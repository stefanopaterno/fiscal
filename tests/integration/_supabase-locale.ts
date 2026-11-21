import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Secret, TOTP } from 'otpauth';

/**
 * Supporto ai test di integrazione: SOLO lo stack locale (`supabase start`), mai il progetto vero.
 * Indirizzi e chiavi locali vengono letti al momento da `supabase status`: non sono mai scritti in un file.
 */
function leggiAmbienteLocale(): Record<string, string> {
  const testo = execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' });
  const ambiente: Record<string, string> = {};
  for (const riga of testo.split('\n')) {
    const m = /^([A-Z_]+)="?([^"]*)"?$/.exec(riga.trim());
    if (m?.[1] && m[2] !== undefined) ambiente[m[1]] = m[2];
  }
  if (!ambiente.API_URL?.startsWith('http://127.0.0.1')) {
    throw new Error('I test di integrazione girano solo sullo stack locale: eseguire `supabase start`.');
  }
  return ambiente;
}

const locale = leggiAmbienteLocale();
export const API_URL = locale.API_URL!;
const CHIAVE_PUBBLICA = locale.PUBLISHABLE_KEY ?? locale.ANON_KEY ?? '';
const CHIAVE_SERVIZIO_LOCALE = locale.SERVICE_ROLE_KEY ?? locale.SECRET_KEY ?? '';

const opzioni = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Client come quello dell'app: solo chiave pubblica. */
export const nuovoClient = (): SupabaseClient => createClient(API_URL, CHIAVE_PUBBLICA, opzioni);

/** Client amministrativo dello stack LOCALE, solo per preparare e pulire i dati di prova. */
export const admin = createClient(API_URL, CHIAVE_SERVIZIO_LOCALE, opzioni);

export { CHIAVE_PUBBLICA };

/** Elenco di tutte le tabelle esposte dall'API (dallo schema OpenAPI dello stack locale). */
export async function tabellePubbliche(): Promise<string[]> {
  const r = await fetch(`${API_URL}/rest/v1/`, {
    headers: {
      apikey: CHIAVE_SERVIZIO_LOCALE,
      Authorization: `Bearer ${CHIAVE_SERVIZIO_LOCALE}`,
      Accept: 'application/openapi+json',
    },
  });
  const schema = (await r.json()) as { paths?: Record<string, unknown> };
  return Object.keys(schema.paths ?? {})
    .filter((p) => p !== '/' && !p.startsWith('/rpc/'))
    .map((p) => p.slice(1))
    .sort();
}

/** Chiama una funzione Edge locale con la sessione del client (come fa l'app). */
export async function chiamaFunzione(
  client: SupabaseClient,
  nome: string,
  corpo: Record<string, unknown>,
): Promise<{ stato: number; dati: Record<string, unknown> }> {
  const { data } = await client.auth.getSession();
  const r = await fetch(`${API_URL}/functions/v1/${nome}`, {
    method: 'POST',
    headers: {
      apikey: CHIAVE_PUBBLICA,
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  });
  return { stato: r.status, dati: (await r.json().catch(() => ({}))) as Record<string, unknown> };
}

/** E-mail ricevute da un indirizzo nella casella finta dello stack locale (Mailpit). */
export async function emailRicevute(indirizzo: string): Promise<Array<{ Subject: string }>> {
  const r = await fetch(
    `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:"${indirizzo}"`)}`,
  );
  const json = (await r.json()) as { messages?: Array<{ Subject: string }> };
  return json.messages ?? [];
}

export type UtenteProva = { id: string; email: string; password: string };

export async function creaUtente(): Promise<UtenteProva> {
  const email = `prova-${randomUUID()}@example.test`;
  const password = `Prova-${randomUUID()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error('Utente di prova non creato');
  return { id: data.user.id, email, password };
}

export async function eliminaUtente(u: UtenteProva | undefined) {
  if (u) await admin.auth.admin.deleteUser(u.id);
}

export async function accediConPassword(u: UtenteProva): Promise<SupabaseClient> {
  const client = nuovoClient();
  const { error } = await client.auth.signInWithPassword({ email: u.email, password: u.password });
  if (error) throw error;
  return client;
}

/** Simula Google Authenticator: dal segreto restituito da Supabase calcola i codici a 6 cifre. */
export function authenticator(segreto: string) {
  const totp = new TOTP({ secret: Secret.fromBase32(segreto), digits: 6, period: 30, algorithm: 'SHA1' });
  return {
    codiceAdesso: () => totp.generate(),
    /** Codice del prossimo intervallo di 30 secondi: utile per non riusare lo stesso codice due volte. */
    codiceTra: (secondi: number) => totp.generate({ timestamp: Date.now() + secondi * 1000 }),
  };
}

/** Prima configurazione del secondo fattore; alla fine la sessione è aal2. */
export async function configuraSecondoFattore(client: SupabaseClient) {
  const { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `prova-${randomUUID()}`,
  });
  if (error || !data) throw error ?? new Error('Configurazione del secondo fattore non riuscita');
  const app = authenticator(data.totp.secret);
  const verifica = await client.auth.mfa.challengeAndVerify({ factorId: data.id, code: app.codiceAdesso() });
  if (verifica.error) throw verifica.error;
  return { factorId: data.id, app };
}

/** Legge il contenuto del token di accesso (senza verificarne la firma: solo per i test). */
export async function contenutoToken(client: SupabaseClient): Promise<Record<string, unknown>> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token ?? '';
  return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
}
