import { formattaEuro } from '../importi';
import { DocumentoPdf, type Colonna } from './pdf';
import { scriviXlsx, type Foglio, type ValoreCella } from './xlsx';

/**
 * Contenuto del pacchetto per il commercialista (specifica 009, FR-001…FR-004, FR-006, FR-008, FR-011): sezioni
 * con righe e totali calcolati una volta sola e poi scritti sia nel PDF sia nell'Excel, così i totali coincidono
 * per costruzione. Solo dati della contabilità: nessun dato clinico, consenso o nota.
 */
export type CodiceSezione = 'fatture' | 'incassi' | 'spese' | 'spese_categorie' | 'beni' | 'enpap' | 'cu' | 'oneri' | 'versamenti' | 'calcolo' | 'scadenze';

export const SEZIONI: { codice: CodiceSezione; titolo: string }[] = [
  { codice: 'fatture', titolo: 'Fatture emesse' },
  { codice: 'incassi', titolo: 'Incassi' },
  { codice: 'spese', titolo: 'Spese professionali' },
  { codice: 'spese_categorie', titolo: 'Spese per categoria e deducibilità' },
  { codice: 'beni', titolo: 'Beni durevoli e ammortamenti' },
  { codice: 'enpap', titolo: 'Contributi ENPAP versati' },
  { codice: 'cu', titolo: 'Certificazioni Uniche' },
  { codice: 'oneri', titolo: 'Oneri e spese detraibili' },
  { codice: 'versamenti', titolo: 'Acconti e versamenti di imposte' },
  { codice: 'calcolo', titolo: 'Calcolo stimato e crediti' },
  { codice: 'scadenze', titolo: 'Scadenze e importi stimati' },
];

type Tipo = 'testo' | 'euro';
export type ColonnaSezione = { titolo: string; tipo: Tipo; larghezza: number };
export type Sezione = { codice: CodiceSezione; titolo: string; colonne: ColonnaSezione[]; righe: (string | number | null)[][]; totali: (number | null)[] | null };
export type Avviso = { tipo: string; testo: string; collegamento: string | null };

export type DatiPacchetto = {
  da: string;
  a: string;
  generatoIl: string;
  regole: string;
  usaCodici: boolean;
  /** Nome e codice fiscale come in fattura, oppure il codice stabile se si usano i codici. */
  cliente: (id: string) => { nome: string; codiceFiscale: string };
  fatture: { id: string; tipo: 'fattura' | 'nota_credito'; stato: string; data: string; anno: number; numero: number | null; cliente_id: string; totale_compensi: number; totale_integrativo: number; iva: number; bollo: number; ritenuta: number; totale: number; netto: number; stato_sts: string }[];
  incassi: { fattura_id: string; data: string; importo: number; modalita: string }[];
  spese: { data: string; categoria: string; descrizione: string | null; fornitore: string | null; importo: number; ha_giustificativo: boolean; modalita: string }[];
  speseCategorie: { nome: string; speso: number; deducibile: number }[];
  beni: { descrizione: string; categoria: string; costo: number; data_acquisto: string; quota: number }[];
  enpap: { data: string; tipo: string; anno_reddito: number; importo: number }[];
  cu: { anno: number; sostituto: string | null; reddito: number; ritenute: number; regionale: number; comunale: number }[];
  oneri: { data: string; voce: string; importo: number }[];
  versamenti: { data: string; voce: string; anno: number; importo: number }[];
  calcolo: { voce: string; importo: number }[];
  scadenze: { data: string; titolo: string; importo: number | null }[];
  sezioni: CodiceSezione[];
  avvisi: Avviso[];
};

const dataIt = (iso: string) => iso.split('-').reverse().join('/');
const nel = (d: { da: string; a: string }, data: string) => data >= d.da && data <= d.a;
const somma = (v: number[]) => v.reduce((t, x) => t + x, 0);

