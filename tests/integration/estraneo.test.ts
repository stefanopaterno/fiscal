import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accediConPassword,
  API_URL,
  CHIAVE_PUBBLICA,
  configuraSecondoFattore,
  creaUtente,
  eliminaUtente,
  nuovoClient,
  tabellePubbliche,
  type UtenteProva,
} from './_supabase-locale';

// T041 (US2, SC-002, D-05): chi ha solo indirizzo e chiave pubblica non legge né scrive nulla,
// e un secondo utente non vede i dati del primo. Elenco delle tabelle preso in automatico.

let tabelle: string[] = [];
let proprietario: UtenteProva | undefined;
let altro: UtenteProva | undefined;

beforeAll(async () => {
  tabelle = await tabellePubbliche();
  proprietario = await creaUtente();
  altro = await creaUtente();
});

afterAll(async () => {
  await eliminaUtente(proprietario);
  await eliminaUtente(altro);
});

describe('estraneo con la sola chiave pubblica', () => {
  it('ci sono tabelle da controllare', () => {
    expect(tabelle).toEqual(expect.arrayContaining(['user_security', 'security_events']));
  });

  it('non legge nessuna tabella', async () => {
    const anonimo = nuovoClient();
    for (const t of tabelle) {
      const { data, error } = await anonimo.from(t).select('*').limit(1);
      expect(error !== null || (data ?? []).length === 0, `lettura di ${t}`).toBe(true);
    }
  });

  it('non inserisce, non modifica e non cancella in nessuna tabella', async () => {
    const anonimo = nuovoClient();
    for (const t of tabelle) {
      const ins = await anonimo.from(t).insert({});
      expect(ins.error, `inserimento in ${t}`).not.toBeNull();
      const mod = await anonimo
        .from(t)
        .update({ owner_id: proprietario!.id })
        .not('owner_id', 'is', null)
        .select();
      expect(mod.error !== null || (mod.data ?? []).length === 0, `modifica di ${t}`).toBe(true);
      const canc = await anonimo.from(t).delete().not('owner_id', 'is', null).select();
      expect(canc.error !== null || (canc.data ?? []).length === 0, `cancellazione in ${t}`).toBe(true);
    }
  });

  it('lo schema private non è raggiungibile', async () => {
    const r = await fetch(`${API_URL}/rest/v1/rpc/accesso_completo_valido`, {
      method: 'POST',
      headers: {
        apikey: CHIAVE_PUBBLICA,
        'Content-Profile': 'private',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    expect(r.ok).toBe(false);
  });

  it('non può registrarsi', async () => {
    const { data, error } = await nuovoClient().auth.signUp({
      email: `estraneo-${Date.now()}@example.test`,
      password: 'Estraneo-Prova-123!',
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});

describe('secondo utente autenticato', () => {
  it('con accesso completo vede solo le proprie righe, mai quelle del proprietario', async () => {
    const client = await accediConPassword(altro!);
    await configuraSecondoFattore(client);
    const { data } = await client.from('user_security').select('owner_id');
    expect(data).toEqual([{ owner_id: altro!.id }]);
    const tentativo = await client
      .from('user_security')
      .update({ blocco_minuti: 30 })
      .eq('owner_id', proprietario!.id)
      .select();
    expect(tentativo.data ?? []).toHaveLength(0);
  });
});
