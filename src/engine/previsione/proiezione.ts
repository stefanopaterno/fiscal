import { divisioneArrotondata } from '../irpef/aritmetica';

/**
 * Proiezione dei compensi mese per mese (specifica 006, FR-003, FR-004, FR-010, FR-016).
 * I mesi prima del mese corrente sono reali; il mese corrente è "in corso" (i dati parziali non devono
 * sembrare un calo); i mesi dopo sono previsti col metodo scelto. Importi in centesimi.
 */
export type Metodo = 'andamento' | 'stagionalita' | 'impegni' | 'obiettivo';

export type Ipotesi = {
  metodo: Metodo | null;
  /** Obiettivo annuo di compensi (centesimi). */
  obiettivo: number | null;
  /** Peso di ogni mese da 0 a 1 (12 valori), predefinito 1. */
  pesi: number[];
  /** Scenario prudente: incassi futuri più bassi di questa frazione (0,2 = 20%). */
  prudente: number;
  ottimistico: number;
};

export const IPOTESI_PREDEFINITE: Ipotesi = {
  metodo: null,
  obiettivo: null,
  pesi: Array(12).fill(1),
  prudente: 0.2,
  ottimistico: 0.2,
};

export type DatiMesi = {
  /** Compensi incassati per mese (12 valori). */
  reali: number[];
  /** Mese corrente 1–12 (13 se l'anno è finito, 0 se non è ancora iniziato). */
  meseCorrente: number;
  /** Compensi per mese dell'anno prima, se c'era attività. */
  annoPrima: number[] | null;
  /** Compensi delle fatture emesse non ancora incassate. */
  impegni: number;
};

export type Disponibilita = { metodo: Metodo; disponibile: boolean; motivo: string };

const somma = (v: number[]) => v.reduce((t, x) => t + x, 0);
const completi = (d: DatiMesi) => Math.max(0, Math.min(12, d.meseCorrente - 1));

export function metodiDisponibili(d: DatiMesi, ip: Ipotesi): Disponibilita[] {
  const c = completi(d);
  return [
    {
      metodo: 'andamento',
      disponibile: c > 0,
      motivo: c > 0 ? `Media dei ${c} mesi passati.` : 'Serve almeno un mese concluso.',
    },
    {
      metodo: 'stagionalita',
      disponibile: d.annoPrima != null && somma(d.annoPrima) > 0,
      motivo: d.annoPrima && somma(d.annoPrima) > 0 ? "Gli stessi mesi dell'anno prima." : "Disponibile dal secondo anno di attività.",
    },
    {
      metodo: 'impegni',
      disponibile: d.impegni > 0,
      motivo: d.impegni > 0 ? 'Le fatture emesse ancora da incassare.' : 'Nessuna fattura da incassare.',
    },
    {
      metodo: 'obiettivo',
      disponibile: ip.obiettivo != null && ip.obiettivo > 0,
      motivo: ip.obiettivo ? "L'obiettivo annuo distribuito sui mesi rimasti." : "Inserisci un obiettivo annuo.",
    },
  ];
}

/**
 * Metodo usato (FR-003): quello scelto se disponibile; altrimenti nel primo anno l'obiettivo, e dopo tre
 * mesi di dati reali l'andamento.
 */
export function metodoUsato(d: DatiMesi, ip: Ipotesi): Metodo | null {
  const disp = new Map(metodiDisponibili(d, ip).map((m) => [m.metodo, m.disponibile]));
  if (ip.metodo && disp.get(ip.metodo)) return ip.metodo;
  if (completi(d) >= 3 && disp.get('andamento')) return 'andamento';
  if (disp.get('obiettivo')) return 'obiettivo';
  if (disp.get('andamento')) return 'andamento';
  if (disp.get('impegni')) return 'impegni';
  return null;
}

export type Mese = { mese: number; valore: number; reale: number; tipo: 'reale' | 'in_corso' | 'previsto' };

