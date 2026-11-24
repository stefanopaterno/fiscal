import { describe, expect, it } from 'vitest';
import { imposteAnno } from '@/engine/accantonamento/incasso';
import { calcolaAnno, type InputAnno } from '@/engine/irpef/anno';
import { compensiPerNetto, nettoAnno, previsioneAnno, righeMensili, type BaseAnno } from '@/engine/previsione/anno';
import { calendarioPagamenti, spiegaVariazione } from '@/engine/previsione/calendario';
import { IPOTESI_PREDEFINITE, metodiDisponibili, metodoUsato, proietta, variabilitaReale, type DatiMesi } from '@/engine/previsione/proiezione';

// Specifica 006: proiezione dei mesi, previsione di fine anno col motore 001, prospetto, calendario, variazioni.
const zeri = () => Array(12).fill(0) as number[];
const dati = (reali: number[], meseCorrente: number, extra: Partial<DatiMesi> = {}): DatiMesi => ({
  reali: [...reali, ...zeri()].slice(0, 12),
  meseCorrente,
  annoPrima: null,
  impegni: 0,
  ...extra,
});

describe('proiezione dei compensi', () => {
  it('andamento: media dei mesi conclusi sui mesi rimasti', () => {
    const p = proietta(dati([100_00, 200_00, 300_00], 4), IPOTESI_PREDEFINITE, 'andamento');
    expect(p.mesi[3]).toMatchObject({ tipo: 'in_corso', valore: 200_00 });
    expect(p.mesi[11]).toMatchObject({ tipo: 'previsto', valore: 200_00 });
    expect(p.totale).toBe(2_400_00);
    expect(p.futuro).toBe(1_800_00);
  });

  it('pesi dei mesi: agosto a zero', () => {
    const pesi = Array(12).fill(1);
    pesi[7] = 0;
    const p = proietta(dati([100_00, 100_00, 100_00], 4), { ...IPOTESI_PREDEFINITE, pesi }, 'andamento');
    expect(p.mesi[7]!.valore).toBe(0);
    expect(p.totale).toBe(1_100_00);
  });

  it('obiettivo: la parte mancante distribuita sui mesi rimasti, mese corrente compreso', () => {
    const p = proietta(dati([1_000_00], 2), { ...IPOTESI_PREDEFINITE, obiettivo: 12_000_00 }, 'obiettivo');
    expect(p.mesi[1]!.valore).toBe(1_000_00);
    expect(p.totale).toBe(12_000_00);
    expect(p.pochiDati).toBe(false);
  });

  it('stagionalità: stessi mesi dell\'anno prima, scalati sull\'andamento di quest\'anno', () => {
    const p = proietta(dati([1_100_00, 1_100_00, 1_100_00], 4, { annoPrima: Array(12).fill(1_000_00) }), IPOTESI_PREDEFINITE, 'stagionalita');
    expect(p.mesi[11]!.valore).toBe(1_100_00);
  });

  it('impegni: le fatture da incassare il mese dopo', () => {
    const p = proietta(dati([500_00], 2, { impegni: 300_00 }), IPOTESI_PREDEFINITE, 'impegni');
    expect(p.mesi[2]!.valore).toBe(300_00);
    expect(p.totale).toBe(800_00);
  });

  it('scenari: prudente e ottimistico del 20% sulla parte futura', () => {
    const p = proietta(dati([100_00, 200_00, 300_00], 4), IPOTESI_PREDEFINITE, 'andamento');
    expect(p.scenari).toEqual({ prudente: 600_00 + 1_440_00, atteso: 2_400_00, ottimistico: 600_00 + 2_160_00 });
  });

  it('metodo predefinito: obiettivo nel primo anno, andamento dopo tre mesi; stagionalità non disponibile', () => {
    const ip = { ...IPOTESI_PREDEFINITE, obiettivo: 30_000_00 };
    expect(metodoUsato(dati([1_000_00], 2), ip)).toBe('obiettivo');
    expect(metodoUsato(dati([1_000_00, 1_000_00, 1_000_00], 4), ip)).toBe('andamento');
    expect(metodiDisponibili(dati([], 1), ip).find((m) => m.metodo === 'stagionalita')?.disponibile).toBe(false);
    expect(proietta(dati([1_000_00], 2), IPOTESI_PREDEFINITE, 'andamento').pochiDati).toBe(true);
  });
});

const input2027 = (professionale: number): InputAnno => ({
  anno: 2027,
  cu: [{ redditoLavoro: 50_500_00, ritenuteIrpef: 13_865_00, addRegionale: 0, addComunaleAcconto: 0, addComunaleSaldo: 0 }],
  redditoProfessionale: professionale,
  addizionali: null,
});
const base = (reali: number): BaseAnno => ({
  input: input2027(reali),
  compensiReali: reali,
  deducibiliReali: 0,
  ritenuteReali: 0,
  soggettoIsa: false,
  manuale: false,
});

