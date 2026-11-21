import { afterAll, describe, expect, it } from 'vitest';
import {
  accediConPassword,
  admin,
  chiamaFunzione,
  configuraSecondoFattore,
  creaUtente,
  eliminaUtente,
  type UtenteProva,
} from './_supabase-locale';

// T059 (US4, FR-008, FR-009): codici di recupero, contro le funzioni Edge dello stack locale
// (`supabase functions serve --env-file supabase/functions/.env`).

const daEliminare: UtenteProva[] = [];
afterAll(async () => {
  for (const u of daEliminare) await eliminaUtente(u);
});

async function utenteConCodici() {
  const utente = await creaUtente();
  daEliminare.push(utente);
  const client = await accediConPassword(utente);
  await configuraSecondoFattore(client);
  const generati = await chiamaFunzione(client, 'recovery-codes', { azione: 'genera' });
  return { utente, client, generati };
}

describe('codici di recupero', () => {
  it('dopo la configurazione si generano 10 codici, mostrati una sola volta', async () => {
    const { client, generati } = await utenteConCodici();
    expect(generati.stato).toBe(200);
    const codici = generati.dati.codici as string[];
    expect(codici).toHaveLength(10);
    const ancora = await chiamaFunzione(client, 'recovery-codes', { azione: 'genera' });
    expect(ancora.dati).toEqual({ gia_presenti: true, residui: 10 });
  });

  it('senza accesso completo non si generano codici', async () => {
    const utente = await creaUtente();
    daEliminare.push(utente);
    const client = await accediConPassword(utente);
    const r = await chiamaFunzione(client, 'recovery-codes', { azione: 'genera' });
    expect(r.stato).toBe(403);
  });

  it('perso il telefono: con un codice valido si toglie il fattore e si configura un nuovo telefono', async () => {
    const { utente, generati } = await utenteConCodici();
    const codice = (generati.dati.codici as string[])[0]!;

    const soloPassword = await accediConPassword(utente);
    const errato = await chiamaFunzione(soloPassword, 'recovery-code', { codice: 'AAAA-BBBB-CCCC-DDDD' });
    expect(errato.stato).toBe(401);

    const ok = await chiamaFunzione(soloPassword, 'recovery-code', { codice: codice.toLowerCase() });
    expect(ok.stato).toBe(200);
    expect(ok.dati.stato).toBe('fattore_rimosso');
    expect(ok.dati.codici_residui).toBe(9);
    const fattori = await admin.auth.admin.mfa.listFactors({ userId: utente.id });
    expect(fattori.data?.factors ?? []).toHaveLength(0);

    // Il codice usato non vale più
    const riuso = await chiamaFunzione(soloPassword, 'recovery-code', { codice });
    expect(riuso.stato).toBe(401);

    // Nuovo telefono: si configura un nuovo fattore e i dati sono tutti lì
    const nuovo = await accediConPassword(utente);
    await configuraSecondoFattore(nuovo);
    const dati = await nuovo.from('user_security').select('owner_id');
    expect(dati.data).toEqual([{ owner_id: utente.id }]);
  });

  it('con accesso completo il codice di recupero non serve (400)', async () => {
    const { client, generati } = await utenteConCodici();
    const r = await chiamaFunzione(client, 'recovery-code', {
      codice: (generati.dati.codici as string[])[0],
    });
    expect(r.stato).toBe(400);
  });

  it('5 codici sbagliati bloccano i tentativi per 15 minuti (429)', async () => {
    const { utente, generati } = await utenteConCodici();
    const soloPassword = await accediConPassword(utente);
    for (let i = 0; i < 5; i++) {
      const r = await chiamaFunzione(soloPassword, 'recovery-code', { codice: `AAAA-BBBB-CCCC-DDD${i}` });
      expect(r.stato).toBe(401);
    }
    const bloccato = await chiamaFunzione(soloPassword, 'recovery-code', {
      codice: (generati.dati.codici as string[])[1],
    });
    expect(bloccato.stato).toBe(429);
    expect(bloccato.dati.riprova_dopo).toBe(900);
  });

  it('la rigenerazione invalida i codici vecchi', async () => {
    const { utente, client, generati } = await utenteConCodici();
    const nuovi = await chiamaFunzione(client, 'recovery-codes', { azione: 'rigenera' });
    expect(nuovi.stato).toBe(200);
    expect(nuovi.dati.lotto).toBe(2);
    const soloPassword = await accediConPassword(utente);
    const vecchio = await chiamaFunzione(soloPassword, 'recovery-code', {
      codice: (generati.dati.codici as string[])[0],
    });
    expect(vecchio.stato).toBe(401);
  });
});
