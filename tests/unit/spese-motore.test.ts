import { describe, expect, it } from 'vitest';
import type { InputAnno } from '@/engine/irpef/anno';
import { pianoAmmortamento, quoteAmmortamentoAnno } from '@/engine/spese/ammortamento';
import { consigli, simulaSpesa } from '@/engine/spese/consigli';
import { totaleSpeseAnno, type SpesaInput } from '@/engine/spese/deducibilita';
import { oneriAnno } from '@/engine/spese/oneri';
import { budgetUfficio } from '@/engine/spese/ufficio';
import { categoria, regoleSpesePerAnno } from '@/engine/regole/spese';
import type { Regola } from '@/engine/regole/tipi';

// T002, T006, T010, T013, T018 (008): casi A–K di quickstart.md al centesimo e invarianti.
const spesa = (categoria: string, importo: number, extra: Partial<SpesaInput> = {}): SpesaInput => ({
  data: '2027-03-10',
  categoria,
  importo,
  modalita: 'carta',
  ...extra,
});
const ctx = { anno: 2027, compensi: 10_000_00 };

describe('regole delle spese', () => {
  it.each([2026, 2027])('%i: ogni categoria e voce ha fonte e stato; studio fisico spento', (anno) => {
    const r = regoleSpesePerAnno(anno);
    const regole: Regola<unknown>[] = [
      ...r.categorie.map((c) => c.regola),
      ...r.beni.categorie.map((c) => c.regola),
      ...r.oneri.map((o) => o.regola),
      r.beni.sogliaImmediata,
      r.tetto16ter,
    ];
    for (const x of regole) expect(x.fonte.length).toBeGreaterThan(10);
    expect(categoria(r, 'affitto_studio')!.attivaDiDefault).toBe(false);
    expect(categoria(r, 'uso_promiscuo_casa')!.attivaDiDefault).toBe(false);
  });
  it('anno senza regole: errore', () => {
    expect(() => regoleSpesePerAnno(2031)).toThrow(/2031/);
  });
});

describe('spese professionali (casi A, B, E, E2)', () => {
  it('formazione, telefono e vitto con il tetto del 2% dei compensi', () => {
    const r = totaleSpeseAnno(
      [spesa('formazione', 1_200_00), spesa('telefonia', 600_00), spesa('vitto_alloggio', 500_00)],
      [],
      ctx,
    );
    const per = Object.fromEntries(r.perCategoria.map((c) => [c.codice, c.deducibile]));
    expect(per).toEqual({ formazione: 1_200_00, telefonia: 480_00, vitto_alloggio: 200_00 });
    expect(r.deducibile).toBe(1_880_00);
    expect(r.perCategoria.find((c) => c.codice === 'vitto_alloggio')!.eccedenza).toBe(175_00);
  });

  it('vitto pagato in contanti: niente deduzione e avviso', () => {
    const r = totaleSpeseAnno([spesa('vitto_alloggio', 500_00, { modalita: 'contanti' })], [], ctx);
    expect(r.deducibile).toBe(0);
    expect(r.avvisi.join(' ')).toMatch(/tracciabil/);
  });

  it('spese di un altro anno, rimborsate dal cliente o con IVA detraibile', () => {
    const r = totaleSpeseAnno(
      [
        spesa('software', 100_00, { data: '2026-12-31' }),
        spesa('software', 200_00, { rimborsata: true }),
        spesa('software', 122_00, { ivaDetraibile: 22_00 }),
      ],
      [],
      ctx,
    );
    expect(r.deducibile).toBe(100_00);
  });

  it('percentuale personalizzata (internet al 50%) e spese senza giustificativo contate', () => {
    const r = totaleSpeseAnno(
      [spesa('internet', 400_00, { percentuale: 0.5, haGiustificativo: false })],
      [],
      ctx,
    );
    expect(r.deducibile).toBe(200_00);
    expect(r.senzaGiustificativo).toBe(1);
  });

  it('formazione oltre 10.000 €: solo 10.000 deducibili', () => {
    const r = totaleSpeseAnno([spesa('formazione', 12_000_00)], [], ctx);
    expect(r.deducibile).toBe(10_000_00);
  });
});

describe('beni durevoli (casi C, D)', () => {
  it("computer da 1.500 €: 300 € l'anno per 5 anni", () => {
    const p = pianoAmmortamento({ costo: 1_500_00, dataAcquisto: '2027-02-01', categoria: 'computer' });
    expect(p.immediata).toBe(false);
    expect(p.quote.map((q) => [q.anno, q.quota])).toEqual([
      [2027, 300_00],
      [2028, 300_00],
      [2029, 300_00],
      [2030, 300_00],
      [2031, 300_00],
    ]);
    expect(p.quote.at(-1)!.residuo).toBe(0);
  });

  it('computer da 450 €: tutto subito', () => {
    const p = pianoAmmortamento({ costo: 450_00, dataAcquisto: '2027-02-01', categoria: 'computer' });
    expect(p).toMatchObject({ immediata: true, quote: [{ anno: 2027, quota: 450_00, residuo: 0 }] });
  });

  it('ultima quota = residuo; dismissione ferma le quote', () => {
    const p = pianoAmmortamento({ costo: 1_000_00, dataAcquisto: '2027-01-10', categoria: 'arredi' });
    expect(p.quote.reduce((t, q) => t + q.quota, 0)).toBe(1_000_00);
    const d = pianoAmmortamento({
      costo: 1_500_00,
      dataAcquisto: '2027-02-01',
      categoria: 'computer',
      dataDismissione: '2029-06-01',
    });
    expect(d.quote.map((q) => q.anno)).toEqual([2027, 2028]);
    expect(d.avvisi.join(' ')).toMatch(/commercialista/);
  });

  it("quote dell'anno nel totale delle spese", () => {
    const beni = [{ costo: 1_500_00, dataAcquisto: '2026-05-01', categoria: 'computer' }];
    expect(quoteAmmortamentoAnno(beni, 2027)).toBe(300_00);
    expect(totaleSpeseAnno([], beni, ctx).ammortamenti).toBe(300_00);
  });
});

