import { baseFatturazione } from '../regole';
import { baseF24 } from '../regole/f24/base';
import { baseIrpef } from '../regole/irpef';
import { scadenzeBase } from '../regole/scadenze/base';
import { baseSpese } from '../regole/spese';
import { registroAttivo } from './attivi';
import { parametro } from './catalogo';
import { rigaInVigore, testoFonte, uguali, type Contesto } from './risolvi';
import type { Insieme, Origine } from './tipi';

/**
 * Da dove viene il valore in uso di un parametro (specifica 014, FR-021, FR-022, FR-023): programma, riportato
 * dall'anno prima, o aggiornamento importato (con «allineato» se il programma ha già lo stesso valore verificato).
 */
const BASI: Partial<Record<Insieme, (anno: number) => unknown>> = {
  irpef: baseIrpef,
  fatturazione: baseFatturazione,
  spese: baseSpese,
  scadenze: (anno) => ({ anno, scadenze: scadenzeBase() }),
  f24: baseF24,
};

export function origineParametro(chiave: string, contesto: Contesto): Origine | null {
  const p = parametro(chiave);
  const baseDi = p ? BASI[p.insieme] : undefined;
  if (!p || !baseDi || !p.leggi) return null;
  let base = baseDi(contesto.anno);
  let riportatoDa: number | undefined;
  if (base === undefined) {
    for (let a = contesto.anno - 1; a >= contesto.anno - 5 && base === undefined; a--) {
      base = baseDi(a);
      if (base !== undefined) riportatoDa = a;
    }
    if (base === undefined) return null;
  }
  const riga = rigaInVigore(p, contesto, base, registroAttivo(), baseDi);
  if (riga) {
    const b = p.leggi(base);
    return { tipo: 'aggiornamento', riga, allineato: !!b && b.stato === 'verificata' && uguali(b.valore, riga.valore) };
  }
  return riportatoDa ? { tipo: 'riportato', daAnno: riportatoDa } : { tipo: 'programma' };
}

/** Frase per le spiegazioni dei calcoli: «aliquota da aggiornamento del 12/01/2027, fonte …» (FR-021). */
export function testoOrigine(chiave: string, contesto: Contesto): string | null {
  const o = origineParametro(chiave, contesto);
  if (!o || o.tipo === 'programma') return null;
  if (o.tipo === 'riportato') return `valore riportato dal ${o.daAnno}, da verificare`;
  const d = o.riga.creato_il.slice(0, 10).split('-').reverse().join('/');
  return `${o.allineato ? 'confermato dall\'aggiornamento' : 'da aggiornamento'} del ${d}, fonte: ${testoFonte(o.riga.fonte)}`;
}
