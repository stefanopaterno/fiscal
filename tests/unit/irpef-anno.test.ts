import { describe, expect, it } from 'vitest';
import { calcolaAnno, type CuInput, type InputAnno } from '@/engine/irpef/anno';
import { ErroreIrpef } from '@/engine/regole/irpef';

// T005 (US1, FR-001..FR-011, FR-017..FR-019, SC-001): casi di quickstart.md al centesimo.
const ADDIZIONALI_ESEMPIO = {
  regionale: [{ finoA: null, aliquota: 0.0123 }],
  comunale: { aliquota: 0.008, soglia: null },
  verificate: true,
};

const cu38 = (extra: Partial<CuInput> = {}): CuInput => ({
  redditoLavoro: 38_000_00,
  ritenuteIrpef: 8_448_09,
  addRegionale: 467_40,
  addComunaleAcconto: 91_20,
  addComunaleSaldo: 212_80,
  addComunaleAccontoAnnoDopo: 91_20,
  ...extra,
});

const base = (extra: Partial<InputAnno> = {}): InputAnno => ({
  anno: 2026,
  cu: [cu38()],
  redditoProfessionale: 0,
  addizionali: ADDIZIONALI_ESEMPIO,
  ...extra,
});

describe('calcolaAnno — casi di riferimento', () => {
  it('caso 1: solo CU 38.000 €, conguaglio zero', () => {
    const r = calcolaAnno(base());
    expect(r.redditoComplessivo).toBe(38_000_00);
    expect(r.irpefLorda.totale).toBe(9_740_00);
    expect(r.detrazioneLavoro).toBe(1_041_91);
    expect(r.ulterioreDetrazione).toBe(250_00);
    expect(r.irpefNetta).toBe(8_448_09);
    expect(r.conguaglioIrpef).toBe(0);
    expect(r.addizionali!.regionale.conguaglio).toBe(0);
    expect(r.addizionali!.comunale.conguaglio).toBe(0);
  });

  it('caso 2: CU 38.000 + professionale 10.000', () => {
    const r = calcolaAnno(base({ redditoProfessionale: 10_000_00 }));
    expect(r.redditoComplessivo).toBe(48_000_00);
    expect(r.redditoImponibile).toBe(48_000_00);
    expect(r.irpefLorda.totale).toBe(13_040_00);
    expect(r.irpefLorda.perScaglione.map((s) => s.imposta)).toEqual([6_440_00, 6_600_00]);
    expect(r.detrazioneLavoro).toBe(173_62);
    expect(r.ulterioreDetrazione).toBe(0);
    expect(r.irpefNetta).toBe(12_866_38);
    expect(r.conguaglioIrpef).toBe(4_418_29);
    expect(r.differenza).toBe(4_418_29);
    expect(r.scaglione).toEqual({
      aliquotaMarginale: 0.33,
      sogliaSuccessiva: 50_000_00,
      mancaAlProssimo: 2_000_00,
    });
    expect(r.addizionali!.regionale).toEqual({ dovuta: 590_40, trattenuta: 467_40, conguaglio: 123_00 });
    expect(r.addizionali!.comunale).toMatchObject({ dovuta: 384_00, trattenuta: 304_00, conguaglio: 80_00 });
    expect(r.addizionali!.comunale.accontoAnnoDopo).toBe(24_00);
    expect(r.conguaglioTotale).toBe(4_621_29);
  });

  it("caso 2: senza il punto 29 l'acconto comunale è stimato e segnalato", () => {
    const r = calcolaAnno(
      base({ redditoProfessionale: 10_000_00, cu: [cu38({ addComunaleAccontoAnnoDopo: null })] }),
    );
    expect(r.addizionali!.comunale.accontoAnnoDopo).toBe(24_00);
    expect(r.datiMancanti.join(' ')).toMatch(/punto 29/i);
  });

  it('caso 3: perdita professionale, conguaglio a credito', () => {
    const r = calcolaAnno(base({ redditoProfessionale: -3_000_00 }));
    expect(r.redditoComplessivo).toBe(35_000_00);
    expect(r.irpefLorda.totale).toBe(8_750_00);
    expect(r.detrazioneLavoro).toBe(1_367_24);
    expect(r.ulterioreDetrazione).toBe(625_00);
    expect(r.irpefNetta).toBe(6_757_76);
    expect(r.conguaglioIrpef).toBe(-1_690_33);
  });

  it("caso 5: soggettivo dedotto dall'imponibile, non dalla base delle detrazioni; integrativo mai", () => {
    const r = calcolaAnno(
      base({
        redditoProfessionale: 10_000_00,
        versamentiPrevidenza: [
          { data: '2026-10-01', importo: 1_200_00, tipo: 'soggettivo', cassa: 'enpap' },
          { data: '2026-10-01', importo: 400_00, tipo: 'integrativo', cassa: 'enpap' },
          { data: '2025-10-01', importo: 999_00, tipo: 'soggettivo', cassa: 'enpap' }, // altro anno
        ],
      }),
    );
    expect(r.contributiDedotti).toBe(1_200_00);
    expect(r.redditoComplessivo).toBe(48_000_00);
    expect(r.redditoImponibile).toBe(46_800_00);
    expect(r.irpefLorda.totale).toBe(12_644_00);
    expect(r.detrazioneLavoro).toBe(173_62);
    expect(r.irpefNetta).toBe(12_470_38);
    expect(r.conguaglioIrpef).toBe(4_022_29);
  });

  it('caso 7 (2026): CU sopra 50.000, la P.IVA è tutta al 43%', () => {
    const r = calcolaAnno({
      anno: 2026,
      cu: [
        {
          redditoLavoro: 50_500_00,
          ritenuteIrpef: 13_915_00,
          addRegionale: 0,
          addComunaleAcconto: 0,
          addComunaleSaldo: 0,
        },
      ],
      redditoProfessionale: 10_000_00,
      addizionali: null,
    });
    expect(r.irpefLorda.totale).toBe(18_215_00);
    expect(r.detrazioneLavoro).toBe(0);
    expect(r.conguaglioIrpef).toBe(4_300_00);
    expect(r.scaglione.aliquotaMarginale).toBe(0.43);
    expect(r.scaglione.sogliaSuccessiva).toBeNull();
    expect(r.addizionali).toBeNull();
    expect(r.datiMancanti.join(' ')).toMatch(/addizionali/);
    expect(r.provvisorio).toBe(true);
  });

  it('caso 8 (2027): CU 49.000 + 10.000, detrazione persa e scaglione 55.000', () => {
    const r = calcolaAnno({
      anno: 2027,
      cu: [
        {
          redditoLavoro: 49_000_00,
          ritenuteIrpef: 13_283_09,
          addRegionale: 0,
          addComunaleAcconto: 0,
          addComunaleSaldo: 0,
        },
      ],
      redditoProfessionale: 10_000_00,
      addizionali: null,
    });
    expect(r.irpefLorda.perScaglione.map((s) => s.imposta)).toEqual([6_440_00, 8_910_00, 1_720_00]);
    expect(r.conguaglioIrpef).toBe(3_786_91);
    expect(r.regoleDaVerificare.join(' ')).toMatch(/DDL di Bilancio 2027/);
  });
});

