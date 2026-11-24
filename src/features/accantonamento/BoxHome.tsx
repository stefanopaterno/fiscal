'use client';

import { makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Text, tokens } from '@fluentui/react-components';
import { formattaEuro } from '@/engine/importi';
import { GrigliaKpi, Kpi } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { Collegamento } from '@/ui/Moduli';
import type { QuadroAccantonamento } from './dati';
import { Promemoria } from './Promemoria';

/**
 * Salvadanaio in home (specifica 007, US1, US2, US5, FR-006): avviso se non basta, netto reale, percentuale
 * del mese e i primi promemoria degli incassi.
 */
const useStili = makeStyles({
  sezione: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  intestazione: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalM },
  titolo: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase400 },
});

export function BoxSalvadanaio({ q, onCambio }: { q: QuadroAccantonamento; onCambio: () => void }) {
  const s = useStili();
  const e = formattaEuro;
  const attivo = q.incassi.length > 0 || q.movimenti.length > 0;
  // senza CU il riquadro in evidenza della home chiede già di inserirla
  if (!attivo || q.manca) return null;
  return (
    <section className={s.sezione} aria-labelledby="salvadanaio-home">
      <div className={s.intestazione}>
        <Text id="salvadanaio-home" className={s.titolo}>
          Salvadanaio
        </Text>
        <Collegamento href="/salvadanaio/">Apri il salvadanaio</Collegamento>
      </div>
      {q.impostazioni.avvisi && q.mancaTotale > 0 ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Il salvadanaio non basta</MessageBarTitle>
            Per le prossime scadenze mancano <ImportoNascosto valore={e(q.mancaTotale)} />.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <GrigliaKpi>
        <Kpi
          evidenza
          etichetta="Netto reale disponibile"
          valore={e(q.netto.disponibile)}
          aiuto={{
            argomento: 'netto reale',
            testo: 'Quello che puoi spendere davvero della partita IVA: incassato meno spese pagate e meno tasse e contributi da mettere da parte. Lo stipendio non è compreso.',
            passi: [
              <>Incassato: <ImportoNascosto valore={e(q.netto.incassato)} /></>,
              <>Meno spese pagate: <ImportoNascosto valore={e(q.netto.spese)} /></>,
              <>Meno tasse e contributi da mettere da parte: <ImportoNascosto valore={e(q.netto.necessari)} /></>,
              <>Netto reale: <ImportoNascosto valore={e(q.netto.disponibile)} /></>,
            ],
          }}
        />
        <Kpi
          etichetta="Ogni 100 € di compenso"
          valore={e(q.percentuale.per100)}
          nota="da mettere da parte"
          aiuto={{
            argomento: 'percentuale',
            testo: q.percentuale.motivi.join(' '),
            passi: [
              <>IRPEF e addizionali sul compenso in più: <ImportoNascosto valore={e(q.percentuale.imposte)} /></>,
              <>Contributi ENPAP: <ImportoNascosto valore={e(q.percentuale.contributi)} /></>,
              <>Margine di sicurezza: <ImportoNascosto valore={e(q.percentuale.margine)} /></>,
              <>Ogni 100 € da mettere da parte: <ImportoNascosto valore={e(q.percentuale.per100)} /></>,
            ],
          }}
        />
        <Kpi
          etichetta="Nel salvadanaio"
          valore={e(q.saldo)}
          nota={q.fabbisogno > 0 ? (q.mancaTotale > 0 ? 'non basta per le scadenze' : 'copre le scadenze') : undefined}
          aiuto={{ argomento: 'salvadanaio', testo: 'Quello che hai messo da parte per tasse e contributi, al netto delle scadenze già pagate.' }}
        />
      </GrigliaKpi>
      <Promemoria voci={q.promemoria} onCambio={onCambio} massimo={3} />
    </section>
  );
}
