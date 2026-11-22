import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';
import { calcolaFattura, percentuale } from '@/engine/fattura/calcola';
import { codiceFiscaleValido } from '@/engine/validazioni/codice-fiscale';
import { partitaIvaValida } from '@/engine/validazioni/partita-iva';
import {
  accediConPassword,
  configuraSecondoFattore,
  creaUtente,
  eliminaUtente,
  type UtenteProva,
} from './_supabase-locale';

// FR-032: i dati d'esempio creati dal database hanno, fattura per fattura, gli stessi totali del motore
// del browser (src/engine/fattura/calcola.ts) e codici fiscali e partite IVA formalmente validi.
// Codice fiscale di esempio costruito a pezzi per la scansione dei segreti.
const CF = 'RSSMRA80' + 'A01H501U';

const utenti: UtenteProva[] = [];
afterAll(async () => {
  for (const u of utenti) await eliminaUtente(u);
});

async function utenteInProva(): Promise<SupabaseClient> {
  const u = await creaUtente();
  utenti.push(u);
  const db = await accediConPassword(u);
  await configuraSecondoFattore(db);
  return db;
}

type Riga = {
  fattura_id: string;
  compenso: number;
  quantita: number;
  natura: 'esente_sanitaria' | 'imponibile';
};

async function confrontaColMotore(db: SupabaseClient) {
  const [profilo, clienti, fatture, righe] = await Promise.all([
    db.from('profilo_professionale').select('*').single(),
    db.from('clienti').select('*'),
    db.from('fatture').select('*'),
    db.from('righe_fattura').select('*'),
  ]);
  const p = profilo.data!;
  const perId = new Map((clienti.data ?? []).map((c) => [c.id as string, c]));
  expect(fatture.data!.length).toBe(45);
  for (const f of fatture.data!) {
    const c = perId.get(f.cliente_id)!;
    const sue = (righe.data as Riga[]).filter((r) => r.fattura_id === f.id);
    // il prezzo che l'utente avrebbe scritto: con l'integrativo compreso è compenso + contributo unitario
    const r = calcolaFattura({
      anno: 2026,
      righe: sue.map((x) => ({
        compenso: p.integrativo_compreso ? x.compenso + percentuale(x.compenso, 0.02) : x.compenso,
        quantita: x.quantita,
        natura: x.natura,
      })),
      sostitutoImposta: c.sostituto_imposta,
      bolloACarico: p.bollo_a_carico,
      integrativoCompreso: p.integrativo_compreso,
      opposizioneSts: c.opposizione_sts,
    });
    expect({
      totale_compensi: f.totale_compensi,
      totale_integrativo: f.totale_integrativo,
      imponibile_iva: f.imponibile_iva,
      iva: f.iva,
      importo_esente: f.importo_esente,
      bollo: f.bollo,
      bollo_addebitato: f.bollo_addebitato,
      ritenuta: f.ritenuta,
      totale: f.totale,
      netto: f.netto,
      dicitura: f.dicitura,
    }).toEqual({
      totale_compensi: r.totaleCompensi,
      totale_integrativo: r.totaleIntegrativo,
      imponibile_iva: r.imponibileIva,
      iva: r.iva,
      importo_esente: r.importoEsente,
      bollo: r.bollo,
      bollo_addebitato: r.bolloAddebitato,
      ritenuta: r.ritenuta,
      totale: r.totale,
      netto: r.netto,
      dicitura: r.diciture.join('\n') || null,
    });
  }
  return { profilo: p, clienti: clienti.data! };
}

describe('dati d’esempio', () => {
  it('senza configurazione: crea profilo e clienti con codici validi e totali uguali al motore', async () => {
    const db = await utenteInProva();
    const { data, error } = await db.rpc('carica_dati_esempio');
    expect(error).toBeNull();
    expect(data).toEqual([{ clienti: 12, fatture: 45, incassi: 37, versamenti: 5 }]);
    const { profilo, clienti } = await confrontaColMotore(db);
    expect(codiceFiscaleValido(profilo.codice_fiscale)).toBe(true);
    expect(partitaIvaValida(profilo.partita_iva)).toBe(true);
    for (const c of clienti) {
      if (c.tipo === 'persona_fisica') expect(codiceFiscaleValido(c.codice_fiscale)).toBe(true);
      else expect(partitaIvaValida(c.partita_iva)).toBe(true);
    }
    const ancora = await db.rpc('carica_dati_esempio');
    expect(ancora.error?.message).toBe('esempio_gia_caricato');
  });

  it('con il profilo dell’utente (integrativo compreso, bollo a suo carico): lo rispetta e non lo cambia', async () => {
    const db = await utenteInProva();
    const id = randomUUID();
    const ins = await db.from('profilo_professionale').insert({
      id,
      nome: 'Mario',
      cognome: 'Rossi',
      codice_fiscale: CF,
      partita_iva: '12345678903',
      inizio_attivita: '2027-01-02',
      indirizzo: 'Via Roma 1',
      cap: '00100',
      comune: 'Roma',
      provincia: 'RM',
      bollo_a_carico: 'professionista',
      integrativo_compreso: true,
    });
    expect(ins.error).toBeNull();
    const { error } = await db.rpc('carica_dati_esempio');
    expect(error).toBeNull();
    const { profilo } = await confrontaColMotore(db);
    expect(profilo).toMatchObject({ id, nome: 'Mario', versione: 1 });

    // La pulizia toglie l'esempio ma non il profilo dell'utente
    const pulizia = await db.rpc('cancella_dati_prova', { p_anagrafiche: false });
    expect(pulizia.error).toBeNull();
    const dopo = await db.from('profilo_professionale').select('id');
    expect(dopo.data).toEqual([{ id }]);
    const clienti = await db.from('clienti').select('id');
    expect(clienti.data).toEqual([]);
  });
});