describe('oneri personali (casi F, G, H)', () => {
  it('previdenza complementare con 1.000 € già in CU: residuo 4.164,57', () => {
    const r = oneriAnno(
      [{ voce: 'previdenza_complementare', importo: 6_000_00, data: '2027-12-01', modalita: 'bonifico' }],
      {
        anno: 2027,
        redditoComplessivo: 60_000_00,
        figli: 0,
        previdenzaInCu: 1_000_00,
      },
    );
    const v = r.perVoce.find((x) => x.codice === 'previdenza_complementare')!;
    expect(v).toMatchObject({ utile: 4_164_57, nonUtile: 1_835_43, residuo: 0, esaurita: true });
    expect(r.deduzioni).toBe(4_164_57);
  });

  it('spese sanitarie: 19% oltre 129,11 €', () => {
    const r = oneriAnno(
      [{ voce: 'spese_sanitarie', importo: 1_000_00, data: '2027-04-01', modalita: 'carta' }],
      {
        anno: 2027,
        redditoComplessivo: 60_000_00,
        figli: 0,
      },
    );
    expect(r.detrazioni).toBe(165_47);
  });

  it("tetto dell'art. 16-ter a 90.000 € senza figli: spese al 19% fino a 7.000 €", () => {
    const r = oneriAnno(
      [{ voce: 'altre_19', importo: 20_000_00, data: '2027-04-01', modalita: 'bonifico' }],
      {
        anno: 2027,
        redditoComplessivo: 90_000_00,
        figli: 0,
      },
    );
    expect(r.detrazioni).toBe(1_330_00);
    expect(r.avvisi.join(' ')).toMatch(/16-ter/);
  });
});

describe('consigli e simulazione (casi J, K)', () => {
  const input: InputAnno = {
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
  };

  it('caso J: 1.200 € di formazione valgono 516 € di IRPEF (43%)', () => {
    const s = simulaSpesa(input, [{ tipo: 'spesa_professionale', importo: 1_200_00 }]);
    expect(s.perOpzione[0]!.risparmioImposte).toBe(516_00);
    expect(s.perOpzione[0]!.costoNetto).toBe(1_200_00 - 516_00);
  });

  it('caso K: ordine per risparmio per euro, voci vincolate solo con accantonamento coperto, esaurite a parte', () => {
    const senza = consigli(
      input,
      { spese: [], oneri: [], beni: [] },
      { accantonamentoCoperto: false, oggi: '2026-11-22', figli: 0 },
    );
    expect(senza.attivi.some((c) => c.vincolata)).toBe(false);
    expect(senza.nascosti.join(' ')).toMatch(/accantonamento/);

    const con = consigli(
      input,
      {
        spese: [],
        oneri: [
          { voce: 'previdenza_complementare', importo: 5_164_57, data: '2026-06-01', modalita: 'bonifico' },
        ],
        beni: [],
      },
      { accantonamentoCoperto: true, oggi: '2026-11-22', figli: 0 },
    );
    expect(con.esauriti.map((c) => c.codice)).toContain('previdenza_complementare');
    const per = con.attivi.map((c) => c.risparmioPerEuro);
    expect([...per].sort((a, b) => b - a)).toEqual(per);
    for (const c of con.attivi) {
      expect(c.costoNetto).toBeGreaterThanOrEqual(0);
      expect(c.scadenza).toBe('2026-12-31');
      expect(c.avvertenze.join(' ')).toMatch(/gratis|costo netto/);
    }
    // mai consigli su incassi o fatture
    expect(JSON.stringify(con)).not.toMatch(/incass|fattur/i);
  });

  it('anno concluso: nessun consiglio attivo', () => {
    const c = consigli(
      input,
      { spese: [], oneri: [], beni: [] },
      { accantonamentoCoperto: true, oggi: '2027-01-02', figli: 0 },
    );
    expect(c.attivi).toEqual([]);
    expect(c.motivoVuoto).toMatch(/31 dicembre/);
  });
});

describe('ufficio (caso I)', () => {
  it('incassi medi 3.000 €, margine 20%, rapporto 15%: canone massimo 360 €', () => {
    const b = budgetUfficio(Array(12).fill(3_000_00), { margine: 0.2, rapporto: 0.15 }, 80_00);
    expect(b.canoneMassimo).toBe(360_00);
    expect(b.sedute).toBe(5);
    expect(b.affidabile).toBe(true);
  });

  it('pochi mesi o incassi molto variabili: non affidabile', () => {
    expect(budgetUfficio([3_000_00, 3_000_00], { margine: 0.2, rapporto: 0.15 }, 80_00).affidabile).toBe(
      false,
    );
    expect(
      budgetUfficio([0, 6_000_00, 0, 6_000_00, 0, 6_000_00], { margine: 0.2, rapporto: 0.15 }, 80_00)
        .affidabile,
    ).toBe(false);
  });
});
