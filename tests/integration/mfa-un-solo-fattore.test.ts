import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accediConPassword,
  admin,
  configuraSecondoFattore,
  creaUtente,
  eliminaUtente,
  type UtenteProva,
} from './_supabase-locale';

// T029, prova S1 (research D-04): chi conosce solo la password NON deve poter aggiungere
// un proprio secondo fattore e diventare aal2.

let utente: UtenteProva | undefined;

beforeAll(async () => {
  utente = await creaUtente();
  const client = await accediConPassword(utente);
  await configuraSecondoFattore(client);
  await client.auth.signOut();
});

afterAll(async () => {
  await eliminaUtente(utente);
});

describe('prova S1: un solo secondo fattore', () => {
  it('con la sola password non si può registrare un secondo fattore nuovo', async () => {
    const client = await accediConPassword(utente!);
    const livello = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(livello.data?.currentLevel).toBe('aal1');

    const tentativo = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'intruso' });
    expect(tentativo.error).not.toBeNull();

    const fattori = await admin.auth.admin.mfa.listFactors({ userId: utente!.id });
    expect(fattori.data?.factors).toHaveLength(1);
  });

  it('con la sola password non si può eliminare il secondo fattore esistente', async () => {
    const client = await accediConPassword(utente!);
    const fattori = await client.auth.mfa.listFactors();
    const id = fattori.data?.totp[0]?.id;
    expect(id).toBeDefined();
    const tentativo = await client.auth.mfa.unenroll({ factorId: id! });
    expect(tentativo.error).not.toBeNull();
    const rimasti = await admin.auth.admin.mfa.listFactors({ userId: utente!.id });
    expect(rimasti.data?.factors).toHaveLength(1);
  });
});
