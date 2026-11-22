import { describe, expect, it } from 'vitest';
import { importoXml } from '@/engine/spese/fattura-ricevuta';

// Importi della fattura elettronica ricevuta (tracciato SDI: punto decimale, fino a 8 decimali).
describe('importoXml', () => {
  it('converte in centesimi con arrotondamento commerciale', () => {
    expect(importoXml('122.00')).toBe(12200);
    expect(importoXml('1234.5')).toBe(123450);
    expect(importoXml('10.005')).toBe(1001);
    expect(importoXml('10.00499999')).toBe(1000);
    expect(importoXml('-5.00')).toBe(-500);
  });
  it('testo non valido o assente: null', () => {
    expect(importoXml(null)).toBeNull();
    expect(importoXml('12,50')).toBeNull();
  });
});
