/**
 * Novità normative (specifica 012). Le scrive l'assistente dopo ogni controllo delle fonti ufficiali e
 * arrivano nell'app con la pubblicazione, come ogni altra regola. SOLO informazioni pubbliche: norme,
 * fonti, regole dell'app. Niente dati personali (regione, comune, importi dell'utente) in questo file:
 * il repository è pubblico. Le aliquote delle addizionali dell'utente stanno nel database.
 *
 * Stato: in_vigore (pubblicata), approvata (approvata ma non ancora pubblicata), proposta (in discussione).
 * Proposta di aggiornamento: in_attesa finché l'utente non dice sì; applicata o rifiutata dopo.
 */
import type { RegoleIrpef } from '../irpef';

export type Fonte = { nome: string; url: string; ufficiale: boolean };

export type Notizia = {
  id: string;
  /** Data in cui la novità è entrata nell'elenco. */
  data: string;
  titolo: string;
  cosaCambia: string;
  daQuando: string;
  stato: 'in_vigore' | 'approvata' | 'proposta';
  fonti: Fonte[];
  /** Regole dell'app toccate (percorso come nell'elenco delle regole da verificare). */
  regole: string[];
  /** Effetto in generale; quello sui conti dell'utente si vede nel simulatore. */
  impatto: string;
  /** Riguarda chi è psicologo in regime ordinario con lavoro dipendente? Se no, il motivo. */
  tiRiguarda: true | string;
  proposta: { descrizione: string; stato: 'in_attesa' | 'applicata' | 'rifiutata'; decisaIl?: string } | null;
  /**
   * Simulazione dell'impatto sui conti dell'utente (T006): le regole dell'anno con la modifica alternativa. Il
   * confronto si fa nel browser con i dati dell'utente, che non lasciano mai l'app.
   */
  simulazione?: {
    anno: number;
    /** Cosa rappresenta l'alternativa rispetto alle regole in uso (es. «se la norma non passa»). */
    alternativa: string;
    applica: (r: RegoleIrpef) => RegoleIrpef;
  };
};

/** Ultimo controllo delle fonti fatto dall'assistente (FR-001, FR-013). */
export const ULTIMO_CONTROLLO = {
  data: '2026-11-27',
  fonti: [
    'Gazzetta Ufficiale',
    'Agenzia delle Entrate',
    'Dipartimento delle Finanze (addizionali regionali e comunali)',
    'ENPAP',
    'Parlamento (Legge di Bilancio 2027)',
    'Normattiva e nuovo TUIR (D.Lgs. 117/2026)',
    'ISTAT (ATECO 2025)',
  ],
  esito:
    'Verifica completa delle regole «da verificare»: confermati scaglioni 2026, detrazioni, codici F24, ATECO, regole ENPAP e spese; corretti invio annuale alla Tessera Sanitaria, ammortamento dimezzato nel primo anno e soglia dei beni a 516,40 €; aggiunto l\'acconto ENPAP. Restano aperte la Legge di Bilancio 2027 e le cifre ENPAP 2026-2027.',
};

