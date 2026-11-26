'use client';

import { Button, Checkbox, makeStyles, MessageBar, MessageBarBody, Text, Textarea, tokens } from '@fluentui/react-components';
import { ArrowDownload20Regular, Copy20Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import type { AddizionaliPerAnno } from '@/engine/parametri/anteprima';
import { generaRichiesta } from '@/engine/parametri/richiesta';
import { oggiIso } from '@/lib/oggi';
import { CampoTesto, Griglia, Scheda } from '@/ui/Moduli';
import { leggiAddizionali, leggiAmbito, salvaAmbito } from './dati';

/** Scheda «Prepara richiesta» (specifica 014, US1, FR-004..FR-008). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  riga: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalM, alignItems: 'center' },
  testo: { width: '100%', minHeight: '240px', fontFamily: tokens.fontFamilyMonospace },
  pulsante: { minHeight: '44px' },
  nota: { color: tokens.colorNeutralForeground3 },
});

export function PreparaRichiesta() {
  const s = useStili();
  const oggi = oggiIso();
  const anno = Number(oggi.slice(0, 4));
  const [anni, setAnni] = useState<Record<number, boolean>>({ [anno]: true, [anno + 1]: oggi.slice(5) >= '10-01' });
  const [regione, setRegione] = useState('');
  const [comune, setComune] = useState('');
  const [siti, setSiti] = useState('');
  const [addizionali, setAddizionali] = useState<AddizionaliPerAnno>({});
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    const a = leggiAmbito();
    if (a) {
      setRegione(a.regione);
      setComune(a.comune);
      setSiti(a.siti.join(', '));
    }
    leggiAddizionali([anno, anno + 1])
      .then(setAddizionali)
      .catch(() => undefined);
  }, [anno]);

  const scelti = Object.entries(anni)
    .filter(([, v]) => v)
    .map(([k]) => Number(k));
  const ambito = regione.trim() && comune.trim() ? { regione: regione.trim(), comune: comune.trim() } : undefined;
  const testo = useMemo(
    () => (scelti.length ? generaRichiesta({ oggi, anni: scelti, ambito, addizionali }) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [oggi, scelti.join(','), ambito?.regione, ambito?.comune, addizionali],
  );

  function ricordaAmbito() {
    salvaAmbito({
      regione: regione.trim(),
      comune: comune.trim(),
      siti: siti
        .split(/[,\s]+/)
        .map((x) => x.trim())
        .filter(Boolean),
    });
  }

  async function copia() {
    ricordaAmbito();
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 3000);
    } catch {
      setCopiato(false);
    }
  }

  function scarica() {
    ricordaAmbito();
    const url = URL.createObjectURL(new Blob([testo], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `richiesta-parametri-fiscal-${oggi}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={s.colonna}>
      <Scheda
        titolo="1. Per quali anni"
        aiuto={{
          argomento: 'anni della richiesta',
          testo: "L'anno in corso e, da ottobre, anche il prossimo: è quando escono la Legge di Bilancio e le nuove aliquote.",
        }}
      >
        <div className={s.riga}>
          {[anno, anno + 1].map((a) => (
            <Checkbox key={a} label={String(a)} checked={!!anni[a]} onChange={(_, d) => setAnni((x) => ({ ...x, [a]: !!d.checked }))} />
          ))}
        </div>
      </Scheda>

      <Scheda
        titolo="2. Regione e comune (per le addizionali)"
        aiuto={{
          argomento: 'regione e comune',
          testo:
            'Servono solo per cercare le addizionali. Restano su questo dispositivo: non vanno nel database e sono l\'unico dato tuo nella richiesta. Lascia vuoto per non includere le addizionali.',
        }}
      >
        <Griglia>
          <CampoTesto etichetta="Regione" valore={regione} onChange={setRegione} aiuto={{ argomento: 'regione', testo: 'La regione in cui hai la residenza al 1° gennaio.' }} />
          <CampoTesto etichetta="Comune" valore={comune} onChange={setComune} aiuto={{ argomento: 'comune', testo: 'Il comune in cui hai la residenza al 1° gennaio.' }} />
        </Griglia>
        <CampoTesto
          etichetta="Siti ufficiali di regione e comune (facoltativo)"
          valore={siti}
          onChange={setSiti}
          segnaposto="es. regione.esempio.it, comune.esempio.it"
          aiuto={{
            argomento: 'siti ufficiali',
            testo: 'Le voci delle addizionali risultano «verificate» solo se la fonte è uno di questi siti (o la Gazzetta, le Finanze…).',
          }}
        />
        {!ambito ? (
          <MessageBar intent="info">
            <MessageBarBody>Senza regione e comune la richiesta non comprende le addizionali.</MessageBarBody>
          </MessageBar>
        ) : null}
      </Scheda>

      <Scheda
        titolo="3. Copia e incolla a Claude"
        aiuto={{
          argomento: 'richiesta per Claude',
          testo:
            'Incolla tutto il testo in una conversazione con Claude con la ricerca sul web attiva. Claude risponde con un file: copialo e incollalo nella scheda «Importa».',
        }}
      >
        {scelti.length === 0 ? (
          <Text>Scegli almeno un anno.</Text>
        ) : (
          <>
            <Textarea className={s.testo} value={testo} readOnly resize="vertical" aria-label="Richiesta per Claude" />
            <div className={s.riga}>
              <Button appearance="primary" className={s.pulsante} icon={<Copy20Regular />} onClick={() => void copia()}>
                {copiato ? 'Copiata' : 'Copia la richiesta'}
              </Button>
              <Button className={s.pulsante} icon={<ArrowDownload20Regular />} onClick={scarica}>
                Scarica .md
              </Button>
            </div>
            <Text size={200} className={s.nota}>
              Nessun importo, nome o codice fiscale: solo le regole pubbliche{ambito ? ', la regione e il comune' : ''}.
            </Text>
          </>
        )}
      </Scheda>
    </div>
  );
}
