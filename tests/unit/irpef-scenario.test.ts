import { describe, expect, it } from 'vitest';
import type { InputAnno } from '@/engine/irpef/anno';
import { confrontaScenario } from '@/engine/irpef/scenario';

// T012 (US2, FR-012..FR-014): "e se fatturo ancora X?".
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

describe('confrontaScenario', () => {
  it('caso 4: +5.000 € sul caso 2, si passa al 43% solo per la parte oltre 50.000', () => {
    const s = confrontaScenario(caso2, { compensi: 5_000_00 }, { soggettoIsa: false });
    expect(s.dopo.conguaglioIrpef).toBe(6_541_91);
    expect(s.differenze.irpef).toBe(2_123_62);
    expect(s.differenze.addizionali).toBe(101_50); // 5.000 × (1,23% + 0,8%)
    expect(s.differenze.contributiEnpap).toBe(550_00); // soggettivo 11% sui redditi 2026
    expect(s.differenze.costoTotale).toBe(2_123_62 + 101_50 + 550_00);
    expect(s.superaScaglione).toBe(true);
    expect(s.prima.scaglione.aliquotaMarginale).toBe(0.33);
    expect(s.dopo.scaglione.aliquotaMarginale).toBe(0.43);
    expect(s.spiegazione).toMatch(/solo la parte/);
  });

  it('stima di giugno con e senza scenario, e la quota dello scenario', () => {
    const s = confrontaScenario(caso2, { compensi: 5_000_00 }, { soggettoIsa: false });
    expect(s.giugno.prima).toBe(6_412_61);
    expect(s.giugno.dopo - s.giugno.prima).toBe(s.giugno.differenza);
    expect(s.giugno.differenza).toBeGreaterThan(s.differenze.irpef);
  });

  it('una spesa ipotetica riduce le imposte', () => {
    const s = confrontaScenario(caso2, { spese: 2_000_00 }, { soggettoIsa: false });
    expect(s.differenze.redditoComplessivo).toBe(-2_000_00);
    expect(s.differenze.irpef).toBeLessThan(0);
    expect(s.superaScaglione).toBe(false);
  });

  it('non modifica i dati reali (FR-014)', () => {
    const copia = structuredClone(caso2);
    confrontaScenario(caso2, { compensi: 5_000_00, spese: 100_00 }, { soggettoIsa: false });
    expect(caso2).toEqual(copia);
  });
});
