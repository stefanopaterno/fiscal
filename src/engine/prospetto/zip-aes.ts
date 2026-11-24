import { ecb } from '@noble/ciphers/aes.js';
import { crc32 } from '../documenti/zip';

/**
 * ZIP cifrato AES-256 (specifica 009, FR-005, research R-01): formato WinZip AE-2, apribile con 7-Zip, WinRAR,
 * Keka, The Unarchiver e libarchive. Per ogni file:
 *   chiavi = PBKDF2-HMAC-SHA1(password, sale di 16 byte, 1000 iterazioni) → 32 byte cifratura + 32 byte
 *   autenticazione + 2 byte di verifica; dati compressi (deflate) e cifrati con AES-CTR a contatore little-endian
 *   da 1; codice di autenticazione = HMAC-SHA1 del cifrato, primi 10 byte.
 * Metodo 99 con il campo extra 0x9901; con AE-2 il CRC nell'intestazione vale 0 (lo protegge l'HMAC).
 * La password non si salva da nessuna parte.
 */
const enc = new TextEncoder();

async function chiavi(password: string, sale: Uint8Array): Promise<{ cifra: Uint8Array; autentica: Uint8Array; verifica: Uint8Array }> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bit = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-1', salt: sale as BufferSource, iterations: 1000 }, base, (32 + 32 + 2) * 8),
  );
  return { cifra: bit.slice(0, 32), autentica: bit.slice(32, 64), verifica: bit.slice(64, 66) };
}

/** AES-CTR alla maniera di WinZip: blocco contatore little-endian, primo valore 1. */
export function ctrWinZip(chiave: Uint8Array, dati: Uint8Array): Uint8Array {
  const blocchi = Math.ceil(dati.length / 16);
  const contatori = new Uint8Array(blocchi * 16);
  for (let i = 0; i < blocchi; i++) {
    let n = i + 1;
    for (let b = 0; b < 8 && n > 0; b++) {
      contatori[i * 16 + b] = n & 0xff;
      n = Math.floor(n / 256);
    }
  }
  const flusso = ecb(chiave, { disablePadding: true }).encrypt(contatori);
  const out = new Uint8Array(dati.length);
  for (let i = 0; i < dati.length; i++) out[i] = dati[i]! ^ flusso[i]!;
  return out;
}

async function comprimi(dati: Uint8Array): Promise<Uint8Array> {
  const flusso = new Blob([dati as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flusso).arrayBuffer());
}

export type FileZip = { nome: string; dati: Uint8Array };

/** Data e ora DOS per le intestazioni ZIP (altrimenti i programmi mostrano il 1980). */
function dataDos(d: Date): { ora: number; data: number } {
  return {
    ora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    data: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export async function zipCifrato(file: FileZip[], password: string, casuale: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): Promise<Uint8Array> {
  if (password.length < 12) throw new Error('Password troppo corta.');
  const quando = dataDos(new Date());
  const locali: Uint8Array[] = [];
  const centrali: Uint8Array[] = [];
  let posizione = 0;
  for (const f of file) {
    const nome = enc.encode(f.nome);
    const compressi = await comprimi(f.dati);
    const usaDeflate = compressi.length < f.dati.length;
    const chiaro = usaDeflate ? compressi : f.dati;
    const sale = casuale(16);
    const k = await chiavi(password, sale);
    const cifrato = ctrWinZip(k.cifra, chiaro);
    const hmacKey = await crypto.subtle.importKey('raw', k.autentica as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const auth = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, cifrato as BufferSource)).slice(0, 10);
    const corpo = new Uint8Array(16 + 2 + cifrato.length + 10);
    corpo.set(sale, 0);
    corpo.set(k.verifica, 16);
    corpo.set(cifrato, 18);
    corpo.set(auth, 18 + cifrato.length);

    // campo extra AES: id 0x9901, 7 byte: versione 2 (AE-2), "AE", forza 3 (256 bit), metodo reale
    const extra = new Uint8Array(11);
    const ev = new DataView(extra.buffer);
    ev.setUint16(0, 0x9901, true);
    ev.setUint16(2, 7, true);
    ev.setUint16(4, 2, true);
    extra[6] = 0x41;
    extra[7] = 0x45;
    extra[8] = 3;
    ev.setUint16(9, usaDeflate ? 8 : 0, true);

    const l = new Uint8Array(30 + nome.length + extra.length);
    const lv = new DataView(l.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 51, true);
    lv.setUint16(6, 0x0801, true); // cifrato + nomi UTF-8
    lv.setUint16(8, 99, true);
    lv.setUint16(10, quando.ora, true);
    lv.setUint16(12, quando.data, true);
    lv.setUint32(14, 0, true); // AE-2: CRC a zero
    lv.setUint32(18, corpo.length, true);
    lv.setUint32(22, f.dati.length, true);
    lv.setUint16(26, nome.length, true);
    lv.setUint16(28, extra.length, true);
    l.set(nome, 30);
    l.set(extra, 30 + nome.length);

    const c = new Uint8Array(46 + nome.length + extra.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 51, true);
    cv.setUint16(6, 51, true);
    cv.setUint16(8, 0x0801, true);
    cv.setUint16(10, 99, true);
    cv.setUint16(12, quando.ora, true);
    cv.setUint16(14, quando.data, true);
    cv.setUint32(16, 0, true);
    cv.setUint32(20, corpo.length, true);
    cv.setUint32(24, f.dati.length, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint16(30, extra.length, true);
    cv.setUint32(42, posizione, true);
    c.set(nome, 46);
    c.set(extra, 46 + nome.length);

    locali.push(l, corpo);
    centrali.push(c);
    posizione += l.length + corpo.length;
  }
  const dimCentrale = centrali.reduce((t, x) => t + x.length, 0);
  const fine = new Uint8Array(22);
  const fv = new DataView(fine.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, file.length, true);
  fv.setUint16(10, file.length, true);
  fv.setUint32(12, dimCentrale, true);
  fv.setUint32(16, posizione, true);
  const parti = [...locali, ...centrali, fine];
  const out = new Uint8Array(parti.reduce((t, x) => t + x.length, 0));
  let o = 0;
  for (const p of parti) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Password lunga e casuale (circa 120 bit), in gruppi da 4 per dettarla o copiarla senza errori. */
export function generaPassword(casuale: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // senza 0/O, 1/l/I
  const out: string[] = [];
  while (out.length < 24) {
    const b = casuale(1)[0]!;
    if (b < 256 - (256 % alfabeto.length)) out.push(alfabeto[b % alfabeto.length]!);
  }
  return out.join('').match(/.{4}/g)!.join('-');
}

export { crc32 };
