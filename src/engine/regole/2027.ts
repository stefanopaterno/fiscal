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
 * TODO(ENPAP_2027) nella costituzione: confermare con ENPAP la decorrenza del 4%.
 */
export const regole2027: RegoleFatturazione = {
  anno: 2027,
  aliquotaIntegrativo: {
    valore: 0.04,
    fonte: 'Regolamento ENPAP, contributo integrativo 4% dal 2027',
    stato: 'da_verificare',
  },
  aliquotaIva: IVA_ORDINARIA,
  sogliaBollo: SOGLIA_BOLLO,
  importoBollo: IMPORTO_BOLLO,
  aliquotaRitenuta: RITENUTA_ACCONTO,
  integrativoFuoriRitenuta: INTEGRATIVO_FUORI_RITENUTA,
  diciture: DICITURE,
};
