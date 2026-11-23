import { describe, expect, it } from 'vitest';
import { controlliDovuti, controlloSettimanale, promptControllo } from '@/engine/novita/controlli';
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
