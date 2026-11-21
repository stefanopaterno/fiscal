import { regole2026 } from './2026';
import { regole2027 } from './2027';
import type { RegoleFatturazione } from './tipi';

export type { Regola, RegoleFatturazione, StatoVerifica } from './tipi';

const PER_ANNO: Record<number, RegoleFatturazione> = { 2026: regole2026, 2027: regole2027 };

/** Regole di fatturazione dell'anno. Mai valori inventati: senza regole per l'anno, errore esplicito. */
export function regolePerAnno(anno: number): RegoleFatturazione {
  const regole = PER_ANNO[anno];
  if (!regole) throw new Error(`Non ci sono ancora regole di fatturazione per il ${anno}.`);
  return regole;
}

export const anniConRegole = (): number[] => Object.keys(PER_ANNO).map(Number).sort();
