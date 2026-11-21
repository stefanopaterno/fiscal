// Crittografia del recupero (T063, research D-06 e D-07).
// Gira identica nelle funzioni Edge (Deno) e nei test (Node): usa solo Web Crypto e @noble/hashes.
// - Codici di recupero: 10 codici da 80 bit; nel database solo HMAC-SHA256 con un "pepe" segreto.
// - Frase di recupero: impronta argon2id con sale casuale; mai la frase in chiaro.

import { argon2id } from '@noble/hashes/argon2.js';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** 10 codici da 80 bit (16 caratteri base32), mostrati come XXXX-XXXX-XXXX-XXXX. */
export function generaCodici(quanti = 10): string[] {
  const codici = new Set<string>();
  while (codici.size < quanti) {
    const byte = crypto.getRandomValues(new Uint8Array(10)); // 80 bit
    let bit = 0;
    let valore = 0;
    let testo = '';
    for (const b of byte) {
      valore = (valore << 8) | b;
      bit += 8;
      while (bit >= 5) {
        testo += BASE32[(valore >>> (bit - 5)) & 31];
        bit -= 5;
      }
    }
    codici.add(testo.match(/.{4}/g)!.join('-'));
  }
  return [...codici];
}

/** Maiuscole, senza spazi né trattini: l'utente può scriverlo come vuole. */
export function normalizzaCodice(codice: string): string {
  return codice.toUpperCase().replace(/[^A-Z2-7]/g, '');
}

const esadecimale = (byte: Uint8Array) => [...byte].map((b) => b.toString(16).padStart(2, '0')).join('');

/** HMAC-SHA256 del codice normalizzato, nel formato bytea di Postgres ("\x…"). */
export async function hmacCodice(codice: string, pepe: string): Promise<string> {
  if (!pepe) throw new Error('Manca il pepe dei codici di recupero (segreto RECOVERY_PEPPER).');
  const chiave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepe),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', chiave, new TextEncoder().encode(normalizzaCodice(codice)));
  return `\\x${esadecimale(new Uint8Array(firma))}`;
}

/** Spazi doppi, maiuscole e spazi ai bordi non contano. */
export function normalizzaFrase(frase: string): string {
  return frase.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Almeno 24 caratteri oppure almeno 6 parole. */
export function fraseAccettabile(frase: string): boolean {
  const f = normalizzaFrase(frase);
  return f.length >= 24 || f.split(' ').length >= 6;
}

// Parametri argon2id: 12 MiB, 3 passaggi (raccomandazione OWASP), sotto il limite di CPU delle funzioni Edge.
const M = 12288;
const T = 3;

const base64 = (byte: Uint8Array) => btoa(String.fromCharCode(...byte));
const daBase64 = (testo: string) => Uint8Array.from(atob(testo), (c) => c.charCodeAt(0));

function calcola(frase: string, sale: Uint8Array, m: number, t: number): Uint8Array {
  return argon2id(new TextEncoder().encode(normalizzaFrase(frase)), sale, { m, t, p: 1, dkLen: 32 });
}

/** Impronta della frase: "argon2id$m=…,t=…,p=1$<sale>$<impronta>". */
export async function hashFrase(frase: string): Promise<string> {
  const sale = crypto.getRandomValues(new Uint8Array(16));
  return `argon2id$m=${M},t=${T},p=1$${base64(sale)}$${base64(calcola(frase, sale, M, T))}`;
}

/** Confronto a tempo costante con l'impronta salvata. */
export async function verificaFrase(frase: string, salvata: string): Promise<boolean> {
  const m = /^argon2id\$m=(\d+),t=(\d+),p=1\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/.exec(salvata);
  if (!m) return false;
  const attesa = daBase64(m[4]!);
  const calcolata = calcola(frase, daBase64(m[3]!), Number(m[1]), Number(m[2]));
  if (attesa.length !== calcolata.length) return false;
  let differenza = 0;
  for (let i = 0; i < attesa.length; i++) differenza |= attesa[i]! ^ calcolata[i]!;
  return differenza === 0;
}
