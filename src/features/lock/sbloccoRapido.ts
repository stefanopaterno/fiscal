import type { SupabaseClient } from '@supabase/supabase-js';
import {
  apriCassaforte,
  chiudiInCassaforte,
  creaCassaforte,
  type Busta,
  type Cassaforte,
} from './cassaforte';
import { MAX_RIFIUTI_SBLOCCO, puoSbloccareRapido, type EsitoSblocco } from './regole';

/**
 * Sblocco rapido con Face ID / impronta / PIN del dispositivo (T081, research D-08, FR-019, FR-020).
 * Usa WebAuthn con l'estensione PRF solo per ricavare una chiave sul dispositivo: non è un login,
 * non crea sessioni nuove, riapre la sessione già esistente chiusa nella cassaforte.
 * Tutto resta su questo dispositivo (localStorage): su un dispositivo nuovo servono password e codice.
 */

const CHIAVE_ATTIVAZIONE = 'fiscal.sbloccoRapido';
const CHIAVE_SESSIONE = 'fiscal.sessioneBloccata';
const CHIAVE_RIFIUTI = 'fiscal.rifiutiSblocco';

type Attivazione = { credenziale: string; sale: string; cassaforte: Cassaforte };
type SessioneBloccata = { busta: Busta; orarioUltimoCodice?: number; accessoCompletoGiorni: number };

const leggi = <T>(chiave: string): T | null => {
  try {
    const v = localStorage.getItem(chiave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};
const scrivi = (chiave: string, valore: unknown) => {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    // archivio del browser non disponibile: lo sblocco rapido semplicemente non sarà offerto
  }
};
const togli = (chiave: string) => {
  try {
    localStorage.removeItem(chiave);
  } catch {
    // niente da fare
  }
};

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const daB64url = (t: string) =>
  Uint8Array.from(
    atob(
      t
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(t.length / 4) * 4, '='),
    ),
    (c) => c.charCodeAt(0),
  );

