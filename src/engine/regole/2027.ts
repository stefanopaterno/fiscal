import {
  DICITURE,
  IMPORTO_BOLLO,
  INTEGRATIVO_FUORI_RITENUTA,
  IVA_ORDINARIA,
  RITENUTA_ACCONTO,
  SOGLIA_BOLLO,
} from './comuni';
import type { RegoleFatturazione } from './tipi';

/**
 * Regole di fatturazione 2027 (primo anno della partita IVA).
 * Integrativo 4% dal 1° gennaio 2027 approvato dai Ministeri vigilanti (notizia ENPAP del 10/11/2026).
 */
export const regole2027: RegoleFatturazione = {
  anno: 2027,
  aliquotaIntegrativo: {
    valore: 0.04,
    fonte:
      'ENPAP, riforma approvata dai Ministeri vigilanti: integrativo dal 2% al 4% dal 1° gennaio 2027 (enpap.it, 10/11/2026)',
    stato: 'verificata',
  },
  aliquotaIva: IVA_ORDINARIA,
  sogliaBollo: SOGLIA_BOLLO,
  importoBollo: IMPORTO_BOLLO,
  aliquotaRitenuta: RITENUTA_ACCONTO,
  integrativoFuoriRitenuta: INTEGRATIVO_FUORI_RITENUTA,
  diciture: DICITURE,
};
