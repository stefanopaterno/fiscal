import { afterEach, describe, expect, it } from 'vitest';
import { calcolaAnno, type InputAnno } from '@/engine/irpef/anno';
import { calcolaFattura } from '@/engine/fattura/calcola';
import { conRegistro, impostaRegistro, registroAttivo } from '@/engine/parametri/attivi';
import { righeAttive } from '@/engine/parametri/risolvi';
import type { RigaRegistro } from '@/engine/parametri/tipi';
import { anniConRegole, regolePerAnno } from '@/engine/regole';
import { regoleF24 } from '@/engine/regole/f24';
import { anniConRegoleIrpef, ErroreIrpef, regoleIrpefPerAnno } from '@/engine/regole/irpef';
import { regoleScadenze } from '@/engine/regole/scadenze';
import { regoleSpesePerAnno } from '@/engine/regole/spese';

// Specifica 014, T005 e T013 (research.md R-01, R-03, R-07; data-model.md «Risoluzione»).
const FONTE = { titolo: 'Atto di prova', url: 'https://www.gazzettaufficiale.it/prova', data_atto: '2026-12-30' };
let n = 0;
const riga = (extra: Partial<RigaRegistro> & Pick<RigaRegistro, 'chiave'>): RigaRegistro => ({
  id: `r${++n}`,
  azione: 'approvato',
  annulla_id: null,
  anno: null,
  dal: null,
  valore: null,
  fonte: FONTE,
  stato: 'verificata',
  stato_norma: 'in_vigore',
  creato_il: `2027-01-${String(10 + n).padStart(2, '0')}T10:00:00Z`,
  ...extra,
});

const SCAGLIONI_50 = [
  { finoA: 28_000_00, aliquota: 0.23 },
  { finoA: 50_000_00, aliquota: 0.33 },
  { finoA: null, aliquota: 0.43 },
];

const input = (anno: number): InputAnno => ({
  anno,
  cu: [
    {
      redditoLavoro: 38_000_00,
      ritenuteIrpef: 8_448_09,
      addRegionale: 467_40,
      addComunaleAcconto: 91_20,
      addComunaleSaldo: 212_80,
      addComunaleAccontoAnnoDopo: 91_20,
    },
  ],
  redditoProfessionale: 20_000_00,
  addizionali: { regionale: [{ finoA: null, aliquota: 0.0123 }], comunale: { aliquota: 0.008, soglia: null }, verificate: true },
});

afterEach(() => impostaRegistro([]));

