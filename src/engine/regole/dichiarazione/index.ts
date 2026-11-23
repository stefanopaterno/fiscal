import type { Regola } from '../tipi';

/**
 * Riferimenti per la dichiarazione (specifica 004, FR-028, FR-014): dove trovare nel 730 i dati dell'anno di
 * partenza e come si chiamano i quadri del Modello Redditi nel riepilogo. Nomi dei righi presi dal prospetto
 * di liquidazione (modello 730-3): la numerazione cambia di anno in anno, per questo si indica il nome.
 */
export type CampoPartenza = 'imposta_netta' | 'differenza' | 'acconti_trattenuti' | 'credito' | 'debito' | 'rimborso_in_busta';

export type Guida = { etichetta: string; dove: string; esempio: string };

export const GUIDA_730: Record<CampoPartenza, Regola<Guida>> = {
  imposta_netta: {
    valore: {
      etichetta: 'Imposta netta',
      dove: 'Modello 730-3 (prospetto di liquidazione), colonna «Dichiarante», rigo «Imposta netta».',
      esempio: 'Per esempio 12.000,00.',
    },
    fonte: 'Istruzioni modello 730/2026, prospetto di liquidazione 730-3',
    stato: 'da_verificare',
  },
  differenza: {
    valore: {
      etichetta: 'Differenza',
      dove: 'Modello 730-3, rigo «Differenza» (imposta netta meno ritenute e acconti): se è zero o negativa, nel 2027 non ci sono acconti da pagare.',
      esempio: 'Spesso 0 per chi ha solo lo stipendio.',
    },
    fonte: 'Istruzioni modello 730/2026, prospetto di liquidazione 730-3',
    stato: 'da_verificare',
  },
  acconti_trattenuti: {
    valore: {
      etichetta: "Acconti IRPEF per l'anno dopo trattenuti in busta paga",
      dove: 'Modello 730-3, righi «Primo acconto IRPEF» e «Secondo o unico acconto IRPEF»: somma i due importi.',
      esempio: 'Se i righi sono vuoti, scrivi 0.',
    },
    fonte: 'Istruzioni modello 730/2026, prospetto di liquidazione 730-3',
    stato: 'da_verificare',
  },
  credito: {
    valore: {
      etichetta: 'Credito IRPEF',
      dove: 'Modello 730-3, rigo «IRPEF da rimborsare» (o «credito») della colonna «Dichiarante».',
      esempio: 'Per esempio 300,00, rimborsato in busta paga a luglio.',
    },
    fonte: 'Istruzioni modello 730/2026, prospetto di liquidazione 730-3',
    stato: 'da_verificare',
  },
  debito: {
    valore: {
      etichetta: 'Debito IRPEF',
      dove: 'Modello 730-3, rigo «IRPEF da trattenere».',
      esempio: 'Trattenuto in busta paga da luglio.',
    },
    fonte: 'Istruzioni modello 730/2026, prospetto di liquidazione 730-3',
    stato: 'da_verificare',
  },
  rimborso_in_busta: {
    valore: {
      etichetta: 'Rimborso o trattenuta già fatti in busta paga',
      dove: 'Nella CU dell\'anno dopo, sezione «Assistenza fiscale»: rimborsi e trattenute del 730; oppure nella busta paga di luglio–agosto.',
      esempio: 'Sì, se a luglio hai visto la voce «rimborso 730».',
    },
    fonte: 'Istruzioni CU 2026, sezione assistenza fiscale',
    stato: 'da_verificare',
  },
};

/** Quadri del Modello Redditi Persone Fisiche usati nel riepilogo (FR-014). */
export const QUADRI: Regola<Record<string, string>> = {
  valore: {
    RC: 'Redditi di lavoro dipendente',
    RE: 'Redditi di lavoro autonomo (arti e professioni)',
    RP: 'Oneri e spese',
    RN: 'Determinazione dell\'IRPEF',
    RV: 'Addizionali regionale e comunale',
    RR: 'Contributi previdenziali (cassa professionale)',
    RX: 'Compensazioni e rimborsi',
    acconti: 'Acconti per l\'anno dopo',
  },
  fonte: 'Modello Redditi Persone Fisiche, fascicoli 1–3 (Agenzia delle Entrate)',
  stato: 'verificata',
};