export function costruisciSezioni(d: DatiPacchetto): Sezione[] {
  const out: Sezione[] = [];
  const voglio = (c: CodiceSezione) => d.sezioni.includes(c);
  const titolo = (c: CodiceSezione) => SEZIONI.find((s) => s.codice === c)!.titolo;
  const numeroDi = new Map(d.fatture.map((f) => [f.id, f.numero != null ? `${f.numero}/${f.anno}` : '—']));
  const clienteDi = new Map(d.fatture.map((f) => [f.id, f.cliente_id]));

  if (voglio('fatture')) {
    const fatture = d.fatture.filter((f) => f.stato !== 'bozza' && nel(d, f.data)).sort((a, b) => a.data.localeCompare(b.data) || (a.numero ?? 0) - (b.numero ?? 0));
    const segno = (f: (typeof fatture)[number]) => (f.tipo === 'nota_credito' ? -1 : 1);
    const righe = fatture.map((f) => {
      const c = d.cliente(f.cliente_id);
      return [
        dataIt(f.data),
        `${f.tipo === 'nota_credito' ? 'NC ' : ''}${f.numero ?? '—'}/${f.anno}`,
        c.nome,
        c.codiceFiscale,
        segno(f) * f.totale_compensi,
        segno(f) * f.totale_integrativo,
        segno(f) * f.iva,
        f.bollo,
        segno(f) * f.ritenuta,
        segno(f) * f.netto,
        f.stato === 'annullata' ? 'annullata' : f.stato_sts === 'inviata' ? 'TS inviata' : f.stato_sts === 'da_inviare' ? 'TS da inviare' : '',
      ];
    });
    const col = (i: number) => somma(righe.map((r) => r[i] as number));
    out.push({
      codice: 'fatture',
      titolo: titolo('fatture'),
      colonne: [
        { titolo: 'Data', tipo: 'testo', larghezza: 52 },
        { titolo: 'Numero', tipo: 'testo', larghezza: 44 },
        { titolo: d.usaCodici ? 'Codice cliente' : 'Cliente', tipo: 'testo', larghezza: 100 },
        { titolo: 'Codice fiscale', tipo: 'testo', larghezza: 86 },
        { titolo: 'Compensi', tipo: 'euro', larghezza: 58 },
        { titolo: 'Integrativo', tipo: 'euro', larghezza: 52 },
        { titolo: 'IVA', tipo: 'euro', larghezza: 44 },
        { titolo: 'Bollo', tipo: 'euro', larghezza: 36 },
        { titolo: 'Ritenuta', tipo: 'euro', larghezza: 50 },
        { titolo: 'Netto', tipo: 'euro', larghezza: 58 },
        { titolo: 'Note', tipo: 'testo', larghezza: 56 },
      ],
      righe,
      totali: [null, null, null, null, col(4), col(5), col(6), col(7), col(8), col(9), null],
    });
  }

  if (voglio('incassi')) {
    const righe = d.incassi
      .filter((i) => nel(d, i.data))
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((i) => [dataIt(i.data), numeroDi.get(i.fattura_id) ?? '—', d.cliente(clienteDi.get(i.fattura_id) ?? '').nome, i.modalita.replace('_', ' '), i.importo]);
    out.push({
      codice: 'incassi',
      titolo: titolo('incassi'),
      colonne: [
        { titolo: 'Data', tipo: 'testo', larghezza: 60 },
        { titolo: 'Fattura', tipo: 'testo', larghezza: 60 },
        { titolo: d.usaCodici ? 'Codice cliente' : 'Cliente', tipo: 'testo', larghezza: 150 },
        { titolo: 'Modalità', tipo: 'testo', larghezza: 80 },
        { titolo: 'Importo', tipo: 'euro', larghezza: 80 },
      ],
      righe,
      totali: [null, null, null, null, somma(righe.map((r) => r[4] as number))],
    });
  }

  if (voglio('spese')) {
    const righe = d.spese
      .filter((s) => nel(d, s.data))
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((s) => [dataIt(s.data), s.categoria, s.fornitore ?? '', s.descrizione ?? '', s.modalita, s.ha_giustificativo ? 'sì' : 'no', s.importo]);
    out.push({
      codice: 'spese',
      titolo: titolo('spese'),
      colonne: [
        { titolo: 'Data', tipo: 'testo', larghezza: 52 },
        { titolo: 'Categoria', tipo: 'testo', larghezza: 100 },
        { titolo: 'Fornitore', tipo: 'testo', larghezza: 90 },
        { titolo: 'Descrizione', tipo: 'testo', larghezza: 120 },
        { titolo: 'Pagamento', tipo: 'testo', larghezza: 52 },
        { titolo: 'Giustificativo', tipo: 'testo', larghezza: 50 },
        { titolo: 'Importo', tipo: 'euro', larghezza: 62 },
      ],
      righe,
      totali: [null, null, null, null, null, null, somma(righe.map((r) => r[6] as number))],
    });
  }

  if (voglio('spese_categorie')) {
    const righe = d.speseCategorie.map((c) => [c.nome, c.speso, c.deducibile]);
    out.push({
      codice: 'spese_categorie',
      titolo: titolo('spese_categorie'),
      colonne: [
        { titolo: 'Categoria', tipo: 'testo', larghezza: 200 },
        { titolo: 'Speso', tipo: 'euro', larghezza: 80 },
        { titolo: 'Deducibile', tipo: 'euro', larghezza: 80 },
      ],
      righe,
      totali: [null, somma(righe.map((r) => r[1] as number)), somma(righe.map((r) => r[2] as number))],
    });
  }

  if (voglio('beni')) {
    const righe = d.beni.map((b) => [b.descrizione, b.categoria, dataIt(b.data_acquisto), b.costo, b.quota]);
    out.push({
      codice: 'beni',
      titolo: titolo('beni'),
      colonne: [
        { titolo: 'Bene', tipo: 'testo', larghezza: 150 },
        { titolo: 'Categoria', tipo: 'testo', larghezza: 100 },
        { titolo: 'Acquisto', tipo: 'testo', larghezza: 60 },
        { titolo: 'Costo', tipo: 'euro', larghezza: 70 },
        { titolo: 'Quota del periodo', tipo: 'euro', larghezza: 80 },
      ],
      righe,
      totali: [null, null, null, somma(righe.map((r) => r[3] as number)), somma(righe.map((r) => r[4] as number))],
    });
  }

  if (voglio('enpap')) {
    const righe = d.enpap.filter((v) => nel(d, v.data)).map((v) => [dataIt(v.data), v.tipo, String(v.anno_reddito), v.importo]);
    out.push({
      codice: 'enpap',
      titolo: titolo('enpap'),
      colonne: [
        { titolo: 'Data', tipo: 'testo', larghezza: 70 },
        { titolo: 'Contributo', tipo: 'testo', larghezza: 120 },
        { titolo: 'Redditi', tipo: 'testo', larghezza: 60 },
        { titolo: 'Importo', tipo: 'euro', larghezza: 80 },
      ],
      righe,
      totali: [null, null, null, somma(righe.map((r) => r[3] as number))],
    });
  }

  if (voglio('cu')) {
    const righe = d.cu.map((c) => [String(c.anno), c.sostituto ?? '', c.reddito, c.ritenute, c.regionale, c.comunale]);
    out.push({
      codice: 'cu',
      titolo: titolo('cu'),
      colonne: [
        { titolo: 'Anno', tipo: 'testo', larghezza: 40 },
        { titolo: 'Datore di lavoro', tipo: 'testo', larghezza: 140 },
        { titolo: 'Reddito (punti 1–2)', tipo: 'euro', larghezza: 80 },
        { titolo: 'Ritenute (21)', tipo: 'euro', larghezza: 70 },
        { titolo: 'Add. regionale (22)', tipo: 'euro', larghezza: 70 },
        { titolo: 'Add. comunale', tipo: 'euro', larghezza: 70 },
      ],
      righe,
      totali: [null, null, ...[2, 3, 4, 5].map((i) => somma(righe.map((r) => r[i] as number)))],
    });
  }

  if (voglio('oneri')) {
    const righe = d.oneri.filter((o) => nel(d, o.data)).map((o) => [dataIt(o.data), o.voce, o.importo]);
    out.push({
      codice: 'oneri',
      titolo: titolo('oneri'),
      colonne: [
        { titolo: 'Data', tipo: 'testo', larghezza: 70 },
        { titolo: 'Voce', tipo: 'testo', larghezza: 220 },
        { titolo: 'Importo', tipo: 'euro', larghezza: 80 },
      ],
      righe,
      totali: [null, null, somma(righe.map((r) => r[2] as number))],
    });
  }

  if (voglio('versamenti')) {
    const righe = d.versamenti.filter((v) => nel(d, v.data)).map((v) => [dataIt(v.data), v.voce, String(v.anno), v.importo]);
    out.push({
      codice: 'versamenti',
      titolo: titolo('versamenti'),
      colonne: [
        { titolo: 'Data', tipo: 'testo', larghezza: 70 },
        { titolo: 'Voce', tipo: 'testo', larghezza: 160 },
        { titolo: "Anno d'imposta", tipo: 'testo', larghezza: 70 },
        { titolo: 'Importo', tipo: 'euro', larghezza: 80 },
      ],
      righe,
      totali: [null, null, null, somma(righe.map((r) => r[3] as number))],
    });
  }

  if (voglio('calcolo')) {
    out.push({
      codice: 'calcolo',
      titolo: titolo('calcolo'),
      colonne: [
        { titolo: 'Voce', tipo: 'testo', larghezza: 260 },
        { titolo: 'Importo', tipo: 'euro', larghezza: 90 },
      ],
      righe: d.calcolo.map((c) => [c.voce, c.importo]),
      totali: null,
    });
  }

  if (voglio('scadenze')) {
    const righe = d.scadenze.map((s) => [dataIt(s.data), s.titolo, s.importo]);
    out.push({
      codice: 'scadenze',
      titolo: titolo('scadenze'),
      colonne: [
        { titolo: 'Data', tipo: 'testo', larghezza: 70 },
        { titolo: 'Scadenza', tipo: 'testo', larghezza: 220 },
        { titolo: 'Importo stimato', tipo: 'euro', larghezza: 90 },
      ],
      righe,
      totali: null,
    });
  }
  return out;
}

