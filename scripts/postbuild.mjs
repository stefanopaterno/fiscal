// Dopo `next build`: sistema la cartella out/ per Vercel (research D-12).
//
// Next.js con `basePath: '/app'` usa il prefisso solo nei collegamenti, ma scrive i file
// alla radice di out/. Quindi:
//   1. sposta tutto l'output di Next.js in out/app/ (dove i collegamenti lo cercano);
//   2. copia BYTE PER BYTE la pagina di cortesia (index.html) e robots.txt in out/.
// La pagina di cortesia alla radice del repository non viene mai modificata.

import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const radice = process.cwd();
const out = path.join(radice, 'out');
const temporanea = path.join(radice, 'out.next-tmp');
const fileDiCortesia = ['index.html', 'robots.txt'];

async function esiste(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function impronta(p) {
  return createHash('sha256')
    .update(await readFile(p))
    .digest('hex');
}

if (!(await esiste(out))) {
  console.error('postbuild: out/ non esiste. Eseguire prima `next build`.');
  process.exit(1);
}

// Se out/ è già sistemata (contiene out/app/ e nient'altro di Next.js), non rifare lo spostamento.
const contenuto = await readdir(out);
const giaSistemata =
  contenuto.includes('app') && contenuto.every((f) => f === 'app' || fileDiCortesia.includes(f));

if (!giaSistemata) {
  await rm(temporanea, { recursive: true, force: true });
  await rename(out, temporanea);
  await mkdir(out);
  await rename(temporanea, path.join(out, 'app'));
}

for (const nome of fileDiCortesia) {
  const sorgente = path.join(radice, nome);
  const destinazione = path.join(out, nome);
  await cp(sorgente, destinazione);
  const [a, b] = await Promise.all([impronta(sorgente), impronta(destinazione)]);
  if (a !== b) {
    console.error(`postbuild: ${nome} copiato in out/ non è identico all'originale.`);
    process.exit(1);
  }
}

// 3. Content-Security-Policy nelle pagine dell'app (research D-15).
//    Next.js inserisce script in linea che cambiano a ogni build: ne calcoliamo l'impronta e li
//    autorizziamo uno per uno, così nessun altro script in linea può girare. La pagina di cortesia
//    non viene toccata. frame-ancestors e le altre intestazioni stanno in vercel.json.
// L'indirizzo di Supabase della build (lo stack locale solo nei test end-to-end).
const SUPABASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aldiyymgvngvdrroluus.supabase.co').replace(
  /\/$/,
  '',
);
const SUPABASE_WS = SUPABASE.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
const regexScriptInLinea = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

async function* fileHtml(cartella) {
  for (const voce of await readdir(cartella, { withFileTypes: true })) {
    const p = path.join(cartella, voce.name);
    if (voce.isDirectory()) yield* fileHtml(p);
    else if (voce.name.endsWith('.html')) yield p;
  }
}

let pagine = 0;
for await (const file of fileHtml(path.join(out, 'app'))) {
  let html = await readFile(file, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;
  const impronte = new Set();
  for (const m of html.matchAll(regexScriptInLinea)) {
    const codice = m[1] ?? '';
    if (codice.length > 0) impronte.add(`'sha256-${createHash('sha256').update(codice).digest('base64')}'`);
  }
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${[...impronte].join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${SUPABASE} ${SUPABASE_WS}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  if (!/<head>/i.test(html)) {
    console.error(`postbuild: ${file} senza <head>, impossibile inserire la CSP.`);
    process.exit(1);
  }
  html = html.replace(/<head>/i, `<head>${meta}`);
  await writeFile(file, html);
  pagine++;
}

console.log(
  `postbuild: app in out/app/ (${pagine} pagine con CSP), pagina di cortesia e robots.txt copiati invariati in out/.`,
);
