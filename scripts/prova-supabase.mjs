// T037: prove S1 e S3 sul progetto Supabase VERO (research D-04, D-09).
// Uso:  node scripts/prova-supabase.mjs
// Legge indirizzo e chiave pubblica da .env.local; e-mail, password e codice li chiede alla tastiera
// e non li salva da nessuna parte. Stampa solo gli esiti. Prerequisito: il secondo fattore è già
// configurato (prima configurazione fatta dall'app).

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';

function leggiEnvLocale() {
  const valori = {};
  for (const riga of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(riga.trim());
    if (m) valori[m[1]] = m[2];
  }
  return valori;
}

function chiedi(domanda, nascosto = false) {
  return new Promise((risolvi) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (nascosto) {
      rl._writeToOutput = (s) => {
        if (s.includes(domanda)) rl.output.write(s);
      };
    }
    rl.question(domanda, (risposta) => {
      rl.close();
      if (nascosto) process.stdout.write('\n');
      risolvi(risposta.trim());
    });
  });
}

const contenutoToken = (sessione) =>
  JSON.parse(Buffer.from(sessione.access_token.split('.')[1], 'base64url').toString('utf8'));
const orarioTotp = (token) => (token.amr ?? []).find((v) => v.method === 'totp')?.timestamp;
const esito = (ok, testo) => console.log(`${ok ? 'OK  ' : 'NO  '} ${testo}`);

const env = leggiEnvLocale();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = await chiedi('E-mail: ');
const password = await chiedi('Password (non viene mostrata): ', true);

const accesso = await supabase.auth.signInWithPassword({ email, password });
if (accesso.error) {
  console.error('Accesso non riuscito:', accesso.error.message);
  process.exit(1);
}
let tutto = true;

const livello1 = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
esito(
  livello1.data?.currentLevel === 'aal1',
  `dopo la sola password il livello è ${livello1.data?.currentLevel}`,
);
if (livello1.data?.nextLevel !== 'aal2') {
  console.error("Il secondo fattore non è ancora configurato: fai prima la configurazione dall'app.");
  process.exit(1);
}
const righeAal1 = await supabase.from('user_security').select('owner_id');
const zero = (righeAal1.data ?? []).length === 0;
esito(zero, 'con la sola password il database non restituisce dati');
tutto &&= zero;

// S1: con la sola password non si deve poter aggiungere un secondo fattore
const intruso = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'prova-S1' });
const s1 = Boolean(intruso.error);
esito(s1, 'S1: con la sola password NON si può aggiungere un secondo fattore');
if (!s1 && intruso.data) await supabase.auth.mfa.unenroll({ factorId: intruso.data.id });
tutto &&= s1;

const codice = await chiedi('Codice a 6 cifre di Google Authenticator: ');
const fattori = await supabase.auth.mfa.listFactors();
const verifica = await supabase.auth.mfa.challengeAndVerify({
  factorId: fattori.data.totp[0].id,
  code: codice,
});
if (verifica.error) {
  console.error('Codice non accettato:', verifica.error.message);
  process.exit(1);
}
const sessione1 = (await supabase.auth.getSession()).data.session;
const prima = orarioTotp(contenutoToken(sessione1));
esito(
  Boolean(prima),
  `S3: il token contiene l'orario del codice (${prima ? new Date(prima * 1000).toLocaleString('it-IT') : 'assente'})`,
);
const righeAal2 = await supabase.from('user_security').select('owner_id');
esito((righeAal2.data ?? []).length === 1, 'con password e codice il database restituisce i tuoi dati');
tutto &&= Boolean(prima) && (righeAal2.data ?? []).length === 1;

await new Promise((r) => setTimeout(r, 1500));
const rinnovo = await supabase.auth.refreshSession();
const dopo = rinnovo.data.session ? orarioTotp(contenutoToken(rinnovo.data.session)) : undefined;
const s3 = Boolean(prima) && dopo === prima;
esito(s3, "S3: dopo il rinnovo del token l'orario del codice non cambia");
const righeDopo = await supabase.from('user_security').select('owner_id');
esito((righeDopo.data ?? []).length === 1, "dopo il rinnovo il database riconosce ancora l'accesso completo");
tutto &&= s3 && (righeDopo.data ?? []).length === 1;

await supabase.auth.signOut();
console.log(
  tutto ? '\nTutte le prove sono superate.' : '\nAlcune prove NON sono superate: manda questo risultato.',
);
process.exit(tutto ? 0 : 1);
