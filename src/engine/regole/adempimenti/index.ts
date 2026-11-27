import { memo, registroAttivo } from '../../parametri/attivi';
import { risolviSet } from '../../parametri/risolvi';
import { baseAdempimenti, type RegoleAdempimenti } from './base';

export * from './base';

/** Valori delle guide in vigore alla data (AAAA-MM-GG), con gli aggiornamenti approvati (014). */
export function regoleAdempimenti(anno: number, data?: string): RegoleAdempimenti {
  const registro = registroAttivo();
  if (!registro.length) return baseAdempimenti(anno);
  return memo(`adempimenti|${anno}|${data ?? ''}`, () => risolviSet('adempimenti', { anno, data }, baseAdempimenti(anno), registro, baseAdempimenti).set);
}
