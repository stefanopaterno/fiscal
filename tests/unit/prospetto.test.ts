import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { confrontaImpronte, improntaSezioni } from '@/engine/prospetto/confronto';
import { codiceCliente, controlli, costruisciSezioni, generaPacchetto, SEZIONI, type DatiPacchetto } from '@/engine/prospetto/contenuto';
import { leggiZip } from '@/engine/documenti/zip';
import { ctrWinZip, generaPassword, zipCifrato } from '@/engine/prospetto/zip-aes';

// Specifica 009: totali uguali in PDF ed Excel, sezioni vuote indicate, codici dei clienti, controlli, ZIP AES.
const base = (extra: Partial<DatiPacchetto> = {}): DatiPacchetto => ({
  da: '2027-01-01',
  a: '2027-12-31',
  generatoIl: '2027-11-22',
  regole: '2027, 12 regole da verificare',
  usaCodici: false,
  cliente: (id) => ({ nome: id === 'c1' ? 'Mario Rossi' : 'ASL Uno', codiceFiscale: id === 'c1' ? 'RSSMRA80A01H501U' : '01234567890' }),
  fatture: [
    { id: 'f1', tipo: 'fattura', stato: 'emessa', data: '2027-03-10', anno: 2027, numero: 1, cliente_id: 'c1', totale_compensi: 80_00, totale_integrativo: 3_20, iva: 0, bollo: 2_00, ritenuta: 0, totale: 85_20, netto: 85_20, stato_sts: 'inviata' },
    { id: 'f2', tipo: 'fattura', stato: 'emessa', data: '2027-04-10', anno: 2027, numero: 2, cliente_id: 'c2', totale_compensi: 1_000_00, totale_integrativo: 40_00, iva: 0, bollo: 0, ritenuta: 200_00, totale: 1_040_00, netto: 840_00, stato_sts: 'non_dovuto' },
    { id: 'f3', tipo: 'fattura', stato: 'bozza', data: '2027-05-10', anno: 2027, numero: null, cliente_id: 'c1', totale_compensi: 50_00, totale_integrativo: 2_00, iva: 0, bollo: 0, ritenuta: 0, totale: 52_00, netto: 52_00, stato_sts: 'da_inviare' },
  ],
  incassi: [{ fattura_id: 'f1', data: '2027-03-10', importo: 85_20, modalita: 'carta_pos' }],
  spese: [{ data: '2027-02-01', categoria: 'Software', descrizione: 'Agenda online', fornitore: 'Fornitore Srl', importo: 120_00, ha_giustificativo: true, modalita: 'carta' }],
  speseCategorie: [{ nome: 'Software', speso: 120_00, deducibile: 120_00 }],
  beni: [],
  enpap: [],
  cu: [{ anno: 2027, sostituto: 'Azienda', reddito: 50_500_00, ritenute: 13_865_00, regionale: 0, comunale: 0 }],
  oneri: [],
  versamenti: [],
  calcolo: [{ voce: 'Saldo da versare', importo: 1_000_00 }],
  scadenze: [{ data: '2028-06-30', titolo: 'Saldo e primo acconto', importo: 3_000_00 }],
  sezioni: SEZIONI.map((s) => s.codice),
  avvisi: [],
  ...extra,
});

describe('sezioni del pacchetto', () => {
  it('fatture senza bozze, con totali; sezioni vuote presenti', () => {
    const s = costruisciSezioni(base());
    const f = s.find((x) => x.codice === 'fatture')!;
    expect(f.righe).toHaveLength(2);
    expect(f.totali![4]).toBe(1_080_00);
    expect(f.totali![9]).toBe(925_20);
    expect(s.find((x) => x.codice === 'beni')!.righe).toHaveLength(0);
    expect(s).toHaveLength(SEZIONI.length);
  });

  it('solo le sezioni scelte e solo il periodo', () => {
    const s = costruisciSezioni(base({ sezioni: ['fatture'], da: '2027-04-01', a: '2027-06-30' }));
    expect(s.map((x) => x.codice)).toEqual(['fatture']);
    expect(s[0]!.righe).toHaveLength(1);
  });

  it('con i codici i nomi non compaiono nel PDF né nell\'Excel (SC-003)', async () => {
    const codice = await codiceCliente('c1');
    expect(codice).toMatch(/^C-[0-9A-F]{6}$/);
    expect(await codiceCliente('c1')).toBe(codice);
    const p = generaPacchetto(base({ usaCodici: true, cliente: (id) => ({ nome: id === 'c1' ? codice : 'C-ENTE01', codiceFiscale: '' }) }));
    const testo = new TextDecoder('latin1').decode(p.pdf);
    expect(testo).not.toMatch(/Rossi|RSSMRA/);
    const fogli = await leggiZip(p.xlsx);
    const xml = fogli.map((f) => new TextDecoder().decode(f.dati)).join('');
    expect(xml).not.toMatch(/Rossi|RSSMRA/);
    expect(xml).toMatch(codice);
  });

  it('PDF ed Excel riportano gli stessi totali (FR-001)', async () => {
    const p = generaPacchetto(base());
    const xml = (await leggiZip(p.xlsx)).map((f) => new TextDecoder().decode(f.dati)).join('');
    expect(xml).toMatch('<v>925.20</v>');
    expect(new TextDecoder('latin1').decode(p.pdf)).toMatch('925,20');
    expect(p.totali.fatture).toContain(925_20);
  });
});

