'use client';

import { useEffect, useState } from 'react';
import { leggiModalita, type Modalita } from '@/features/fatturazione/dati';

/**
 * Modalità dell'account (prova o produzione), letta una volta per pagina e condivisa.
 * null finché non è nota (o senza rete): l'interfaccia non mostra nulla di specifico.
 */
let inMemoria: Promise<Modalita> | null = null;
const ascoltatori = new Set<(m: Modalita) => void>();

export function aggiornaModalita() {
  inMemoria = leggiModalita();
  void inMemoria.then((m) => ascoltatori.forEach((a) => a(m))).catch(() => undefined);
  return inMemoria;
}

export function useModalita(): Modalita | null {
  const [m, setM] = useState<Modalita | null>(null);
  useEffect(() => {
    let vivo = true;
    ascoltatori.add(setM);
    (inMemoria ?? aggiornaModalita())
      .then((x) => vivo && setM(x))
      .catch(() => {
        inMemoria = null;
      });
    return () => {
      vivo = false;
      ascoltatori.delete(setM);
    };
  }, []);
  return m;
}
