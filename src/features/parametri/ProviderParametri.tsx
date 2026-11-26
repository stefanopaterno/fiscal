'use client';

import { useEffect, useState } from 'react';
import { impostaRegistro } from '@/engine/parametri/attivi';
import type { RigaRegistro } from '@/engine/parametri/tipi';
import { leggiRegistro } from './dati';

/**
 * Caricamento del registro dei parametri (specifica 014, T016). Dopo l'accesso completo si legge il registro e
 * lo si imposta nel motore prima di mostrare la pagina, così ogni calcolo usa i valori in vigore. Senza rete si
 * usa l'ultima copia di questo dispositivo, senza le righe delle addizionali (rivelerebbero il comune; il motore
 * non le usa: le addizionali stanno nei dati dell'anno).
 */
const CHIAVE = 'fiscal.parametri.registro';
const EVENTO = 'fiscal-parametri';

function copiaLocale(): RigaRegistro[] {
  try {
    const r = JSON.parse(localStorage.getItem(CHIAVE) ?? '[]') as unknown;
    return Array.isArray(r) ? (r as RigaRegistro[]) : [];
  } catch {
    return [];
  }
}

/** Rilegge il registro dal database (dopo un'approvazione o un annullamento) e avvisa le pagine aperte. */
export async function ricaricaRegistro(): Promise<void> {
  const righe = await leggiRegistro();
  const perMotore = righe.filter((r) => !r.chiave.startsWith('addizionali.'));
  impostaRegistro(perMotore);
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(perMotore));
  } catch {
    // spazio pieno: la copia locale serve solo senza rete
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Svuota registro e copia locale (uscita dall'account). */
export function dimenticaRegistro(): void {
  impostaRegistro([]);
  localStorage.removeItem(CHIAVE);
}

/** Vero quando il registro è pronto; `attivo` = accesso completo verificato. */
export function useRegistroParametri(attivo: boolean): boolean {
  const [pronto, setPronto] = useState(false);
  const [, setVersione] = useState(0);
  useEffect(() => {
    if (!attivo) return;
    let vivo = true;
    ricaricaRegistro()
      .catch(() => impostaRegistro(copiaLocale()))
      .finally(() => vivo && setPronto(true));
    const aggiorna = () => setVersione((v) => v + 1);
    window.addEventListener(EVENTO, aggiorna);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO, aggiorna);
    };
  }, [attivo]);
  return pronto;
}