describe('calcolaAnno — invarianti', () => {
  it('detrazione della CU coerente con le ritenute del datore (caso 8 senza P.IVA)', () => {
    const r = calcolaAnno({
      anno: 2027,
      cu: [
        {
          redditoLavoro: 49_000_00,
          ritenuteIrpef: 13_283_09,
          addRegionale: 0,
          addComunaleAcconto: 0,
          addComunaleSaldo: 0,
        },
      ],
      redditoProfessionale: 0,
      addizionali: null,
    });
    expect(r.detrazioneLavoro).toBe(86_91);
    expect(r.conguaglioIrpef).toBe(0);
  });

  it('IRPEF netta zero ⇒ addizionali non dovute', () => {
    const r = calcolaAnno(
      base({
        cu: [
          {
            redditoLavoro: 8_000_00,
            ritenuteIrpef: 0,
            addRegionale: 0,
            addComunaleAcconto: 0,
            addComunaleSaldo: 0,
          },
        ],
      }),
    );
    expect(r.irpefNetta).toBe(0);
    expect(r.incapienza).toBeGreaterThan(0);
    expect(r.addizionali!.regionale.dovuta).toBe(0);
    expect(r.addizionali!.comunale.dovuta).toBe(0);
  });

  it('soglia di esenzione comunale: sotto non si paga, sopra si paga su tutto', () => {
    const conSoglia = (soglia: number) =>
      calcolaAnno(base({ addizionali: { ...ADDIZIONALI_ESEMPIO, comunale: { aliquota: 0.008, soglia } } }));
    expect(conSoglia(40_000_00).addizionali!.comunale.dovuta).toBe(0);
    expect(conSoglia(20_000_00).addizionali!.comunale.dovuta).toBe(304_00);
  });

  it('regionale a più scaglioni, progressiva', () => {
    const r = calcolaAnno(
      base({
        addizionali: {
          regionale: [
            { finoA: 15_000_00, aliquota: 0.0123 },
            { finoA: 28_000_00, aliquota: 0.0158 },
            { finoA: null, aliquota: 0.0173 },
          ],
          comunale: { aliquota: 0.008, soglia: null },
          verificate: false,
        },
      }),
    );
    // 15.000 × 1,23% + 13.000 × 1,58% + 10.000 × 1,73% = 184,50 + 205,40 + 173,00
    expect(r.addizionali!.regionale.dovuta).toBe(562_90);
    expect(r.regoleDaVerificare.join(' ')).toMatch(/addizionali/i);
  });

  it('giorni di lavoro: detrazione rapportata', () => {
    const r = calcolaAnno(base({ cu: [cu38({ giorniLavoro: 182 })] }));
    expect(r.detrazioneLavoro).toBe(519_53);
  });

  it('ulteriore detrazione rapportata ai giorni di lavoro (istruzioni CU, punto 368)', () => {
    // 38.000 €: ulteriore 250,00 € pieni; 182 giorni su 365 ⇒ 124,66 €
    const r = calcolaAnno(base({ cu: [cu38({ giorniLavoro: 182 })] }));
    expect(r.ulterioreDetrazione).toBe(124_66);
  });

  it('più CU nello stesso anno si sommano', () => {
    const r = calcolaAnno(
      base({
        cu: [
          cu38({ redditoLavoro: 20_000_00, ritenuteIrpef: 4_000_00, giorniLavoro: 180 }),
          cu38({ redditoLavoro: 18_000_00, ritenuteIrpef: 4_448_09, giorniLavoro: 185 }),
        ],
      }),
    );
    expect(r.redditoLavoro).toBe(38_000_00);
    expect(r.detrazioneLavoro).toBe(1_041_91);
    expect(r.ritenute).toBe(8_448_09);
  });

  it('altre detrazioni e acconti versati entrano nel conguaglio; ritenute subite scomputate', () => {
    const r = calcolaAnno(
      base({
        redditoProfessionale: 10_000_00,
        altreDetrazioni: 300_00,
        ritenuteSubite: 200_00,
        accontiVersati: { irpef: 1_000_00, addComunale: 0 },
      }),
    );
    expect(r.irpefNetta).toBe(12_566_38);
    expect(r.differenza).toBe(3_918_29);
    expect(r.conguaglioIrpef).toBe(2_918_29);
  });

  it('contributi previsti contano solo per un anno non concluso e sono mostrati a parte', () => {
    const r = calcolaAnno(base({ redditoProfessionale: 10_000_00, contributiPrevisti: 1_200_00 }));
    expect(r.contributiPrevisti).toBe(1_200_00);
    expect(r.redditoImponibile).toBe(46_800_00);
    expect(r.conguaglioIrpef).toBe(4_022_29);
  });

  it('ogni voce ha una spiegazione con la regola', () => {
    const r = calcolaAnno(base({ redditoProfessionale: 10_000_00 }));
    const voci = r.spiegazioni.map((s) => s.voce);
    for (const v of [
      'redditoComplessivo',
      'redditoImponibile',
      'irpefLorda',
      'detrazioneLavoro',
      'irpefNetta',
      'conguaglioIrpef',
      'scaglione',
      'addizionali',
    ])
      expect(voci).toContain(v);
    for (const s of r.spiegazioni) {
      expect(s.testo.length).toBeGreaterThan(20);
      expect(s.regola.length).toBeGreaterThan(5);
    }
    // con regole da verificare il risultato è provvisorio (FR-017)
    expect(r.provvisorio).toBe(true);
  });

  it('dati non validi: errore chiaro, nessun risultato', () => {
    expect(() => calcolaAnno(base({ cu: [] }))).toThrow(ErroreIrpef);
    expect(() => calcolaAnno(base({ cu: [cu38({ redditoLavoro: -1 })] }))).toThrow(/negativ/);
    expect(() => calcolaAnno(base({ cu: [cu38({ giorniLavoro: 400 })] }))).toThrow(/giorni/);
    expect(() => calcolaAnno(base({ anno: 2031 }))).toThrow(/2031/);
    expect(() => calcolaAnno(base({ redditoProfessionale: 1.5 }))).toThrow(/centesimi/);
  });
});
