import {
  DICITURE,
  IMPORTO_BOLLO,
  INTEGRATIVO_FUORI_RITENUTA,
  IVA_ORDINARIA,
  RITENUTA_ACCONTO,
  SOGLIA_BOLLO,
} from './comuni';
import type { RegoleFatturazione } from './tipi';

/** Regole di fatturazione 2026 (per confronti e simulazioni: la partita IVA parte nel 2027). */
export const regole2026: RegoleFatturazione = {
  anno: 2026,
  aliquotaIntegrativo: {
    valore: 0.02,
    fonte: 'Regolamento ENPAP, contributo integrativo 2% fino al 2026',
    stato: 'da_verificare',
  },
  aliquotaIva: IVA_ORDINARIA,
  sogliaBollo: SOGLIA_BOLLO,
  importoBollo: IMPORTO_BOLLO,
  aliquotaRitenuta: RITENUTA_ACCONTO,
  integrativoFuoriRitenuta: INTEGRATIVO_FUORI_RITENUTA,
  diciture: DICITURE,
};
