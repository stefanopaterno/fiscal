import { describe, expect, it } from 'vitest';
import { controlliDovuti, controlloSettimanale, promptControllo } from '@/engine/novita/controlli';
import { impattoNovita } from '@/engine/novita/impatto';
import { regoleAperte } from '@/engine/novita/regole-aperte';
import { NOTIZIE, ULTIMO_CONTROLLO } from '@/engine/regole/novita';

// Specifica 012: regole da verificare raccolte da tutti i set, calendario dei controlli, prompt senza dati personali.
describe('regole da verificare', () => {
  it('raccoglie le regole aperte di tutti i set, con anno, percorso e fonte', () => {
    const aperte = regoleAperte();
    expect(aperte.length).toBeGreaterThan(3);
    expect(aperte.every((r) => r.fonte.length > 0 && r.percorso.length > 0)).toBe(true);
    // l'aliquota ENPAP 2027 e la ritenuta sugli interessi sono oggi da verificare
    expect(aperte.some((r) => r.ambito === 'Accantonamento' && /ritenutaInteressi/.test(r.percorso))).toBe(true);
    expect(aperte.some((r) => r.ambito === 'IRPEF ed ENPAP' && r.anno === 2027)).toBe(true);
  });
});

describe('controlli periodici', () => {
  it('addizionale regionale: a febbraio, se le aliquote dell\'anno non sono verificate', () => {
    const d = controlliDovuti('2027-02-05', { aliquoteVerificate: new Map([[2027, false]]) });
    expect(d.map((c) => c.chiave)).toContain('addizionale_regionale-2027');
    const fatto = controlliDovuti('2027-02-05', { aliquoteVerificate: new Map([[2027, true]]) });
    expect(fatto.map((c) => c.chiave)).not.toContain('addizionale_regionale-2027');
  });

  it('addizionale comunale: da fine dicembre per l\'anno dopo e di nuovo a maggio', () => {
    const dic = controlliDovuti('2026-12-28', { aliquoteVerificate: new Map() });
    expect(dic.map((c) => c.chiave)).toContain('addizionale_comunale-2027');
    const mag = controlliDovuti('2027-05-03', { aliquoteVerificate: new Map([[2027, false]]) });
    expect(mag.map((c) => c.chiave)).toContain('addizionale_comunale-2027');
    const estate = controlliDovuti('2027-08-01', { aliquoteVerificate: new Map([[2027, false]]) });
    expect(estate.map((c) => c.chiave)).not.toContain('addizionale_comunale-2027');
  });

  it('controllo settimanale scaduto dopo 7 giorni', () => {
    expect(controlloSettimanale('2026-11-23', '2026-11-23').scaduto).toBe(false);
    expect(controlloSettimanale('2026-12-01', '2026-11-23')).toMatchObject({ scaduto: true, giorni: 8 });
  });

  it('il prompt non contiene dati personali e cita le regole aperte', () => {
    const p = promptControllo('2026-11-23');
    expect(p).toMatch(/Fiscal/);
    expect(p).toMatch(/da verificare/);
    expect(p).not.toMatch(/Lazio|Roma|€\s?\d/);
  });

  it('le notizie hanno fonte, stato e data; l\'ultimo controllo è una data', () => {
    expect(ULTIMO_CONTROLLO.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const n of NOTIZIE) {
      expect(n.fonti.length).toBeGreaterThan(0);
      expect(['in_vigore', 'approvata', 'proposta']).toContain(n.stato);
      expect(n.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('impatto di una novità sui conti (T006)', () => {
  const input = (reddito: number) => ({
    anno: 2027,
    cu: [{ redditoLavoro: reddito, ritenuteIrpef: 0, addRegionale: 0, addComunaleAcconto: 0, addComunaleSaldo: 0 }],
    redditoProfessionale: 0,
    addizionali: null,
  });
  const bilancio = NOTIZIE.find((n) => n.id === '2026-11-bilancio-2027')!;

  it('tra 50.000 e 55.000 € il 33% invece del 43% fa risparmiare il 10% della fascia', () => {
    const r = impattoNovita(bilancio, input(55_000_00))!;
    expect(r.differenza).toBe(-500_00);
    expect(impattoNovita(bilancio, input(40_000_00))!.differenza).toBe(0);
  });

  it('nessuna simulazione per un altro anno', () => {
    expect(impattoNovita(bilancio, { ...input(55_000_00), anno: 2026 })).toBeNull();
  });
});

// Specifica 014: T037 (modifiche al programma) e T039 (promemoria dei parametri).
describe('014 — modifiche al programma e promemoria', async () => {
  const { modificheProgramma } = await import('@/engine/novita/modifiche');
  const { promemoriaParametri } = await import('@/engine/novita/controlli');
  const fonte = { titolo: 'L', url: 'https://www.gazzettaufficiale.it/x', data_atto: '2026-12-30' };
  const m = (impronta: string, stato: 'aperta' | 'fatta' | 'non_riguarda' = 'aperta') => ({ titolo: impronta, descrizione: 'd', fonte, impronta, stato });

  it('una voce per impronta tra più importazioni; chiusa se segnata in una qualsiasi', () => {
    const r = modificheProgramma([
      { id: 'i1', creato_il: '2027-01-10T10:00:00Z', modifiche_programma: [m('a', 'fatta'), m('b')] },
      { id: 'i2', creato_il: '2027-02-10T10:00:00Z', modifiche_programma: [m('a'), m('c', 'non_riguarda')] },
    ]);
    expect(r.map((x) => [x.impronta, x.stato])).toEqual([
      ['a', 'fatta'],
      ['c', 'non_riguarda'],
      ['b', 'aperta'],
    ]);
    expect(r.find((x) => x.impronta === 'a')!.importazioni).toEqual(['i1', 'i2']);
  });

  it('promemoria: inizio anno, da verificare, 90 giorni, mai dopo un\'importazione recente', () => {
    expect(promemoriaParametri('2027-01-10', { ultimaImportazione: null, daVerificareAnnoInCorso: 3 })).toMatchObject({ dovuto: true, motivo: expect.stringMatching(/Legge di Bilancio/) });
    expect(promemoriaParametri('2027-02-10', { ultimaImportazione: '2026-12-01T10:00:00Z', daVerificareAnnoInCorso: 0 })).toMatchObject({ dovuto: true, motivo: expect.stringMatching(/istruzioni/) });
    expect(promemoriaParametri('2027-01-10', { ultimaImportazione: '2027-01-05T10:00:00Z', daVerificareAnnoInCorso: 3 }).dovuto).toBe(false);
    expect(promemoriaParametri('2027-06-10', { ultimaImportazione: '2027-04-01T10:00:00Z', daVerificareAnnoInCorso: 2 })).toMatchObject({ dovuto: true, motivo: expect.stringMatching(/2 regole del 2027/) });
    expect(promemoriaParametri('2027-06-10', { ultimaImportazione: '2027-05-25T10:00:00Z', daVerificareAnnoInCorso: 2 }).dovuto).toBe(false);
    expect(promemoriaParametri('2027-09-10', { ultimaImportazione: '2027-05-25T10:00:00Z', daVerificareAnnoInCorso: 0 })).toMatchObject({ dovuto: true, motivo: expect.stringMatching(/giorni fa/) });
    expect(promemoriaParametri('2027-06-10', { ultimaImportazione: '2027-04-01T10:00:00Z', daVerificareAnnoInCorso: 0 }).dovuto).toBe(false);
  });
});
