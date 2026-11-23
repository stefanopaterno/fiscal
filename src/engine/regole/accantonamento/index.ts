import type { Regola } from '../tipi';

/** Regole dell'accantonamento per anno (specifica 007, FR-014, FR-015, research R-04). */
export type RegoleAccantonamento = {
  anno: number;
  /** Margine di sicurezza proposto nel primo anno (regole e dati provvisori). */
  marginePrimoAnno: Regola<number>;
  /** Ritenuta sugli interessi dei conti correnti e di deposito. */
  ritenutaInteressi: Regola<number>;
  /** Scadenze dell'anno dopo per IVA e bollo incassati (mese-giorno), approssimate. */
  scadenzeIvaBollo: Regola<string[]>;
};

const BASE: Omit<RegoleAccantonamento, 'anno'> = {
  marginePrimoAnno: {
    valore: 0.1,
    fonte: 'Scelta dell\'utente (chiarimento 2026-11-20 della specifica 007): 10% in più nel primo anno',
    stato: 'verificata',
  },
  ritenutaInteressi: {
    valore: 0.26,
    fonte: 'Art. 26 DPR 600/1973 come modificato dal DL 66/2014: ritenuta del 26% sugli interessi dei conti',
    stato: 'da_verificare',
  },
  scadenzeIvaBollo: {
    valore: ['05-31', '09-30', '11-30', '02-28'],
    fonte: 'Bollo virtuale sulle fatture elettroniche (DM 4/12/2020) e liquidazioni IVA trimestrali: date indicative',
    stato: 'da_verificare',
  },
};

export function regoleAccantonamento(anno: number): RegoleAccantonamento {
  return { anno, ...BASE };
}
