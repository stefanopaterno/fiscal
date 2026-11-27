import { memo, registroAttivo } from '../../parametri/attivi';
import { risolviSet } from '../../parametri/risolvi';
import { baseF24, type RegoleF24 } from './base';

export * from './base';

/** Codici tributo in vigore alla data del versamento (AAAA-MM-GG), con gli aggiornamenti approvati (014). */
export function regoleF24(anno: number, data?: string): RegoleF24 {
  const registro = registroAttivo();
  if (!registro.length) return baseF24(anno);
  return memo(`f24|${anno}|${data ?? ''}`, () => risolviSet('f24', { anno, data }, baseF24(anno), registro, baseF24).set);
}