export type Proiezione = {
  metodo: Metodo | null;
  mesi: Mese[];
  reale: number;
  futuro: number;
  totale: number;
  pochiDati: boolean;
  scenari: { prudente: number; atteso: number; ottimistico: number };
};

/** Distribuisce un importo sui mesi indicati in proporzione ai pesi (resto all'ultimo mese con peso). */
function distribuisci(importo: number, mesi: number[], pesi: number[]): Map<number, number> {
  const out = new Map<number, number>();
  const tot = somma(mesi.map((m) => pesi[m - 1] ?? 1));
  if (importo <= 0 || tot <= 0) return out;
  let assegnato = 0;
  const conPeso = mesi.filter((m) => (pesi[m - 1] ?? 1) > 0);
  conPeso.forEach((m, i) => {
    const q =
      i === conPeso.length - 1 ? importo - assegnato : divisioneArrotondata(importo * Math.round((pesi[m - 1] ?? 1) * 1000), Math.round(tot * 1000));
    out.set(m, q);
    assegnato += q;
  });
  return out;
}

export function proietta(d: DatiMesi, ip: Ipotesi, metodoForzato?: Metodo | null): Proiezione {
  const metodo = metodoForzato === undefined ? metodoUsato(d, ip) : metodoForzato;
  const c = completi(d);
  const corrente = d.meseCorrente;
  const pesi = ip.pesi.length === 12 ? ip.pesi : IPOTESI_PREDEFINITE.pesi;
  const daPrevedere = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => m >= corrente && m <= 12);
  const previsto = new Map<number, number>();
  // additivo: il previsto si somma al reale del mese corrente; altrimenti si prende il maggiore
  let additivo = false;

  if (metodo === 'andamento' && c > 0) {
    const pesiPassati = somma(pesi.slice(0, c));
    const base = pesiPassati > 0 ? somma(d.reali.slice(0, c)) / pesiPassati : 0;
    for (const m of daPrevedere) previsto.set(m, Math.round(base * (pesi[m - 1] ?? 1)));
  } else if (metodo === 'stagionalita' && d.annoPrima) {
    const primaPassati = somma(d.annoPrima.slice(0, c));
    const fattore = c > 0 && primaPassati > 0 ? somma(d.reali.slice(0, c)) / primaPassati : 1;
    for (const m of daPrevedere) previsto.set(m, Math.round((d.annoPrima[m - 1] ?? 0) * fattore));
  } else if (metodo === 'obiettivo' && ip.obiettivo) {
    additivo = true;
    const giaIncassato = somma(d.reali.slice(0, Math.min(12, corrente)));
    for (const [m, v] of distribuisci(Math.max(0, ip.obiettivo - giaIncassato), daPrevedere, pesi)) previsto.set(m, v);
  } else if (metodo === 'impegni' && d.impegni > 0) {
    additivo = true;
    const m = Math.min(12, corrente < 12 ? corrente + 1 : 12);
    if (corrente <= 12) previsto.set(m, d.impegni);
  }

  const mesi: Mese[] = d.reali.map((reale, i) => {
    const m = i + 1;
    if (m < corrente) return { mese: m, valore: reale, reale, tipo: 'reale' };
    const p = previsto.get(m) ?? 0;
    if (m === corrente) return { mese: m, valore: additivo ? reale + p : Math.max(reale, p), reale, tipo: 'in_corso' };
    return { mese: m, valore: p, reale, tipo: 'previsto' };
  });
  const totale = somma(mesi.map((x) => x.valore));
  const reale = somma(d.reali.slice(0, Math.min(12, corrente)));
  const futuro = Math.max(0, totale - reale);
  return {
    metodo,
    mesi,
    reale,
    futuro,
    totale,
    pochiDati: c < 3 && metodo !== 'obiettivo',
    scenari: {
      prudente: reale + Math.round(futuro * (1 - ip.prudente)),
      atteso: totale,
      ottimistico: reale + Math.round(futuro * (1 + ip.ottimistico)),
    },
  };
}