describe('risolutore', () => {
  it('registro vuoto: stessi oggetti del programma', () => {
    const prima = regoleIrpefPerAnno(2027);
    impostaRegistro([]);
    expect(regoleIrpefPerAnno(2027)).toBe(prima);
    expect(anniConRegoleIrpef()).toEqual([2026, 2027]);
    expect(() => regoleIrpefPerAnno(2028)).toThrow(ErroreIrpef);
  });

  it('per anno: vale solo per l\'anno indicato', () => {
    impostaRegistro([riga({ chiave: 'irpef.scaglioni', anno: 2027, valore: SCAGLIONI_50 })]);
    expect(regoleIrpefPerAnno(2027).scaglioni.valore).toEqual(SCAGLIONI_50);
    expect(regoleIrpefPerAnno(2027).scaglioni.fonte).toMatch(/Atto di prova/);
    expect(regoleIrpefPerAnno(2026).scaglioni.valore[1]!.finoA).toBe(50_000_00);
  });

  it('per data: dalla decorrenza in poi, fattura emessa prima invariata', () => {
    impostaRegistro([riga({ chiave: 'fattura.importo_bollo', dal: '2027-03-01', valore: 250 })]);
    expect(regolePerAnno(2027, '2027-02-15').importoBollo.valore).toBe(200);
    expect(regolePerAnno(2027, '2027-03-01').importoBollo.valore).toBe(250);
    expect(regolePerAnno(2027).importoBollo.valore).toBe(200); // senza data: 1° gennaio
  });

  it('decorrenza più recente; a parità l\'ultima approvata; righe annullate ignorate', () => {
    const a = riga({ chiave: 'fattura.importo_bollo', dal: '2027-03-01', valore: 250 });
    const b = riga({ chiave: 'fattura.importo_bollo', dal: '2027-05-01', valore: 300 });
    const c = riga({ chiave: 'fattura.importo_bollo', dal: '2027-05-01', valore: 320 });
    impostaRegistro([a, b, c]);
    expect(regolePerAnno(2027, '2027-04-01').importoBollo.valore).toBe(250);
    expect(regolePerAnno(2027, '2027-06-01').importoBollo.valore).toBe(320);
    const annulla = riga({ chiave: 'fattura.importo_bollo', azione: 'annullato', annulla_id: c.id, dal: '2027-05-01' });
    impostaRegistro([a, b, c, annulla]);
    expect(righeAttive(registroAttivo()).map((r) => r.id)).toEqual([a.id, b.id]);
    expect(regolePerAnno(2027, '2027-06-01').importoBollo.valore).toBe(300);
  });

  it('per data: vale negli anni dopo finché il programma non cambia il valore', () => {
    // integrativo 2026 = 2%, 2027 = 4% nel programma: un 3% dal 2026-06-01 non deve valere nel 2027
    impostaRegistro([riga({ chiave: 'fattura.aliquota_integrativo', dal: '2026-06-01', valore: 0.03 })]);
    expect(regolePerAnno(2026, '2026-07-01').aliquotaIntegrativo.valore).toBe(0.03);
    expect(regolePerAnno(2027, '2027-07-01').aliquotaIntegrativo.valore).toBe(0.04);
    // il bollo è uguale nel 2026 e nel 2027: un nuovo bollo dal 2026-06-01 vale anche nel 2027
    impostaRegistro([riga({ chiave: 'fattura.importo_bollo', dal: '2026-06-01', valore: 250 })]);
    expect(regolePerAnno(2027, '2027-07-01').importoBollo.valore).toBe(250);
  });

  it('integrativo ENPAP del set IRPEF segue il parametro di fatturazione al 1° gennaio', () => {
    impostaRegistro([riga({ chiave: 'fattura.aliquota_integrativo', dal: '2027-01-01', valore: 0.05 })]);
    expect(regoleIrpefPerAnno(2027).enpap.aliquotaIntegrativo.valore).toBe(0.05);
    impostaRegistro([riga({ chiave: 'fattura.aliquota_integrativo', dal: '2027-07-01', valore: 0.05 })]);
    expect(regoleIrpefPerAnno(2027).enpap.aliquotaIntegrativo.valore).toBe(0.04);
  });

  it('spese, scadenze e codici F24', () => {
    impostaRegistro([
      riga({ chiave: 'spese.categoria.telefonia.percentuale', anno: 2027, valore: 0.5 }),
      riga({ chiave: 'scadenze.saldo_acconto.data', anno: 2028, valore: '07-21' }),
      riga({ chiave: 'f24.irpef_saldo', dal: '2027-06-01', valore: '9999' }),
    ]);
    expect(regoleSpesePerAnno(2027).categorie.find((c) => c.codice === 'telefonia')!.percentuale).toBe(0.5);
    expect(regoleSpesePerAnno(2026).categorie.find((c) => c.codice === 'telefonia')!.percentuale).toBe(0.8);
    expect(regoleScadenze(2028).scadenze.find((s) => s.valore.chiave === 'saldo_acconto')!.valore.data).toBe('07-21');
    expect(regoleScadenze(2027).scadenze.find((s) => s.valore.chiave === 'saldo_acconto')!.valore.data).toBe('06-30');
    expect(regoleF24(2027, '2027-06-30').codici.irpef_saldo.valore.codice).toBe('9999');
    expect(regoleF24(2027, '2027-05-31').codici.irpef_saldo.valore.codice).toBe('4001');
  });

  it('anno senza set nel programma: riportato dal precedente e «da verificare»', () => {
    impostaRegistro([riga({ chiave: 'irpef.scaglioni', anno: 2028, valore: SCAGLIONI_50 })]);
    expect(anniConRegoleIrpef()).toEqual([2026, 2027, 2028]);
    const r = regoleIrpefPerAnno(2028);
    expect(r.anno).toBe(2028);
    expect(r.scaglioni.valore).toEqual(SCAGLIONI_50);
    expect(r.scaglioni.stato).toBe('verificata');
    expect(r.enpap.aliquotaSoggettivo.stato).toBe('da_verificare');
    expect(r.enpap.aliquotaSoggettivo.fonte).toMatch(/^Riportato dal 2027/);
    expect(anniConRegole()).toEqual([2026, 2027]);
  });

  it('conRegistro ripristina il registro anche se il calcolo fallisce', () => {
    const r = [riga({ chiave: 'irpef.scaglioni', anno: 2027, valore: SCAGLIONI_50 })];
    impostaRegistro(r);
    expect(() =>
      conRegistro([], () => {
        throw new Error('x');
      }),
    ).toThrow('x');
    expect(registroAttivo()).toBe(r);
    expect(regoleIrpefPerAnno(2027).scaglioni.valore).toEqual(SCAGLIONI_50);
  });

  it('non regressione: calcolo dell\'anno e fattura uguali con registro vuoto e con voci di altri anni', () => {
    const anno = calcolaAnno(input(2027));
    impostaRegistro([riga({ chiave: 'irpef.scaglioni', anno: 2026, valore: SCAGLIONI_50 })]);
    expect(calcolaAnno(input(2027))).toEqual(anno);
    impostaRegistro([]);
    expect(calcolaAnno(input(2027))).toEqual(anno);
  });

  it('impatto: scaglione al 33% fino a 50.000 € invece di 55.000 € fa pagare di più', () => {
    const prima = calcolaAnno(input(2027));
    impostaRegistro([riga({ chiave: 'irpef.scaglioni', anno: 2027, valore: SCAGLIONI_50 })]);
    const dopo = calcolaAnno(input(2027));
    expect(dopo.irpefLorda.totale).toBeGreaterThan(prima.irpefLorda.totale);
    // 58.000 € di reddito: 5.000 € passano dal 33% al 43% = +500 €
    expect(dopo.irpefLorda.totale - prima.irpefLorda.totale).toBe(500_00);
  });

  it('calcolo della fattura usa la data (T012)', () => {
    impostaRegistro([riga({ chiave: 'fattura.importo_bollo', dal: '2027-03-01', valore: 250 })]);
    const f = (data: string) =>
      calcolaFattura({ anno: 2027, data, righe: [{ compenso: 100_00, natura: 'esente_sanitaria' }], sostitutoImposta: false, bolloACarico: 'paziente' });
    expect(f('2027-02-15').bollo).toBe(200);
    expect(f('2027-03-02').bollo).toBe(250);
  });
});

