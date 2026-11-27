import { useSyncExternalStore } from 'react';

/**
 * Spunte dei passi delle guide (specifica 015, FR-011): solo su questo dispositivo, nessun dato personale.
 * `localStorage['fiscal.guide.spunte']` = { [idGuida]: numeri dei passi fatti }.
 */
export const CHIAVE_SPUNTE = 'fiscal.guide.spunte';
const EVENTO = 'fiscal-guide-spunte';

export type Spunte = Record<string, number[]>;

function leggiGrezzo(): string {
  try {
    return localStorage.getItem(CHIAVE_SPUNTE) ?? '{}';
  } catch {
    return '{}';
  }
}

export function leggiSpunte(): Spunte {
  try {
    const v = JSON.parse(leggiGrezzo()) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Spunte) : {};
  } catch {
    return {};
  }
}

function scrivi(s: Spunte) {
  try {
    localStorage.setItem(CHIAVE_SPUNTE, JSON.stringify(s));
  } catch {
    // spazio pieno: le spunte sono solo un aiuto
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO));
}

export function cambiaSpunta(id: string, passo: number, fatto: boolean): void {
  const s = leggiSpunte();
  const fatti = new Set(s[id] ?? []);
  if (fatto) fatti.add(passo);
  else fatti.delete(passo);
  scrivi({ ...s, [id]: [...fatti].sort((a, b) => a - b) });
}

export function azzeraSpunte(id: string): void {
  const s = leggiSpunte();
  delete s[id];
  scrivi(s);
}

function iscrivi(f: () => void) {
  window.addEventListener(EVENTO, f);
  window.addEventListener('storage', f);
  return () => {
    window.removeEventListener(EVENTO, f);
    window.removeEventListener('storage', f);
  };
}

/** Passi fatti della guida (si aggiorna da solo). */
export function useSpunte(id: string): number[] {
  const grezzo = useSyncExternalStore(iscrivi, leggiGrezzo, () => '{}');
  try {
    const v = (JSON.parse(grezzo) as Spunte)[id];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
