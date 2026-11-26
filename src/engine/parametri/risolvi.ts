import type { Regola } from '../regole/tipi';
import { parametriDi, parametro } from './catalogo';
import type { FonteVoce, Insieme, Origine, ParametroCatalogo, RigaRegistro } from './tipi';

/**
 * Risolutore (specifica 014, data-model.md «Risoluzione», research.md R-01, R-03, R-07). Funzioni pure: dato il
 * set base dell'anno e il registro, restituisce il set con i valori in vigore. Con registro vuoto restituisce
 * il set base così com'è (stesso oggetto): i risultati di oggi non cambiano.
 */

export type Contesto = { anno: number; /** AAAA-MM-GG; senza data vale il 1° gennaio dell'anno. */ data?: string };

const annoDi = (data: string) => Number(data.slice(0, 4));

/** Righe approvate e non annullate. */
export function righeAttive(registro: readonly RigaRegistro[]): RigaRegistro[] {
  const annullate = new Set(registro.filter((r) => r.azione === 'annullato' && r.annulla_id).map((r) => r.annulla_id!));
  return registro.filter((r) => r.azione === 'approvato' && !annullate.has(r.id));
}

export const testoFonte = (f: FonteVoce | null): string =>
  f ? `${f.titolo}${f.riferimento ? `, ${f.riferimento}` : ''} (${f.url}, atto del ${f.data_atto})` : 'fonte non indicata';

/** Confronto strutturale di due valori (JSON). */
export const uguali = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Riga in vigore per un parametro nel contesto, o null. Per anno: stessa annata. Per data: decorrenza non
 * successiva alla data; da un anno all'altro vale solo finché la base del programma non è cambiata (se il
 * programma ha un valore nuovo per l'anno, vince il programma: è una norma più recente).
 */
export function rigaInVigore<S>(
  p: ParametroCatalogo,
  contesto: Contesto,
  base: S,
  registro: readonly RigaRegistro[],
  baseDiAnno: (anno: number) => S | undefined,
): RigaRegistro | null {
  const dataRif = contesto.data ?? `${contesto.anno}-01-01`;
  const candidate = righeAttive(registro).filter((r) => {
    if (r.chiave !== p.chiave) return false;
    if (p.decorrenza !== 'data') return r.anno === contesto.anno;
    if (!r.dal || r.dal > dataRif) return false;
    const annoRiga = annoDi(r.dal);
    if (annoRiga === contesto.anno) return true;
    const baseRiga = baseDiAnno(annoRiga);
    return baseRiga !== undefined && p.leggi !== undefined && uguali(p.leggi(baseRiga)?.valore, p.leggi(base)?.valore);
  });
  if (!candidate.length) return null;
  return candidate.reduce((a, b) => {
    const da = a.dal ?? '';
    const db = b.dal ?? '';
    if (da !== db) return db > da ? b : a;
    return b.creato_il >= a.creato_il ? b : a;
  });
}

/** Set con i valori in vigore e l'origine di ciascun parametro dell'insieme. */
export function risolviSet<S>(
  insieme: Insieme,
  contesto: Contesto,
  base: S,
  registro: readonly RigaRegistro[],
  baseDiAnno: (anno: number) => S | undefined,
): { set: S; origini: Map<string, Origine> } {
  const origini = new Map<string, Origine>();
  if (!registro.length) return { set: base, origini };
  let set: unknown = base;
  for (const p of parametriDi(insieme)) {
    if (!p.leggi || !p.applica) continue;
    const riga = rigaInVigore(p, contesto, base, registro, baseDiAnno);
    if (!riga) continue;
    const regolaBase = p.leggi(base);
    const regola: Regola<unknown> = { valore: riga.valore, fonte: testoFonte(riga.fonte), stato: riga.stato };
    set = p.applica(set, regola);
    const allineato = regolaBase !== undefined && regolaBase.stato === 'verificata' && uguali(regolaBase.valore, riga.valore);
    origini.set(p.chiave, { tipo: 'aggiornamento', riga, allineato });
  }
  return { set: set as S, origini };
}

/** Copia profonda di un set con ogni `Regola` segnata «da verificare» e «riportata dal …» (research.md R-07). */
export function riporta<S>(set: S, daAnno: number, anno: number): S {
  const visita = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(visita);
    if (!x || typeof x !== 'object') return x;
    const r = x as Record<string, unknown>;
    if ('valore' in r && 'fonte' in r && 'stato' in r)
      return { ...r, valore: visita(r.valore), fonte: `Riportato dal ${daAnno}: ${String(r.fonte)}`, stato: 'da_verificare' };
    return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, k === 'anno' ? anno : visita(v)]));
  };
  return visita(set) as S;
}

/** Anni che hanno righe nel registro per un insieme (parametri per anno). */
export function anniNelRegistro(insieme: Insieme, registro: readonly RigaRegistro[]): number[] {
  const anni = new Set<number>();
  for (const r of righeAttive(registro)) if (r.anno !== null && parametro(r.chiave)?.insieme === insieme) anni.add(r.anno);
  return [...anni];
}

/**
 * Base dell'anno: il set del programma; se manca ma il registro ha voci per quell'anno, il set dell'ultimo
 * anno precedente disponibile, riportato e «da verificare». Altrimenti undefined (nessun prestito in silenzio).
 */
export function basePerAnno<S>(
  perAnno: Record<number, S>,
  anno: number,
  insieme: Insieme,
  registro: readonly RigaRegistro[],
): { base: S; riportatoDa?: number } | undefined {
  if (perAnno[anno]) return { base: perAnno[anno]! };
  if (!anniNelRegistro(insieme, registro).includes(anno)) return undefined;
  const precedenti = Object.keys(perAnno)
    .map(Number)
    .filter((a) => a < anno)
    .sort((a, b) => b - a);
  const da = precedenti[0];
  if (da === undefined) return undefined;
  return { base: riporta(perAnno[da]!, da, anno), riportatoDa: da };
}
