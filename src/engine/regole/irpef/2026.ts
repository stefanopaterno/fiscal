import {
  ACCONTI,
  ADDIZIONALI_SOLO_CON_IRPEF,
  DETRAZIONE_LAVORO,
  DIFFERIMENTO,
  RATEIZZAZIONE,
  SCADENZA_SALDO_ENPAP,
  SCAGLIONI_2026,
  ULTERIORE_DETRAZIONE,
  ULTERIORE_RAGGUAGLIATA,
} from './comuni';
import type { RegoleIrpef } from './tipi';

/** Regole IRPEF 2026 (anno senza partita IVA: serve per gli acconti 2027 e per i confronti). */
export const regoleIrpef2026: RegoleIrpef = {
  anno: 2026,
  scaglioni: SCAGLIONI_2026,
  detrazioneLavoro: DETRAZIONE_LAVORO,
  ulterioreDetrazione: ULTERIORE_DETRAZIONE,
  ulterioreRagguagliata: ULTERIORE_RAGGUAGLIATA,
  addizionaliSoloConIrpefDovuta: ADDIZIONALI_SOLO_CON_IRPEF,
  acconti: ACCONTI,
  rateizzazione: RATEIZZAZIONE,
  differimento: DIFFERIMENTO,
  enpap: {
    aliquotaSoggettivo: {
      valore: 0.11,
      fonte:
        "ENPAP, riforma approvata il 4/11/2026: «nel 2027 il minimo è pari all'11% … applicata con il saldo sui redditi 2026 con scadenza 1° ottobre 2027» (enpap.it)",
      stato: 'verificata',
    },
    aliquotaIntegrativo: {
      valore: 0.02,
      fonte: 'Regolamento ENPAP: integrativo 2% fino al 31/12/2026',
      stato: 'verificata',
    },
    minimoSoggettivo: {
      valore: 856_00,
      fonte: 'Contributo soggettivo minimo: 856 € è il valore ufficiale 2025 (istruzioni ENPAP mod. 2026); quello sui redditi 2026 non è ancora pubblicato',
      stato: 'da_verificare',
    },
    minimoIntegrativo: {
      valore: 66_00,
      fonte: 'Contributo integrativo minimo: 66 € è il valore ufficiale 2025 (istruzioni ENPAP mod. 2026); quello sui redditi 2026 non è ancora pubblicato',
      stato: 'da_verificare',
    },
    maternita: {
      valore: 130_00,
      fonte: 'Contributo di maternità: 130 € è il valore ufficiale 2025 (istruzioni ENPAP mod. 2026); quello 2026 non è ancora pubblicato',
      stato: 'da_verificare',
    },
    scadenzaSaldo: SCADENZA_SALDO_ENPAP,
  },
};