const AVVERTENZA =
  "Prospetto preparato con Fiscal come supporto: contiene solo dati della contabilità (nessun dato clinico, consenso o nota). Le stime non sostituiscono la consulenza del commercialista e non sono la dichiarazione ufficiale.";

export function generaPacchetto(d: DatiPacchetto): { pdf: Uint8Array; xlsx: Uint8Array; sezioni: Sezione[]; totali: Record<string, number[]> } {
  const sezioni = costruisciSezioni(d);
  const periodo = `dal ${dataIt(d.da)} al ${dataIt(d.a)}`;
  const e = formattaEuro;

  // PDF
  const pdf = new DocumentoPdf(`Fiscal · prospetto per il commercialista · ${periodo} · generato il ${dataIt(d.generatoIl)}`);
  pdf.titolo('Prospetto per il commercialista', 20);
  pdf.paragrafo(`Periodo ${periodo}. Generato il ${dataIt(d.generatoIl)}. Regole fiscali: ${d.regole}.`);
  if (d.usaCodici) pdf.paragrafo('I clienti sono indicati con un codice stabile al posto del nome.', 9.5, 0.3);
  pdf.paragrafo(AVVERTENZA, 8.5, 0.35);
  pdf.titolo('Avvisi', 13);
  if (d.avvisi.length === 0) pdf.paragrafo('Nessun avviso: i controlli di completezza sono tutti superati.');
  for (const a of d.avvisi) pdf.paragrafo(`• ${a.testo}`);
  for (const s of sezioni) {
    pdf.titolo(s.titolo, 13);
    if (s.righe.length === 0) {
      pdf.paragrafo('Nessun dato nel periodo.', 9.5, 0.35);
      continue;
    }
    const colonne: Colonna[] = s.colonne.map((c) => ({ titolo: c.titolo, larghezza: c.larghezza, destra: c.tipo === 'euro' }));
    const testo = (v: string | number | null, i: number) => (v == null ? '' : s.colonne[i]!.tipo === 'euro' ? e(v as number) : String(v));
    pdf.tabella(
      colonne,
      s.righe.map((r) => r.map(testo)),
      s.totali ? s.totali.map((t, i) => (i === 0 ? 'Totale' : t == null ? '' : e(t))) : undefined,
    );
  }

  // Excel: un foglio per sezione più le avvertenze
  const fogli: Foglio[] = sezioni.map((s) => {
    const cella = (v: string | number | null, i: number): ValoreCella => (v == null ? null : s.colonne[i]!.tipo === 'euro' ? { euro: v as number } : String(v));
    const righe: ValoreCella[][] = [s.colonne.map((c) => c.titolo), ...s.righe.map((r) => r.map(cella))];
    if (s.righe.length === 0) righe.push(['Nessun dato nel periodo']);
    else if (s.totali) righe.push(s.totali.map((t, i) => (i === 0 ? 'Totale' : t == null ? null : { euro: t })));
    return { nome: s.titolo, righe };
  });
  fogli.push({
    nome: 'Avvertenze',
    righe: [
      ['Prospetto per il commercialista'],
      ['Periodo', periodo],
      ['Generato il', dataIt(d.generatoIl)],
      ['Regole fiscali', d.regole],
      ['Clienti', d.usaCodici ? 'indicati con un codice' : 'nome e codice fiscale come in fattura'],
      [AVVERTENZA],
      [],
      ['Avvisi'],
      ...(d.avvisi.length ? d.avvisi.map((a) => [a.testo]) : [['Nessun avviso']]),
    ],
  });

  const totali = Object.fromEntries(sezioni.map((s) => [s.codice, (s.totali ?? []).filter((t): t is number => t != null)]));
  return { pdf: pdf.byte(), xlsx: scriviXlsx(fogli), sezioni, totali };
}

