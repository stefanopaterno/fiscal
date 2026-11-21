import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  accediConPassword,
  admin,
  configuraSecondoFattore,
  creaUtente,
  eliminaUtente,
  type UtenteProva,
} from './_supabase-locale';

// T013 (003, US2): emissione dall'app (stesse chiamate del browser), numerazione, data anteriore,
// immutabilità, incassi e chiusura dell'account con fatture emesse.
// Codice fiscale di esempio costruito a pezzi per la scansione dei segreti.
const CF = 'RSSMRA80' + 'A01H501U';

let utente: UtenteProva | undefined;
let db: SupabaseClient;
const cliente = randomUUID();
const attivita = randomUUID();

async function bozza(data: string, compenso = 8000) {
  const id = randomUUID();
  const integrativo = Math.round(compenso * 0.04);
  const esente = compenso + integrativo;
  const bollo = esente > 7747 ? 200 : 0;
  const { error } = await db.from('fatture').insert({
    id,
    data,
    cliente_id: cliente,
    attivita_id: attivita,
    totale_compensi: compenso,
    totale_integrativo: integrativo,
    importo_esente: esente,
    bollo,
    bollo_addebitato: bollo > 0,
    totale: esente + bollo,
    netto: esente + bollo,
  });
  expect(error).toBeNull();
  const righe = await db.from('righe_fattura').insert({
    id: randomUUID(),
    fattura_id: id,
    descrizione: 'Prestazione professionale psicologica',
    compenso,
    natura: 'esente_sanitaria',
    integrativo,
  });
  expect(righe.error).toBeNull();
  return id;
}

beforeAll(async () => {
  utente = await creaUtente();
  db = await accediConPassword(utente);
  await configuraSecondoFattore(db);
  const profilo = await db.from('profilo_professionale').insert({
    id: randomUUID(),
    nome: 'Mario',
    cognome: 'Rossi',
    codice_fiscale: CF,
    partita_iva: '12345678903',
    inizio_attivita: '2027-01-02',
    indirizzo: 'Via Roma 1',
    cap: '00100',
    comune: 'Roma',
    provincia: 'RM',
  });
  expect(profilo.error).toBeNull();
  await db
    .from('attivita')
    .insert({ id: attivita, nome: 'Psicologo', natura_iva: 'esente_sanitaria', predefinita: true });
  await db.from('clienti').insert({
    id: cliente,
    tipo: 'persona_fisica',
    nome: 'Luca',
    cognome: 'Bianchi',
    codice_fiscale: CF,
    indirizzo: 'Via Milano 2',
    cap: '20100',
    comune: 'Milano',
    provincia: 'MI',
  });
});

afterAll(async () => {
  await eliminaUtente(utente);
});

describe('fatture dal client', () => {
  it('emette con numeri progressivi e senza salti', async () => {
    const a = await bozza('2027-01-10');
    const b = await bozza('2027-01-11');
    await db.from('fatture').delete().eq('id', b);
    const c = await bozza('2027-01-12');
    const r1 = await db.rpc('emetti_fattura', { p_id: a });
    const r2 = await db.rpc('emetti_fattura', { p_id: c });
    expect(r1.data).toEqual([{ anno: 2027, numero: 1 }]);
    expect(r2.data).toEqual([{ anno: 2027, numero: 2 }]);
  });

  it("l'errore del database arriva con il suo codice e la spiegazione", async () => {
    const id = await bozza('2026-12-30');
    const { error } = await db.rpc('emetti_fattura', { p_id: id });
    expect(error?.message).toBe('data_anteriore_inizio');
    expect(error?.details).toMatch(/inizio attività/);
  });

  it('una fattura emessa non si modifica né si cancella', async () => {
    const id = await bozza('2027-02-01');
    await db.rpc('emetti_fattura', { p_id: id });
    const modifica = await db.from('fatture').update({ data: '2027-02-02' }).eq('id', id);
    expect(modifica.error?.message).toBe('fattura_immutabile');
    const cancella = await db.from('fatture').delete().eq('id', id);
    expect(cancella.error?.message).toBe('fattura_immutabile');
  });

  it('incassi fino al netto, poi rifiutati', async () => {
    const id = await bozza('2027-03-01');
    await db.rpc('emetti_fattura', { p_id: id });
    const ok = await db.from('incassi').insert({
      id: randomUUID(),
      fattura_id: id,
      data: '2027-03-01',
      importo: 8520,
      modalita: 'carta_pos',
      tracciabile: true,
    });
    expect(ok.error).toBeNull();
    const oltre = await db.from('incassi').insert({
      id: randomUUID(),
      fattura_id: id,
      data: '2027-03-02',
      importo: 1,
      modalita: 'bonifico',
      tracciabile: true,
    });
    expect(oltre.error?.message).toBe('oltre_il_netto');
  });

  it("la chiusura dell'account cancella anche le fatture emesse", async () => {
    const { count } = await admin
      .from('fatture')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', utente!.id);
    expect(count).toBeGreaterThan(0);
    const { error } = await admin.auth.admin.deleteUser(utente!.id);
    expect(error).toBeNull();
    const dopo = await admin
      .from('fatture')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', utente!.id);
    expect(dopo.count).toBe(0);
    utente = undefined;
  });
});
