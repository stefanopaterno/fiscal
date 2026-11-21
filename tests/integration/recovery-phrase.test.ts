import { afterAll, describe, expect, it } from 'vitest';
import {
  accediConPassword,
  admin,
  chiamaFunzione,
  configuraSecondoFattore,
  creaUtente,
  eliminaUtente,
  emailRicevute,
  type UtenteProva,
} from './_supabase-locale';

// T060 (US4, FR-023, FR-024): frase di recupero con attesa di 48 ore e avviso via e-mail.

const FRASE = 'il gatto rosso mangia la torta di mele';
const daEliminare: UtenteProva[] = [];
afterAll(async () => {
  for (const u of daEliminare) await eliminaUtente(u);
});

async function utenteConFrase() {
  const utente = await creaUtente();
  daEliminare.push(utente);
  const client = await accediConPassword(utente);
  const { app } = await configuraSecondoFattore(client);
  const r = await chiamaFunzione(client, 'recovery-phrase', { azione: 'imposta', frase: FRASE });
  expect(r.stato).toBe(200);
  await client.auth.signOut();
  return { utente, app };
}

describe('frase di recupero', () => {
  it('una frase troppo corta viene rifiutata', async () => {
    const utente = await creaUtente();
    daEliminare.push(utente);
    const client = await accediConPassword(utente);
    await configuraSecondoFattore(client);
    const r = await chiamaFunzione(client, 'recovery-phrase', { azione: 'imposta', frase: 'corta' });
    expect(r.stato).toBe(400);
  });

  it("avvia il ripristino con 48 ore di attesa e manda l'e-mail di avviso", async () => {
    const { utente } = await utenteConFrase();
    const client = await accediConPassword(utente);

    const sbagliata = await chiamaFunzione(client, 'recovery-phrase', {
      azione: 'avvia',
      frase: 'frase del tutto sbagliata qui',
    });
    expect(sbagliata.stato).toBe(401);

    const avvio = await chiamaFunzione(client, 'recovery-phrase', {
      azione: 'avvia',
      frase: `  ${FRASE.toUpperCase()} `,
    });
    expect(avvio.stato).toBe(200);
    const richiesta = avvio.dati.richiesta as { stato: string; esegui_dopo: string };
    expect(richiesta.stato).toBe('in_attesa');
    const ore = (new Date(richiesta.esegui_dopo).getTime() - Date.now()) / 3_600_000;
    expect(ore).toBeGreaterThan(47.9);
    expect(ore).toBeLessThanOrEqual(48);

    const email = await emailRicevute(utente.email);
    expect(email.some((m) => m.Subject.includes('ripristino'))).toBe(true);

    // Prima della scadenza non si completa
    const presto = await chiamaFunzione(client, 'recovery-phrase', { azione: 'completa' });
    expect(presto.stato).toBe(409);

    // Trascorse le 48 ore (simulate) il ripristino si completa: fattore tolto, frase non più valida
    await admin
      .from('recovery_requests')
      .update({ esegui_dopo: new Date(Date.now() - 60_000).toISOString() })
      .eq('owner_id', utente.id)
      .eq('stato', 'in_attesa');
    const fine = await chiamaFunzione(client, 'recovery-phrase', { azione: 'completa' });
    expect(fine.stato).toBe(200);
    const fattori = await admin.auth.admin.mfa.listFactors({ userId: utente.id });
    expect(fattori.data?.factors ?? []).toHaveLength(0);
    const frase = await admin.rpc('recupero_dati_frase', { p_owner: utente.id });
    expect((frase.data as Array<{ hash: string | null }>)[0]?.hash).toBeNull();
  });

  it('un accesso con password e codice annulla il ripristino in attesa', async () => {
    const { utente, app } = await utenteConFrase();
    const intruso = await accediConPassword(utente);
    const avvio = await chiamaFunzione(intruso, 'recovery-phrase', { azione: 'avvia', frase: FRASE });
    expect(avvio.stato).toBe(200);

    // Il vero proprietario entra con il codice
    const proprietario = await accediConPassword(utente);
    const fattori = await proprietario.auth.mfa.listFactors();
    await proprietario.auth.mfa.challengeAndVerify({
      factorId: fattori.data!.totp[0]!.id,
      code: app.codiceAdesso(),
    });

    // La richiesta risulta annullata per "accesso valido"...
    const richieste = await admin
      .from('recovery_requests')
      .select('stato, motivo_chiusura')
      .eq('owner_id', utente.id);
    expect(richieste.data).toEqual([{ stato: 'annullata', motivo_chiusura: 'accesso_valido' }]);
    // ...e Supabase ha chiuso la sessione dell'intruso (solo password): non può più completare nulla.
    const completa = await chiamaFunzione(intruso, 'recovery-phrase', { azione: 'completa' });
    expect(completa.stato).toBe(401);
  });

  it('5 frasi sbagliate bloccano il recupero per 24 ore (423)', async () => {
    const { utente } = await utenteConFrase();
    const client = await accediConPassword(utente);
    for (let i = 0; i < 4; i++) {
      const r = await chiamaFunzione(client, 'recovery-phrase', {
        azione: 'avvia',
        frase: `tentativo sbagliato numero ${i}`,
      });
      expect(r.stato).toBe(401);
    }
    const quinto = await chiamaFunzione(client, 'recovery-phrase', {
      azione: 'avvia',
      frase: 'ultimo tentativo sbagliato',
    });
    expect(quinto.stato).toBe(423);
    const anche = await chiamaFunzione(client, 'recovery-phrase', { azione: 'avvia', frase: FRASE });
    expect(anche.stato).toBe(423);
  });

  it("l'utente può annullare da solo il ripristino", async () => {
    const { utente } = await utenteConFrase();
    const client = await accediConPassword(utente);
    await chiamaFunzione(client, 'recovery-phrase', { azione: 'avvia', frase: FRASE });
    const annulla = await chiamaFunzione(client, 'recovery-phrase', { azione: 'annulla' });
    expect(annulla.dati.annullata).toBe(true);
    const stato = await chiamaFunzione(client, 'recovery-phrase', { azione: 'stato' });
    expect(stato.dati.richiesta).toBeNull();
  });
});
