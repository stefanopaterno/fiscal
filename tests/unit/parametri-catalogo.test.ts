import { describe, expect, it } from 'vitest';
import { CATALOGO, NON_AGGIORNABILI, parametriDi, percorsiRegole } from '@/engine/parametri/catalogo';
import type { Insieme } from '@/engine/parametri/tipi';
import { baseFatturazione } from '@/engine/regole';
import { baseF24 } from '@/engine/regole/f24';
import { baseIrpef } from '@/engine/regole/irpef';
import { regoleScadenze } from '@/engine/regole/scadenze';
import { baseSpese } from '@/engine/regole/spese';

// Specifica 014, T003 (FR-001..FR-003): ogni regola usata dal motore è nel catalogo o esclusa con motivo.
const SET: [Insieme, (anno: number) => unknown][] = [
  ['irpef', baseIrpef],
  ['fatturazione', baseFatturazione],
  ['spese', baseSpese],
  ['scadenze', regoleScadenze],
  ['f24', baseF24],
];

describe('catalogo dei parametri', () => {
  it('chiavi uniche, nomi e spiegazioni presenti', () => {
    const chiavi = CATALOGO.map((p) => p.chiave);
    expect(new Set(chiavi).size).toBe(chiavi.length);
    for (const p of CATALOGO) {
      expect(p.chiave).toMatch(/^[a-z0-9_.]+$/);
      expect(p.nome.length).toBeGreaterThan(3);
      expect(p.spiegazione.length).toBeGreaterThan(10);
      expect(p.fonti.length).toBeGreaterThan(0);
      for (const f of p.fonti) expect(f.url).toMatch(/^https:\/\//);
    }
  });

  it.each(SET)('%s: ogni Regola dei set 2026 e 2027 è coperta o esclusa con motivo', (insieme, base) => {
    const coperti = parametriDi(insieme).map((p) => p.percorso);
    for (const anno of [2026, 2027]) {
      for (const percorso of percorsiRegole(base(anno))) {
        const ok =
          coperti.includes(percorso) ||
          // elementi di un elenco (categorie, oneri, beni): coperti se un campo dell'elemento è nel catalogo
          coperti.some((c) => percorso.endsWith('.regola') && c.startsWith(percorso.slice(0, -'regola'.length))) ||
          `${insieme}:${percorso}` in NON_AGGIORNABILI;
        expect(ok, `${insieme}:${percorso} non è nel catalogo`).toBe(true);
      }
    }
  });

  it.each(SET)('%s: leggi → applica con lo stesso valore non cambia il set', (insieme, base) => {
    for (const anno of [2026, 2027]) {
      const set = base(anno);
      for (const p of parametriDi(insieme)) {
        const r = p.leggi!(set);
        expect(r, p.chiave).toBeDefined();
        expect(JSON.stringify(p.applica!(set, r!)), p.chiave).toBe(JSON.stringify(set));
      }
    }
  });

  it.each(SET)('%s: il valore del programma passa dal file e torna uguale (limiti coerenti)', (insieme, base) => {
    const set = base(2027);
    for (const p of parametriDi(insieme)) {
      const valore = p.leggi!(set)!.valore;
      if (valore === null) continue; // minimi ENPAP 2027 non ancora pubblicati
      const e = p.conv.daFile(JSON.parse(JSON.stringify(p.conv.aFile(valore))));
      expect(e, p.chiave).toEqual({ ok: true, valore });
    }
  });

  it('decorrenze come research.md R-03', () => {
    const d = (k: string) => CATALOGO.find((p) => p.chiave === k)?.decorrenza;
    expect(d('irpef.scaglioni')).toBe('anno');
    expect(d('enpap.aliquota_soggettivo')).toBe('anno');
    expect(d('fattura.importo_bollo')).toBe('data');
    expect(d('fattura.aliquota_integrativo')).toBe('data');
    expect(d('f24.irpef_saldo')).toBe('data');
    expect(d('scadenze.saldo_acconto.data')).toBe('anno_solare');
    expect(d('addizionali.comunale.aliquota')).toBe('anno');
  });
});
