'use client';

import { useSyncExternalStore } from 'react';

/**
 * Preferenze dell'aiuto e avanzamento delle guide (specifica 011, FR-007, FR-010, US2): restano su questo
 * dispositivo, lette con useSyncExternalStore. Sono comodità: se l'archivio del browser non c'è, valgono i
 * predefiniti (suggerimenti attivi, livello breve, guide da capo).
 */
export type Preferenze = { automatici: boolean; livello: 'breve' | 'dettagliato' };
const PREDEFINITE: Preferenze = { automatici: true, livello: 'breve' };
const CHIAVE_PREF = 'fiscal.aiuto';
const CHIAVE_GUIDE = 'fiscal.guide';
const EVENTO = 'fiscal-aiuto';

function leggi(chiave: string, vuoto: string): string {
  try {
    return localStorage.getItem(chiave) ?? vuoto;
  } catch {
    return vuoto;
  }
}
function scrivi(chiave: string, valore: unknown) {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    /* solo una comodità */
  }
  window.dispatchEvent(new Event(EVENTO));
}
const iscrivi = (f: () => void) => {
  window.addEventListener(EVENTO, f);
  window.addEventListener('storage', f);
  return () => {
    window.removeEventListener(EVENTO, f);
    window.removeEventListener('storage', f);
  };
};
function json<T>(t: string, d: T): T {
  try {
    return { ...d, ...(JSON.parse(t) as T) };
  } catch {
    return d;
  }
}

export function usePreferenzeAiuto(): [Preferenze, (p: Partial<Preferenze>) => void] {
  const grezzo = useSyncExternalStore(iscrivi, () => leggi(CHIAVE_PREF, '{}'), () => '{}');
  const p = json(grezzo, PREDEFINITE);
  return [p, (nuove) => scrivi(CHIAVE_PREF, { ...p, ...nuove })];
}

/** Avanzamento delle guide: per ogni guida il numero di passi completati. */
export function useAvanzamentoGuide(): [Record<string, number>, (id: string, passi: number) => void] {
  const grezzo = useSyncExternalStore(iscrivi, () => leggi(CHIAVE_GUIDE, '{}'), () => '{}');
  const a = json<Record<string, number>>(grezzo, {});
  return [a, (id, passi) => scrivi(CHIAVE_GUIDE, { ...a, [id]: passi })];
}
