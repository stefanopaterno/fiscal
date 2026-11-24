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
  data: '2026-11-23',
  fonti: [
    'Gazzetta Ufficiale',
    'Agenzia delle Entrate',
    'Dipartimento delle Finanze (addizionali regionali e comunali)',
    'ENPAP',
    'Parlamento (Legge di Bilancio 2027)',
  ],
  esito: 'Nessuna nuova norma pubblicata; restano aperte la Legge di Bilancio 2027 e le cifre ENPAP 2027.',
};

export const NOTIZIE: Notizia[] = [
  {
    id: '2026-11-bilancio-2027',
    data: '2026-11-23',
    titolo: 'Legge di Bilancio 2027: IRPEF al 33% fino a 55.000 €',
    cosaCambia:
      'Il disegno di legge estende lo scaglione del 33% da 50.000 a 55.000 € per il solo 2027. Fiscal usa già questo valore per il 2027, segnato «da verificare».',
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
    titolo: 'ENPAP 2027: minimi e maternità non ancora pubblicati',
    cosaCambia:
      'Per il 2027 mancano contributo minimo soggettivo, minimo integrativo e maternità. Il soggettivo al 12% sui redditi 2027 viene dalla riforma approvata e attende la conferma definitiva.',
    daQuando: 'Contributi sui redditi 2027 (saldo nel 2028)',
    stato: 'approvata',
    fonti: [{ nome: 'ENPAP: contribuzione', url: 'https://www.enpap.it/', ufficiale: true }],
    regole: ['IRPEF ed ENPAP 2027 · enpap'],
    impatto: 'Cambia di poco i contributi ENPAP e quindi la quota da mettere da parte a ogni incasso.',
    tiRiguarda: true,
    proposta: {
      descrizione: 'Alla pubblicazione delle cifre 2027: inserire i minimi e la maternità e segnarli «verificati».',
      stato: 'in_attesa',
    },
  },
];
