// Genera out/app/sw.js dopo la build (T017, prova S6, chiude TODO(PWA_NEXT)).
//
// Regole (costituzione, Hosting; contracts/app-routes-and-lock.md):
// - conserva SOLO i file dell'app esportati (pagine, script, stili, icone);
// - le richieste verso altri domini (Supabase compreso) non vengono mai intercettate: vanno sempre
//   in rete e nessuna risposta con dati dell'utente finisce nella cache;
// - una nuova build crea una nuova versione della cache e cancella le vecchie.

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cartellaApp = path.join(process.cwd(), 'out', 'app');

async function* file(cartella) {
  for (const voce of await readdir(cartella, { withFileTypes: true })) {
    const p = path.join(cartella, voce.name);
    if (voce.isDirectory()) yield* file(p);
    else yield p;
  }
}

const elenco = [];
const impronta = createHash('sha256');
for await (const f of file(cartellaApp)) {
  const relativo = path.relative(cartellaApp, f).split(path.sep).join('/');
  if (relativo === 'sw.js' || relativo.endsWith('.map')) continue;
  impronta.update(relativo).update(await readFile(f));
  // Le pagine si richiamano con la barra finale (trailingSlash): /app/accesso/ invece di /app/accesso/index.html
  const url = relativo.endsWith('index.html')
    ? `/app/${relativo.slice(0, -'index.html'.length)}`
    : `/app/${relativo}`;
  elenco.push(url);
}
elenco.sort();
const versione = impronta.digest('hex').slice(0, 16);

const codice = `// Generato da scripts/build-sw.mjs: non modificare a mano.
const VERSIONE = 'fiscal-${versione}';
const FILE_APP = ${JSON.stringify(elenco, null, 0)};

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSIONE).then((cache) => cache.addAll(FILE_APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== VERSIONE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;
  const url = new URL(richiesta.url);
  // Supabase e qualsiasi altro dominio: solo rete, mai cache (nessun dato dell'utente salvato qui).
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/app/')) return;

  if (url.pathname.startsWith('/app/_next/static/')) {
    // File con impronta nel nome: non cambiano mai, prima la cache.
    evento.respondWith(caches.match(richiesta).then((r) => r || fetch(richiesta)));
    return;
  }
  // Pagine e dati delle pagine: prima la rete (versione aggiornata), la cache solo senza rete.
  evento.respondWith(
    fetch(richiesta).catch(() =>
      caches.match(richiesta, { ignoreSearch: true }).then((r) => r || caches.match('/app/')),
    ),
  );
});
`;

await writeFile(path.join(cartellaApp, 'sw.js'), codice);
console.log(`build-sw: service worker versione ${versione} con ${elenco.length} file dell'app.`);
