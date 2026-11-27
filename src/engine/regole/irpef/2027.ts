import {
  ACCONTI,
  ADDIZIONALI_SOLO_CON_IRPEF,
  DETRAZIONE_LAVORO,
  DIFFERIMENTO,
  RATEIZZAZIONE,
  SCADENZA_SALDO_ENPAP,
  ULTERIORE_DETRAZIONE,
  ULTERIORE_RAGGUAGLIATA,
} from './comuni';
import type { RegoleIrpef } from './tipi';

/**
 * Regole IRPEF 2027, primo anno della partita IVA (research R-01, R-07).
 * Scaglioni del DDL di Bilancio 2027 (33% fino a 55.000 €, solo per il 2027): non ancora legge.
 */
export const regoleIrpef2027: RegoleIrpef = {
  anno: 2027,
  scaglioni: {
    valore: [
      { finoA: 28_000_00, aliquota: 0.23 },
      { finoA: 55_000_00, aliquota: 0.33 },
      { finoA: null, aliquota: 0.43 },
    ],
    fonte:
      'DDL di Bilancio 2027 (Consiglio dei ministri del 28/10/2026), al 27/11/2026 ancora all\'esame della Camera: 33% esteso fino a 55.000 € per il solo 2027. Se non passa vale l\'art. 11 del nuovo TUIR (33% fino a 50.000 €)',
    stato: 'da_verificare',
  },
  detrazioneLavoro: DETRAZIONE_LAVORO,
  ulterioreDetrazione: ULTERIORE_DETRAZIONE,
  ulterioreRagguagliata: ULTERIORE_RAGGUAGLIATA,
  addizionaliSoloConIrpefDovuta: ADDIZIONALI_SOLO_CON_IRPEF,
  acconti: ACCONTI,
  rateizzazione: RATEIZZAZIONE,
  differimento: DIFFERIMENTO,
  enpap: {
    aliquotaSoggettivo: {
      valore: 0.12,
      fonte:
        "ENPAP, riforma approvata dai Ministeri vigilanti il 4/11/2026: minimo +1 punto l'anno dal 2027 (11% con il saldo sui redditi 2026, scadenza 1/10/2027) ⇒ 12% sui redditi 2027 (enpap.it, notizia del novembre 2026)",
      stato: 'verificata',
    },
    aliquotaIntegrativo: {
      valore: 0.04,
      fonte:
        'ENPAP, riforma approvata dai Ministeri vigilanti: integrativo 4% dal 1° gennaio 2027 (enpap.it, 10/11/2026)',
      stato: 'verificata',
    },
    minimoSoggettivo: {
      valore: null,
      fonte: 'Minimo 2027 non ancora pubblicato da ENPAP (e agevolazioni per i nuovi iscritti da verificare)',
      stato: 'da_verificare',
    },
    minimoIntegrativo: {
      valore: null,
      fonte: 'Minimo integrativo 2027 non ancora pubblicato da ENPAP',
      stato: 'da_verificare',
    },
    maternita: {
      valore: null,
      fonte: 'Contributo di maternità 2027 non ancora pubblicato da ENPAP',
      stato: 'da_verificare',
    },
    scadenzaSaldo: SCADENZA_SALDO_ENPAP,
  },
};
