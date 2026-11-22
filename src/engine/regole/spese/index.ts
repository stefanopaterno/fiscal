import { ErroreIrpef } from '../irpef';
import { BENI, CATEGORIE, ONERI, SCADENZA, TETTO_16TER } from './comuni';
import type { RegoleSpese } from './tipi';

export type * from './tipi';

/** 2026 e 2027 usano le stesse regole (D.Lgs. 192/2024 e L. 207/2024); ogni anno è un set distinto. */
const PER_ANNO: Record<number, RegoleSpese> = {
  2026: {
    anno: 2026,
    categorie: CATEGORIE,
    beni: BENI,
    oneri: ONERI,
    tetto16ter: TETTO_16TER,
    scadenza: SCADENZA,
  },
  2027: {
    anno: 2027,
    categorie: CATEGORIE,
    beni: BENI,
    oneri: ONERI,
    tetto16ter: TETTO_16TER,
    scadenza: SCADENZA,
  },
};

export function regoleSpesePerAnno(anno: number): RegoleSpese {
  const r = PER_ANNO[anno];
  if (!r) throw new ErroreIrpef(`Non ci sono ancora le regole delle spese per il ${anno}.`);
  return r;
}

export const categoria = (r: RegoleSpese, codice: string) => r.categorie.find((c) => c.codice === codice);
export const voceOnere = (r: RegoleSpese, codice: string) => r.oneri.find((o) => o.codice === codice);

export const anniConRegoleSpese = (): number[] =>
  Object.keys(PER_ANNO)
    .map(Number)
    .sort((a, b) => a - b);
