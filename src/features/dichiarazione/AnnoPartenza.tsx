'use client';

import { Button, makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Text, tokens } from '@fluentui/react-components';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { centesimiInTesto, euroInCentesimi } from '@/engine/importi';
import { GUIDA_730, type CampoPartenza } from '@/engine/regole/dichiarazione';
import { CampoSiNo, CampoTesto, Collegamento, Griglia, Scheda } from '@/ui/Moduli';
import { leggiDichiarazione, nuovaDichiarazione, nuovoId, salva, spiegaErrore, type Dichiarazione } from './dati';

/**
 * Anno di partenza (specifica 004, US8, FR-027…FR-029): i pochi dati dell'ultimo 730 che servono per gli acconti
 * del primo anno di partita IVA, con la guida su dove trovarli. Gli acconti trattenuti in busta paga valgono come
 * versati nell'anno dopo (se non registri versamenti di acconto a mano).
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  nota: { color: tokens.colorNeutralForeground3 },
});

const IMPORTI: Exclude<CampoPartenza, 'rimborso_in_busta'>[] = ['imposta_netta', 'differenza', 'acconti_trattenuti', 'credito', 'debito'];

export function AnnoPartenza() {
  const p = useSearchParams();
  const anno = Number(p.get('anno')) || 2026;
  const [d, setD] = useState<Dichiarazione | null>(null);
  const [caricato, setCaricato] = useState(false);
  useEffect(() => {
    let vivo = true;
    leggiDichiarazione(anno)
      .then((x) => {
        if (!vivo) return;
        setD(x?.tipo === '730' ? x : null);
        setCaricato(true);
      })
      .catch(() => vivo && setCaricato(true));
    return () => {
      vivo = false;
    };
  }, [anno]);
  if (!caricato) return null;
  return <Modulo key={d?.id ?? 'nuovo'} anno={anno} iniziale={d} />;
}

function Modulo({ anno, iniziale }: { anno: number; iniziale: Dichiarazione | null }) {
  const s = useStili();
  const base = iniziale ?? nuovaDichiarazione(anno, '730', nuovoId());
  const [riga, setRiga] = useState(base);
  const [testi, setTesti] = useState<Record<string, string>>(() =>
    Object.fromEntries(IMPORTI.map((k) => [k, base[k] == null ? '' : centesimiInTesto(base[k] as number)])),
  );
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const valore = (k: string) => (testi[k]!.trim() === '' ? null : euroInCentesimi(testi[k]!.replace('-', '')));
  const negativa = testi.differenza!.trim().startsWith('-');
  const errati = IMPORTI.filter((k) => testi[k]!.trim() !== '' && valore(k) == null);
  const mancanti = IMPORTI.filter((k) => testi[k]!.trim() === '');

  async function salvaTutto() {
    setMessaggio(null);
    const nuova: Dichiarazione = {
      ...riga,
      imposta_netta: valore('imposta_netta'),
      differenza: valore('differenza') == null ? null : (negativa ? -1 : 1) * valore('differenza')!,
      acconti_trattenuti: valore('acconti_trattenuti'),
      credito: valore('credito') ?? 0,
      debito: valore('debito') ?? 0,
    };
    try {
      const r = await salva('dichiarazioni', nuova);
      setRiga({ ...nuova, versione: r.versione });
      setMessaggio('Salvato.');
    } catch (err) {
      setMessaggio(spiegaErrore(err));
    }
  }

  return (
    <div className={s.colonna}>
      <Text>
        Dal {anno + 1} con la partita IVA userai il Modello Redditi. Per partire servono pochi dati del tuo ultimo 730 (redditi {anno}):
        li trovi nel prospetto di liquidazione (modello 730-3) che ti ha dato il CAF, il sostituto o la precompilata.
      </Text>
      <Scheda
        titolo={`730 dei redditi ${anno}`}
        aiuto={{ argomento: '730', testo: 'Tocca il punto di domanda di ogni campo per sapere dove trovarlo. Se un dato non lo trovi, lascialo vuoto: gli acconti risulteranno provvisori.' }}
      >
        <Griglia>
          {IMPORTI.map((k) => {
            const g = GUIDA_730[k];
            return (
              <CampoTesto
                key={k}
                etichetta={g.valore.etichetta}
                valore={testi[k]!}
                onChange={(v) => setTesti((x) => ({ ...x, [k]: v }))}
                inputMode="decimal"
                lunghezzaMax={13}
                errore={errati.includes(k) ? 'Importo non valido' : undefined}
                aiuto={{
                  argomento: g.valore.etichetta,
                  testo: `${g.valore.dove} ${g.valore.esempio}${g.stato === 'da_verificare' ? ' (Riferimento da verificare sul modello del tuo anno.)' : ''}`,
                }}
              />
            );
          })}
        </Griglia>
        <CampoSiNo
          etichetta={GUIDA_730.rimborso_in_busta.valore.etichetta}
          valore={riga.rimborso_in_busta === true}
          onChange={(v) => setRiga((x) => ({ ...x, rimborso_in_busta: v }))}
          aiuto={{ argomento: 'rimborso in busta paga', testo: `${GUIDA_730.rimborso_in_busta.valore.dove} ${GUIDA_730.rimborso_in_busta.valore.esempio}` }}
        />
        <Button className={s.pulsante} appearance="primary" disabled={errati.length > 0} onClick={() => void salvaTutto()}>
          Salva i dati del 730
        </Button>
        {messaggio ? <Text role="status">{messaggio}</Text> : null}
      </Scheda>
      {mancanti.length > 0 ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Dati mancanti</MessageBarTitle>
            Senza {mancanti.map((k) => GUIDA_730[k].valore.etichetta.toLowerCase()).join(', ')} gli acconti del {anno + 1} sono provvisori.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <Text size={200} className={s.nota}>
        Gli acconti trattenuti in busta paga contano come già versati per il {anno + 1}, se non registri versamenti di acconto a mano.
        Puoi allegare il 730 nell&apos;<Collegamento href="/documenti/" inLinea>archivio</Collegamento>.
      </Text>
    </div>
  );
}