describe('previsione di fine anno', () => {
  it('coincide col motore 001 sui dati reali più i previsti (SC-001)', () => {
    const p = previsioneAnno(base(10_000_00), 5_000_00);
    const con = calcolaAnno(input2027(15_000_00));
    const senza = calcolaAnno(input2027(0));
    expect(p.reddito).toBe(15_000_00);
    expect(p.imposte).toBe(imposteAnno(con) - imposteAnno(senza));
    expect(p.contributi).toBeGreaterThan(0);
    expect(p.totale).toBe(p.imposte + p.contributi);
  });

  it('spese future nella stessa proporzione dei compensi', () => {
    const b = { ...base(8_000_00), deducibiliReali: 2_000_00, input: input2027(8_000_00) };
    expect(previsioneAnno(b, 4_000_00).reddito).toBe(8_000_00 + 4_000_00 - 1_000_00);
  });

  it('prospetto: segnala il mese in cui si passa dal 33% al 43% (FR-012)', () => {
    const righe = righeMensili(base(0), Array(12).fill(1_000_00));
    expect(righe.find((r) => r.cambioScaglione)?.mese).toBe(5);
    expect(righe[11]!.cumulato).toBe(12_000_00);
  });
});

describe('calendario e variazioni', () => {
  it('18 mesi; il totale coincide con giugno, novembre ed ENPAP del motore (SC-004); giugno è il più pesante', () => {
    const p = previsioneAnno(base(20_000_00), 0);
    const cal = calendarioPagamenti('2027-11-22', [{ anno: 2027, stima: p.stima, enpap: p.enpap }]);
    expect(cal).toHaveLength(18);
    expect(cal[0]!.mese).toBe('2027-11');
    const totale = cal.reduce((t, m) => t + m.totale, 0);
    expect(totale).toBe(p.stima.giugno + p.stima.novembre + p.enpap.importo);
    expect(cal.find((m) => m.piuPesante)?.mese).toBe('2028-06');
  });

  it('spiega una variazione con le sue cause (FR-006)', () => {
    const f = { mese: '2027-03', metodo: 'obiettivo', compensiReali: 3_000_00, compensiPrevisti: 9_000_00, reddito: 12_000_00, imposte: 4_000_00, contributi: 1_440_00, totale: 5_440_00, aliquotaMarginale: 0.33 };
    const g = { ...f, mese: '2027-04', metodo: 'andamento', compensiReali: 4_500_00, totale: 6_000_00, aliquotaMarginale: 0.43 };
    const s = spiegaVariazione(f, g).join(' ');
    expect(s).toMatch(/^\+560,00\s€/);
    expect(s).toMatch(/incassi reali \+1\.500,00\s€/);
    expect(s).toMatch(/metodo cambiato/);
    expect(s).toMatch(/dal 33% al 43%/);
  });
});

describe('variabilità reale e obiettivo di netto (T008)', () => {
  it('propone un intervallo solo dopo sei mesi, più largo se i mesi oscillano', () => {
    const regolari = [3000_00, 3000_00, 3000_00, 3000_00, 3000_00, 3000_00, ...Array(6).fill(0)];
    expect(variabilitaReale(dati(regolari.map((x, i) => (i < 5 ? x : 0)), 6))).toBeNull();
    expect(variabilitaReale(dati(regolari, 7))!.frazione).toBe(0.05); // minimo
    const altalena = [1000_00, 5000_00, 1000_00, 5000_00, 1000_00, 5000_00, ...Array(6).fill(0)];
    const v = variabilitaReale(dati(altalena, 7))!;
    expect(v.scostamentoMensile).toBeCloseTo(0.67, 2);
    expect(v.mesiFuturi).toBe(6);
    expect(v.frazione).toBe(0.25); // 0,67 / √6 ≈ 0,27 → 25%
  });

  it('i mesi prima dell\'inizio dell\'attività non contano', () => {
    const prima = [...Array(9).fill(0), 3000_00, 3000_00, 3000_00];
    const v = variabilitaReale(dati([3000_00, 3000_00, 3000_00, 3000_00, 3000_00, 3000_00, ...Array(6).fill(0)], 7, { annoPrima: prima }))!;
    expect(v.mesiUsati).toBe(9);
  });

  it('netto e compensi necessari: ogni euro in più vale meno di un euro netto', () => {
    const b = base(20_000_00);
    const netto = nettoAnno(b, 0);
    expect(netto).toBeLessThan(20_000_00);
    expect(compensiPerNetto(b, netto - 1)).toBeNull(); // già raggiunto
    const servono = compensiPerNetto(b, netto + 5_000_00)!;
    expect(servono).toBeGreaterThan(5_000_00);
    expect(nettoAnno(b, servono)).toBeGreaterThanOrEqual(netto + 5_000_00);
    expect(nettoAnno(b, servono - 200)).toBeLessThan(netto + 5_000_00);
  });
});
