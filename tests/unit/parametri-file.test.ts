import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { InputAnno } from '@/engine/irpef/anno';
import { calcolaImpatti, preparaApprovazione, valoreInUso } from '@/engine/parametri/anteprima';
import { impostaRegistro, registroAttivo } from '@/engine/parametri/attivi';
import { improntaModifica, leggiFile } from '@/engine/parametri/leggi-file';
import { fonteUfficiale, validaFile, type ContestoValidazione } from '@/engine/parametri/valida';
import type { EsitoVoce, FileAggiornamento, RigaRegistro } from '@/engine/parametri/tipi';
import { regolePerAnno } from '@/engine/regole';
import { regoleIrpefPerAnno } from '@/engine/regole/irpef';

// Specifica 014: T021 (lettura), T022 (validazione), T023 (anteprima), T028 (approvazione).
const fixture = (nome: string) => readFileSync(join(__dirname, '../fixtures/parametri', nome), 'utf8');
const leggi = (nome: string): FileAggiornamento => {
  const l = leggiFile(fixture(nome));
  if (!l.ok) throw new Error(l.motivo);
  return l.file;
};
const ctx = (extra: Partial<ContestoValidazione> = {}): ContestoValidazione => ({
  anniChiusi: [],
  registro: registroAttivo(),
  inUso: (p, c) => valoreInUso(p, c),
  ...extra,
});
const gruppo = (esiti: EsitoVoce[], chiave: string) => esiti.find((e) => e.chiave === chiave);

const INPUT: InputAnno = {
  anno: 2027,
  cu: [{ redditoLavoro: 38_000_00, ritenuteIrpef: 8_448_09, addRegionale: 467_40, addComunaleAcconto: 91_20, addComunaleSaldo: 212_80, addComunaleAccontoAnnoDopo: 91_20 }],
  redditoProfessionale: 20_000_00,
  addizionali: { regionale: [{ finoA: null, aliquota: 0.0123 }], comunale: { aliquota: 0.008, soglia: null }, verificate: true },
};

afterEach(() => impostaRegistro([]));

describe('lettura del file (T021)', () => {
  it('JSON puro', () => {
    expect(leggiFile(fixture('valido.json')).ok).toBe(true);
  });

  it('risposta di Claude con testo intorno e blocco ```json', () => {
    const testo = `Ecco i risultati {non json}.\n\n\`\`\`json\n${fixture('valido.json')}\n\`\`\`\nFammi sapere!`;
    const l = leggiFile(testo);
    expect(l.ok && l.file.voci.length).toBe(2);
  });

  it('rifiuta: niente JSON, versione diversa, oltre 256 KB', () => {
    expect(leggiFile('Non ho trovato nulla.')).toMatchObject({ ok: false, motivo: expect.stringMatching(/Chiedi a Claude/) });
    expect(leggiFile(fixture('valido.json').replace('"versione_schema": 1', '"versione_schema": 2'))).toMatchObject({ ok: false, motivo: expect.stringMatching(/versione/i) });
    expect(leggiFile('x'.repeat(256 * 1024 + 1))).toMatchObject({ ok: false, motivo: expect.stringMatching(/256 KB/) });
  });

  it('modifiche al programma: impronta stabile per titolo e collegamento', () => {
    const f = leggi('programma.json');
    expect(f.modifiche_programma).toHaveLength(1);
    const m = f.modifiche_programma[0]!;
    expect(improntaModifica(m)).toBe(improntaModifica({ titolo: m.titolo.toUpperCase() + '  ', fonte: { ...m.fonte, url: `${m.fonte.url}/?utm=x` } }));
  });
});

