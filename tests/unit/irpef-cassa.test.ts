import { describe, expect, it } from 'vitest';
import { redditoDiCassa } from '@/engine/irpef/cassa';

// T009 (R-08): reddito per cassa e ritenute subite dagli incassi dell'anno.
describe('redditoDiCassa', () => {
  const fatture = [
    // paziente: 80 € + 4% integrativo + bollo addebitato, nessuna ritenuta
    {
      id: 'p',
      tipo: 'fattura' as const,
      totale_compensi: 8000,
      totale_integrativo: 320,
      ritenuta: 0,
      netto: 8520,
    },
    // ente sostituto d'imposta: 1.000 € + 40 € integrativo, ritenuta 20% su 1.000
    {
      id: 'e',
      tipo: 'fattura' as const,
      totale_compensi: 100000,
      totale_integrativo: 4000,
      ritenuta: 20000,
      netto: 84000,
    },
  ];

  it("solo gli incassi dell'anno, in proporzione al netto incassato", () => {
    const r = redditoDiCassa(2027, fatture, [
      { fattura_id: 'p', data: '2027-03-01', importo: 8520 },
      { fattura_id: 'e', data: '2027-12-30', importo: 42000 }, // metà
      { fattura_id: 'e', data: '2028-01-10', importo: 42000 }, // l'altra metà conta nel 2028
    ]);
    expect(r).toEqual({ compensi: 8000 + 50000, integrativo: 320 + 2000, ritenute: 10000, incassato: 50520 });
  });

  it('nessun incasso: tutto zero', () => {
    expect(redditoDiCassa(2027, fatture, [])).toEqual({
      compensi: 0,
      integrativo: 0,
      ritenute: 0,
      incassato: 0,
    });
  });
});
