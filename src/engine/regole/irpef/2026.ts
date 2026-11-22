import {
  ACCONTI,
  ADDIZIONALI_SOLO_CON_IRPEF,
  DETRAZIONE_LAVORO,
  DIFFERIMENTO,
  RATEIZZAZIONE,
  SCADENZA_SALDO_ENPAP,
  SCAGLIONI_2026,
  ULTERIORE_DETRAZIONE,
  ULTERIORE_NON_RAGGUAGLIATA,
} from './comuni';
import type { RegoleIrpef } from './tipi';

/** Regole IRPEF 2026 (anno senza partita IVA: serve per gli acconti 2027 e per i confronti). */
export const regoleIrpef2026: RegoleIrpef = {
  anno: 2026,
  scaglioni: SCAGLIONI_2026,
  detrazioneLavoro: DETRAZIONE_LAVORO,
  ulterioreDetrazione: ULTERIORE_DETRAZIONE,
  ulterioreRagguagliata: ULTERIORE_NON_RAGGUAGLIATA,
  addizionaliSoloConIrpefDovuta: ADDIZIONALI_SOLO_CON_IRPEF,
  acconti: ACCONTI,
  rateizzazione: RATEIZZAZIONE,
  differimento: DIFFERIMENTO,
  enpap: {
    aliquotaSoggettivo: {
      valore: 0.11,
      fonte: 'ENPAP, riforma approvata: 11% applicato con il saldo sui redditi 2026 (scadenza 1/10/2027)',
      stato: 'verificata',
    },
    aliquotaIntegrativo: {
      valore: 0.02,
      fonte: 'Regolamento ENPAP: integrativo 2% fino al 31/12/2026',
      stato: 'verificata',
    },
    minimoSoggettivo: {
      valore: 856_00,
      fonte: 'Contributo soggettivo minimo 2026 (fonte divulgativa, da riscontrare su enpap.it)',
      stato: 'da_verificare',
    },
    minimoIntegrativo: {
      valore: 66_00,
      fonte: 'Contributo integrativo minimo 2026 (fonte divulgativa, da riscontrare su enpap.it)',
      stato: 'da_verificare',
    },
    maternita: {
      valore: 130_00,
      fonte: 'Contributo di maternità 2026 circa 130 € (fonte divulgativa, da riscontrare su enpap.it)',
      stato: 'da_verificare',
    },
    scadenzaSaldo: SCADENZA_SALDO_ENPAP,
  },
};
