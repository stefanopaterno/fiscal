import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accediConPassword,
  configuraSecondoFattore,
  contenutoToken,
  creaUtente,
  eliminaUtente,
  type UtenteProva,
} from './_supabase-locale';
import type { SupabaseClient } from '@supabase/supabase-js';

// T048 (US3, FR-006, FR-007): elenco e chiusura delle sessioni.

type Sessione = { id: string; corrente: boolean; browser: string | null };

let utente: UtenteProva | undefined;
let altro: UtenteProva | undefined;
let telefono: SupabaseClient;
let pc: SupabaseClient;
let codice: () => string;

async function accediCompleto(u: UtenteProva, cod: () => string): Promise<SupabaseClient> {
  const c = await accediConPassword(u);
  const f = await c.auth.mfa.listFactors();
  await c.auth.mfa.challengeAndVerify({ factorId: f.data!.totp[0]!.id, code: cod() });
  return c;
}

beforeAll(async () => {
  utente = await creaUtente();
  altro = await creaUtente();
  const primo = await accediConPassword(utente);
  codice = (await configuraSecondoFattore(primo)).app.codiceAdesso;
  telefono = primo;
  pc = await accediCompleto(utente, codice);
});

afterAll(async () => {
  await eliminaUtente(utente);
  await eliminaUtente(altro);
});

describe('sessioni', () => {
  it('ogni dispositivo vede le proprie sessioni e riconosce quella corrente', async () => {
    const { data, error } = await telefono.rpc('mie_sessioni');
    expect(error).toBeNull();
    const sessioni = data as Sessione[];
    expect(sessioni.length).toBeGreaterThanOrEqual(2);
    expect(sessioni.filter((s) => s.corrente)).toHaveLength(1);
    const idTelefono = (await contenutoToken(telefono)).session_id;
    expect(sessioni.find((s) => s.corrente)?.id).toBe(idTelefono);
  });

  it('non si può chiudere la sessione corrente (si usa "Esci")', async () => {
    const idTelefono = (await contenutoToken(telefono)).session_id as string;
    const { error } = await telefono.rpc('chiudi_mia_sessione', { p_id: idTelefono });
    expect(error).not.toBeNull();
  });

  it('non si può chiudere la sessione di un altro utente', async () => {
    const cAltro = await accediConPassword(altro!);
    await configuraSecondoFattore(cAltro);
    const idAltro = (await contenutoToken(cAltro)).session_id as string;
    const { data } = await telefono.rpc('chiudi_mia_sessione', { p_id: idAltro });
    expect(data).toBe(false);
    const ancora = await cAltro.from('user_security').select('owner_id');
    expect(ancora.data).toHaveLength(1);
  });

  it('chiusa dal telefono, la sessione del PC non può più rinnovarsi', async () => {
    const idPc = (await contenutoToken(pc)).session_id as string;
    const { data, error } = await telefono.rpc('chiudi_mia_sessione', { p_id: idPc });
    expect(error).toBeNull();
    expect(data).toBe(true);
    const rinnovo = await pc.auth.refreshSession();
    expect(rinnovo.error).not.toBeNull();
  });

  it('con la sola password elenco e chiusura sono rifiutati', async () => {
    const soloPassword = await accediConPassword(utente!);
    const elenco = await soloPassword.rpc('mie_sessioni');
    expect(elenco.error).not.toBeNull();
  });
});
