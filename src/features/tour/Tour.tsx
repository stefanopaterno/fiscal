'use client';

import { Checkbox, makeStyles, ProgressBar, Text, Title3, tokens } from '@fluentui/react-components';
import { useSyncExternalStore } from 'react';
import { Collegamento } from '@/ui/Moduli';

/**
 * Tour di Fiscal: le sezioni dell'app in ordine d'uso, cosa provare e la logica fiscale in una riga.
 * Le tappe viste restano su questo dispositivo (comodità, non dati dell'utente).
 */
type Tappa = {
  id: string;
  titolo: string;
  spec: string;
  cosa: string;
  prova: string[];
  logica: string;
  link: { href: string; testo: string }[];
};

export const TAPPE: Tappa[] = [
  {
    id: 'home',
    titolo: 'Home',
    spec: 'tutte le specifiche',
    cosa: "Tasse previste per l'anno con il prossimo versamento, salvadanaio, netto reale, promemoria degli incassi, scadenze in arrivo e novità da controllare.",
    prova: [
      "Chiudi e riapri l'occhio: ogni cifra si nasconde, anche nei testi.",
      'Tocca «Vedi la previsione» nel riquadro blu.',
      'Nei promemoria del salvadanaio tocca «Fatto» su un incasso.',
    ],
    logica:
      "Il netto reale è solo della partita IVA: incassato meno spese pagate meno tasse e contributi da mettere da parte. Lo stipendio non c'entra.",
    link: [{ href: '/home/', testo: 'Apri la home' }],
  },
  {
    id: 'fatture',
    titolo: 'Fatture e clienti',
    spec: 'specifica 003',
    cosa: 'Parcella completa: compenso, integrativo ENPAP, esenzione IVA sanitaria, bollo, ritenuta per gli enti, netto a pagare. Rubrica, incassi anche parziali, note di credito, stampa, Tessera Sanitaria.',
    prova: [
      'Nuova fattura a un paziente: sopra 77,47 € compare il bollo da 2 €.',
      'Rifalla per un ente: compare la ritenuta del 20% e il netto scende.',
      'Emetti, registra un incasso e guarda il promemoria «Da mettere da parte» sotto la fattura.',
    ],
    logica:
      "L'integrativo si addebita al cliente e si gira all'ENPAP: non è reddito. La ritenuta l'ha già versata il cliente per te e si scala in dichiarazione.",
    link: [
      { href: '/fatture/', testo: 'Fatture' },
      { href: '/clienti/', testo: 'Clienti' },
      { href: '/adempimenti/', testo: 'Adempimenti' },
    ],
  },
  {
    id: 'salvadanaio',
    titolo: 'Salvadanaio',
    spec: 'specifica 007',
    cosa: 'Quanto mettere da parte a ogni incasso e se basta per le scadenze: percentuale del mese con i motivi, copertura per scadenza, piano del primo anno, movimenti e controllo del saldo.',
    prova: [
      'Su un promemoria tocca «Importo diverso», su un altro «Dopo».',
      "Fissa la percentuale del mese, poi metti il margine a 0: l'app spiega cosa è cambiato.",
      'Scrivi un tasso del conto: il piano mensile scende per gli interessi netti.',
    ],
    logica:
      "Per ogni incasso: IRPEF e addizionali con e senza quel compenso, sommato allo stipendio, più il soggettivo ENPAP, l'integrativo, IVA e bollo, meno la ritenuta.",
    link: [{ href: '/salvadanaio/', testo: 'Apri il salvadanaio' }],
  },
  {
    id: 'tasse',
    titolo: 'Tasse',
    spec: 'specifica 001',
    cosa: 'Stipendio più partita IVA: scaglioni, detrazioni, addizionali, ENPAP, conguaglio, acconti. Simulatore «e se fatturo altri X €», versamenti e strategie con rate e differimento.',
    prova: [
      "Nel simulatore scrivi 5.000: vedi l'IRPEF in più e il cambio di scaglione.",
      'Apri «Strategia dei versamenti» e confronta rate e differimento a luglio.',
      "Tocca il punto di domanda di un campo della CU: c'è il punto della CU.",
    ],
    logica:
      "Le detrazioni dipendono dal reddito complessivo, scaglioni e addizionali dall'imponibile. Le regole non ancora confermate sono segnate «da verificare».",
    link: [{ href: '/tasse/', testo: 'Apri le tasse' }],
  },
  {
    id: 'previsione',
    titolo: 'Previsione',
    spec: 'specifica 006',
    cosa: "Le tasse dell'anno mese per mese: mesi reali e previsti, tre scenari, quattro metodi, attività per mese, fotografie mensili spiegate e calendario dei pagamenti a 18 mesi.",
    prova: [
      'Scrivi un obiettivo annuo, scegli «Obiettivo annuo» e metti agosto a 0.',
      'Guarda in quale mese il prossimo euro passa al 43%.',
      'Scorri il calendario: il mese più pesante è evidenziato.',
    ],
    logica:
      "Nel primo anno si parte dall'obiettivo, dopo tre mesi di incassi dall'andamento. Spese e ritenute future seguono la proporzione avuta finora.",
    link: [{ href: '/tasse/previsione/', testo: 'Apri la previsione' }],
  },
  {
    id: 'spese',
    titolo: 'Spese',
    spec: 'specifica 008',
    cosa: 'Spese professionali con la parte deducibile, beni in ammortamento, spese personali deducibili e detraibili, giustificativi e consigli per pagare meno.',
    prova: [
      "Aggiungi una spesa di telefono: si deduce all'80%.",
      'Registra un computer da 1.500 €: va in ammortamento.',
      'Apri «Come abbassare le tasse» e guarda il risparmio di ogni consiglio.',
    ],
    logica:
      'Sopra 516,46 € un bene si ammortizza. Vitto e alloggio: 75% entro il 2% dei compensi, solo se pagati in modo tracciabile.',
    link: [{ href: '/spese/', testo: 'Apri le spese' }],
  },
  {
    id: 'documenti',
    titolo: 'Documenti',
    spec: 'specifica 010',
    cosa: 'Archivio privato: carichi file, importi lo ZIP delle fatture ricevute (anche .p7m), salti i doppioni, classifichi e crei la spesa in un tocco.',
    prova: [
      'Carica un PDF come «CU»: la checklist della dichiarazione lo vede.',
      'Importa due volte lo stesso ZIP: la seconda non crea doppioni.',
    ],
    logica:
      "L'archivio aiuta a ritrovare i documenti ma non è conservazione a norma: per quella serve l'adesione al servizio gratuito dell'Agenzia delle Entrate.",
    link: [{ href: '/documenti/', testo: 'Apri i documenti' }],
  },
  {
    id: 'dichiarazione',
    titolo: 'Dichiarazione e scadenze',
    spec: 'specifica 004',
    cosa: 'Checklist del Modello Redditi, esito voce per voce con i crediti, anno di partenza dal 730, scadenze con festivi e proroghe, file per il calendario del telefono, riepilogo da stampare e pacchetto protetto per il commercialista.',
    prova: [
      'Nella checklist segna «Non applicabile» una voce: la percentuale sale.',
      'Nelle scadenze segna «Fatta» il bollo di novembre, poi guarda il 2028.',
      'Aggiungi una scadenza personale e scarica il file del calendario.',
    ],
    logica:
      "Con il Modello Redditi detrazioni e crediti abbassano il saldo di giugno invece di arrivare in busta paga. Solo l'eccedenza è un credito.",
    link: [
      { href: '/dichiarazione/', testo: 'Dichiarazione' },
      { href: '/dichiarazione/scadenze/', testo: 'Scadenze' },
      { href: '/dichiarazione/pacchetto/', testo: 'Pacchetto per il commercialista' },
    ],
  },
  {
    id: 'novita',
    titolo: 'Novità',
    spec: 'specifica 012',
    cosa: "Novità di legge con fonte e proposta, regole ancora da verificare, controlli da fare (comprese le addizionali alle date in cui escono) e il testo da copiare per l'assistente.",
    prova: [
      "Leggi l'elenco delle regole da verificare.",
      "Copia il testo per l'assistente: le regole cambiano solo dopo il tuo sì.",
    ],
    logica:
      'Il testo da copiare non contiene importi né residenza: le aliquote delle addizionali stanno solo nei tuoi dati.',
    link: [{ href: '/novita/', testo: 'Apri le novità' }],
  },
  {
    id: 'impostazioni',
    titolo: 'Impostazioni e sicurezza',
    spec: 'specifiche 002 e 003',
    cosa: 'Secondo fattore, codici di recupero, blocco per inattività, modalità prova e produzione, dati della partita IVA e attività, spese e consigli.',
    prova: [
      'Apri Sicurezza e controlla i codici di recupero.',
      "Lascia l'app ferma: si blocca e chiede di nuovo il codice.",
    ],
    logica:
      'Accesso ai dati solo dopo il secondo fattore. Nessun dato clinico: le fatture contengono solo ciò che serve alla fattura.',
    link: [{ href: '/impostazioni/', testo: 'Apri le impostazioni' }],
  },
];

