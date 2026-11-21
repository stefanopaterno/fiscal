// Genera le icone dell'app (T026): quadrato blu Fluent con la "F" bianca, in PNG e SVG.
// Nessuna dipendenza esterna: il PNG è scritto a mano con zlib. Uso: node scripts/genera-icone.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import path from 'node:path';

const BLU = [0x0f, 0x6c, 0xbd, 255];
const BIANCO = [255, 255, 255, 255];
// Rettangoli della "F" in frazioni del lato (x0, y0, x1, y1), dentro la zona sicura delle icone "maskable".
const LETTERA_F = [
  [0.36, 0.26, 0.47, 0.74],
  [0.36, 0.26, 0.66, 0.37],
  [0.36, 0.45, 0.61, 0.55],
];

const tabellaCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = tabellaCrc[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const blocco = (tipo, dati) => {
  const lunghezza = Buffer.alloc(4);
  lunghezza.writeUInt32BE(dati.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([lunghezza, corpo, crc]);
};

function png(lato) {
  const righe = [];
  for (let y = 0; y < lato; y++) {
    const riga = Buffer.alloc(1 + lato * 4); // byte 0 = filtro "nessuno"
    for (let x = 0; x < lato; x++) {
      const fx = (x + 0.5) / lato;
      const fy = (y + 0.5) / lato;
      const dentro = LETTERA_F.some(([x0, y0, x1, y1]) => fx >= x0 && fx < x1 && fy >= y0 && fy < y1);
      Buffer.from(dentro ? BIANCO : BLU).copy(riga, 1 + x * 4);
    }
    righe.push(riga);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(lato, 4);
  ihdr[8] = 8; // bit per canale
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    blocco('IHDR', ihdr),
    blocco('IDAT', deflateSync(Buffer.concat(righe))),
    blocco('IEND', Buffer.alloc(0)),
  ]);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0F6CBD"/>${LETTERA_F.map(
  ([x0, y0, x1, y1]) => `<rect x="${x0 * 100}" y="${y0 * 100}" width="${((x1 - x0) * 100).toFixed(1)}" height="${((y1 - y0) * 100).toFixed(1)}" fill="#FFFFFF"/>`,
).join('')}</svg>\n`;

const cartella = path.join(process.cwd(), 'public', 'icons');
await mkdir(cartella, { recursive: true });
await writeFile(path.join(cartella, 'icon-192.png'), png(192));
await writeFile(path.join(cartella, 'icon-512.png'), png(512));
await writeFile(path.join(cartella, 'icon.svg'), svg);
console.log('Icone generate in public/icons/.');
