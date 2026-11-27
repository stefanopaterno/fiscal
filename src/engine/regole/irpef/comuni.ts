import type { Regola } from '../tipi';
import type {
  ParametriAcconti,
  ParametriDetrazioneLavoro,
  ParametriDifferimento,
  ParametriRateizzazione,
  ParametriUlterioreDetrazione,
  Scaglione,
} from './tipi';

/** Valori uguali nel 2026 e nel 2027 (research R-01..R-06). Ogni anno li richiama esplicitamente. */

export const SCAGLIONI_2026: Regola<Scaglione[]> = {
  valore: [
    { finoA: 28_000_00, aliquota: 0.23 },
    { finoA: 50_000_00, aliquota: 0.33 },
    { finoA: null, aliquota: 0.43 },
  ],
  fonte:
    'Art. 11 TUIR come modificato dalla L. 199/2025 (Legge di Bilancio 2026), art. 1 c. 3: 23% fino a 28.000 €, 33% fino a 50.000 €, 43% oltre; confermato dall\'art. 11 del nuovo TUIR (D.Lgs. 117/2026). Verifica del 27/11/2026',
  stato: 'verificata',
};

export const DETRAZIONE_LAVORO: Regola<ParametriDetrazioneLavoro> = {
  valore: {
    importoFisso: 1_955_00,
    primaSoglia: 15_000_00,
    base: 1_910_00,
    aggiunta: 1_190_00,
    secondaSoglia: 28_000_00,
    terzaSoglia: 50_000_00,
    maggiorazione: { importo: 65_00, oltre: 25_000_00, finoA: 35_000_00 },
  },
  fonte:
    'Art. 13 c. 1 e 1.1 TUIR (importo di 1.955 € dalla L. 207/2024, art. 1 c. 2); stessi valori nell\'art. 13 c. 1 del nuovo TUIR (D.Lgs. 117/2026, dal 2027). Verifica del 27/11/2026 su Normattiva e Gazzetta',
  stato: 'verificata',
};

export const ULTERIORE_DETRAZIONE: Regola<ParametriUlterioreDetrazione> = {
  valore: { importo: 1_000_00, oltre: 20_000_00, pienaFinoA: 32_000_00, azzeraA: 40_000_00 },
  fonte:
    'Art. 1 c. 6 L. 207/2024 (fino al 2026); dal 2027 art. 13 c. 10 del nuovo TUIR (D.Lgs. 117/2026): 1.000 € tra 20.000 e 32.000 €, poi a scalare fino a 40.000 €, rapportata al periodo di lavoro. Verifica del 27/11/2026',
  stato: 'verificata',
};

export const ULTERIORE_RAGGUAGLIATA: Regola<boolean> = {
  valore: true,
  fonte:
    'Istruzioni CU 2026 (Agenzia delle Entrate), punto 368: l\'ulteriore detrazione "deve essere rapportata al periodo di lavoro nell\'anno"',
  stato: 'verificata',
};

export const ADDIZIONALI_SOLO_CON_IRPEF: Regola<boolean> = {
  valore: true,
  fonte: 'Art. 50 c. 2 D.Lgs. 446/1997 (regionale) e D.Lgs. 360/1998 (comunale)',
  stato: 'verificata',
};

export const ACCONTI: Regola<ParametriAcconti> = {
  valore: {
    percentuale: 1,
    sogliaNonDovuto: 51_65,
    sogliaUnicaSoluzione: 257_52,
    primaRata: { nonIsa: 0.4, isa: 0.5 },
    addizionaleComunale: 0.3,
    mesePrimo: 6,
    meseSecondo: 11,
    conScaglioniPrecedenti: false,
  },
  fonte:
    'Art. 17 DPR 435/2001 e istruzioni Modello Redditi PF: 100% del rigo "differenza", soglie 51,65 e 257,52 €, 40/60 non ISA e 50/50 ISA; acconto addizionale comunale 30% (art. 1 c. 4 D.Lgs. 360/1998)',
  stato: 'da_verificare',
};

export const RATEIZZAZIONE: Regola<ParametriRateizzazione> = {
  valore: {
    maxRate: 7,
    interessiPerRata: [0, 0.0018, 0.0051, 0.0084, 0.0117, 0.015, 0.0183],
  },
  fonte:
    'Art. 20 D.Lgs. 241/1997: rate mensili con interessi 4% annuo; tabella delle rate per i titolari di partita IVA (scadenza il 16 di ogni mese)',
  stato: 'da_verificare',
};

export const DIFFERIMENTO: Regola<ParametriDifferimento> = {
  valore: { maggiorazione: 0.004, giorni: 30 },
  fonte: 'Art. 17 c. 2 DPR 435/2001: versamento nei 30 giorni successivi con maggiorazione dello 0,40%',
  stato: 'da_verificare',
};

export const SCADENZA_SALDO_ENPAP: Regola<string> = {
  valore: '10-01',
  fonte:
    "ENPAP: saldo sui redditi dell'anno con scadenza il 1° ottobre dell'anno dopo (enpap.it, 10/11/2026)",
  stato: 'verificata',
};
