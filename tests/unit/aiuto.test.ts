import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cercaGlossario, GLOSSARIO, trovaTermini } from '@/engine/regole/glossario';
import { GUIDE } from '@/features/aiuto/guide';
import { TAPPE } from '@/features/tour/Tour';

// Specifica 011: glossario, termini toccabili, guide e controlli per lo sviluppo (FR-013).
const paginaEsiste = (href: string) => {
  const percorso = href.split('?')[0]!.replace(/^\/|\/$/g, '');
  return existsSync(join('app', percorso, 'page.tsx'));
};

function pagine(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return pagine(p);
    return n === 'page.tsx' ? [p] : [];
  });
}

describe('glossario', () => {
  it('ogni voce ha definizione ed esempio, con le cifre dalle regole dell\'anno', () => {
    for (const v of GLOSSARIO) {
      expect(v.definizione.length, v.id).toBeGreaterThan(20);
      expect(v.esempio(2027).length, v.id).toBeGreaterThan(10);
      expect(v.pagine.length, v.id).toBeGreaterThan(0);
    }
    expect(GLOSSARIO.find((v) => v.id === 'ritenuta')!.esempio(2027)).toMatch(/20%/);
    expect(GLOSSARIO.find((v) => v.id === 'bollo')!.esempio(2027)).toMatch(/77,47/);
  });

  it('ricerca per termine, sinonimo e definizione', () => {
    expect(cercaGlossario('ritenute').map((v) => v.id)).toContain('ritenuta');
    expect(cercaGlossario('pensione').map((v) => v.id)).toContain('enpap');
    expect(cercaGlossario('')).toHaveLength(GLOSSARIO.length);
  });

  it('termini toccabili: prima occorrenza, parole intere, forma più lunga', () => {
    const parti = trovaTermini("L'addizionale regionale si calcola sull'imponibile; l'IRPEF anche. Ancora IRPEF.");
    const ids = parti.filter((p) => p.id).map((p) => p.id);
    expect(ids).toEqual(['addizionali', 'imponibile', 'irpef']);
    expect(parti.map((p) => p.testo).join('')).toBe("L'addizionale regionale si calcola sull'imponibile; l'IRPEF anche. Ancora IRPEF.");
    expect(trovaTermini('saldatura').some((p) => p.id)).toBe(false);
  });
});

describe('controlli per lo sviluppo (FR-013)', () => {
  it('ogni collegamento di guide, glossario e tour porta a una pagina che esiste', () => {
    const link = [
      ...GUIDE.flatMap((g) => g.passi.map((p) => p.href)),
      ...GLOSSARIO.flatMap((v) => v.pagine.map((p) => p.href)),
      ...TAPPE.flatMap((t) => t.link.map((l) => l.href)),
    ];
    expect(link.filter((h) => !paginaEsiste(h))).toEqual([]);
  });

  it('ogni guida ha da 3 a 6 passi con cosa fare e cosa controllare', () => {
    for (const g of GUIDE) {
      expect(g.passi.length, g.id).toBeGreaterThanOrEqual(3);
      expect(g.passi.length, g.id).toBeLessThanOrEqual(6);
      for (const p of g.passi) expect(p.cosa && p.controlla, `${g.id}: ${p.titolo}`).toBeTruthy();
    }
  });

  it('ogni pagina dell\'app ha il suo aiuto (nella pagina o nel componente che mostra)', () => {
    const conAiuto = (t: string) => /aiuto=\{|ConAiuto|AiutoContestuale|BollaAiuto/.test(t);
    const senza = pagine('app')
      .filter((p) => !/app\/(page|layout)\.tsx$/.test(p))
      // la stampa della fattura è il documento da stampare: niente «?» sulla carta
      .filter((p) => !/app\/fatture\/stampa\//.test(p))
      .filter((p) => {
        const testo = readFileSync(p, 'utf8');
        if (conAiuto(testo)) return false;
        const componenti = [...testo.matchAll(/from '@\/features\/([^']+)'/g)].map((m) => join('src/features', `${m[1]}.tsx`));
        return !componenti.some((c) => existsSync(c) && conAiuto(readFileSync(c, 'utf8')));
      });
    expect(senza).toEqual([]);
  });

  it('nessuna cifra normativa scritta a mano nelle guide (FR-009)', () => {
    const testi = GUIDE.flatMap((g) => [g.perche, ...g.passi.flatMap((p) => [p.cosa, p.controlla])]).join(' ');
    expect(testi).not.toMatch(/\d+(,\d+)?\s?%|\d[\d.]*,\d{2}\s?€/);
  });
});

describe('passi del calcolo sui numeri (T008)', () => {
  // Somme e conteggi semplici non hanno un calcolo da spiegare; ogni altro numero in evidenza ha i suoi passi.
  const SEMPLICI = ['Incassato nel', 'Da incassare', 'Fatture ', 'Pagato nel', 'Senza giustificativo', 'Nel salvadanaio'];

  function kpiSenzaPassi(dir: string): string[] {
    const out: string[] = [];
    const file = (d: string): string[] =>
      readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? file(join(d, n)) : n.endsWith('.tsx') ? [join(d, n)] : []));
    for (const f of file(dir)) {
      const s = readFileSync(f, 'utf8');
      let i = s.indexOf('<Kpi');
      while (i >= 0) {
        let j = i;
        let prof = 0;
        while (j < s.length && !(s.startsWith('/>', j) && prof === 0)) {
          if (s[j] === '{') prof++;
          else if (s[j] === '}') prof--;
          j++;
        }
        const blocco = s.slice(i, j);
        const etichetta = /etichetta=\{?[`"']([^`"']*)/.exec(blocco)?.[1] ?? '?';
        if (!blocco.includes('passi') && !SEMPLICI.some((x) => etichetta.startsWith(x))) out.push(`${f}: ${etichetta}`);
        i = s.indexOf('<Kpi', j);
      }
    }
    return out;
  }

  it('ogni numero calcolato in evidenza spiega i suoi passi', () => {
    expect(kpiSenzaPassi('src/features')).toEqual([]);
  });
});
