// Parti comuni delle funzioni Edge di Fiscal (Deno): risposte, origini consentite, utente.
// Contratto: specs/002-accesso-protetto-2fa/contracts/edge-functions.md

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const ambiente = (nome: string): string => Deno.env.get(nome) ?? '';

/** Client con chiave di servizio: SOLO dentro le funzioni Edge, mai nel browser. */
export function clientServizio(): SupabaseClient {
  return createClient(ambiente('SUPABASE_URL'), ambiente('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function intestazioniCors(richiesta: Request): Record<string, string> {
  const origine = richiesta.headers.get('Origin') ?? '';
  const consentite = (ambiente('ORIGINI_CONSENTITE') || 'https://fiscal.soarlyai.com')
    .split(',')
    .map((o) => o.trim());
  return {
    ...(consentite.includes(origine) ? { 'Access-Control-Allow-Origin': origine, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  };
}

export function rispostaJson(richiesta: Request, stato: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status: stato,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...intestazioniCors(richiesta),
    },
  });
}

/** Errore secondo la convenzione del contratto: { errore, messaggio, riprova_dopo }. */
export function errore(
  richiesta: Request,
  stato: number,
  codice: string,
  messaggio: string,
  riprovaDopo: number | null = null,
): Response {
  return rispostaJson(richiesta, stato, { errore: codice, messaggio, riprova_dopo: riprovaDopo });
}

/** Risposta alle richieste preliminari del browser (CORS) e controllo del metodo. */
export function preliminari(richiesta: Request): Response | null {
  if (richiesta.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: intestazioniCors(richiesta) });
  if (richiesta.method !== 'POST') return errore(richiesta, 405, 'metodo', 'Usare POST.');
  return null;
}

export type Utente = { id: string; email: string | undefined; aal: string; orarioTotp: number | undefined };

/** L'utente della richiesta, con il token verificato dal server di autenticazione. */
export async function utenteDallaRichiesta(richiesta: Request): Promise<Utente | null> {
  const token = (richiesta.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await clientServizio().auth.getUser(token);
  if (error || !data.user) return null;
  const parte = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
  const contenuto = JSON.parse(atob(parte.padEnd(Math.ceil(parte.length / 4) * 4, '=')));
  const amr = (contenuto.amr ?? []) as Array<{ method: string; timestamp: number }>;
  return {
    id: data.user.id,
    email: data.user.email,
    aal: String(contenuto.aal ?? 'aal1'),
    orarioTotp: amr.find((v) => v.method === 'totp')?.timestamp,
  };
}

/** Verifica recente: codice a 6 cifre inserito negli ultimi 5 minuti (operazioni sensibili). */
export function verificaRecente(utente: Utente, secondi = 300): boolean {
  return utente.orarioTotp !== undefined && Date.now() / 1000 - utente.orarioTotp <= secondi;
}

/** Elimina il secondo fattore dell'utente (dopo un codice o una frase di recupero validi). */
export async function eliminaSecondoFattore(utenteId: string): Promise<void> {
  const admin = clientServizio().auth.admin.mfa;
  const { data, error } = await admin.listFactors({ userId: utenteId });
  if (error) throw error;
  for (const fattore of data?.factors ?? []) {
    const r = await admin.deleteFactor({ id: fattore.id, userId: utenteId });
    if (r.error) throw r.error;
  }
}
