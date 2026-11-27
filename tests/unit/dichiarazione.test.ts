import { describe, expect, it } from 'vitest';
import { checklist, type DatiChecklist } from '@/engine/dichiarazione/checklist';
import { creditoDisponibile, esitoDichiarazione } from '@/engine/dichiarazione/esito';
import { calcolaAnno } from '@/engine/irpef/anno';
import { regoleScadenze } from '@/engine/regole/scadenze';
import { calendarioAnno, festivi, fileCalendario, lavorativo, promemoria, type Contesto } from '@/engine/scadenze/calendario';

// Specifica 004: calendario con slittamenti, pertinenza, promemoria, file di calendario; esito e checklist.
const contesto: Contesto = { partitaIvaDal: 2027, conIva: false, conBollo: true, conSts: true };

describe('calendario delle scadenze', () => {
  it('festivi e slittamento al primo giorno lavorativo', () => {
    expect(festivi(2027).has('2027-03-29')).toBe(true); // lunedì dell'Angelo 2027
    expect(lavorativo('2028-04-30')).toBe('2028-05-02'); // domenica, poi 1° maggio
    expect(lavorativo('2027-06-30')).toBe('2027-06-30'); // mercoledì
  });

  it('ogni scadenza ha fonte e data dalle regole (SC-003)', () => {
    for (const r of regoleScadenze(2028).scadenze) {
      expect(r.fonte.length).toBeGreaterThan(5);
      expect(r.valore.data).toMatch(/^\d{2}-\d{2}$/);
    }
  });

  it('pertinenza: IVA esclusa per chi fa solo prestazioni esenti; saldo pertinente dal 2028', () => {
    const v2028 = calendarioAnno(2028, '2028-01-10', contesto, []);
    expect(v2028.find((v) => v.chiave === 'iva_dichiarazione')!.pertinente).toBe(false);
    expect(v2028.find((v) => v.chiave === 'saldo_acconto')!.pertinente).toBe(true);
    const v2027 = calendarioAnno(2027, '2027-01-10', contesto, []);
    expect(v2027.find((v) => v.chiave === 'saldo_acconto')!.pertinente).toBe(false); // redditi 2026: solo dipendente
  });

  it('stato, flag «fatta», proroga e scadenza personale', () => {
    const stati = [
      { chiave: 'bollo_t1', anno: 2027, fatta_il: '2027-05-20', data: null, titolo: null, esporta: null },
      { chiave: 'bollo_t2', anno: 2027, fatta_il: null, data: '2027-03-10', titolo: null, esporta: null },
      { chiave: 'personale_1', anno: 2027, fatta_il: null, data: '2027-05-10', titolo: 'Documenti al commercialista', esporta: true },
    ];
    const v = calendarioAnno(2027, '2027-05-01', contesto, stati);
    expect(v.find((x) => x.chiave === 'bollo_t1')!.stato).toBe('fatta');
    expect(v.find((x) => x.chiave === 'bollo_t2')).toMatchObject({ data: '2027-03-10', prorogata: true, stato: 'scaduta' });
    expect(v.find((x) => x.chiave === 'personale_1')).toMatchObject({ personale: true, giorni: 9 });
    const p = promemoria(v, 14).map((x) => x.chiave);
    expect(p).toContain('personale_1');
    expect(p).toContain('bollo_t2'); // scaduta e non fatta
    expect(p).not.toContain('bollo_t1');
  });

  it('file di calendario senza importi né nomi, con promemoria', () => {
    const v = calendarioAnno(2028, '2028-01-01', contesto, []).filter((x) => x.chiave === 'saldo_acconto');
    const ics = fileCalendario(v, 7, '2028-01-01');
    expect(ics).toMatch(/BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/DTSTART;VALUE=DATE:20280630/);
    expect(ics).toMatch(/TRIGGER:-P7D/);
    expect(ics).not.toMatch(/€/);
  });
});

const input = {
  anno: 2027,
  cu: [{ redditoLavoro: 50_500_00, ritenuteIrpef: 13_865_00, addRegionale: 0, addComunaleAcconto: 0, addComunaleSaldo: 0 }],
  redditoProfessionale: 10_000_00,
  addizionali: null,
};

describe('esito della dichiarazione', () => {
  it('le voci sommate danno il saldo (SC-008)', () => {
    const r = calcolaAnno(structuredClone(input));
    const es = esitoDichiarazione(r, 0);
    const tot = es.voci
      .filter((v) => v.segno !== '=')
      .reduce((t, v) => t + (v.segno === '+' ? v.importo : -v.importo), 0);
    const netta = es.voci.find((v) => v.voce === 'IRPEF netta')!.importo;
    expect(netta).toBe(r.irpefNetta);
    expect(tot - (r.irpefLorda.totale - r.irpefNetta - (r.detrazioneLavoro + r.ulterioreDetrazione + r.altreDetrazioni))).toBe(es.saldo);
    expect(es.saldo).toBe(r.conguaglioTotale);
    expect(es.messaggio).toMatch(/abbassano il saldo di giugno/);
  });

  it('un credito dell\'anno prima che supera il saldo diventa credito', () => {
    const r = calcolaAnno(structuredClone(input));
    const es = esitoDichiarazione(r, r.conguaglioTotale + 100_00);
    expect(es.credito).toBe(100_00);
    expect(es.messaggio).toMatch(/compensazione o chiedere a rimborso/);
  });

  it('un rimborso non incassato non è liquidità (SC-009)', () => {
    expect(creditoDisponibile({ credito: 500_00, scelta: 'rimborso', stato: 'richiesto', usato: 0 })).toEqual({ residuo: 500_00, liquido: 0 });
    expect(creditoDisponibile({ credito: 500_00, scelta: 'rimborso', stato: 'incassato', usato: 0 })).toEqual({ residuo: 0, liquido: 500_00 });
    expect(creditoDisponibile({ credito: 500_00, scelta: 'compensazione', stato: null, usato: 200_00 })).toEqual({ residuo: 300_00, liquido: 0 });
  });
});

describe('checklist', () => {
  const base: DatiChecklist = {
    anno: 2027,
    partitaIva: true,
    primoAnno: true,
    cu: { quante: 1, incoerenze: [] },
    annoPartenza: false,
    aliquoteVerificate: true,
    incassi: 10,
    spese: 0,
    senzaGiustificativo: 0,
    versamentiEnpap: 0,
    oneri: 0,
    impostazioniFamiliari: true,
    stsDaInviare: 0,
    cuInArchivio: false,
    manuali: new Map(),
  };

  it('segna disponibili i dati derivati e da fornire il resto', () => {
    const c = checklist(base);
    const s = new Map(c.elementi.map((e) => [e.chiave, e.stato]));
    expect(s.get('cu')).toBe('completato');
    expect(s.get('compensi')).toBe('disponibile');
    expect(s.get('anno_partenza')).toBe('da_fornire');
    expect(s.get('conservazione')).toBe('da_fornire');
    expect(c.mancanti).toBeGreaterThan(0);
  });

  it('non applicabile non conta nel progresso; incoerenze della CU segnalate', () => {
    const prima = checklist(base).percentuale;
    const dopo = checklist({ ...base, manuali: new Map([['spese', 'non_applicabile'], ['oneri', 'non_applicabile']]) }).percentuale;
    expect(dopo).toBeGreaterThan(prima);
    const inc = checklist({ ...base, cu: { quante: 1, incoerenze: ['Ritenute superiori al reddito.'] } });
    expect(inc.elementi.find((e) => e.chiave === 'cu')).toMatchObject({ stato: 'da_fornire', avviso: 'Ritenute superiori al reddito.' });
  });
});
