// Crea supabase/functions/.env per lo stack LOCALE (test sul Mac e su GitHub). Mai per il progetto vero.
// - RECOVERY_PEPPER casuale (cambia a ogni esecuzione: i codici generati prima non varranno più)
// - SMTP verso la casella finta Mailpit dello stack locale (per indirizzo IP: dentro le funzioni il nome
//   del contenitore non viene risolto)
// Uso: node scripts/env-funzioni-locali.mjs   poi   supabase functions serve --env-file supabase/functions/.env

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const file = 'supabase/functions/.env';
const progetto = /project_id\s*=\s*"([^"]+)"/.exec(readFileSync('supabase/config.toml', 'utf8'))?.[1];
const ip = execFileSync(
  'docker',
  [
    'inspect',
    `supabase_inbucket_${progetto}`,
    '--format',
    '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',
  ],
  { encoding: 'utf8' },
).trim();
if (!ip) {
  console.error('Mailpit dello stack locale non trovato: eseguire prima `supabase start`.');
  process.exit(1);
}

// Se esiste già, conserva il pepe (così i codici generati restano validi) e aggiorna solo l'IP.
const pepeEsistente = existsSync(file)
  ? /^RECOVERY_PEPPER=(.+)$/m.exec(readFileSync(file, 'utf8'))?.[1]
  : undefined;

writeFileSync(
  file,
  [
    '# SOLO stack locale (ignorato da git). Sul progetto vero: supabase secrets set.',
    `RECOVERY_PEPPER=${pepeEsistente ?? randomBytes(32).toString('base64url')}`,
    'ORIGINI_CONSENTITE=http://localhost:3000,http://localhost:4173,http://127.0.0.1:4173,http://localhost:4174',
    `AVVISO_SMTP_HOST=${ip}`,
    'AVVISO_SMTP_PORT=1025',
    'AVVISO_SMTP_SECURE=false',
    'AVVISO_MITTENTE=fiscal@localhost',
    '',
  ].join('\n'),
);
console.log(`Creato ${file} (Mailpit su ${ip}).`);
