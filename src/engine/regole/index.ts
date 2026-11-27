import { memo, registroAttivo } from '../parametri/attivi';
import { anniNelRegistro, basePerAnno, risolviSet } from '../parametri/risolvi';
import { regole2026 } from './2026';
import { regole2027 } from './2027';
import type { RegoleFatturazione } from './tipi';

export type { Regola, RegoleFatturazione, StatoVerifica } from './tipi';

const PER_ANNO: Record<number, RegoleFatturazione> = { 2026: regole2026, 2027: regole2027 };

/** Set del programma per l'anno, senza aggiornamenti importati (specifica 014). */
export const baseFatturazione = (anno: number): RegoleFatturazione | undefined => PER_ANNO[anno];

/**
 * Regole di fatturazione dell'anno, con gli aggiornamenti approvati in vigore alla `data` della fattura
 * (AAAA-MM-GG; senza data: 1° gennaio dell'anno). Mai valori inventati: senza regole per l'anno, errore esplicito.
 */
export function regolePerAnno(anno: number, data?: string): RegoleFatturazione {
  const registro = registroAttivo();
  if (!registro.length) {
    const regole = PER_ANNO[anno];
    if (!regole) throw new Error(`Non ci sono ancora regole di fatturazione per il ${anno}.`);
    return regole;
  }
  return memo(`fatturazione|${anno}|${data ?? ''}`, () => {
    const b = basePerAnno(PER_ANNO, anno, 'fatturazione', registro);
    if (!b) throw new Error(`Non ci sono ancora regole di fatturazione per il ${anno}.`);
    return risolviSet('fatturazione', { anno, data }, b.base, registro, baseFatturazione).set;
  });
}

export const anniConRegole = (): number[] =>
  [...new Set([...Object.keys(PER_ANNO).map(Number), ...anniNelRegistro('fatturazione', registroAttivo())])].sort();
