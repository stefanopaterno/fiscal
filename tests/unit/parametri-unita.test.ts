import { describe, expect, it } from 'vitest';
import {
  euro,
  euroDaFile,
  meseGiorno,
  oggetto,
  percentuale,
  percentualeAFile,
  percentualeDaFile,
  scaglioni,
  variazioneAnomala,
} from '@/engine/parametri/unita';

// Specifica 014, T004 (research.md R-05): unità del file ↔ unità delle regole, senza virgola mobile.
describe('conversioni', () => {
  it('euro → centesimi', () => {
    expect(euroDaFile(2)).toBe(200);
    expect(euroDaFile('2.00')).toBe(200);
    expect(euroDaFile(77.47)).toBe(7747);
    expect(euroDaFile('129.11')).toBe(12911);
    expect(euroDaFile(5164.57)).toBe(516457);
    expect(euroDaFile(2.555)).toBeNull();
    expect(euroDaFile('abc')).toBeNull();
    expect(euroDaFile(1e21)).toBeNull();
  });

  it('percentuale ↔ frazione esatta', () => {
    expect(percentualeDaFile(23)).toBe(0.23);
    expect(percentualeDaFile(0.18)).toBe(0.0018);
    expect(percentualeDaFile('0.40')).toBe(0.004);
    expect(percentualeDaFile(1.83)).toBe(0.0183);
    expect(percentualeAFile(0.0051)).toBe(0.51);
    expect(percentualeAFile(0.12)).toBe(12);
  });

  it('limiti di plausibilità: 0,23 al posto di 23 è rifiutato', () => {
    const aliq = percentuale(5, 60);
    expect(aliq.daFile(23)).toEqual({ ok: true, valore: 0.23 });
    const e = aliq.daFile(0.23);
    expect(e.ok).toBe(false);
    expect(!e.ok && e.motivo).toMatch(/0,23 invece di 23/);
    expect(euro(0.5, 20).daFile(200).ok).toBe(false);
  });

  it('mese-giorno', () => {
    expect(meseGiorno.daFile('06-30')).toEqual({ ok: true, valore: '06-30' });
    expect(meseGiorno.daFile('02-30').ok).toBe(false);
    expect(meseGiorno.daFile('6-30').ok).toBe(false);
  });

  it('scaglioni: crescenti, solo l\'ultimo senza limite', () => {
    const s = scaglioni(5, 60);
    expect(s.daFile([{ fino_a: 28000, aliquota: 23 }, { fino_a: null, aliquota: 43 }])).toEqual({
      ok: true,
      valore: [
        { finoA: 2_800_000, aliquota: 0.23 },
        { finoA: null, aliquota: 0.43 },
      ],
    });
    expect(s.daFile([{ fino_a: 50000, aliquota: 23 }, { fino_a: 28000, aliquota: 33 }, { fino_a: null, aliquota: 43 }]).ok).toBe(false);
    expect(s.daFile([{ fino_a: null, aliquota: 23 }, { fino_a: null, aliquota: 43 }]).ok).toBe(false);
    expect(s.daFile([{ fino_a: 28000, aliquota: 33 }, { fino_a: null, aliquota: 23 }]).ok).toBe(false);
  });

  it('oggetto: campi mancanti o in più rifiutati', () => {
    const o = oggetto({ a: ['uno', euro(0, 10)], b: ['due', percentuale(0, 100)] });
    expect(o.daFile({ uno: 1, due: 50 })).toEqual({ ok: true, valore: { a: 100, b: 0.5 } });
    expect(o.daFile({ uno: 1 }).ok).toBe(false);
    expect(o.daFile({ uno: 1, due: 50, tre: 3 }).ok).toBe(false);
  });

  it('variazione anomala', () => {
    expect(variazioneAnomala(0.23, 0.25)).toBe(false);
    expect(variazioneAnomala(0.23, 0.43)).toBe(true);
    expect(variazioneAnomala(200, 250)).toBe(false);
    expect(variazioneAnomala(200, 2000)).toBe(true);
  });
});
