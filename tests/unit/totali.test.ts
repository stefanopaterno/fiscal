import { describe, expect, it } from 'vitest';
import { totaliFatture, type DocumentoTotali } from '@/engine/fattura/totali';

// T022 (003, FR-011, FR-018): totali dello storico.
const f = (id: string, campi: Partial<DocumentoTotali>): DocumentoTotali => ({
  id,
  tipo: 'fattura',
  stato: 'emessa',
  totale: 8520,
  netto: 8520,
  ...campi,
});

describe('totaliFatture', () => {
  it('emesso al netto delle note di credito; bozze escluse; annullate non da incassare', () => {
    const r = totaliFatture(
      [
        f('a', { stato: 'annullata' }),
        f('nc', { tipo: 'nota_credito' }),
        f('b', {}),
        f('c', { totale: 104200, netto: 84200 }),
        f('bozza', { stato: 'bozza' }),
      ],
      [
        { fattura_id: 'b', importo: 5000 },
        { fattura_id: 'c', importo: 84200 },
      ],
    );
    expect(r).toEqual({ emesso: 8520 + 104200, incassato: 89200, daIncassare: 3520, documenti: 4 });
  });
  it('nessun documento: tutto a zero', () => {
    expect(totaliFatture([], [])).toEqual({ emesso: 0, incassato: 0, daIncassare: 0, documenti: 0 });
  });
});
