import type { Sezione } from './contenuto';

/**
 * Confronto riga per riga tra pacchetti (specifica 009, US4, T007). Del pacchetto si conservano solo le impronte
 * delle righe (SHA-256 abbreviato), mai il contenuto: la chiave è l'impronta delle prime due colonne (data e numero,
 * o le colonne equivalenti), il valore l'impronta della riga intera. Così si contano righe nuove, tolte e cambiate
 * senza tenere nomi o importi nello storico.
 */
export type Impronte = Record<string, Record<string, string>>;
export type DifferenzaSezione = { codice: string; nuove: string[]; tolte: string[]; cambiate: string[] };

const testo = (v: string | number | null) => (v == null ? '' : String(v));

async function sha(t: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(h)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Etichetta leggibile della riga (prime due colonne): serve solo nell'anteprima, non si salva. */
export const etichettaRiga = (r: (string | number | null)[]) => r.slice(0, 2).map(testo).filter(Boolean).join(' · ');

export async function improntaSezioni(sezioni: Sezione[]): Promise<{ impronte: Impronte; etichette: Record<string, Record<string, string>> }> {
  const impronte: Impronte = {};
  const etichette: Record<string, Record<string, string>> = {};
  for (const s of sezioni) {
    const visti = new Map<string, number>();
    impronte[s.codice] = {};
    etichette[s.codice] = {};
    for (const r of s.righe) {
      const base = etichettaRiga(r);
      const n = (visti.get(base) ?? 0) + 1; // righe con la stessa data e lo stesso numero: si numerano
      visti.set(base, n);
      const chiave = await sha(`${s.codice}|${base}|${n}`);
      impronte[s.codice]![chiave] = await sha(r.map(testo).join('|'));
      etichette[s.codice]![chiave] = n > 1 ? `${base} (${n})` : base;
    }
  }
  return { impronte, etichette };
}

/** Differenze tra due insiemi di impronte, sezione per sezione (solo le sezioni presenti in entrambi). */
export function confrontaImpronte(nuove: Impronte, vecchie: Impronte): DifferenzaSezione[] {
  const out: DifferenzaSezione[] = [];
  for (const [codice, righe] of Object.entries(nuove)) {
    const prima = vecchie[codice];
    if (!prima) continue;
    const d: DifferenzaSezione = { codice, nuove: [], tolte: [], cambiate: [] };
    for (const [k, v] of Object.entries(righe)) {
      if (!(k in prima)) d.nuove.push(k);
      else if (prima[k] !== v) d.cambiate.push(k);
    }
    for (const k of Object.keys(prima)) if (!(k in righe)) d.tolte.push(k);
    if (d.nuove.length || d.tolte.length || d.cambiate.length) out.push(d);
  }
  return out;
}
