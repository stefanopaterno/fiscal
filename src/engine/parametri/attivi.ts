import type { RigaRegistro } from './tipi';

/**
 * Registro attivo (specifica 014, research.md R-01, R-02): le righe approvate dall'utente, impostate dopo
 * l'accesso. Il motore è sincrono e i getter delle regole leggono da qui; `conRegistro` sostituisce il registro
 * per la durata di un calcolo (anteprima) e lo ripristina sempre. La cache dei set risolti è legata alla
 * versione del registro.
 */
let registro: readonly RigaRegistro[] = [];
let versione = 0;
let contatore = 0;
const cache = new Map<string, unknown>();

export function impostaRegistro(righe: readonly RigaRegistro[]): void {
  registro = righe;
  versione = ++contatore;
  cache.clear();
}

export const registroAttivo = (): readonly RigaRegistro[] => registro;

/** Esegue `calcola` con un altro registro (per le simulazioni) e poi ripristina quello di prima. */
export function conRegistro<T>(righe: readonly RigaRegistro[], calcola: () => T): T {
  const prima = registro;
  const versionePrima = versione;
  registro = righe;
  versione = ++contatore;
  try {
    return calcola();
  } finally {
    registro = prima;
    versione = versionePrima;
  }
}

/** Valore calcolato una volta per versione del registro. */
export function memo<T>(chiave: string, calcola: () => T): T {
  const k = `${versione}|${chiave}`;
  if (cache.has(k)) return cache.get(k) as T;
  const v = calcola();
  if (cache.size > 500) cache.clear();
  cache.set(k, v);
  return v;
}
