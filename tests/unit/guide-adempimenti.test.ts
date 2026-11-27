import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { impostaRegistro } from '@/engine/parametri/attivi';
import {
  cercaGuide,
  componi,
  daRicontrollare,
  ErroreSegnaposto,
  GRUPPI,
  guida,
  GUIDE_ADEMPIMENTI,
  SEGNAPOSTO,
  type Guida,
} from '@/engine/regole/guide-adempimenti';

// Specifica 015: T002 (segnaposto), T008 (catalogo e nessun valore scritto a mano), T015 (ricerca).
const C = { anno: 2027, oggi: '2027-03-10' };
afterEach(() => impostaRegistro([]));

/** Tutti i testi di una guida (quelli che passano da `componi`). */
const testi = (g: Guida): string[] => [
  g.inBreve,
  g.quando,
  g.doveSiFa,
  ...(g.cosaTiServe ?? []),
  ...g.passi.flatMap((p) => [p.testo, p.avvertenza ?? '']),
  ...(g.campi ?? []).flatMap((c) => [c.valore, c.aiuto]),
  ...(g.errori ?? []),
  g.parere ?? '',
];

describe('segnaposto (T002)', () => {
  it('codici F24, scadenze, fatturazione, ENPAP e adempimenti dalle regole', () => {
    expect(componi('{{f24.irpef_saldo}}', C).testo).toBe('4001');
    expect(componi('{{f24.addizionale_comunale_acconto}}', C).testo).toBe('3843');
    expect(componi('{{scadenza.saldo_acconto}}', C).testo).toBe('30 giugno 2027');
    expect(componi('{{scadenza.secondo_acconto}}', C).testo).toBe('30 novembre 2027');
    expect(componi('{{scadenza.bollo_t4}}', C).testo).toBe('28 febbraio 2028'); // già passata nel 2027
    expect(componi('{{fattura.importo_bollo}}', C).testo).toMatch(/^2,00\s€$/);
    expect(componi('{{fattura.aliquota_integrativo}}', C).testo).toBe('4%');
    expect(componi('{{enpap.aliquota_soggettivo}}', C).testo).toBe('12%');
    expect(componi('{{adempimenti.codice_ateco}}', C).testo).toBe('86.93.00');
    expect(componi('{{adempimenti.natura_esente}}', C).testo).toBe('N4');
  });

  it('valori «da verificare» segnalati', () => {
    expect(componi('{{adempimenti.codice_ateco}}', C).daVerificare[0]).toMatch(/^86\.93\.00: .*ISTAT/);
    expect(componi('{{f24.irpef_saldo}}', C).daVerificare).toEqual([]);
  });

  it('segnaposto sconosciuto = errore', () => {
    expect(() => componi('{{f24.inventato}}', C)).toThrow(ErroreSegnaposto);
    expect(() => componi('{{boh.x}}', C)).toThrow(ErroreSegnaposto);
  });

  it('valore aggiornato con la 014: la guida mostra il codice nuovo dalla decorrenza', () => {
    impostaRegistro([
      {
        id: 'r1', azione: 'approvato', annulla_id: null, chiave: 'f24.irpef_saldo', anno: null, dal: '2027-03-11', valore: '4999',
        fonte: { titolo: 'Risoluzione di prova', url: 'https://www.agenziaentrate.gov.it/x', data_atto: '2027-03-01' },
        stato: 'verificata', stato_norma: 'in_vigore', creato_il: '2027-03-05T10:00:00Z',
      },
    ]);
    expect(componi('{{f24.irpef_saldo}}', C).testo).toBe('4001');
    const dopo = componi('{{f24.irpef_saldo}}', { anno: 2027, oggi: '2027-03-11' });
    expect(dopo.testo).toBe('4999');
    expect(dopo.aggiornati).toEqual(['4999']);
  });
});