describe('origine e spiegazioni (T032, T033)', () => {
  it('le spiegazioni dell\'IRPEF citano l\'aggiornamento', async () => {
    const { calcolaAnno } = await import('@/engine/irpef/anno');
    impostaRegistro([riga({ chiave: 'irpef.scaglioni', anno: 2027, valore: SCAGLIONI_50, creato_il: '2027-01-12T09:00:00Z' })]);
    const r = calcolaAnno(input(2027));
    expect(JSON.stringify(r.spiegazioni)).toMatch(/Aggiornamento approvato il 12\/01\/2027: Atto di prova/);
  });

  it('origine: programma, aggiornamento, allineato al programma, riportato', async () => {
    const { origineParametro, testoOrigine } = await import('@/engine/parametri/origine');
    expect(origineParametro('irpef.scaglioni', { anno: 2027 })).toEqual({ tipo: 'programma' });
    impostaRegistro([
      riga({ chiave: 'irpef.scaglioni', anno: 2027, valore: SCAGLIONI_50 }),
      riga({ chiave: 'fattura.aliquota_iva', dal: '2027-01-01', valore: 0.22 }),
      riga({ chiave: 'irpef.scaglioni', anno: 2028, valore: SCAGLIONI_50 }),
    ]);
    expect(origineParametro('irpef.scaglioni', { anno: 2027 })).toMatchObject({ tipo: 'aggiornamento', allineato: false });
    expect(origineParametro('fattura.aliquota_iva', { anno: 2027, data: '2027-05-01' })).toMatchObject({ tipo: 'aggiornamento', allineato: true });
    expect(origineParametro('enpap.aliquota_soggettivo', { anno: 2028 })).toEqual({ tipo: 'riportato', daAnno: 2027 });
    expect(testoOrigine('irpef.scaglioni', { anno: 2027 })).toMatch(/^da aggiornamento del/);
  });
});
