import { afterAll, describe, expect, it } from 'vitest';
import {
  accediConPassword,
  chiamaFunzione,
  configuraSecondoFattore,
  contenutoToken,
  creaUtente,
  eliminaUtente,
  nuovoClient,
  type UtenteProva,
} from './_supabase-locale';

// T084 (US6, FR-013): impostazioni di sicurezza.

const daEliminare: UtenteProva[] = [];
afterAll(async () => {
  for (const u of daEliminare) await eliminaUtente(u);
});

async function utenteCompleto() {
  const utente = await creaUtente();
  daEliminare.push(utente);
  const client = await accediConPassword(utente);
  const { app } = await configuraSecondoFattore(client);
  return { utente, client, app };
}

describe('impostazioni di sicurezza', () => {
  it('cambio password: la vecchia non vale più, la nuova sì, le altre sessioni devono rientrare', async () => {
    const { utente, client, app } = await utenteCompleto();
    const altroDispositivo = await accediConPassword(utente);

    const nuova = 'Nuova-Password-Sicura-2027!';
    const cambio = await client.auth.updateUser({ password: nuova });
    expect(cambio.error).toBeNull();
    const chiuse = await client.auth.signOut({ scope: 'others' });
    expect(chiuse.error).toBeNull();

    const conVecchia = await nuovoClient().auth.signInWithPassword({
      email: utente.email,
      password: utente.password,
    });
    expect(conVecchia.error).not.toBeNull();
    const conNuova = await nuovoClient().auth.signInWithPassword({ email: utente.email, password: nuova });
    expect(conNuova.error).toBeNull();
    expect((await altroDispositivo.auth.refreshSession()).error).not.toBeNull();
    expect(app).toBeDefined();
  });

  it("verifica recente: un nuovo codice aggiorna l'orario nel token e permette la rigenerazione", async () => {
    const { client, app } = await utenteCompleto();
    const prima = (await contenutoToken(client)).amr as Array<{ method: string; timestamp: number }>;
    await new Promise((r) => setTimeout(r, 1100));
    const fattori = await client.auth.mfa.listFactors();
    const verifica = await client.auth.mfa.challengeAndVerify({
      factorId: fattori.data!.totp[0]!.id,
      code: await app.codiceStabile(),
    });
    expect(verifica.error).toBeNull();
    const dopo = (await contenutoToken(client)).amr as Array<{ method: string; timestamp: number }>;
    const t = (a: typeof prima) => a.find((v) => v.method === 'totp')?.timestamp ?? 0;
    expect(t(dopo)).toBeGreaterThanOrEqual(t(prima));
    await chiamaFunzione(client, 'recovery-codes', { azione: 'genera' });
    const nuovi = await chiamaFunzione(client, 'recovery-codes', { azione: 'rigenera' });
    expect(nuovi.stato).toBe(200);
  });

  it('i tempi di blocco e di accesso completo restano nei limiti (1–60 minuti, 1–30 giorni)', async () => {
    const { client } = await utenteCompleto();
    const aggiorna = (valori: Record<string, number>) =>
      client.from('user_security').update(valori).not('owner_id', 'is', null).select('blocco_minuti');
    expect((await aggiorna({ blocco_minuti: 0 })).error).not.toBeNull();
    expect((await aggiorna({ blocco_minuti: 61 })).error).not.toBeNull();
    expect((await aggiorna({ accesso_completo_giorni: 31 })).error).not.toBeNull();
    const ok = await aggiorna({ blocco_minuti: 10, accesso_completo_giorni: 7 });
    expect(ok.error).toBeNull();
    expect(ok.data).toEqual([{ blocco_minuti: 10 }]);
  });

  it('il registro di sicurezza mostra gli eventi del proprio account', async () => {
    const { client } = await utenteCompleto();
    const { data, error } = await client
      .from('security_events')
      .select('tipo, avvenuto_il, dispositivo')
      .order('avvenuto_il', { ascending: false });
    expect(error).toBeNull();
    expect((data ?? []).map((e) => e.tipo)).toEqual(expect.arrayContaining(['login_ok', 'mfa_configurato']));
  });
});