type RisultatiPrf = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };
const casuale = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/** Il dispositivo ha un sistema di verifica dell'utente (Face ID, impronta, PIN)? */
export async function dispositivoCompatibile(): Promise<boolean> {
  if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function segretoPrf(credenziale: string, sale: Uint8Array): Promise<ArrayBuffer> {
  const asserzione = (await navigator.credentials.get({
    publicKey: {
      challenge: casuale(32),
      allowCredentials: [{ type: 'public-key', id: daB64url(credenziale) }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: { prf: { eval: { first: sale } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  const primo = (asserzione?.getClientExtensionResults() as RisultatiPrf | undefined)?.prf?.results?.first;
  if (!primo) throw new Error('non_supportato');
  return primo;
}

/**
 * Verifica del dispositivo (Face ID, impronta o PIN) senza toccare la sessione: serve a mostrare per pochi
 * secondi i nomi completi dei pazienti (specifica 005, FR-013). Falso se non attivo qui o se la verifica fallisce.
 */
export async function verificaConDispositivo(): Promise<boolean> {
  const attivazione = leggi<Attivazione>(CHIAVE_ATTIVAZIONE);
  if (!attivazione) return false;
  try {
    await segretoPrf(attivazione.credenziale, daB64url(attivazione.sale));
    return true;
  } catch {
    return false;
  }
}

/** Attiva lo sblocco rapido su QUESTO dispositivo (chiede Face ID / impronta). */
export async function attivaSbloccoRapido(): Promise<void> {
  const sale = casuale(32);
  const credenziale = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Fiscal', id: window.location.hostname },
      user: { id: casuale(16), name: 'Fiscal', displayName: 'Fiscal · sblocco rapido' },
      challenge: casuale(32),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
      extensions: { prf: { eval: { first: sale } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!credenziale) throw new Error('annullato');
  const id = b64url(credenziale.rawId);
  const risultati = credenziale.getClientExtensionResults() as RisultatiPrf;
  if (risultati.prf?.enabled === false) throw new Error('non_supportato');
  // Alcuni dispositivi danno il segreto subito, altri solo con una seconda verifica.
  const segreto = risultati.prf?.results?.first ?? (await segretoPrf(id, sale));
  scrivi(CHIAVE_ATTIVAZIONE, {
    credenziale: id,
    sale: b64url(sale),
    cassaforte: await creaCassaforte(segreto),
  });
  togli(CHIAVE_RIFIUTI);
}

export function disattivaSbloccoRapido(): void {
  togli(CHIAVE_ATTIVAZIONE);
  togli(CHIAVE_SESSIONE);
  togli(CHIAVE_RIFIUTI);
}

export function sbloccoRapidoAttivoQui(): boolean {
  return leggi<Attivazione>(CHIAVE_ATTIVAZIONE) !== null;
}

function orarioCodice(token: string): number | undefined {
  try {
    const p = token.split('.')[1] ?? '';
    const contenuto = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
    return (contenuto.amr as Array<{ method: string; timestamp: number }> | undefined)?.find(
      (v) => v.method === 'totp',
    )?.timestamp;
  } catch {
    return undefined;
  }
}

/** Toglie dal dispositivo la sessione di Supabase SENZA annullarla sul server. */
function togliSessioneLocale() {
  try {
    for (const k of Object.keys(localStorage)) if (/^sb-.*-auth-token/.test(k)) localStorage.removeItem(k);
  } catch {
    // niente da fare
  }
}

/**
 * Blocca l'app (T079). Con sblocco rapido attivo: la sessione va in cassaforte e sparisce dal dispositivo.
 * Senza: uscita completa (al rientro servono password e codice).
 */
export async function blocca(supabase: SupabaseClient, accessoCompletoGiorni: number): Promise<void> {
  const attivazione = leggi<Attivazione>(CHIAVE_ATTIVAZIONE);
  const { data } = await supabase.auth.getSession();
  const sessione = data.session;
  if (attivazione && sessione) {
    const busta = await chiudiInCassaforte(
      attivazione.cassaforte.pubblica,
      JSON.stringify({ access_token: sessione.access_token, refresh_token: sessione.refresh_token }),
    );
    scrivi(CHIAVE_SESSIONE, {
      busta,
      orarioUltimoCodice: orarioCodice(sessione.access_token),
      accessoCompletoGiorni,
    } satisfies SessioneBloccata);
    await supabase.auth.stopAutoRefresh();
    togliSessioneLocale();
  } else {
    await supabase.auth.signOut({ scope: 'local' });
  }
}

/** Si può offrire lo sblocco rapido adesso, su questo dispositivo? */
export function valutaSbloccoRapido(adesso = Date.now()): EsitoSblocco {
  const sessione = leggi<SessioneBloccata>(CHIAVE_SESSIONE);
  return puoSbloccareRapido({
    attivo: sbloccoRapidoAttivoQui(),
    prfDisponibile: sbloccoRapidoAttivoQui(),
    sessioneCifrata: sessione !== null,
    orarioUltimoCodice: sessione?.orarioUltimoCodice,
    accessoCompletoGiorni: sessione?.accessoCompletoGiorni ?? 14,
    rifiuti: Number(leggi<number>(CHIAVE_RIFIUTI) ?? 0),
    adesso,
  });
}

/** Rinuncia alla sessione bloccata: al prossimo ingresso servono password e codice. */
export function dimenticaSessioneBloccata(): void {
  togli(CHIAVE_SESSIONE);
  togli(CHIAVE_RIFIUTI);
}

export type EsitoTentativo = { ok: true } | { ok: false; rifiutiRimasti: number; definitivo: boolean };

/** Sblocca con Face ID / impronta e riapre la STESSA sessione (FR-020). */
export async function sblocca(supabase: SupabaseClient): Promise<EsitoTentativo> {
  const attivazione = leggi<Attivazione>(CHIAVE_ATTIVAZIONE);
  const sessione = leggi<SessioneBloccata>(CHIAVE_SESSIONE);
  if (!attivazione || !sessione) return { ok: false, rifiutiRimasti: 0, definitivo: true };
  try {
    const segreto = await segretoPrf(attivazione.credenziale, daB64url(attivazione.sale));
    const dati = JSON.parse(await apriCassaforte(segreto, attivazione.cassaforte, sessione.busta)) as {
      access_token: string;
      refresh_token: string;
    };
    const { error } = await supabase.auth.setSession(dati);
    dimenticaSessioneBloccata();
    if (error) return { ok: false, rifiutiRimasti: 0, definitivo: true }; // sessione chiusa altrove
    await supabase.auth.startAutoRefresh();
    return { ok: true };
  } catch {
    const rifiuti = Number(leggi<number>(CHIAVE_RIFIUTI) ?? 0) + 1;
    scrivi(CHIAVE_RIFIUTI, rifiuti);
    const definitivo = rifiuti >= MAX_RIFIUTI_SBLOCCO;
    if (definitivo) dimenticaSessioneBloccata();
    return { ok: false, rifiutiRimasti: Math.max(0, MAX_RIFIUTI_SBLOCCO - rifiuti), definitivo };
  }
}
