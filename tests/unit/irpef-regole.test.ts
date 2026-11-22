import { describe, expect, it } from 'vitest';
import { calcolaAnno, type InputAnno } from '@/engine/irpef/anno';
import { anniConRegoleIrpef, ErroreIrpef, regoleIrpefPerAnno } from '@/engine/regole/irpef';
import type { Regola } from '@/engine/regole/tipi';

// T002, T022 (FR-016, FR-017, SC-005): regole per anno con fonte e stato, nessun prestito tra anni.
describe('regole IRPEF per anno', () => {
  it('2026 e 2027 presenti, anno mancante rifiutato', () => {
    expect(anniConRegoleIrpef()).toEqual([2026, 2027]);
    expect(() => regoleIrpefPerAnno(2031)).toThrow(ErroreIrpef);
    expect(() => regoleIrpefPerAnno(2031)).toThrow(/2031/);
  });

  it.each([2026, 2027])('%i: ogni regola ha fonte e stato', (anno) => {
    const r = regoleIrpefPerAnno(anno);
    const regole: Regola<unknown>[] = [
      r.scaglioni,
      r.detrazioneLavoro,
      r.ulterioreDetrazione,
      r.ulterioreRagguagliata,
      r.addizionaliSoloConIrpefDovuta,
      r.acconti,
      r.rateizzazione,
      r.differimento,
      ...Object.values(r.enpap),
    ];
    for (const regola of regole) {
      expect(regola.fonte.length).toBeGreaterThan(10);
      expect(['verificata', 'da_verificare']).toContain(regola.stato);
    }
  });

  it.each([2026, 2027])('%i: scaglioni crescenti, ultimo senza limite', (anno) => {
    const s = regoleIrpefPerAnno(anno).scaglioni.valore;
    expect(s.at(-1)!.finoA).toBeNull();
    for (let i = 1; i < s.length - 1; i++) expect(s[i]!.finoA!).toBeGreaterThan(s[i - 1]!.finoA!);
  });

  it('2027: 33% fino a 55.000 € (DDL), da verificare; minimi ENPAP assenti, non inventati', () => {
    const r = regoleIrpefPerAnno(2027);
    expect(r.scaglioni.valore[1]).toEqual({ finoA: 55_000_00, aliquota: 0.33 });
    expect(r.scaglioni.stato).toBe('da_verificare');
    expect(r.enpap.minimoSoggettivo.valore).toBeNull();
    expect(r.enpap.maternita.valore).toBeNull();
    expect(r.enpap.aliquotaIntegrativo).toMatchObject({ valore: 0.04, stato: 'verificata' });
  });

  it('caso 7: stesso caso, risultato diverso tra 2026 e 2027, ognuno con le sue regole', () => {
    const caso = (anno: number, ritenute: number): InputAnno => ({
      anno,
      cu: [
        {
          redditoLavoro: 50_500_00,
          ritenuteIrpef: ritenute,
          addRegionale: 0,
          addComunaleAcconto: 0,
          addComunaleSaldo: 0,
        },
      ],
      redditoProfessionale: 10_000_00,
      addizionali: null,
    });
    const r26 = calcolaAnno(caso(2026, 13_915_00));
    const r27 = calcolaAnno(caso(2027, 13_865_00));
    expect(r26.conguaglioIrpef).toBe(4_300_00);
    expect(r27.conguaglioIrpef).toBe(3_850_00);
    // ricalcolare il 2026 dopo il 2027 dà lo stesso risultato (SC-005)
    expect(calcolaAnno(caso(2026, 13_915_00)).conguaglioIrpef).toBe(4_300_00);
  });
});
