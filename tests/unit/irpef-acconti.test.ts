import { describe, expect, it } from 'vitest';
import { calcolaAcconti, stimaVersamenti } from '@/engine/irpef/acconti';
import { calcolaAnno, type InputAnno } from '@/engine/irpef/anno';
import { contributiEnpap } from '@/engine/irpef/enpap';
import { ErroreIrpef } from '@/engine/regole/irpef';

// T015 (US3, FR-013, FR-015, FR-024, FR-028): acconti storico e previsionale, primo anno, ENPAP.
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

/** Risultato con una "differenza" scelta, per provare le soglie. */
const conDifferenza = (differenza: number) => ({ ...calcolaAnno(caso2), differenza });

describe('calcolaAcconti', () => {
  it('caso 2, storico, non ISA: 40% a giugno e 60% a novembre', () => {
    const a = calcolaAcconti(calcolaAnno(caso2), { metodo: 'storico', soggettoIsa: false });
    expect(a).toMatchObject({
      totale: 4_418_29,
      primo: 1_767_32,
      secondo: 2_650_97,
      nonDovuto: false,
      unicaSoluzione: false,
    });
    expect(a.accontoAddComunale).toBe(24_00);
    expect(a.spiegazione).toMatch(/40%/);
  });

  it('soggetto ISA: 50 e 50', () => {
    const a = calcolaAcconti(calcolaAnno(caso2), { metodo: 'storico', soggettoIsa: true });
    expect([a.primo, a.secondo]).toEqual([2_209_15, 2_209_14]);
  });

  it('soglie: fino a 51,65 € non dovuto; fino a 257,52 € tutto a novembre', () => {
    const op = { metodo: 'storico' as const, soggettoIsa: false };
    expect(calcolaAcconti(conDifferenza(51_65), op)).toMatchObject({
      nonDovuto: true,
      totale: 0,
      primo: 0,
      secondo: 0,
    });
    expect(calcolaAcconti(conDifferenza(51_66), op)).toMatchObject({
      unicaSoluzione: true,
      primo: 0,
      secondo: 51_66,
    });
    expect(calcolaAcconti(conDifferenza(257_52), op)).toMatchObject({
      unicaSoluzione: true,
      secondo: 257_52,
    });
    expect(calcolaAcconti(conDifferenza(257_53), op)).toMatchObject({
      unicaSoluzione: false,
      primo: 103_01,
      secondo: 154_52,
    });
    expect(calcolaAcconti(conDifferenza(-500_00), op)).toMatchObject({ nonDovuto: true, totale: 0 });
  });

  it("previsionale: sull'imposta attesa, e serve la stima", () => {
    const r = calcolaAnno(caso2);
    const a = calcolaAcconti(r, { metodo: 'previsionale', differenzaAttesa: 2_000_00, soggettoIsa: false });
    expect([a.totale, a.primo, a.secondo]).toEqual([2_000_00, 800_00, 1_200_00]);
    expect(a.spiegazione).toMatch(/sanzione/);
    expect(() => calcolaAcconti(r, { metodo: 'previsionale', soggettoIsa: false })).toThrow(ErroreIrpef);
  });

  it('caso 6, primo anno: con il 2026 solo da dipendente nessun acconto nel 2027', () => {
    const anno2026 = calcolaAnno({ ...caso2, redditoProfessionale: 0 });
    const a = calcolaAcconti(anno2026, { metodo: 'storico', soggettoIsa: false });
    expect(a.nonDovuto).toBe(true);
    expect(a.accontoAddComunale).toBe(0);
  });
});

describe('stimaVersamenti', () => {
  it("caso 2: giugno 6.412,61 e novembre 2.650,97 dell'anno dopo", () => {
    const s = stimaVersamenti(calcolaAnno(caso2), { metodo: 'storico', soggettoIsa: false });
    expect(s.giugno).toBe(6_412_61);
    expect(s.novembre).toBe(2_650_97);
    expect(s.meseGiugno).toBe('2027-06');
    expect(s.voci.map((v) => v.voce)).toEqual([
      'saldo_irpef',
      'saldo_add_regionale',
      'saldo_add_comunale',
      'acconto_add_comunale',
      'acconto_irpef_1',
      'acconto_irpef_2',
    ]);
  });

  it('un credito di saldo riduce quanto si versa a giugno, senza andare sotto zero', () => {
    const s = stimaVersamenti(calcolaAnno({ ...caso2, redditoProfessionale: -3_000_00 }), {
      metodo: 'storico',
      soggettoIsa: false,
    });
    expect(s.giugno).toBe(0);
    expect(s.credito).toBeGreaterThan(0);
  });
});

describe('contributiEnpap', () => {
  it('2027: soggettivo 12% e integrativo 4%; minimi e maternità mancanti segnalati', () => {
    const c = contributiEnpap(2027, { redditoProfessionale: 10_000_00, volumeAffari: 12_000_00 });
    expect(c.soggettivo).toBe(1_200_00);
    expect(c.integrativo).toBe(480_00);
    expect(c.maternita).toBe(0);
    expect(c.mancanti.length).toBe(3);
    expect(c.scadenza).toBe('2028-10-01');
    expect(c.provvisorio).toBe(true);
  });

  it('2026: sotto il minimo si paga il minimo', () => {
    const c = contributiEnpap(2026, { redditoProfessionale: 1_000_00, volumeAffari: 1_000_00 });
    expect(c.soggettivo).toBe(856_00);
    expect(c.integrativo).toBe(66_00);
    expect(c.maternita).toBe(130_00);
    expect(c.deducibili).toBe(986_00);
  });

  it('reddito negativo: nessun soggettivo oltre il minimo', () => {
    expect(contributiEnpap(2026, { redditoProfessionale: -5_000_00, volumeAffari: 0 }).soggettivo).toBe(
      856_00,
    );
  });
});