// Tappe viste: su questo dispositivo, lette con useSyncExternalStore (niente setState negli effetti)
const CHIAVE = 'fiscal.tour';
const EVENTO = 'fiscal-tour';
const leggi = (): string => {
  try {
    return localStorage.getItem(CHIAVE) ?? '[]';
  } catch {
    return '[]';
  }
};
const iscrivi = (f: () => void) => {
  window.addEventListener(EVENTO, f);
  window.addEventListener('storage', f);
  return () => {
    window.removeEventListener(EVENTO, f);
    window.removeEventListener('storage', f);
  };
};
function scrivi(viste: string[]) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(viste));
  } catch {
    /* solo una comodità */
  }
  window.dispatchEvent(new Event(EVENTO));
}

const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  preparazione: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorBrandBackground2,
  },
  lista: {
    margin: 0,
    paddingLeft: tokens.spacingHorizontalXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  tappa: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    minWidth: 0,
  },
  testa: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  etichetta: {
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  nota: { color: tokens.colorNeutralForeground3 },
  logica: {
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    paddingLeft: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground2,
  },
  fila: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: `0 ${tokens.spacingHorizontalL}` },
});

export function Tour() {
  const s = useStili();
  const grezzo = useSyncExternalStore(iscrivi, leggi, () => '[]');
  let viste: string[] = [];
  try {
    viste = JSON.parse(grezzo) as string[];
  } catch {
    viste = [];
  }
  const segna = (id: string, vista: boolean) =>
    scrivi(vista ? [...new Set([...viste, id])] : viste.filter((x) => x !== id));
  const n = TAPPE.filter((t) => viste.includes(t.id)).length;

  return (
    <div className={s.colonna}>
      <Text>
        Dieci tappe nell&apos;ordine in cui userai Fiscal durante l&apos;anno. Spunta «Vista» man mano: il
        segno resta su questo dispositivo.
      </Text>
      <ProgressBar value={n / TAPPE.length} thickness="large" aria-label="Tappe viste" />
      <Text className={s.nota}>
        {n} {n === 1 ? 'tappa vista' : 'tappe viste'} su {TAPPE.length}
      </Text>

      <section className={s.preparazione} aria-labelledby="tour-prep">
        <Title3 as="h2" id="tour-prep">
          Prima di partire
        </Title3>
        <ol className={s.lista}>
          <li>
            <Text>
              In{' '}
              <Collegamento href="/impostazioni/modalita/" inLinea>
                Prova e produzione
              </Collegamento>{' '}
              carica i dati d&apos;esempio e imposta la data di prova al 22/11/2027.
            </Text>
          </li>
          <li>
            <Text>
              Inserisci una CU 2027 di prova in{' '}
              <Collegamento href="/tasse/dati/?anno=2027" inLinea>
                Dati dell&apos;anno
              </Collegamento>
              : senza CU salvadanaio, previsione ed esito non mostrano importi.
            </Text>
          </li>
          <li>
            <Text>
              L&apos;occhio in alto mostra o nasconde gli importi; accanto c&apos;è il tema chiaro o scuro.
            </Text>
          </li>
          <li>
            <Text>Alla fine cancella i dati di prova e togli la data di prova.</Text>
          </li>
        </ol>
      </section>

      {TAPPE.map((t, i) => (
        <section key={t.id} className={s.tappa} aria-labelledby={`tappa-${t.id}`}>
          <div className={s.testa}>
            <Title3 as="h2" id={`tappa-${t.id}`}>
              {i + 1} · {t.titolo}
            </Title3>
            <Text size={200} className={s.nota}>
              {t.spec}
            </Text>
          </div>
          <Text>{t.cosa}</Text>
          <Text size={200} className={s.etichetta}>
            Prova
          </Text>
          <ol className={s.lista}>
            {t.prova.map((p) => (
              <li key={p}>
                <Text>{p}</Text>
              </li>
            ))}
          </ol>
          <Text className={s.logica}>{t.logica}</Text>
          <div className={s.fila}>
            {t.link.map((l) => (
              <Collegamento key={l.href} href={l.href}>
                {l.testo}
              </Collegamento>
            ))}
            <Checkbox
              label="Vista"
              checked={viste.includes(t.id)}
              onChange={(_, d) => segna(t.id, d.checked === true)}
            />
          </div>
        </section>
      ))}
      <Text size={200} className={s.nota}>
        Ancora da fare: consenso informato dei pazienti e aiuto contestuale completo. Le stime non sostituiscono il
        commercialista.
      </Text>
    </div>
  );
}
