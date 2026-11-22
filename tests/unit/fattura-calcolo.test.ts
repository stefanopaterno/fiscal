import { describe, expect, it } from 'vitest';
import { calcolaFattura, type InputFattura } from '@/engine/fattura/calcola';

// T002 (003, SC-001): casi al centesimo di quickstart.md e invarianti del contratto motore-fattura.
// Importi in centesimi. Regole 2027: integrativo 4%, IVA 22%, bollo 2,00 € oltre 77,47 €, ritenuta 20%.

const base: Omit<InputFattura, 'righe'> = { anno: 2027, sostitutoImposta: false, bolloACarico: 'paziente' };

describe('calcolaFattura: casi al centesimo (2027)', () => {
  it('1) seduta esente 80,00 € a persona fisica: integrativo, bollo, nessuna ritenuta', () => {
    const r = calcolaFattura({ ...base, righe: [{ compenso: 8000, natura: 'esente_sanitaria' }] });
    expect(r).toMatchObject({
      totaleCompensi: 8000,
      totaleIntegrativo: 320,
      importoEsente: 8320,
      imponibileIva: 0,
      iva: 0,
      bollo: 200,
      bolloAddebitato: true,
      ritenuta: 0,
      totale: 8520,
      netto: 8520,
    });
  });

  it('2) seduta esente 74,00 €: sotto la soglia, niente bollo', () => {
    const r = calcolaFattura({ ...base, righe: [{ compenso: 7400, natura: 'esente_sanitaria' }] });
    expect(r).toMatchObject({ totaleIntegrativo: 296, importoEsente: 7696, bollo: 0, totale: 7696 });
  });

  it("3) seduta esente 1.000,00 € a ente sostituto d'imposta: ritenuta solo sul compenso", () => {
    const r = calcolaFattura({
      ...base,
      sostitutoImposta: true,
      righe: [{ compenso: 100000, natura: 'esente_sanitaria' }],
    });
    expect(r).toMatchObject({
      totaleIntegrativo: 4000,
      importoEsente: 104000,
      bollo: 200,
      totale: 104200,
      ritenuta: 20000,
      netto: 84200,
    });
  });

  it('4) consulenza imponibile 500,00 € a ente sostituto: IVA su compenso e integrativo, niente bollo', () => {
    const r = calcolaFattura({
      ...base,
      sostitutoImposta: true,
      righe: [{ compenso: 50000, natura: 'imponibile' }],
    });
    expect(r).toMatchObject({
      totaleIntegrativo: 2000,
      imponibileIva: 52000,
      iva: 11440,
      importoEsente: 0,
      bollo: 0,
      totale: 63440,
      ritenuta: 10000,
      netto: 53440,
    });
  });

  it('5) righe miste esente + imponibile a persona fisica', () => {
    const r = calcolaFattura({
      ...base,
      righe: [
        { compenso: 10000, natura: 'esente_sanitaria' },
        { compenso: 10000, natura: 'imponibile' },
      ],
    });
    expect(r).toMatchObject({
      totaleIntegrativo: 800,
      importoEsente: 10400,
      imponibileIva: 10400,
      iva: 2288,
      bollo: 200,
      totale: 23288,
    });
  });

  it('6) bollo a carico del professionista: non entra nel totale', () => {
    const r = calcolaFattura({
      ...base,
      bolloACarico: 'professionista',
      righe: [{ compenso: 8000, natura: 'esente_sanitaria' }],
    });
    expect(r).toMatchObject({ bollo: 200, bolloAddebitato: false, totale: 8320, netto: 8320 });
  });
});

