import { describe, expect, it } from 'vitest';
import { centesimiInTesto, euroInCentesimi, formattaEuro } from '@/engine/importi';

describe('importi in centesimi', () => {
  it("legge gli importi scritti all'italiana", () => {
    expect(euroInCentesimi('80')).toBe(8000);
    expect(euroInCentesimi('80,5')).toBe(8050);
    expect(euroInCentesimi('1.234,56')).toBe(123456);
    expect(euroInCentesimi(' 77,47 € ')).toBe(7747);
    expect(euroInCentesimi('80.50')).toBe(8050);
  });
  it('rifiuta testi non validi', () => {
    for (const t of ['', 'abc', '1,234', '-5', '12,3,4']) expect(euroInCentesimi(t)).toBeNull();
  });
  it('scrive gli importi', () => {
    expect(formattaEuro(123456).replace(/\s/g, ' ')).toBe('1.234,56 €');
    expect(centesimiInTesto(8000)).toBe('80,00');
  });
});
