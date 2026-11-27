import { memo, registroAttivo } from '../../parametri/attivi';
import { risolviSet } from '../../parametri/risolvi';
import type { Regola } from '../tipi';
import { scadenzeBase, type ScadenzaRegola } from './base';

export * from './base';

type SetScadenze = { anno: number; scadenze: Regola<ScadenzaRegola>[] };

const base = (anno: number): SetScadenze => ({ anno, scadenze: scadenzeBase() });

/** Scadenze dell'anno solare, con le date aggiornate da file per quell'anno (specifica 014, proroghe). */
export function regoleScadenze(anno: number): SetScadenze {
  const registro = registroAttivo();
  if (!registro.length) return base(anno);
  return memo(`scadenze|${anno}`, () => risolviSet('scadenze', { anno }, base(anno), registro, base).set);
}

/** Anni di calendario disponibili: dal primo anno con regole fiscali a due anni dopo. */
export const anniConScadenze = (): number[] => [2026, 2027, 2028, 2029];

/** Giorni di anticipo predefiniti del promemoria. */
export const ANTICIPO_PREDEFINITO: Regola<number> = {
  valore: 14,
  fonte: 'Scelta di Fiscal: due settimane prima, modificabile',
  stato: 'verificata',
};