describe('controlli prima dell\'invio', () => {
  it('elenca i difetti noti (SC-005)', () => {
    const a = controlli({
      da: '2027-01-01',
      a: '2027-12-31',
      spese: [{ id: 's1', data: '2027-02-01', descrizione: 'Cancelleria', ha_giustificativo: false }],
      fatture: [{ id: 'f2', tipo: 'fattura', stato: 'emessa', data: '2027-04-10', numero: 2, anno: 2027, netto: 840_00, stato_sts: 'da_inviare' }],
      incassatoPer: new Map(),
      anniConCu: [],
      regoleDaVerificare: 3,
      provvisorio: true,
      testiLiberi: [{ testo: 'Seduta con Rossi', dove: 'Fattura 2/2027', collegamento: '/fatture/' }],
      nomiClienti: ['Mario Rossi'],
    });
    expect(a.map((x) => x.tipo).sort()).toEqual(['cu', 'giustificativo', 'incasso', 'nome', 'provvisorio', 'regole', 'sts']);
  });
});

describe('ZIP cifrato AES-256', () => {
  it('password lunga e casuale', () => {
    const p = generaPassword();
    expect(p).toMatch(/^([a-zA-Z2-9]{4}-){5}[a-zA-Z2-9]{4}$/);
    expect(generaPassword()).not.toBe(p);
  });

  it('CTR alla WinZip: cifrare due volte restituisce il chiaro', () => {
    const k = new Uint8Array(32).fill(7);
    const dati = new TextEncoder().encode('prospetto '.repeat(20));
    expect(ctrWinZip(k, ctrWinZip(k, dati))).toEqual(dati);
  });

  const bsdtar = existsSync('/usr/bin/bsdtar');
  it.skipIf(!bsdtar)('si apre con libarchive solo con la password giusta (SC-004)', async () => {
    const p = generaPacchetto(base());
    const zip = await zipCifrato([{ nome: 'prospetto.pdf', dati: p.pdf }, { nome: 'dati.xlsx', dati: p.xlsx }], 'abcd-efgh-jkmn-pqrs-tuvw-xyz2');
    expect(new TextDecoder('latin1').decode(zip)).not.toMatch(/Rossi|Prospetto/);
    const dir = mkdtempSync(join(tmpdir(), 'fiscal-zip-'));
    try {
      writeFileSync(join(dir, 'p.zip'), zip);
      execFileSync('/usr/bin/bsdtar', ['-x', '--passphrase', 'abcd-efgh-jkmn-pqrs-tuvw-xyz2', '-f', 'p.zip'], { cwd: dir });
      expect(readFileSync(join(dir, 'prospetto.pdf'))).toEqual(Buffer.from(p.pdf));
      expect(readFileSync(join(dir, 'dati.xlsx'))).toEqual(Buffer.from(p.xlsx));
      expect(() => execFileSync('/usr/bin/bsdtar', ['-x', '--passphrase', 'sbagliata-sbagliata', '-f', 'p.zip', '-C', dir, '-O'], { stdio: 'pipe' })).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('confronto riga per riga (T007)', () => {
  const sezione = (righe: (string | number | null)[][]) => [{ codice: 'fatture' as const, titolo: 'Fatture', colonne: [], righe, totali: null }];

  it('conta righe nuove, cambiate e tolte senza conservare il contenuto', async () => {
    const prima = await improntaSezioni(sezione([['2027-01-10', '1', 'Rossi', 8000], ['2027-02-10', '2', 'Bianchi', 8000]]));
    const dopo = await improntaSezioni(sezione([['2027-01-10', '1', 'Rossi', 9000], ['2027-03-10', '3', 'Verdi', 8000]]));
    const [d] = confrontaImpronte(dopo.impronte, prima.impronte);
    expect(d).toMatchObject({ codice: 'fatture' });
    expect(d!.nuove.map((k) => dopo.etichette.fatture![k])).toEqual(['2027-03-10 · 3']);
    expect(d!.cambiate.map((k) => dopo.etichette.fatture![k])).toEqual(['2027-01-10 · 1']);
    expect(d!.tolte).toHaveLength(1);
    expect(JSON.stringify(dopo.impronte)).not.toMatch(/Rossi|Verdi|9000/);
  });

  it('righe con stessa data e numero si distinguono; nessuna differenza se uguali', async () => {
    const a = await improntaSezioni(sezione([['2027-01-10', 'Software', 10], ['2027-01-10', 'Software', 20]]));
    expect(Object.keys(a.impronte.fatture!)).toHaveLength(2);
    expect(confrontaImpronte(a.impronte, a.impronte)).toEqual([]);
  });
});