describe('calcolaFattura: regole e invarianti', () => {
  it('la soglia del bollo è esclusa: 77,47 € esatti non lo fanno scattare', () => {
    // compenso tale che compenso + 4% = 7747 non è intero; usiamo il 2026 (2%): 7595 + 152 = 7747
    const r = calcolaFattura({
      ...base,
      anno: 2026,
      righe: [{ compenso: 7595, natura: 'esente_sanitaria' }],
    });
    expect(r.importoEsente).toBe(7747);
    expect(r.bollo).toBe(0);
  });

  it('nel 2026 il contributo integrativo è al 2%', () => {
    const r = calcolaFattura({
      ...base,
      anno: 2026,
      righe: [{ compenso: 8000, natura: 'esente_sanitaria' }],
    });
    expect(r.totaleIntegrativo).toBe(160);
  });

  it('quantità: compenso moltiplicato per il numero di sedute', () => {
    const r = calcolaFattura({
      ...base,
      righe: [{ compenso: 6000, quantita: 4, natura: 'esente_sanitaria' }],
    });
    expect(r.totaleCompensi).toBe(24000);
    expect(r.totaleIntegrativo).toBe(960);
  });

  it('arrotondamento commerciale al centesimo (0,5 per eccesso)', () => {
    // 12,37 € × 4% = 0,4948 € → 49 centesimi; 12,38 × 4% = 0,4952 → 50
    expect(
      calcolaFattura({ ...base, righe: [{ compenso: 1237, natura: 'imponibile' }] }).totaleIntegrativo,
    ).toBe(49);
    expect(
      calcolaFattura({ ...base, righe: [{ compenso: 1238, natura: 'imponibile' }] }).totaleIntegrativo,
    ).toBe(50);
  });

  it('invarianti: totale, netto, mai importi negativi', () => {
    const casi: InputFattura[] = [
      { ...base, righe: [{ compenso: 12345, natura: 'esente_sanitaria' }] },
      { ...base, sostitutoImposta: true, righe: [{ compenso: 99999, natura: 'imponibile' }] },
      {
        ...base,
        bolloACarico: 'professionista',
        righe: [
          { compenso: 3333, natura: 'imponibile' },
          { compenso: 7777, natura: 'esente_sanitaria', quantita: 3 },
        ],
      },
    ];
    for (const c of casi) {
      const r = calcolaFattura(c);
      expect(r.totale).toBe(r.imponibileIva + r.iva + r.importoEsente + (r.bolloAddebitato ? r.bollo : 0));
      expect(r.netto).toBe(r.totale - r.ritenuta);
      for (const v of [r.iva, r.ritenuta, r.bollo, r.totaleIntegrativo]) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('diciture: esenzione e bollo quando servono, opposizione STS se indicata', () => {
    const r = calcolaFattura({
      ...base,
      opposizioneSts: true,
      righe: [{ compenso: 8000, natura: 'esente_sanitaria' }],
    });
    expect(r.diciture.join(' ')).toMatch(/art\. 10.*n\. 18/);
    expect(r.diciture.join(' ')).toMatch(/bollo/i);
    expect(r.diciture.join(' ')).toMatch(/opposizione/i);
    expect(
      calcolaFattura({ ...base, righe: [{ compenso: 8000, natura: 'imponibile' }] }).diciture.join(' '),
    ).not.toMatch(/art\. 10/);
  });

  it('spiegazioni in parole semplici e regole da verificare segnalate', () => {
    const r = calcolaFattura({ ...base, righe: [{ compenso: 8000, natura: 'esente_sanitaria' }] });
    expect(r.spiegazioni.length).toBeGreaterThan(0);
    expect(r.spiegazioni.join(' ')).toMatch(/ENPAP/);
    // integrativo 4% 2027 verificato sulla fonte ENPAP (10/11/2026)
    expect(r.regoleDaVerificare).not.toContain('aliquotaIntegrativo');
    // con ritenuta resta da verificare l'esclusione dell'integrativo dalla base
    const conRitenuta = calcolaFattura({
      ...base,
      sostitutoImposta: true,
      righe: [{ compenso: 8000, natura: 'esente_sanitaria' }],
    });
    expect(conRitenuta.regoleDaVerificare).toContain('integrativoFuoriRitenuta');
  });

  it('righe vuote, compensi negativi e anni senza regole sono rifiutati', () => {
    expect(() => calcolaFattura({ ...base, righe: [] })).toThrow(/riga/);
    expect(() => calcolaFattura({ ...base, righe: [{ compenso: -1, natura: 'imponibile' }] })).toThrow(
      /compenso/,
    );
    expect(() =>
      calcolaFattura({ ...base, anno: 2019, righe: [{ compenso: 100, natura: 'imponibile' }] }),
    ).toThrow(/regole/);
  });
});
