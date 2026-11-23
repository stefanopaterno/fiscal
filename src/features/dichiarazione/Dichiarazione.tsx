'use client';

import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  ProgressBar,
  Skeleton,
  SkeletonItem,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useCallback, useEffect, useState } from 'react';
import type { Elemento, StatoElemento } from '@/engine/dichiarazione/checklist';
import { SCELTE_CREDITO } from '@/engine/dichiarazione/esito';
import { formattaEuro } from '@/engine/importi';
import { SceltaAnno, useAnno } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, Collegamento, Scheda } from '@/ui/Moduli';
import { oggiIso } from '@/lib/oggi';
import { eliminaRiga, nuovaDichiarazione, nuovoId, quadroDichiarazione, salva, spiegaErrore, type QuadroDichiarazione } from './dati';

/**
 * Dichiarazione dell'anno (specifica 004, US1, US6, US7): checklist con il progresso, esito voce per voce,
 * credito (compensazione o rimborso) e chiusura dell'anno. Collegamenti a scadenze, anno di partenza e riepilogo.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  scelta: { maxWidth: '240px' },
  collegamenti: { display: 'flex', flexWrap: 'wrap', gap: `0 ${tokens.spacingHorizontalXL}` },
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  elemento: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalM} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  nota: { color: tokens.colorNeutralForeground3 },
  avviso: { color: tokens.colorPaletteDarkOrangeForeground1 },
  pulsante: { minHeight: '44px' },
  voce: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr auto',
    gap: tokens.spacingHorizontalS,
    alignItems: 'baseline',
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  totale: { fontWeight: tokens.fontWeightSemibold },
  importo: { fontVariantNumeric: 'tabular-nums', textAlign: 'right' },
  spiegazione: { gridColumn: '2 / -1', color: tokens.colorNeutralForeground3 },
});

const STATO: Record<StatoElemento, { testo: string; colore: 'success' | 'brand' | 'warning' | 'subtle' }> = {
  completato: { testo: 'Completato', colore: 'success' },
  disponibile: { testo: "Già nell'app", colore: 'brand' },
  da_fornire: { testo: 'Da fornire', colore: 'warning' },
  non_applicabile: { testo: 'Non applicabile', colore: 'subtle' },
};
const e = formattaEuro;

export function Dichiarazione() {
  const s = useStili();
  const [anno, setAnno] = useAnno();
  const [q, setQ] = useState<QuadroDichiarazione | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);
  const ricarica = useCallback(() => setGiro((g) => g + 1), []);

  useEffect(() => {
    let vivo = true;
    quadroDichiarazione(anno)
      .then((x) => vivo && (setQ(x), setErrore(null)))
      .catch((err) => vivo && setErrore(spiegaErrore(err)));
    return () => {
      vivo = false;
    };
  }, [anno, giro]);

  return (
    <div className={s.colonna}>
      <div className={s.scelta}>
        <SceltaAnno anno={anno} onChange={setAnno} />
      </div>
      <div className={s.collegamenti}>
        <Collegamento href="/dichiarazione/scadenze/">Scadenze</Collegamento>
        <Collegamento href={`/dichiarazione/riepilogo/?anno=${anno}`}>Riepilogo per il commercialista</Collegamento>
        <Collegamento href={`/dichiarazione/partenza/?anno=${anno - 1}`}>Anno di partenza (730)</Collegamento>
      </div>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      {!q && !errore ? (
        <Skeleton aria-label="Carico la dichiarazione">
          <SkeletonItem shape="rectangle" style={{ height: '160px' }} />
        </Skeleton>
      ) : null}
      {q && q.anno === anno ? (
        <>
          <Checklist q={q} onCambio={ricarica} />
          <EsitoAnno q={q} onCambio={ricarica} />
          <Chiusura q={q} onCambio={ricarica} />
          <Text size={200} className={s.nota}>
            Fiscal prepara i dati: la dichiarazione ufficiale la compila e la invia il commercialista (o tu), fuori dall&apos;app.
          </Text>
        </>
      ) : null}
    </div>
  );
}

function Checklist({ q, onCambio }: { q: QuadroDichiarazione; onCambio: () => void }) {
  const s = useStili();
  const [inCorso, setInCorso] = useState(false);
  const c = q.checklist;
  async function segna(el: Elemento, stato: 'completato' | 'non_applicabile' | null) {
    setInCorso(true);
    try {
      const riga = q.righeChecklist.find((r) => r.chiave === el.chiave);
      if (stato == null) {
        if (riga) await eliminaRiga('checklist_anno', riga.id);
      } else await salva('checklist_anno', { id: riga?.id ?? nuovoId(), versione: riga?.versione ?? 0, anno: q.anno, chiave: el.chiave, stato });
      onCambio();
    } finally {
      setInCorso(false);
    }
  }
  return (
    <Scheda
      titolo={`Cosa serve per la dichiarazione ${q.anno}`}
      aiuto={{
        argomento: 'checklist',
        testo: 'Con la partita IVA si usa il Modello Redditi, non il 730. Qui vedi cosa c\'è già nell\'app e cosa manca. «Non applicabile» toglie la voce dal conteggio.',
      }}
    >
      <Text>
        {c.percentuale}% pronto{c.mancanti > 0 ? ` · mancano ${c.mancanti} ${c.mancanti === 1 ? 'elemento' : 'elementi'}` : ''}
      </Text>
      <ProgressBar value={c.percentuale / 100} thickness="large" color={c.mancanti === 0 ? 'success' : 'brand'} aria-label="Avanzamento della checklist" />
      <ul className={s.elenco}>
        {c.elementi.map((el) => {
          const manuale = q.righeChecklist.some((r) => r.chiave === el.chiave);
          return (
            <li key={el.chiave} className={s.elemento}>
              <div className={s.riga}>
                <Text weight="semibold">{el.titolo}</Text>
                <Badge appearance="tint" color={STATO[el.stato].colore}>
                  {STATO[el.stato].testo}
                </Badge>
              </div>
              <Text size={200}>{el.spiegazione}</Text>
              {el.avviso ? <Text size={200} className={s.avviso}>{el.avviso}</Text> : null}
              <div className={s.riga}>
                <Collegamento href={el.collegamento}>Apri</Collegamento>
                {manuale ? (
                  <Button className={s.pulsante} appearance="subtle" disabled={inCorso} onClick={() => void segna(el, null)}>
                    Ripristina
                  </Button>
                ) : (
                  <>
                    {el.stato === 'da_fornire' ? (
                      <Button className={s.pulsante} appearance="subtle" disabled={inCorso} onClick={() => void segna(el, 'completato')}>
                        Segna fatto
                      </Button>
                    ) : null}
                    <Button className={s.pulsante} appearance="subtle" disabled={inCorso} onClick={() => void segna(el, 'non_applicabile')}>
                      Non applicabile
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Scheda>
  );
}

function EsitoAnno({ q, onCambio }: { q: QuadroDichiarazione; onCambio: () => void }) {
  const s = useStili();
  if (!q.esito)
    return (
      <Scheda titolo="Esito della dichiarazione" aiuto={{ argomento: 'esito', testo: 'Dall\'imposta al saldo di giugno, voce per voce.' }}>
        <Text>{q.errore ?? `Per l'esito serve la CU ${q.anno}.`}</Text>
      </Scheda>
    );
  const es = q.esito;
  return (
    <Scheda
      titolo="Esito della dichiarazione"
      aiuto={{
        argomento: 'esito',
        testo:
          'Con il 730 detrazioni e rimborsi arrivavano in busta paga. Con il Modello Redditi prima abbassano quello che paghi a giugno; solo se avanza qualcosa diventa un credito.',
      }}
    >
      <div>
        {es.voci.map((v) => (
          <div key={v.voce} className={s.voce}>
            <Text className={v.segno === '=' ? s.totale : undefined}>{v.segno}</Text>
            <Text className={v.segno === '=' ? s.totale : undefined}>{v.voce}</Text>
            <Text className={mergeClasses(s.importo, v.segno === '=' && s.totale)}>
              <ImportoNascosto valore={e(v.importo)} />
            </Text>
            <Text size={200} className={s.spiegazione}>
              <ImportoNascosto valore={v.spiegazione} segnaposto={v.spiegazione.replace(/[\d.]+,\d{2}\s€/g, '•••• €')} />
            </Text>
          </div>
        ))}
      </div>
      <MessageBar intent={es.credito > 0 ? 'success' : 'info'} layout="multiline">
        <MessageBarBody>
          <ImportoNascosto valore={es.messaggio} segnaposto={es.messaggio.replace(/[\d.]+,\d{2}\s€/g, '•••• €')} />
        </MessageBarBody>
      </MessageBar>
      {es.incapienza > 0 ? (
        <Text size={200} className={s.nota}>
          Una parte delle detrazioni (<ImportoNascosto valore={e(es.incapienza)} />) non si usa perché supera l&apos;imposta: non diventa rimborso.
        </Text>
      ) : null}
      {es.credito > 0 ? <Credito key={`${q.dichiarazione?.id}-${q.dichiarazione?.versione}`} q={q} credito={es.credito} onCambio={onCambio} /> : null}
      {q.risultato?.provvisorio ? (
        <Text size={200} className={s.nota}>
          Stima provvisoria: alcune regole o dati sono ancora da verificare.
        </Text>
      ) : null}
    </Scheda>
  );
}

function Credito({ q, credito, onCambio }: { q: QuadroDichiarazione; credito: number; onCambio: () => void }) {
  const s = useStili();
  const d = q.dichiarazione?.tipo === 'redditi' ? q.dichiarazione : nuovaDichiarazione(q.anno, 'redditi', nuovoId());
  const [scelta, setScelta] = useState<'compensazione' | 'rimborso' | ''>(d.credito_scelta ?? '');
  const [stato, setStato] = useState(d.credito_stato ?? 'disponibile');
  const [errore, setErrore] = useState<string | null>(null);
  async function registra() {
    setErrore(null);
    try {
      await salva('dichiarazioni', {
        ...d,
        credito,
        credito_scelta: scelta || null,
        credito_stato: stato,
        credito_incassato_il: stato === 'incassato' ? (d.credito_incassato_il ?? oggiIso()) : null,
      });
      onCambio();
    } catch (err) {
      setErrore(spiegaErrore(err));
    }
  }
  return (
    <>
      <Text weight="semibold">Cosa fare del credito</Text>
      {(['compensazione', 'rimborso'] as const).map((k) => (
        <Text key={k} size={200}>
          <strong>{SCELTE_CREDITO[k].titolo}:</strong> {SCELTE_CREDITO[k].effetto} {SCELTE_CREDITO[k].vincoli}
        </Text>
      ))}
      <CampoScelta
        etichetta="Scelta"
        valore={scelta}
        onChange={setScelta}
        opzioni={[
          { valore: '', etichetta: 'Da decidere' },
          { valore: 'compensazione', etichetta: SCELTE_CREDITO.compensazione.titolo },
          { valore: 'rimborso', etichetta: SCELTE_CREDITO.rimborso.titolo },
        ]}
        aiuto={{ argomento: 'scelta del credito', testo: 'Decidila col commercialista quando prepara la dichiarazione.' }}
      />
      {scelta === 'rimborso' ? (
        <CampoScelta
          etichetta="Stato del rimborso"
          valore={stato}
          onChange={setStato}
          opzioni={[
            { valore: 'disponibile', etichetta: 'Da chiedere' },
            { valore: 'richiesto', etichetta: 'Richiesto, in attesa' },
            { valore: 'incassato', etichetta: 'Incassato' },
          ]}
          aiuto={{ argomento: 'stato del rimborso', testo: 'Finché non è incassato non conta come soldi disponibili. I tempi dell\'Agenzia delle Entrate non dipendono dall\'app.' }}
        />
      ) : null}
      <Button className={s.pulsante} appearance="primary" onClick={() => void registra()}>
        Registra la scelta
      </Button>
      {errore ? <Text role="alert">{errore}</Text> : null}
    </>
  );
}

function Chiusura({ q, onCambio }: { q: QuadroDichiarazione; onCambio: () => void }) {
  const s = useStili();
  const [chiedi, setChiedi] = useState(false);
  const d = q.dichiarazione;
  const chiuso = d?.chiuso_il != null;
  async function cambia() {
    const riga = d ?? nuovaDichiarazione(q.anno, 'redditi', nuovoId());
    await salva('dichiarazioni', { ...riga, chiuso_il: chiuso ? null : oggiIso() });
    setChiedi(false);
    onCambio();
  }
  return (
    <Scheda
      titolo={chiuso ? `Anno ${q.anno} chiuso` : 'Chiudere l\'anno'}
      aiuto={{ argomento: 'chiusura', testo: 'Dopo l\'invio della dichiarazione chiudi l\'anno: i dati restano consultabili e servono da storico per gli acconti.' }}
    >
      <Text>
        {chiuso
          ? `Chiuso il ${d!.chiuso_il!.split('-').reverse().join('/')}. Riaprilo solo se devi correggere qualcosa.`
          : 'Quando la dichiarazione è stata inviata, chiudi l\'anno.'}
      </Text>
      <Button className={s.pulsante} onClick={() => setChiedi(true)}>
        {chiuso ? 'Riapri l\'anno' : 'Chiudi l\'anno'}
      </Button>
      <Dialog open={chiedi} onOpenChange={(_, x) => setChiedi(x.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{chiuso ? `Riaprire il ${q.anno}?` : `Chiudere il ${q.anno}?`}</DialogTitle>
            <DialogContent>
              {chiuso
                ? 'Riaprendo l\'anno potrai cambiarne i dati: la modifica resta registrata.'
                : 'I dati restano consultabili. Per modificarli dovrai riaprire l\'anno.'}
            </DialogContent>
            <DialogActions>
              <Button className={s.pulsante} onClick={() => setChiedi(false)}>
                No
              </Button>
              <Button className={s.pulsante} appearance="primary" onClick={() => void cambia()}>
                {chiuso ? 'Sì, riapri' : 'Sì, chiudi'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </Scheda>
  );
}