describe('validazione (T022)', () => {
  it('file valido: uno cambia, uno conferma', () => {
    const esiti = validaFile(leggi('valido.json'), ctx());
    expect(gruppo(esiti, 'irpef.scaglioni')).toMatchObject({ gruppo: 'cambia', statoFinale: 'verificata', anomala: false });
    expect(gruppo(esiti, 'fattura.aliquota_integrativo')).toMatchObject({ gruppo: 'conferma', dopo: 0.04 });
  });

  it('errori: chiave sconosciuta, 0,2 al posto di 20, scaglioni non crescenti, fonte non ufficiale', () => {
    const esiti = validaFile(leggi('errori.json'), ctx());
    expect(esiti.map((e) => e.gruppo)).toEqual(['scartata', 'scartata', 'scartata', 'conferma']);
    expect(esiti[0]!.motivi[0]).toMatch(/chiave sconosciuta/);
    expect(esiti[1]!.motivi[0]).toMatch(/0,23 invece di 23|fuori dai valori plausibili/);
    expect(esiti[2]!.motivi[0]).toMatch(/crescenti/);
    expect(esiti[3]).toMatchObject({ statoFinale: 'da_verificare' });
    expect(esiti[3]!.motivi.join(' ')).toMatch(/non è un sito ufficiale/);
  });

  it('decorrenza incoerente col tipo del parametro', () => {
    const f = leggi('valido.json');
    const voce = { ...(f.voci[1] as Record<string, unknown>), dal: undefined, anno: 2027 };
    const esiti = validaFile({ ...f, voci: [voce] }, ctx());
    expect(esiti[0]).toMatchObject({ gruppo: 'scartata', motivi: [expect.stringMatching(/serve «dal»/)] });
  });

  it('norma solo proposta: mai «verificata»', () => {
    const f = leggi('valido.json');
    const voce = { ...(f.voci[0] as Record<string, unknown>), stato_norma: 'proposta' };
    expect(validaFile({ ...f, voci: [voce] }, ctx())[0]).toMatchObject({ gruppo: 'cambia', statoFinale: 'da_verificare' });
  });

  it('anno chiuso: bloccata', () => {
    const esiti = validaFile(leggi('anno-chiuso.json'), ctx({ anniChiusi: [2026] }));
    expect(esiti[0]).toMatchObject({ gruppo: 'bloccata', motivi: [expect.stringMatching(/2026 è chiuso/)] });
  });

  it('doppioni: vale l\'ultima voce', () => {
    const f = leggi('bollo-marzo.json');
    const v = f.voci[0] as Record<string, unknown>;
    const esiti = validaFile({ ...f, voci: [{ ...v, valore: 3 }, v] }, ctx());
    expect(esiti.map((e) => e.gruppo)).toEqual(['scartata', 'cambia']);
    expect(esiti[0]!.motivi[0]).toMatch(/doppione/);
  });

  it('variazione anomala segnalata', () => {
    const f = leggi('bollo-marzo.json');
    const esiti = validaFile({ ...f, voci: [{ ...(f.voci[0] as Record<string, unknown>), valore: 15 }] }, ctx());
    expect(esiti[0]).toMatchObject({ gruppo: 'cambia', anomala: true });
  });

  it('file superato da un aggiornamento più recente', () => {
    const riga: RigaRegistro = {
      id: 'x', azione: 'approvato', annulla_id: null, chiave: 'fattura.importo_bollo', anno: null, dal: '2027-03-01', valore: 300,
      fonte: null, stato: 'verificata', stato_norma: 'in_vigore', creato_il: '2027-02-25T10:00:00Z',
    };
    const esiti = validaFile(leggi('bollo-marzo.json'), ctx({ registro: [riga] }));
    expect(esiti[0]!.fileVecchio).toBe(true);
  });

  it('addizionali: solo con ambito uguale a quello dell\'utente', () => {
    const f: FileAggiornamento = {
      ...leggi('valido.json'),
      ambito: { regione: 'Regione di prova', comune: 'Comune di prova' },
      voci: [{ chiave: 'addizionali.comunale.aliquota', anno: 2027, valore: 0.8, fonte: { titolo: 'Delibera', url: 'https://www.comune.example.it/delibera', data_atto: '2026-12-20' }, stato_proposto: 'verificata', stato_norma: 'in_vigore' }],
    };
    expect(validaFile(f, ctx())[0]).toMatchObject({ gruppo: 'scartata' });
    expect(validaFile(f, ctx({ ambito: { regione: 'Altra', comune: 'Altro' } }))[0]).toMatchObject({ gruppo: 'scartata' });
    const ok = validaFile(f, ctx({ ambito: { regione: 'regione di PROVA', comune: 'comune di prova' }, dominiExtra: ['comune.example.it'] }))[0]!;
    expect(ok).toMatchObject({ gruppo: 'cambia', dopo: 0.008, statoFinale: 'verificata' });
  });

  it('file malevolo: fonti false scartate o declassate, testo trattato come dati', () => {
    const l = leggiFile(fixture('malevolo.json'));
    expect(l.ok).toBe(true);
    const esiti = validaFile((l as { file: FileAggiornamento }).file, ctx());
    expect(esiti[0]).toMatchObject({ gruppo: 'scartata', motivi: [expect.stringMatching(/https/)] });
    expect(esiti[1]).toMatchObject({ gruppo: 'cambia', statoFinale: 'da_verificare' });
    expect(esiti[2]).toMatchObject({ gruppo: 'scartata', motivi: [expect.stringMatching(/chiave sconosciuta/)] });
  });

  it('dominio ufficiale: host, non testo', () => {
    expect(fonteUfficiale('https://www.gazzettaufficiale.it/x')).toBe(true);
    expect(fonteUfficiale('https://def.finanze.gov.it/x')).toBe(true);
    expect(fonteUfficiale('https://www.gazzettaufficiale.it.example.com/x')).toBe(false);
    expect(fonteUfficiale('https://example.com/?ref=gazzettaufficiale.it')).toBe(false);
    expect(fonteUfficiale('http://www.gazzettaufficiale.it/x')).toBe(false);
  });
});

