import { describe, expect, it } from 'vitest';
import { quotaImponibile } from '@/engine/fattura/prorata';

// T003 (003, FR-024, research R-03): quota imponibile e pro-rata (art. 19-bis DPR 633/72).

describe('quotaImponibile', () => {
  it('solo esenti: quota 0 e pro-rata 0', () => {
    expect(quotaImponibile({ imponibili: 0, esenti: 100000 })).toEqual({ quota: 0, prorata: 0 });
  });
  it('solo imponibili: 100%', () => {
    expect(quotaImponibile({ imponibili: 50000, esenti: 0 })).toEqual({ quota: 100, prorata: 100 });
  });
  it('nessuna operazione: 0 senza divisioni per zero', () => {
    expect(quotaImponibile({ imponibili: 0, esenti: 0 })).toEqual({ quota: 0, prorata: 0 });
  });
  it("arrotonda all'unità superiore solo se la parte decimale supera 0,5", () => {
    expect(quotaImponibile({ imponibili: 1050, esenti: 8950 }).prorata).toBe(10); // 10,50 → 10
    expect(quotaImponibile({ imponibili: 1051, esenti: 8949 }).prorata).toBe(11); // 10,51 → 11
    expect(quotaImponibile({ imponibili: 1049, esenti: 8951 }).prorata).toBe(10); // 10,49 → 10
  });
  it('quota con due decimali', () => {
    expect(quotaImponibile({ imponibili: 1, esenti: 2 }).quota).toBe(33.33);
  });
});
