import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accediConPassword,
  configuraSecondoFattore,
  contenutoToken,
  creaUtente,
  eliminaUtente,
  nuovoClient,
  type UtenteProva,
} from './_supabase-locale';

// T028 (US1, FR-001, FR-002, FR-012) e prova S3 (research D-09), sullo stack locale.

let utente: UtenteProva | undefined;
let authenticatorUtente: ReturnType<typeof import('./_supabase-locale').authenticator>;

beforeAll(async () => {
  utente = await creaUtente();
  const client = await accediConPassword(utente);
  const { app } = await configuraSecondoFattore(client);
  authenticatorUtente = app;
  await client.auth.signOut();
});

afterAll(async () => {
  await eliminaUtente(utente);
});

describe('accesso con password e secondo fattore', () => {
  it('con la sola password la sessione è aal1 e il database non restituisce nulla', async () => {
    const client = await accediConPassword(utente!);
    const livello = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(livello.data?.currentLevel).toBe('aal1');
    expect(livello.data?.nextLevel).toBe('aal2');

    const impostazioni = await client.from('user_security').select('owner_id');
    expect(impostazioni.data ?? []).toHaveLength(0);
    const eventi = await client.from('security_events').select('id');
    expect(eventi.data ?? []).toHaveLength(0);
    const richieste = await client.from('recovery_requests').select('id');
    expect(richieste.data ?? []).toHaveLength(0);
    const codici = await client.from('recovery_codes').select('id');
    expect(codici.error).not.toBeNull();
  });

  it('con password e codice giusto la sessione è aal2 e i propri dati sono visibili', async () => {
    const client = await accediConPassword(utente!);
    const fattori = await client.auth.mfa.listFactors();
    const fattore = fattori.data?.totp[0];
    expect(fattore).toBeDefined();
    const verifica = await client.auth.mfa.challengeAndVerify({
      factorId: fattore!.id,
      code: authenticatorUtente.codiceAdesso(),
    });
    expect(verifica.error).toBeNull();
    const livello = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(livello.data?.currentLevel).toBe('aal2');

    const impostazioni = await client.from('user_security').select('owner_id, blocco_minuti');
    expect(impostazioni.data).toEqual([{ owner_id: utente!.id, blocco_minuti: 5 }]);
  });

  it('un codice sbagliato è rifiutato e la sessione resta aal1', async () => {
    const client = await accediConPassword(utente!);
    const fattori = await client.auth.mfa.listFactors();
    const sbagliato = authenticatorUtente.codiceAdesso() === '000000' ? '111111' : '000000';
    const verifica = await client.auth.mfa.challengeAndVerify({
      factorId: fattori.data!.totp[0]!.id,
      code: sbagliato,
    });
    expect(verifica.error).not.toBeNull();
    const livello = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(livello.data?.currentLevel).toBe('aal1');
  });

  it('una password sbagliata non dà nessuna sessione', async () => {
    const client = nuovoClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: utente!.email,
      password: 'sbagliata-123',
    });
    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it('i limiti di tentativi sono dichiarati nella configurazione (FR-012)', () => {
    const config = readFileSync(path.resolve(__dirname, '../../supabase/config.toml'), 'utf8');
    expect(config).toMatch(/\[auth\.rate_limit\][\s\S]*sign_in_sign_ups\s*=\s*\d+/);
    expect(config).toMatch(/\[auth\.rate_limit\][\s\S]*token_verifications\s*=\s*\d+/);
  });
});

describe('prova S3: orario della verifica nel token', () => {
  it("il token aal2 porta l'orario del codice (amr totp) e il rinnovo non lo cambia", async () => {
    const client = await accediConPassword(utente!);
    const fattori = await client.auth.mfa.listFactors();
    await client.auth.mfa.challengeAndVerify({
      factorId: fattori.data!.totp[0]!.id,
      code: authenticatorUtente.codiceAdesso(),
    });

    const prima = await contenutoToken(client);
    const amrPrima = (prima.amr as Array<{ method: string; timestamp: number }>) ?? [];
    const totpPrima = amrPrima.find((v) => v.method === 'totp');
    expect(totpPrima?.timestamp).toBeGreaterThan(0);

    await new Promise((r) => setTimeout(r, 1100));
    const rinnovo = await client.auth.refreshSession();
    expect(rinnovo.error).toBeNull();
    const dopo = await contenutoToken(client);
    const totpDopo = ((dopo.amr as Array<{ method: string; timestamp: number }>) ?? []).find(
      (v) => v.method === 'totp',
    );
    expect(dopo.aal).toBe('aal2');
    expect(totpDopo?.timestamp).toBe(totpPrima?.timestamp);

    // E il database, dopo il rinnovo, continua a riconoscere l'accesso completo.
    const impostazioni = await client.from('user_security').select('owner_id');
    expect(impostazioni.data).toHaveLength(1);
  });
});