/** Codice stabile del cliente (FR-006): non si ricostruisce il nome senza l'app. */
export async function codiceCliente(id: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`fiscal-cliente:${id}`)));
  return `C-${Array.from(h.slice(0, 3), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/**
 * Controlli prima dell'invio (US2, FR-004, FR-011): spese senza giustificativo, fatture non pagate o non inviate
 * alla Tessera Sanitaria, CU mancanti, regole da verificare, stime provvisorie, nomi di clienti nel testo libero.
 */
export function controlli(p: {
  da: string;
  a: string;
  spese: { id: string; data: string; descrizione: string | null; ha_giustificativo: boolean }[];
  fatture: { id: string; tipo: string; stato: string; data: string; numero: number | null; anno: number; netto: number; stato_sts: string }[];
  incassatoPer: Map<string, number>;
  anniConCu: number[];
  regoleDaVerificare: number;
  provvisorio: boolean;
  testiLiberi: { testo: string; dove: string; collegamento: string }[];
  nomiClienti: string[];
}): Avviso[] {
  const out: Avviso[] = [];
  const nelPeriodo = (data: string) => data >= p.da && data <= p.a;
  for (const s of p.spese.filter((s) => nelPeriodo(s.data) && !s.ha_giustificativo))
    out.push({ tipo: 'giustificativo', testo: `Spesa del ${dataIt(s.data)}${s.descrizione ? ` (${s.descrizione})` : ''} senza giustificativo.`, collegamento: `/spese/scheda/?id=${s.id}` });
  const emesse = p.fatture.filter((f) => f.tipo === 'fattura' && f.stato === 'emessa' && nelPeriodo(f.data));
  for (const f of emesse.filter((f) => (p.incassatoPer.get(f.id) ?? 0) < f.netto))
    out.push({ tipo: 'incasso', testo: `Fattura ${f.numero}/${f.anno} non ancora incassata del tutto.`, collegamento: `/fatture/dettaglio/?id=${f.id}` });
  const sts = emesse.filter((f) => f.stato_sts === 'da_inviare').length;
  if (sts) out.push({ tipo: 'sts', testo: `${sts} ${sts === 1 ? 'fattura da inviare' : 'fatture da inviare'} al Sistema Tessera Sanitaria.`, collegamento: '/adempimenti/' });
  for (let a = Number(p.da.slice(0, 4)); a <= Number(p.a.slice(0, 4)); a++)
    if (!p.anniConCu.includes(a)) out.push({ tipo: 'cu', testo: `Manca la Certificazione Unica ${a}.`, collegamento: `/tasse/dati/?anno=${a}` });
  if (p.regoleDaVerificare) out.push({ tipo: 'regole', testo: `${p.regoleDaVerificare} regole fiscali sono ancora da verificare: le stime possono cambiare.`, collegamento: '/novita/' });
  if (p.provvisorio) out.push({ tipo: 'provvisorio', testo: 'Il calcolo delle imposte è provvisorio (dati o regole mancanti).', collegamento: '/tasse/' });
  const nomi = p.nomiClienti
    .flatMap((n) => n.split(/\s+/))
    .filter((x) => x.length >= 4)
    .map((x) => x.toLowerCase());
  for (const t of p.testiLiberi) {
    const parole = t.testo.toLowerCase().split(/[^\p{L}']+/u);
    if (parole.some((w) => nomi.includes(w)))
      out.push({ tipo: 'nome', testo: `${t.dove}: il testo sembra contenere il nome di un cliente. Controlla prima di inviare.`, collegamento: t.collegamento });
  }
  return out;
}