describe('catalogo delle guide (T008)', () => {
  const contratto = readFileSync('specs/015-guide-adempimenti/contracts/guida.md', 'utf8');
  const idContratto = [...contratto.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1]);

  it('le 22 guide del contratto, id unici, gruppi giusti', () => {
    expect(idContratto).toHaveLength(22);
    expect(GUIDE_ADEMPIMENTI.map((g) => g.id).sort()).toEqual([...idContratto].sort());
    expect(new Set(GUIDE_ADEMPIMENTI.map((g) => g.id)).size).toBe(22);
    for (const { gruppo } of GRUPPI) expect(GUIDE_ADEMPIMENTI.some((g) => g.gruppo === gruppo)).toBe(true);
  });

  it.each(GUIDE_ADEMPIMENTI.map((g) => [g.id, g] as const))('%s: sezioni obbligatorie, fonti, stato', (_, g) => {
    expect(g.id).toMatch(/^[a-z0-9-]+$/);
    expect(g.titolo.length).toBeLessThanOrEqual(60);
    expect(g.riga.length).toBeLessThanOrEqual(120);
    for (const t of [g.inBreve, g.quando, g.doveSiFa]) expect(t.length).toBeGreaterThan(10);
    expect(g.passi.length).toBeGreaterThanOrEqual(2);
    expect(g.fonti.length).toBeGreaterThanOrEqual(1);
    for (const f of g.fonti) expect(f.url).toMatch(/^https:\/\//);
    expect(g.ultimoControllo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (g.stato === 'da_verificare') expect(g.daVerificare?.length).toBeGreaterThan(0);
    // i passi collegati al disegno hanno il numero giusto
    if (g.disegno)
      for (const [casella, n] of Object.entries(g.disegno.caselle)) expect(g.passi[n - 1]?.casella, `${g.id}:${casella}`).toBe(casella);
  });

  it.each(GUIDE_ADEMPIMENTI.map((g) => [g.id, g] as const))('%s: ogni segnaposto si risolve', (_, g) => {
    for (const t of testi(g)) expect(() => componi(t, C)).not.toThrow();
  });

  it.each(GUIDE_ADEMPIMENTI.map((g) => [g.id, g] as const))('%s: nessun valore normativo scritto a mano (SC-005)', (_, g) => {
    for (const t of testi(g)) {
      const senza = t.replace(SEGNAPOSTO, '');
      expect(senza, t).not.toMatch(/\b\d{4}\b/); // codici tributo e anni
      expect(senza, t).not.toMatch(/\b\d{1,2}\/\d{1,2}\b/); // date gg/mm
      expect(senza, t).not.toMatch(/\b\d{2}-\d{2}\b/); // date MM-GG
      expect(senza, t).not.toMatch(/\d\s?%/); // aliquote
      expect(senza, t).not.toMatch(/\b\d{1,2} (gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/i);
      expect(senza, t).not.toMatch(/\d+,\d{2}\s?€/); // importi normativi (soglie, bollo)
    }
  });

  it('guida(id) e «da ricontrollare» dopo 12 mesi', () => {
    const g = guida('f24-tasse')!;
    expect(g.titolo).toMatch(/F24/);
    expect(guida('inesistente')).toBeUndefined();
    expect(daRicontrollare(g, '2027-11-27')).toBe(false);
    expect(daRicontrollare(g, '2027-11-28')).toBe(true);
  });
});

describe('ricerca (T015)', () => {
  const ids = (t: string) => cercaGuide(t).map((g) => g.id);
  it('per parola, sinonimi, senza accenti', () => {
    expect(ids('bollo')).toContain('f24-bollo');
    expect(ids('740')).toEqual(['redditi-pf']);
    expect(ids('UNICO')).toEqual(['redditi-pf']);
    expect(ids('attivita')).toContain('apertura-piva');
    expect(ids('')).toHaveLength(22);
    expect(ids('zzz')).toEqual([]);
  });
});
