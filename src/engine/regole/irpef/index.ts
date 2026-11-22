import { regoleIrpef2026 } from './2026';
import { regoleIrpef2027 } from './2027';
import type { RegoleIrpef } from './tipi';

export type * from './tipi';

const PER_ANNO: Record<number, RegoleIrpef> = { 2026: regoleIrpef2026, 2027: regoleIrpef2027 };

/** Errore del motore IRPEF con messaggio in italiano da mostrare all'utente. */
export class ErroreIrpef extends Error {}

/** Regole IRPEF dell'anno. Senza regole per l'anno: errore, mai le regole di un altro anno (FR-017). */
export function regoleIrpefPerAnno(anno: number): RegoleIrpef {
  const regole = PER_ANNO[anno];
  if (!regole)
    throw new ErroreIrpef(`Non ci sono ancora le regole IRPEF per il ${anno}: il calcolo non è possibile.`);
  return regole;
}

export const anniConRegoleIrpef = (): number[] =>
  Object.keys(PER_ANNO)
    .map(Number)
    .sort((a, b) => a - b);
