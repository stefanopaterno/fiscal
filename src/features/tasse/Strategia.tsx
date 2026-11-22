'use client';

import {
  Badge,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { calcolaAnno, type RisultatoAnno } from '@/engine/irpef/anno';
import { contributiEnpap } from '@/engine/irpef/enpap';
import { pianiVersamento, type Piano } from '@/engine/irpef/piani';
import { differenzaPrevista, type Previsione } from '@/engine/irpef/previsione';
import { formattaEuro } from '@/engine/importi';
import { ErroreIrpef } from '@/engine/regole/irpef';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, CampoTesto, Griglia, Scheda } from '@/ui/Moduli';
import { CampoEuro, SceltaAnno, useAnno } from './componenti';
import { raccogliAnno, type DatiRaccolti } from './dati';

/**
 * Strategia dei versamenti (US5, FR-025..FR-030): piani a confronto, mese per mese. L'imposta non cambia,
 * cambiano tempi e costi. Nessuna strategia sposta incassi o fatture.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  scelta: { maxWidth: '240px' },
  mesi: { display: 'flex', flexDirection: 'column' },
  mese: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    minHeight: '36px',
    alignItems: 'center',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  riepilogo: { display: 'flex', gap: tokens.spacingHorizontalL, flexWrap: 'wrap' },
});

const NOMI_MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const meseBreve = (m: string) => `${NOMI_MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

export function Strategia() {
  const [anno, setAnno] = useAnno();
  return <StrategiaPerAnno key={anno} anno={anno} setAnno={setAnno} />;
}

function StrategiaPerAnno({ anno, setAnno }: { anno: number; setAnno: (a: number) => void }) {
  const s = useStili();
  const [dati, setDati] = useState<DatiRaccolti | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [volontario, setVolontario] = useState<number | null>(null);
  const [meseVolontario, setMeseVolontario] = useState(`${anno}-12`);
  const [rate, setRate] = useState('7');

  useEffect(() => {
    let vivo = true;
    raccogliAnno(anno)
      .then((d) => vivo && setDati(d))
      .catch(() => vivo && setErrore('Non riesco a leggere i dati. Controlla la connessione.'));
    return () => {
      vivo = false;
    };
  }, [anno]);

  let piani: Piano[] = [];
  let risultato: RisultatoAnno | null = null;
  let previsione: Previsione | null = null;
  let erroreCalcolo: string | null = null;
  if (dati && dati.cu.length > 0) {
    try {
      risultato = calcolaAnno(dati.input);
      if (dati.dati?.reddito_atteso != null)
        previsione = differenzaPrevista(dati.input, dati.dati.reddito_atteso);
      const conPiva =
        dati.input.redditoProfessionale !== 0 || (dati.annoInizio !== null && dati.annoInizio <= anno);
      const enpap = conPiva
        ? contributiEnpap(anno, {
            redditoProfessionale: dati.input.redditoProfessionale,
            volumeAffari: dati.cassa.compensi,
          })
        : null;
      piani = pianiVersamento(risultato, {
        soggettoIsa: dati.dati?.soggetto_isa ?? false,
        differenzaAttesa: previsione?.differenzaAttesa ?? null,
        volontario: volontario ? { importo: volontario, mese: meseVolontario } : null,
        numeroRate: Number(rate),
        contributiEnpap: enpap
          ? {
              importo: enpap.soggettivo + enpap.maternita + enpap.integrativo,
              mese: enpap.scadenza.slice(0, 7),
            }
          : null,
      });
    } catch (e) {
      erroreCalcolo = e instanceof ErroreIrpef ? e.message : 'Calcolo non riuscito.';
    }
  }

  const mesiVolontario = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(anno, 6 + i, 1); // da luglio dell'anno a dicembre…
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).concat(Array.from({ length: 5 }, (_, i) => `${anno + 1}-${String(i + 1).padStart(2, '0')}`));

  return (
    <div className={s.colonna}>
      <div className={s.scelta}>
        <SceltaAnno anno={anno} onChange={setAnno} />
      </div>
      {errore ? <Text>{errore}</Text> : null}
      {!dati && !errore ? <Spinner label="Carico i dati…" /> : null}
      {dati && dati.cu.length === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>Inserisci prima la CU {anno} in Dati dell&apos;anno.</MessageBarBody>
        </MessageBar>
      ) : null}
      {erroreCalcolo ? (
        <MessageBar intent="error">
          <MessageBarBody>{erroreCalcolo}</MessageBarBody>
        </MessageBar>
      ) : null}
      {risultato ? (
        <>
          <Scheda
            titolo="Le tue scelte"
            aiuto={{
              argomento: 'scelte della strategia',
              testo: `Prova un acconto volontario (un versamento in anticipo che scali da giugno ${anno + 1}) e il numero di rate. Il metodo previsionale compare se in Dati dell'anno hai scritto il reddito atteso.`,
            }}
          >
            <Griglia>
              <CampoEuro
                etichetta="Acconto volontario"
                facoltativo
                valore={volontario}
                onChange={setVolontario}
                aiuto={{
                  argomento: 'acconto volontario',
                  testo:
                    'Un versamento in più fatto prima di giugno: non è un costo, è un anticipo. Abbassa il picco di giugno. Chiedi al commercialista come indicarlo in F24.',
                }}
              />
              <CampoScelta
                etichetta="Mese del versamento"
                valore={meseVolontario}
                onChange={setMeseVolontario}
                opzioni={mesiVolontario.map((m) => ({ valore: m, etichetta: meseBreve(m) }))}
                aiuto={{ argomento: 'mese', testo: 'Quando faresti il versamento volontario.' }}
              />
              <CampoTesto
                etichetta="Numero di rate (2–7)"
                valore={rate}
                inputMode="numeric"
                onChange={(v) => setRate(v.replace(/\D/g, '').slice(0, 1))}
                aiuto={{
                  argomento: 'rate',
                  testo:
                    "In quante rate mensili dividere il versamento di giugno. Dalla seconda si pagano gli interessi del 4% l'anno.",
                }}
              />
            </Griglia>
            {previsione?.avviso ? <Text size={200}>{previsione.avviso}</Text> : null}
          </Scheda>
          {piani.map((p) => (
            <SchedaPiano key={p.tipo} piano={p} />
          ))}
          <Text size={200}>
            Il totale d&apos;imposta è lo stesso in tutti i piani: cambiano solo quando paghi e i costi. Stime
            da verificare con il commercialista.
          </Text>
        </>
      ) : null}
    </div>
  );
}

function SchedaPiano({ piano: p }: { piano: Piano }) {
  const s = useStili();
  const perMese = new Map<string, number>();
  for (const v of p.versamenti) perMese.set(v.mese, (perMese.get(v.mese) ?? 0) + v.importo + v.costo);
  return (
    <Scheda titolo={p.titolo} aiuto={{ argomento: p.titolo.toLowerCase(), testo: p.spiegazione }}>
      <div className={s.riepilogo}>
        {p.consigliato ? (
          <Badge appearance="filled" color="success">
            consigliato
          </Badge>
        ) : null}
        <Text>
          Mese più pesante: {p.picco.mese ? meseBreve(p.picco.mese) : '—'}{' '}
          <ImportoNascosto valore={formattaEuro(p.picco.importo)} />
        </Text>
        <Text>
          Costi: <ImportoNascosto valore={formattaEuro(p.costi)} />
        </Text>
      </div>
      {p.rischio ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Rischio</MessageBarTitle>
            {p.rischio}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <div className={s.mesi}>
        {[...perMese]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([mese, importo]) => (
            <div key={mese} className={s.mese}>
              <Text>{meseBreve(mese)}</Text>
              <ImportoNascosto valore={formattaEuro(importo)} />
            </div>
          ))}
      </div>
    </Scheda>
  );
}
