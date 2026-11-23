import { describe, expect, it } from 'vitest';
import { copertura } from '@/engine/accantonamento/copertura';
import { accantonamentoIncasso, quoteIncasso } from '@/engine/accantonamento/incasso';
import { motiviCambio, percentualeMese } from '@/engine/accantonamento/percentuale';
import { interessiNetti, nettoReale, pianoMensile } from '@/engine/accantonamento/piano';
import { regoleAccantonamento } from '@/engine/regole/accantonamento';
import type { InputAnno } from '@/engine/irpef/anno';

// T001 (007): casi A–G di quickstart.md al centesimo.
const anno2027 = (professionale: number): InputAnno => ({
  anno: 2027,
  cu: [{ redditoLavoro: 50_500_00, ritenuteIrpef: 13_865_00, addRegionale: 0, addComunaleAcconto: 0, addComunaleSaldo: 0 }],
  redditoProfessionale: professionale,
  addizionali: null,
});

describe('quote di un incasso', () => {
  it('in proporzione alla parte di netto incassata', () => {
    const f = { totale_compensi: 100_000, totale_integrativo: 4_000, iva: 0, bollo: 200, ritenuta: 20_000, netto: 84_200 };
    expect(quoteIncasso(f, 42_100)).toEqual({ compenso: 50_000, integrativo: 2_000, iva: 0, bollo: 100, ritenuta: 10_000, incassato: 42_100 });
  });
});

describe('accantonamento di un incasso', () => {
  it('caso A: seduta 80 € → 49,20 € da mettere da parte, 36,00 € da spendere', () => {
    const q = { compenso: 80_00, integrativo: 3_20, iva: 0, bollo: 2_00, ritenuta: 0, incassato: 85_20 };
    const a = accantonamentoIncasso(anno2027(10_000_00), q, { margine: 0 });
    expect(a).toMatchObject({ imposte: 34_40, contributi: 9_60, integrativo: 3_20, iva: 0, bollo: 2_00, ritenuta: 0, margine: 0, totale: 49_20, netto: 36_00 });
    expect(a.spiegazione).toMatch(/43%/);
  });

  it('caso A2: margine del 10% su imposte e soggettivo, mostrato a parte', () => {
    const q = { compenso: 80_00, integrativo: 3_20, iva: 0, bollo: 2_00, ritenuta: 0, incassato: 85_20 };
    const a = accantonamentoIncasso(anno2027(10_000_00), q, { margine: 0.1 });
    expect(a.margine).toBe(4_40);
    expect(a.totale).toBe(53_60);
  });

  it('caso B: fattura a un ente con ritenuta del 20%', () => {
    const q = { compenso: 1_000_00, integrativo: 40_00, iva: 0, bollo: 0, ritenuta: 200_00, incassato: 840_00 };
    const a = accantonamentoIncasso(anno2027(10_000_00), q, { margine: 0 });
    expect(a).toMatchObject({ imposte: 430_00, contributi: 120_00, totale: 390_00, netto: 450_00 });
    expect(a.spiegazione).toMatch(/ritenuta/);
  });

  it('mai negativo: con una ritenuta alta l\'accantonamento è zero', () => {
    const q = { compenso: 100_00, integrativo: 0, iva: 0, bollo: 0, ritenuta: 100_00, incassato: 0 };
    expect(accantonamentoIncasso(anno2027(10_000_00), q, { margine: 0 }).totale).toBe(0);
  });
});

describe('percentuale del mese', () => {
  it('caso C: 55 € ogni 100 € di compenso, con i motivi', () => {
    const p = percentualeMese(anno2027(10_000_00), { margine: 0 });
    expect(p.per100).toBe(55_00);
    expect(p.aliquotaMarginale).toBe(0.43);
    expect(p.motivi.join(' ')).toMatch(/43%/);
  });

  it('spiega il cambio: dal 33% al 43% quando si supera lo scaglione', () => {
    const prima = percentualeMese(anno2027(1_000_00), { margine: 0 }); // imponibile 51.500: 33%
    const dopo = percentualeMese(anno2027(10_000_00), { margine: 0 });
    expect(prima.aliquotaMarginale).toBe(0.33);
    expect(motiviCambio(prima, dopo).join(' ')).toMatch(/33% al 43%/);
  });
});

describe('copertura, piano e netto reale', () => {
  it('caso F: il salvadanaio copre le scadenze in ordine di data', () => {
    const c = copertura(5_000_00, [
      { voce: 'novembre', data: '2028-11-30', importo: 2_000_00 },
      { voce: 'giugno', data: '2028-06-30', importo: 6_000_00 },
    ]);
    expect(c.scadenze.map((s) => [s.voce, s.coperto, s.manca])).toEqual([
      ['giugno', 5_000_00, 1_000_00],
      ['novembre', 0, 2_000_00],
    ]);
    expect(c.mancaTotale).toBe(3_000_00);
    expect(c.eccedenza).toBe(0);
  });

  it('caso D: piano mensile fino a giugno', () => {
    const p = pianoMensile({ fabbisogno: 10_000_00, saldo: 1_000_00, oggi: '2027-11-22', scadenza: '2028-06-30' });
    expect(p).toMatchObject({ mesi: 7, mensile: 1_285_72, interessi: 0 });
  });

  it('caso E: interessi netti con ritenuta del 26%', () => {
    expect(interessiNetti(9_000_00, 0.03, 0.26, 7)).toBe(116_55);
    const p = pianoMensile({ fabbisogno: 10_000_00, saldo: 1_000_00, oggi: '2027-11-22', scadenza: '2028-06-30', tasso: 0.03, ritenuta: 0.26 });
    expect(p.interessi).toBeGreaterThan(0);
    expect(p.mensile).toBeLessThan(1_285_72);
  });

  it('caso G: netto reale senza crediti né stipendio', () => {
    expect(nettoReale({ incassato: 20_000_00, spese: 2_000_00, necessari: 9_000_00 })).toBe(9_000_00);
  });

  it('regole: margine del primo anno e ritenuta sugli interessi con fonte', () => {
    const r = regoleAccantonamento(2027);
    expect(r.marginePrimoAnno.valore).toBe(0.1);
    expect(r.ritenutaInteressi.valore).toBe(0.26);
    expect(r.ritenutaInteressi.fonte.length).toBeGreaterThan(10);
  });
});