export const NOTIZIE: Notizia[] = [
  {
    id: '2026-11-bilancio-2027',
    data: '2026-11-23',
    titolo: 'Legge di Bilancio 2027: IRPEF al 33% fino a 55.000 €',
    cosaCambia:
      'Il disegno di legge estende lo scaglione del 33% da 50.000 a 55.000 € per il solo 2027. Al 27/11/2026 è ancora all\'esame della Camera. Fiscal usa già questo valore per il 2027, segnato «da verificare».',
    daQuando: 'Redditi 2027, se approvata entro il 31 dicembre 2026',
    stato: 'proposta',
    fonti: [{ nome: 'Disegno di legge di Bilancio 2027 (Camera e Senato)', url: 'https://www.senato.it/', ufficiale: true }],
    regole: ['IRPEF ed ENPAP 2027 · scaglioni'],
    simulazione: {
      anno: 2027,
      alternativa: 'se la norma non venisse approvata (33% solo fino a 50.000 €)',
      applica: (r) => ({
        ...r,
        scaglioni: {
          ...r.scaglioni,
          valore: r.scaglioni.valore.map((x) => (x.finoA === 55_000_00 ? { ...x, finoA: 50_000_00 } : x)),
        },
      }),
    },
    impatto:
      'Chi ha un imponibile tra 50.000 e 55.000 € paga il 10% in meno su quella fascia: fino a 500 € in meno sul 2027.',
    tiRiguarda: true,
    proposta: {
      descrizione:
        'Alla pubblicazione in Gazzetta: segnare gli scaglioni 2027 come «verificati» con la fonte; se il testo finale è diverso, aggiornare i valori e i casi di prova.',
      stato: 'in_attesa',
    },
  },
  {
    id: '2026-11-enpap-2027',
    data: '2026-11-23',
    titolo: 'ENPAP: minimi e maternità 2026 e 2027 non ancora pubblicati',
    cosaCambia:
      'La riforma è approvata (Ministeri, 4/11/2026): soggettivo minimo all\'11% sui redditi 2026 e al 12% sui redditi 2027, integrativo al 4% in fattura dal 1° gennaio 2027. Mancano ancora i minimi e la maternità: per il 2026 Fiscal usa i valori ufficiali del 2025 (856 €, 66 €, 130 €).',
    daQuando: 'Contributi sui redditi 2027 (saldo nel 2028)',
    stato: 'approvata',
    fonti: [
      { nome: 'ENPAP: approvata la riforma della previdenza', url: 'https://www.enpap.it/news/2026/11/approvata-la-riforma-della-previdenza-le-novita-dal-1-gennaio-2027/', ufficiale: true },
    ],
    regole: ['IRPEF ed ENPAP 2027 · enpap'],
    impatto: 'Cambia di poco i contributi ENPAP e quindi la quota da mettere da parte a ogni incasso.',
    tiRiguarda: true,
    proposta: {
      descrizione: 'Alla pubblicazione delle cifre 2027: inserire i minimi e la maternità e segnarli «verificati».',
      stato: 'in_attesa',
    },
  },
  {
    id: '2026-11-sts-annuale',
    data: '2026-11-27',
    titolo: 'Tessera Sanitaria: invio una volta l\'anno',
    cosaCambia:
      'Dal 2025 le spese sanitarie si inviano al Sistema Tessera Sanitaria una volta l\'anno, entro il 31 gennaio dell\'anno dopo (non più ogni mese). Fiscal ora ha una sola scadenza annuale.',
    daQuando: 'Spese dal 2025 in poi (per il 2027: entro il 31 gennaio 2028)',
    stato: 'in_vigore',
    fonti: [{ nome: 'DM MEF 29/10/2025, Gazzetta Ufficiale n. 261 del 10/11/2025', url: 'https://www.gazzettaufficiale.it/eli/gu/2025/11/10/261/sg/pdf', ufficiale: true }],
    regole: ['Scadenze · Tessera Sanitaria'],
    impatto: 'Nessun importo: cambia solo il calendario. Puoi comunque inviare man mano.',
    tiRiguarda: true,
    proposta: { descrizione: 'Sostituite le 12 scadenze mensili con una scadenza annuale.', stato: 'applicata', decisaIl: '2026-11-27' },
  },
  {
    id: '2026-11-beni-primo-anno',
    data: '2026-11-27',
    titolo: 'Beni strumentali: metà quota il primo anno, soglia 516,40 €',
    cosaCambia:
      'Per i professionisti l\'ammortamento del primo anno è ridotto alla metà e la deduzione immediata vale per i beni fino a 516,40 € (516,46 € è la soglia delle imprese).',
    daQuando: 'Dal 2025 (D.Lgs. 192/2024); confermato nel nuovo TUIR dal 2027',
    stato: 'in_vigore',
    fonti: [{ nome: 'D.Lgs. 117/2026 (nuovo TUIR), art. 60', url: 'https://www.gazzettaufficiale.it/', ufficiale: true }],
    regole: ['Spese 2026 e 2027 · beni'],
    impatto: 'Un computer da 1.500 € si deduce 150 € il primo anno invece di 300 €; il resto negli anni dopo.',
    tiRiguarda: true,
    proposta: { descrizione: 'Applicato nelle regole delle spese.', stato: 'applicata', decisaIl: '2026-11-27' },
  },
  {
    id: '2026-11-enpap-acconto',
    data: '2026-11-27',
    titolo: 'ENPAP: acconto del 1° marzo dal secondo anno',
    cosaCambia:
      'Ogni anno c\'è un acconto dei contributi ENPAP entro il 1° marzo, calcolato nell\'area riservata ENPAP. Il primo anno non è dovuto: la prima scadenza è il saldo del 1° ottobre dell\'anno dopo.',
    daQuando: 'Dal secondo anno di attività',
    stato: 'in_vigore',
    fonti: [{ nome: 'Regolamento ENPAP per le attività di previdenza, art. 7', url: 'https://www.enpap.it/DOC/REGOLAMENTOATTUAZIONEATTIVITAPREVIDENZA.PDF', ufficiale: true }],
    regole: ['Scadenze · enpap_acconto'],
    impatto: 'Una parte dei contributi si anticipa a marzo: conviene averla nel salvadanaio.',
    tiRiguarda: true,
    proposta: { descrizione: 'Aggiunta la scadenza nel calendario (senza importo: lo calcola ENPAP).', stato: 'applicata', decisaIl: '2026-11-27' },
  },
  {
    id: '2026-11-nuovo-tuir',
    data: '2026-11-27',
    titolo: 'Nuovo Testo unico delle imposte sui redditi dal 2027',
    cosaCambia:
      'Il D.Lgs. 117/2026 riscrive il TUIR con una nuova numerazione degli articoli. I valori usati da Fiscal (scaglioni, detrazioni, spese del professionista) restano gli stessi; cambiano i riferimenti agli articoli.',
    daQuando: 'Dal 1° gennaio 2027',
    stato: 'in_vigore',
    fonti: [{ nome: 'D.Lgs. 19 giugno 2026, n. 117', url: 'https://www.gazzettaufficiale.it/', ufficiale: true }],
    regole: ['IRPEF e spese 2027'],
    impatto: 'Nessun cambio di importi: solo i riferimenti normativi.',
    tiRiguarda: true,
    proposta: null,
  },
];
