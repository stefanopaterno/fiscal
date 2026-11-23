/**
 * Lettura e scrittura di file ZIP senza librerie (specifica 010, research R-03).
 * Lettura: "central directory", metodi store (0) e deflate (8) con DecompressionStream.
 * Scrittura: metodo store, oppure dati già compressi in deflate (per i test), con CRC-32.
 */
export class ErroreZip extends Error {}

const TABELLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABELLA[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function inflate(dati: Uint8Array): Promise<Uint8Array> {
  const flusso = new Blob([dati as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flusso).arrayBuffer());
}

export async function leggiZip(byte: Uint8Array): Promise<{ nome: string; dati: Uint8Array }[]> {
  const v = new DataView(byte.buffer, byte.byteOffset, byte.byteLength);
  // fine del central directory: firma 0x06054b50 cercata dal fondo (dopo c'è al massimo un commento)
  let eocd = -1;
  for (let i = byte.length - 22; i >= Math.max(0, byte.length - 22 - 65535); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new ErroreZip('Il file non è uno ZIP leggibile.');
  const quanti = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const out: { nome: string; dati: Uint8Array }[] = [];
  for (let n = 0; n < quanti; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new ErroreZip('ZIP danneggiato.');
    const metodo = v.getUint16(p + 10, true);
    const compressa = v.getUint32(p + 20, true);
    const lNome = v.getUint16(p + 28, true);
    const lExtra = v.getUint16(p + 30, true);
    const lCommento = v.getUint16(p + 32, true);
    const locale = v.getUint32(p + 42, true);
    const nome = decoder.decode(byte.subarray(p + 46, p + 46 + lNome));
    p += 46 + lNome + lExtra + lCommento;
    if (nome.endsWith('/')) continue; // cartella
    if (v.getUint32(locale, true) !== 0x04034b50) throw new ErroreZip('ZIP danneggiato.');
    const inizio = locale + 30 + v.getUint16(locale + 26, true) + v.getUint16(locale + 28, true);
    const grezzi = byte.subarray(inizio, inizio + compressa);
    if (metodo === 0) out.push({ nome, dati: grezzi.slice() });
    else if (metodo === 8) out.push({ nome, dati: await inflate(grezzi) });
    else throw new ErroreZip(`Il file ${nome} usa una compressione non supportata.`);
  }
  return out;
}

/** ZIP con i file indicati; `compressi` (deflate) facoltativo, altrimenti metodo store. */
export function scriviZip(file: { nome: string; dati: Uint8Array; compressi?: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const locali: Uint8Array[] = [];
  const centrali: Uint8Array[] = [];
  let posizione = 0;
  for (const f of file) {
    const nome = enc.encode(f.nome);
    const corpo = f.compressi ?? f.dati;
    const metodo = f.compressi ? 8 : 0;
    const crc = crc32(f.dati);
    const l = new Uint8Array(30 + nome.length);
    const lv = new DataView(l.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // nomi in UTF-8
    lv.setUint16(8, metodo, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, corpo.length, true);
    lv.setUint32(22, f.dati.length, true);
    lv.setUint16(26, nome.length, true);
    l.set(nome, 30);
    const c = new Uint8Array(46 + nome.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, metodo, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, corpo.length, true);
    cv.setUint32(24, f.dati.length, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint32(42, posizione, true);
    c.set(nome, 46);
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
  let i = 0;
  for (const x of parti) {
    out.set(x, i);
    i += x.length;
  }
  return out;
}
