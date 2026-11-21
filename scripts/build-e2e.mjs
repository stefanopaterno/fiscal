// Build per i test end-to-end: collega l'app allo stack LOCALE di Supabase (`supabase start`),
// mai al progetto vero. Indirizzo e chiave pubblica locali vengono letti da `supabase status`.
// Uso: npm run build:e2e   (poi npm run test:e2e)

import { execFileSync, execSync } from 'node:child_process';

const testo = execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' });
const valori = Object.fromEntries(
  testo
    .split('\n')
    .map((r) => /^([A-Z_]+)="?([^"]*)"?$/.exec(r.trim()))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const url = valori.API_URL;
const chiave = valori.PUBLISHABLE_KEY || valori.ANON_KEY;
if (!url?.startsWith('http://127.0.0.1') || !chiave) {
  console.error('build:e2e: stack locale non trovato. Eseguire `supabase start`.');
  process.exit(1);
}

execSync('npm run build', {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: chiave },
});
console.log('build:e2e: build collegata allo stack locale. Prima di pubblicare rifare `npm run build`.');
