'use client';

import {
  Badge,
  Button,
  Link,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import { Copy20Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { controlliDovuti, controlloSettimanale, promptControllo, type Controllo } from '@/engine/novita/controlli';
import { regoleAperte } from '@/engine/novita/regole-aperte';
import { NOTIZIE, ULTIMO_CONTROLLO, type Notizia } from '@/engine/regole/novita';
import { leggiAliquote } from '@/features/tasse/dati';
import { Collegamento, Scheda } from '@/ui/Moduli';
import { oggiIso } from '@/lib/oggi';

/**
 * Pagina delle novità normative (specifica 012): controlli da fare (addizionali alle date giuste e
 * controllo settimanale, con il prompt da incollare all'assistente), notizie con fonte e proposta,
 * regole ancora da verificare. Nessun dato personale lascia l'app.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  voce: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: 0 },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  nota: { color: tokens.colorNeutralForeground3 },
  prompt: { width: '100%', minHeight: '180px' },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  fonte: { display: 'inline-flex', alignItems: 'center', minHeight: '44px', textDecorationLine: 'none', ':hover': { textDecorationLine: 'underline' } },
  regola: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    overflowWrap: 'anywhere',
  },
});

const STATO: Record<Notizia['stato'], { testo: string; colore: 'success' | 'warning' | 'informative' }> = {
  in_vigore: { testo: 'In vigore', colore: 'success' },
  approvata: { testo: 'Approvata, non ancora pubblicata', colore: 'warning' },
  proposta: { testo: 'Proposta', colore: 'informative' },
};

/** Controlli dovuti oggi (usato anche dalla home). */
export async function controlliDiOggi(): Promise<{ controlli: Controllo[]; settimanale: ReturnType<typeof controlloSettimanale> }> {
  const oggi = oggiIso();
  const anno = Number(oggi.slice(0, 4));
  const anni = [anno, anno + 1];
  const righe = await Promise.all(anni.map((a) => leggiAliquote(a).catch(() => null)));
  const aliquoteVerificate = new Map(anni.map((a, i) => [a, righe[i]?.verificate === true]));
  return { controlli: controlliDovuti(oggi, { aliquoteVerificate }), settimanale: controlloSettimanale(oggi) };
}

export function Novita() {
  const s = useStili();
  const oggi = oggiIso();
  const [dovuti, setDovuti] = useState<Controllo[] | null>(null);
  const [copiato, setCopiato] = useState(false);
  const settimanale = controlloSettimanale(oggi);
  const prompt = useMemo(() => promptControllo(oggi), [oggi]);
  const aperte = useMemo(() => regoleAperte(), []);

  useEffect(() => {
    let vivo = true;
    controlliDiOggi()
      .then((c) => vivo && setDovuti(c.controlli))
      .catch(() => vivo && setDovuti([]));
    return () => {
      vivo = false;
    };
  }, []);

  async function copia() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiato(true);
    } catch {
      setCopiato(false);
    }
  }

  const notizie = [...NOTIZIE].sort((a, b) => b.data.localeCompare(a.data));
  const daFare = (dovuti?.length ?? 0) > 0 || settimanale.scaduto;

  return (
    <div className={s.colonna}>
      <MessageBar intent={settimanale.scaduto ? 'warning' : 'success'} layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>
            Ultimo controllo delle fonti: {ULTIMO_CONTROLLO.data.split('-').reverse().join('/')}
            {settimanale.giorni > 0 ? ` (${settimanale.giorni} ${settimanale.giorni === 1 ? 'giorno' : 'giorni'} fa)` : ' (oggi)'}
          </MessageBarTitle>
          {ULTIMO_CONTROLLO.esito} Fonti: {ULTIMO_CONTROLLO.fonti.join(', ')}.
        </MessageBarBody>
      </MessageBar>

      <Scheda
        titolo="Controlli da fare"
        aiuto={{
          argomento: 'controlli',
          testo:
            'Ogni settimana si controllano le fonti ufficiali; le addizionali quando regione e comune le pubblicano (febbraio, fine dicembre e maggio). Le regole cambiano solo dopo il tuo sì.',
        }}
      >
        {!daFare ? <Text>Niente da fare: il controllo è aggiornato.</Text> : null}
        <ul className={s.elenco}>
          {settimanale.scaduto ? (
            <li className={s.voce}>
              <Text weight="semibold">Controllo settimanale delle novità</Text>
              <Text>Sono passati più di 7 giorni: copia il testo qui sotto e incollalo all&apos;assistente.</Text>
            </li>
          ) : null}
          {(dovuti ?? []).map((c) => (
            <li key={c.chiave} className={s.voce}>
              <Text weight="semibold">{c.titolo}</Text>
              <Text>{c.perche}</Text>
              <Collegamento href={`/tasse/dati/?anno=${c.anno}`}>Apri i dati del {c.anno}</Collegamento>
            </li>
          ))}
        </ul>
        <Textarea
          className={s.prompt}
          value={prompt}
          readOnly
          resize="vertical"
          aria-label="Testo da incollare all'assistente"
        />
        <Button className={s.pulsante} icon={<Copy20Regular />} onClick={() => void copia()}>
          {copiato ? 'Copiato' : 'Copia il testo per l\'assistente'}
        </Button>
        <Text size={200} className={s.nota}>
          Il testo contiene solo informazioni pubbliche: nessun importo, né regione o comune.
        </Text>
      </Scheda>

      <Scheda
        titolo="Novità"
        aiuto={{
          argomento: 'novità',
          testo: 'Cosa cambia, da quando, la fonte ufficiale e cosa propongo di aggiornare. Per vedere l\'effetto sui tuoi conti usa il simulatore delle tasse.',
        }}
      >
        {notizie.length === 0 ? <Text>Nessuna novità.</Text> : null}
        <ul className={s.elenco}>
          {notizie.map((n) => (
            <li key={n.id} className={s.voce}>
              <div className={s.riga}>
                <Text weight="semibold">{n.titolo}</Text>
                <Badge appearance="tint" color={STATO[n.stato].colore}>
                  {STATO[n.stato].testo}
                </Badge>
                {n.tiRiguarda !== true ? (
                  <Badge appearance="tint" color="subtle">
                    Non ti riguarda
                  </Badge>
                ) : null}
              </div>
              <Text>{n.cosaCambia}</Text>
              <Text size={200}>Da quando: {n.daQuando}</Text>
              <Text size={200}>Effetto: {n.impatto}</Text>
              {n.tiRiguarda !== true ? <Text size={200}>{n.tiRiguarda}</Text> : null}
              <Text size={200} className={s.nota}>
                Regole toccate: {n.regole.join(', ')}
              </Text>
              {n.proposta ? (
                <Text size={200}>
                  Proposta ({n.proposta.stato === 'in_attesa' ? 'in attesa del tuo sì' : n.proposta.stato}): {n.proposta.descrizione}
                </Text>
              ) : null}
              <div className={s.riga}>
                {n.fonti.map((f) => (
                  <Link key={f.url} href={f.url} target="_blank" rel="noreferrer" className={s.fonte}>
                    {f.nome}
                    {f.ufficiale ? '' : ' (fonte divulgativa, da confermare)'}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <Text size={200} className={s.nota}>
          Per gli effetti importanti conferma col commercialista.
        </Text>
      </Scheda>

      <Scheda
        titolo={`Regole da verificare (${aperte.length})`}
        aiuto={{
          argomento: 'regole da verificare',
          testo: 'Le regole usate come stima finché la fonte ufficiale non le conferma: a ogni controllo si guarda se si possono chiudere.',
        }}
      >
        <div>
          {aperte.map((r) => (
            <div key={`${r.ambito}-${r.anno}-${r.percorso}`} className={s.regola}>
              <Text weight="semibold">
                {r.ambito} {r.anno} · {r.percorso}
              </Text>
              <Text size={200}>Valore usato: {r.valore}</Text>
              <Text size={200} className={s.nota}>
                {r.fonte}
              </Text>
            </div>
          ))}
        </div>
      </Scheda>
    </div>
  );
}
