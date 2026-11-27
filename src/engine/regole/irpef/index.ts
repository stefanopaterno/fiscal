import { memo, registroAttivo } from '../../parametri/attivi';
import { anniNelRegistro, basePerAnno, risolviSet } from '../../parametri/risolvi';
import { regolePerAnno } from '../index';
import { regoleIrpef2026 } from './2026';
import { regoleIrpef2027 } from './2027';
import type { RegoleIrpef } from './tipi';

export type * from './tipi';

const PER_ANNO: Record<number, RegoleIrpef> = { 2026: regoleIrpef2026, 2027: regoleIrpef2027 };

/** Errore del motore IRPEF con messaggio in italiano da mostrare all'utente. */
export class ErroreIrpef extends Error {}

/** Set del programma per l'anno, senza aggiornamenti importati (specifica 014). */
export const baseIrpef = (anno: number): RegoleIrpef | undefined => PER_ANNO[anno];

/**
 * Regole IRPEF dell'anno con gli aggiornamenti approvati (specifica 014). Senza regole per l'anno: errore,
 * mai le regole di un altro anno (FR-017 della 001); un anno senza set è disponibile solo se l'utente ha
 * importato voci per quell'anno, e allora i valori riportati sono «da verificare».
 */
export function regoleIrpefPerAnno(anno: number): RegoleIrpef {
  const registro = registroAttivo();
  if (!registro.length) {
    const regole = PER_ANNO[anno];
    if (!regole)
      throw new ErroreIrpef(`Non ci sono ancora le regole IRPEF per il ${anno}: il calcolo non è possibile.`);
    return regole;
  }
  return memo(`irpef|${anno}`, () => {
    const b = basePerAnno(PER_ANNO, anno, 'irpef', registro);
    if (!b) throw new ErroreIrpef(`Non ci sono ancora le regole IRPEF per il ${anno}: il calcolo non è possibile.`);
    const set = risolviSet('irpef', { anno }, b.base, registro, baseIrpef).set;
    // L'integrativo ENPAP segue il parametro di fatturazione in vigore al 1° gennaio (research.md R-03)
    try {
      const integrativo = regolePerAnno(anno, `${anno}-01-01`).aliquotaIntegrativo;
      if (integrativo.valore !== set.enpap.aliquotaIntegrativo.valore)
        return { ...set, enpap: { ...set.enpap, aliquotaIntegrativo: integrativo } };
    } catch {
      // nessuna regola di fatturazione per l'anno: resta il valore del set IRPEF
    }
    return set;
  });
}

export const anniConRegoleIrpef = (): number[] =>
  [...new Set([...Object.keys(PER_ANNO).map(Number), ...anniNelRegistro('irpef', registroAttivo())])].sort((a, b) => a - b);