describe('anteprima e impatto (T023)', () => {
  it('impatto IRPEF = differenza del carico dell\'anno; il registro torna quello di prima', () => {
    const prima = registroAttivo();
    const esiti = calcolaImpatti(validaFile(leggi('valido.json'), ctx()), { inputAnno: () => INPUT });
    const e = gruppo(esiti, 'irpef.scaglioni')!;
    // reddito complessivo 58.000 €: 5.000 € passano dal 33% al 43% = +500 € di IRPEF
    expect(e.impatto).toBeGreaterThan(450_00);
    expect(e.impatto).toBeLessThan(550_00);
    expect(registroAttivo()).toBe(prima);
    expect(regoleIrpefPerAnno(2027).scaglioni.valore[1]!.finoA).toBe(55_000_00);
  });

  it('impatto di fatturazione su una fattura tipo, scadenze e codici come testo', () => {
    const esiti = calcolaImpatti(validaFile(leggi('bollo-marzo.json'), ctx()), { inputAnno: () => INPUT, fatturaTipo: 100_00 });
    expect(esiti[0]!.impattoTesto).toMatch(/2,50/);
    expect(regolePerAnno(2027, '2027-03-02').importoBollo.valore).toBe(200);
  });

  it('dati mancanti: impatto non calcolato con spiegazione', () => {
    const esiti = calcolaImpatti(validaFile(leggi('valido.json'), ctx()), { inputAnno: () => null });
    expect(gruppo(esiti, 'irpef.scaglioni')).toMatchObject({ impatto: null, impattoTesto: expect.stringMatching(/Mancano i dati/) });
  });
});

describe('approvazione (T028)', () => {
  it('righe nelle unità delle regole, valore precedente, conteggi con rifiutate', () => {
    const file = leggi('valido.json');
    const esiti = validaFile(file, ctx());
    let n = 0;
    const a = preparaApprovazione(file, esiti, new Set([0]), () => `id-${++n}`);
    expect(a.righe).toHaveLength(1);
    expect(a.righe[0]).toMatchObject({
      chiave: 'irpef.scaglioni',
      anno: 2027,
      dal: null,
      valore: [{ finoA: 28_000_00, aliquota: 0.23 }, { finoA: 50_000_00, aliquota: 0.33 }, { finoA: null, aliquota: 0.43 }],
      valore_precedente: [{ finoA: 28_000_00, aliquota: 0.23 }, { finoA: 55_000_00, aliquota: 0.33 }, { finoA: null, aliquota: 0.43 }],
      stato: 'verificata',
    });
    expect(a.importazione.conteggi).toMatchObject({ cambia: 1, conferma: 0, rifiutata: 1 });
  });

  it('dopo l\'approvazione: bollo nuovo solo dalla decorrenza', () => {
    const file = leggi('bollo-marzo.json');
    const a = preparaApprovazione(file, validaFile(file, ctx()), new Set([0]), () => 'r1');
    impostaRegistro([{ ...a.righe[0]!, azione: 'approvato', annulla_id: null, fonte: a.righe[0]!.fonte!, stato_norma: 'in_vigore', creato_il: '2027-02-21T10:00:00Z' } as RigaRegistro]);
    expect(regolePerAnno(2027, '2027-02-15').importoBollo.valore).toBe(200);
    expect(regolePerAnno(2027, '2027-03-02').importoBollo.valore).toBe(250);
  });

  it('addizionali nel formato della tabella dei dati, verificate solo con fonte ufficiale', () => {
    const file: FileAggiornamento = {
      ...leggi('valido.json'),
      ambito: { regione: 'R', comune: 'C' },
      voci: [{ chiave: 'addizionali.regionale.scaglioni', anno: 2027, valore: [{ fino_a: 15000, aliquota: 1.73 }, { fino_a: null, aliquota: 3.33 }], fonte: { titolo: 'Legge regionale', url: 'https://www.regione.example.it/x', data_atto: '2026-12-20' }, stato_proposto: 'verificata', stato_norma: 'in_vigore' }],
    };
    const esiti = validaFile(file, ctx({ ambito: { regione: 'R', comune: 'C' }, dominiExtra: ['regione.example.it'] }));
    const a = preparaApprovazione(file, esiti, new Set([0]), () => 'x');
    expect(a.addizionali).toEqual([{ anno: 2027, regionale_scaglioni: [{ fino_a: 15_000_00, aliquota: 0.0173 }, { fino_a: null, aliquota: 0.0333 }], verificate: true }]);
    expect(a.righe[0]!.valore).toEqual([{ fino_a: 15_000_00, aliquota: 0.0173 }, { fino_a: null, aliquota: 0.0333 }]);
  });
});
