import type { Regola, RegoleFatturazione } from './tipi';

/** Regole che non cambiano tra 2026 e 2027 (research R-01 della specifica 003). */
export const IVA_ORDINARIA: Regola<number> = {
  valore: 0.22,
  fonte: 'DPR 633/1972, art. 16',
  stato: 'verificata',
};

export const SOGLIA_BOLLO: Regola<number> = {
  valore: 7747,
  fonte: 'DPR 642/1972, Tariffa parte I, art. 13 (importi oltre 77,47 €)',
  stato: 'verificata',
};

export const IMPORTO_BOLLO: Regola<number> = {
  valore: 200,
  fonte: 'DPR 642/1972, Tariffa parte I, art. 13 (2,00 €)',
  stato: 'verificata',
};

export const RITENUTA_ACCONTO: Regola<number> = {
  valore: 0.2,
  fonte: 'DPR 600/1973, art. 25',
  stato: 'verificata',
};

export const INTEGRATIVO_FUORI_RITENUTA: Regola<boolean> = {
  valore: true,
  fonte:
    'Regolamento ENPAP per le attività di previdenza, art. 4 c. 4: «Il contributo integrativo non è soggetto a ritenuta di acconto IRPEF e non concorre alla formazione del reddito imponibile»',
  stato: 'verificata',
};

export const DICITURE: RegoleFatturazione['diciture'] = {
  esenzione: "Operazione esente da IVA ai sensi dell'art. 10, comma 1, n. 18 del DPR 633/1972",
  bollo: "Imposta di bollo di 2,00 € ai sensi dell'art. 13 della Tariffa allegata al DPR 642/1972",
  opposizioneSts:
    'Opposizione del paziente alla trasmissione dei dati al Sistema Tessera Sanitaria (art. 3 DM 31/07/2015)',
};
