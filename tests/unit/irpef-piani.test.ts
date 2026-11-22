import { describe, expect, it } from 'vitest';
import { calcolaAnno, type InputAnno } from '@/engine/irpef/anno';
import { pianiVersamento, type Piano } from '@/engine/irpef/piani';
import { ErroreIrpef } from '@/engine/regole/irpef';

// T019 (US5, FR-025..FR-030, SC-007): piani di versamento sul caso 2.
const caso2: InputAnno = {
  anno: 2026,
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
  redditoProfessionale: 10_000_00,
  addizionali: {
    regionale: [{ finoA: null, aliquota: 0.0123 }],
    comunale: { aliquota: 0.008, soglia: null },
    verificate: true,
  },
};
const r = calcolaAnno(caso2);
const perMese = (p: Piano) =>
  p.versamenti.reduce<Record<string, number>>(
    (m, v) => ({ ...m, [v.mese]: (m[v.mese] ?? 0) + v.importo + v.costo }),
    {},
  );
const trova = (piani: Piano[], tipo: Piano['tipo']) => piani.find((p) => p.tipo === tipo)!;

describe('pianiVersamento', () => {
  const piani = pianiVersamento(r, {
    soggettoIsa: false,
    volontario: { importo: 3_000_00, mese: '2026-12' },
  });

  it('storico: giugno 6.412,61 e novembre 2.650,97', () => {
    const p = trova(piani, 'storico');
    expect(perMese(p)).toEqual({ '2027-06': 6_412_61, '2027-11': 2_650_97 });
    expect(p.picco).toEqual({ mese: '2027-06', importo: 6_412_61 });
    expect(p.costi).toBe(0);
  });

  it('rateizzazione in 7 rate con gli interessi della tabella', () => {
    const p = trova(piani, 'rateizzazione');
    const m = perMese(p);
    expect(m['2027-06']).toBe(916_13);
    expect(m['2027-07']).toBe(916_08 + 1_65);
    expect(m['2027-12']).toBe(916_08 + 16_76);
    expect(m['2027-11']).toBe(916_08 + 13_74 + 2_650_97);
    expect(p.costi).toBe(55_24);
    expect(p.picco).toEqual({ mese: '2027-11', importo: 3_580_79 });
  });

  it('differimento di 30 giorni con lo 0,40%', () => {
    const p = trova(piani, 'differimento');
    expect(perMese(p)['2027-07']).toBe(6_412_61 + 25_65);
    expect(p.costi).toBe(25_65);
  });

  it('acconto volontario: versato prima, scende il picco di giugno', () => {
    const p = trova(piani, 'volontario');
    expect(perMese(p)).toEqual({ '2026-12': 3_000_00, '2027-06': 3_412_61, '2027-11': 2_650_97 });
    expect(p.picco.importo).toBe(3_412_61);
    expect(p.spiegazione).toMatch(/3\.000,00/);
  });

  it("totale d'imposta identico in tutti i piani (SC-007)", () => {
    const totali = new Set(piani.map((p) => p.totaleImposta));
    expect(totali.size).toBe(1);
    expect([...totali][0]).toBe(4_418_29 + 123_00 + 80_00 + 24_00 + 4_418_29);
  });

  it('piano consigliato: il picco più basso senza rischi', () => {
    expect(piani.filter((p) => p.consigliato).map((p) => p.tipo)).toEqual(['volontario']);
    const senzaVolontario = pianiVersamento(r, { soggettoIsa: false });
    expect(senzaVolontario.find((p) => p.consigliato)!.tipo).toBe('rateizzazione');
  });

  it('previsionale con stima più bassa: meno acconti, rischio segnalato, totale invariato', () => {
    const conStima = pianiVersamento(r, { soggettoIsa: false, differenzaAttesa: 3_000_00 });
    const p = trova(conStima, 'previsionale');
    expect(perMese(p)['2027-06']).toBe(4_418_29 + 123_00 + 80_00 + 24_00 + 1_200_00);
    expect(perMese(p)['2027-11']).toBe(1_800_00);
    expect(p.rischio).toMatch(/sanzione/);
    expect(p.consigliato).toBe(false);
    // stessa ipotesi per tutti: con lo storico l'eccedenza torna come credito a giugno 2028
    expect(perMese(trova(conStima, 'storico'))['2028-06']).toBe(3_000_00 - 4_418_29);
    expect(new Set(conStima.map((x) => x.totaleImposta)).size).toBe(1);
  });

  it("contributi ENPAP nel mese di scadenza, fuori dal totale d'imposta", () => {
    const conEnpap = pianiVersamento(r, {
      soggettoIsa: false,
      contributiEnpap: { importo: 1_200_00, mese: '2027-10' },
    });
    const p = trova(conEnpap, 'storico');
    expect(perMese(p)['2027-10']).toBe(1_200_00);
    expect(p.totaleImposta).toBe(trova(piani, 'storico').totaleImposta);
    expect(p.totaleContributi).toBe(1_200_00);
  });

  it('acconto volontario dopo giugno rifiutato', () => {
    expect(() =>
      pianiVersamento(r, { soggettoIsa: false, volontario: { importo: 100_00, mese: '2027-07' } }),
    ).toThrow(ErroreIrpef);
  });
});
