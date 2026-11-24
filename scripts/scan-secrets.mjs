// Scansione dei segreti (SC-003, FR-005): repository (file versionati) e build (out/).
// Fallisce se trova chiavi segrete di Supabase, chiavi private o codici fiscali.
// La chiave pubblica (sb_publishable_ / anon) è ammessa: non dà accesso ai dati.

import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const radice = process.cwd();
const ESCLUSI = new Set(['package-lock.json', 'scripts/scan-secrets.mjs']);
const MAX_BYTE = 5 * 1024 * 1024;

const controlli = [
  { nome: 'chiave segreta Supabase (sb_secret_)', regex: /sb_secret_[A-Za-z0-9_-]{10,}/g },
  { nome: 'chiave privata', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { nome: 'variabile service role valorizzata', regex: /SERVICE_ROLE(_KEY)?\s*=\s*\S{10,}/g },
  // I codici fiscali veri non stanno mai nel repo (vivono solo nel database). Nei file di test
  // servono però CF finti ma sintatticamente validi (es. i test di nascitaDaCodiceFiscale), quindi
  // il controllo salta le cartelle di test. Le chiavi e i token restano controllati ovunque.
  { nome: 'codice fiscale', regex: /\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b/g, fuoriDaiTest: true },
];

// Un file è "di test" se un segmento del percorso è `tests` (così tests/… e supabase/tests/…).
const eFileDiTest = (relativo) => relativo.split(path.sep).includes('tests');

function ruoloJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role;
  } catch {
    return undefined;
  }
}

async function* fileIn(cartella) {
  for (const voce of await readdir(cartella, { withFileTypes: true })) {
    const p = path.join(cartella, voce.name);
    if (voce.isDirectory()) yield* fileIn(p);
    else yield p;
  }
}

async function elencoFile() {
  const versionati = execFileSync('git', ['ls-files'], { cwd: radice, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((f) => path.join(radice, f));
  const build = [];
  try {
    for await (const f of fileIn(path.join(radice, 'out'))) build.push(f);
  } catch {
    // out/ assente: nessuna build da controllare
  }
  return [...versionati, ...build];
}

const problemi = [];
for (const file of await elencoFile()) {
  const relativo = path.relative(radice, file);
  if (ESCLUSI.has(relativo)) continue;
  let info;
  try {
    info = await stat(file);
  } catch {
    continue; // file versionato ma cancellato nella copia di lavoro
  }
  if (info.size > MAX_BYTE) continue;
  const testo = await readFile(file, 'utf8').catch(() => '');
  for (const c of controlli) {
    if (c.fuoriDaiTest && eFileDiTest(relativo)) continue;
    for (const m of testo.matchAll(c.regex)) problemi.push(`${relativo}: ${c.nome} (${m[0].slice(0, 12)}…)`);
  }
  for (const m of testo.matchAll(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    if (ruoloJwt(m[0]) === 'service_role') problemi.push(`${relativo}: token con ruolo service_role`);
  }
}

if (problemi.length > 0) {
  console.error('scan:secrets: TROVATI POSSIBILI SEGRETI O DATI PERSONALI:');
  for (const p of problemi) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('scan:secrets: nessun segreto né codice fiscale trovato.');
