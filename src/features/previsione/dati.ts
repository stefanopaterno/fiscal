import { quoteIncasso } from '@/engine/accantonamento/incasso';
import { compensiPerNetto, nettoAnno, previsioneAnno, righeMensili, type BaseAnno, type PrevisioneAnno, type RigaMese } from '@/engine/previsione/anno';
import { calendarioPagamenti, spiegaVariazione, type Fotografia, type MesePagamenti } from '@/engine/previsione/calendario';
import {
  IPOTESI_PREDEFINITE,
  metodiDisponibili,
  proietta,
  type DatiMesi,
  type Disponibilita,
  type Ipotesi,
  type Metodo,
  type Proiezione,
  type ProposteVariabilita,
  variabilitaReale,
} from '@/engine/previsione/proiezione';
import { anniConRegoleIrpef } from '@/engine/regole/irpef';
import {
  ErroreFatturazione,
  leggiFatture,
  leggiIncassi,
  type Fattura,
  type Incasso,
  type Metadati,
} from '@/features/fatturazione/dati';
import { raccogliAnno, type DatiRaccolti } from '@/features/tasse/dati';
import { getSupabase } from '@/lib/supabase/client';
import { oggiIso } from '@/lib/oggi';

export { nuovoId, salva, spiegaErrore } from '@/features/fatturazione/dati';

/**
 * Dati della specifica 006 (data-model.md): ipotesi per anno e fotografie mensili, più il quadro calcolato
 * dal motore (src/engine/previsione/). I dati reali non si toccano mai (FR-013).
 */
export type IpotesiRiga = Metadati & {
  anno: number;
  metodo: Metodo | null;
  obiettivo: number | null;
  /** Netto dell'anno che l'utente vuole raggiungere (FR-011). */
  obiettivo_netto: number | null;
  pesi: number[];
  prudente: number;
  ottimistico: number;
};

export type FotografiaRiga = Metadati & {
  anno: number;
  mese: string;
  metodo: Metodo | null;
  compensi_reali: number;
  compensi_previsti: number;
  reddito: number;
  imposte: number;
  contributi: number;
  totale: number;
  aliquota_marginale: number;
};

function controlla<T>(r: { data: T; error: { message: string; details?: string | null } | null }): T {
  if (r.error) throw new ErroreFatturazione(r.error.message, r.error.details ?? undefined);
  return r.data;
}

export async function leggiIpotesi(anno: number): Promise<IpotesiRiga | null> {
  const r = await getSupabase().from('ipotesi_previsione').select('*').eq('anno', anno).maybeSingle();
  const d = controlla(r) as IpotesiRiga | null;
  return d
    ? { ...d, pesi: d.pesi.map(Number), prudente: Number(d.prudente), ottimistico: Number(d.ottimistico), obiettivo: d.obiettivo == null ? null : Number(d.obiettivo), obiettivo_netto: d.obiettivo_netto == null ? null : Number(d.obiettivo_netto) }
    : null;
}

export async function leggiFotografie(anno: number): Promise<FotografiaRiga[]> {
  const r = await getSupabase().from('previsioni_salvate').select('*').eq('anno', anno).order('mese');
  return (controlla(r) as FotografiaRiga[]).map((f) => ({ ...f, aliquota_marginale: Number(f.aliquota_marginale) }));
}

export const nuoveIpotesi = (anno: number, id: string): IpotesiRiga => ({
  id,
  versione: 0,
  anno,
  metodo: null,
  obiettivo: null,
  obiettivo_netto: null,
  pesi: [...IPOTESI_PREDEFINITE.pesi],
  prudente: IPOTESI_PREDEFINITE.prudente,
  ottimistico: IPOTESI_PREDEFINITE.ottimistico,
});

// ---------------------------------------------------------------------------

/** Compensi incassati per mese dell'anno (quote in proporzione al netto, come nel reddito di cassa). */
export function compensiPerMese(anno: number, fatture: Fattura[], incassi: Incasso[]): number[] {
  const perId = new Map(fatture.map((f) => [f.id, f]));
  const mesi = Array(12).fill(0) as number[];
  for (const i of incassi) {
    if (!i.data.startsWith(`${anno}-`)) continue;
    const f = perId.get(i.fattura_id);
    if (!f || f.netto <= 0) continue;
    const m = Number(i.data.slice(5, 7)) - 1;
    mesi[m] = (mesi[m] ?? 0) + quoteIncasso(f, i.importo).compenso;
  }
  return mesi;
}

/** Compensi delle fatture emesse ancora da incassare (impegni noti). */
export function compensiDaIncassare(fatture: Fattura[], incassi: Incasso[]): number {
  const incassato = new Map<string, number>();
  for (const i of incassi) incassato.set(i.fattura_id, (incassato.get(i.fattura_id) ?? 0) + i.importo);
  return fatture
    .filter((f) => f.tipo === 'fattura' && f.stato === 'emessa' && f.netto > 0)
    .reduce((t, f) => t + quoteIncasso(f, Math.max(0, f.netto - (incassato.get(f.id) ?? 0))).compenso, 0);
}

const baseDa = (r: DatiRaccolti): BaseAnno => ({
  input: r.input,
  compensiReali: r.cassa.compensi,
  deducibiliReali: (r.spese?.deducibile ?? 0) + (r.dati?.spese_professionali ?? 0),
  ritenuteReali: r.cassa.ritenute,
  soggettoIsa: r.dati?.soggetto_isa ?? false,
  manuale: r.manuale,
});

export type QuadroPrevisione = {
  anno: number;
  oggi: string;
  manca: 'cu' | 'regole' | null;
  ipotesi: IpotesiRiga;
  dati: DatiMesi;
  disponibili: Disponibilita[];
  proiezione: Proiezione;
  scenari: { prudente: PrevisioneAnno; atteso: PrevisioneAnno; ottimistico: PrevisioneAnno } | null;
  /** Tasse e contributi a fine anno con ogni metodo disponibile (FR-003, confronto). */
  perMetodo: { metodo: Metodo; compensi: number; totale: number }[];
  righe: RigaMese[];
  calendario: MesePagamenti[];
  prossimo: MesePagamenti | null;
  fotografie: FotografiaRiga[];
  variazioni: Map<string, string[]>;
  /** Fotografia di fine mese da salvare (chiusura mensile alla prima apertura dopo la fine del mese). */
  chiusuraDaSalvare: Fotografia | null;
  attuale: Fotografia | null;
  primoAnno: boolean;
  annoPrima: number[] | null;
  /** Intervallo degli scenari proposto dalla variabilità reale (null con meno di sei mesi). */
  variabilita: ProposteVariabilita | null;
  /** Netto previsto e, se l'obiettivo di netto non è raggiunto, i compensi che servono in tutto (FR-011). */
  netto: { previsto: number; obiettivo: number | null; compensiNecessari: number | null } | null;
};

const fotoDaRiga = (f: FotografiaRiga): Fotografia => ({
  mese: f.mese,
  metodo: f.metodo,
  compensiReali: Number(f.compensi_reali),
  compensiPrevisti: Number(f.compensi_previsti),
  reddito: Number(f.reddito),
  imposte: Number(f.imposte),
  contributi: Number(f.contributi),
  totale: Number(f.totale),
  aliquotaMarginale: f.aliquota_marginale,
});

export async function quadroPrevisione(anno: number): Promise<QuadroPrevisione> {
  const [raccolti, prima, fatture, incassi, ipotesi, fotografie] = await Promise.all([
    raccogliAnno(anno),
    anniConRegoleIrpef().includes(anno - 1) ? raccogliAnno(anno - 1).catch(() => null) : Promise.resolve(null),
    leggiFatture(),
    leggiIncassi(),
    leggiIpotesi(anno),
    leggiFotografie(anno),
  ]);
  return calcolaPrevisione({ anno, oggi: oggiIso(), raccolti, prima, fatture, incassi, ipotesi, fotografie });
}

export function calcolaPrevisione(p: {
  anno: number;
  oggi: string;
  raccolti: DatiRaccolti;
  prima: DatiRaccolti | null;
  fatture: Fattura[];
  incassi: Incasso[];
  ipotesi: IpotesiRiga | null;
  fotografie: FotografiaRiga[];
}): QuadroPrevisione {
  const { anno, oggi, raccolti } = p;
  const ipotesi = p.ipotesi ?? nuoveIpotesi(anno, '');
  const ip: Ipotesi = ipotesi;
  const annoOggi = Number(oggi.slice(0, 4));
  const meseCorrente = annoOggi > anno ? 13 : annoOggi < anno ? 0 : Number(oggi.slice(5, 7));
  const prima = compensiPerMese(anno - 1, p.fatture, p.incassi);
  const annoPrima = prima.some((x) => x > 0) ? prima : null;
  const dati: DatiMesi = {
    reali: compensiPerMese(anno, p.fatture, p.incassi),
    meseCorrente,
    annoPrima,
    impegni: compensiDaIncassare(p.fatture, p.incassi),
  };
  const disponibili = metodiDisponibili(dati, ip);
  const proiezione = proietta(dati, ip);
  const manca: QuadroPrevisione['manca'] = !anniConRegoleIrpef().includes(anno)
    ? 'regole'
    : raccolti.cu.length === 0
      ? 'cu'
      : null;

  const base = baseDa(raccolti);
  let scenari: QuadroPrevisione['scenari'] = null;
  let perMetodo: QuadroPrevisione['perMetodo'] = [];
  let righe: RigaMese[] = [];
  let calendario: MesePagamenti[] = [];
  let attuale: Fotografia | null = null;
  if (!manca) {
    const futuro = (tot: number) => Math.max(0, tot - proiezione.reale);
    scenari = {
      prudente: previsioneAnno(base, futuro(proiezione.scenari.prudente)),
      atteso: previsioneAnno(base, futuro(proiezione.scenari.atteso)),
      ottimistico: previsioneAnno(base, futuro(proiezione.scenari.ottimistico)),
    };
    perMetodo = disponibili
      .filter((d) => d.disponibile)
      .map((d) => {
        const pr = proietta(dati, ip, d.metodo);
        return { metodo: d.metodo, compensi: pr.totale, totale: previsioneAnno(base, pr.futuro).totale };
      });
    righe = righeMensili(base, proiezione.mesi.map((m) => m.valore));
    const anni = [{ anno, stima: scenari.atteso.stima, enpap: scenari.atteso.enpap }];
    if (p.prima && p.prima.cu.length > 0 && (p.prima.cassa.incassato > 0 || p.prima.manuale)) {
      try {
        const pa = previsioneAnno(baseDa(p.prima), 0);
        anni.unshift({ anno: anno - 1, stima: pa.stima, enpap: pa.enpap });
      } catch {
        /* anno prima senza dati sufficienti: solo l'anno in corso */
      }
    }
    calendario = calendarioPagamenti(oggi, anni);
    attuale = {
      mese: oggi.slice(0, 7),
      metodo: proiezione.metodo,
      compensiReali: proiezione.reale,
      compensiPrevisti: proiezione.futuro,
      reddito: scenari.atteso.reddito,
      imposte: scenari.atteso.imposte,
      contributi: scenari.atteso.contributi,
      totale: scenari.atteso.totale,
      aliquotaMarginale: scenari.atteso.aliquotaMarginale,
    };
  }

  // variazioni tra fotografie consecutive, e dell'attuale rispetto all'ultima
  const foto = p.fotografie.map(fotoDaRiga);
  const variazioni = new Map<string, string[]>();
  foto.forEach((f, i) => i > 0 && variazioni.set(f.mese, spiegaVariazione(foto[i - 1]!, f)));
  if (attuale && foto.length > 0) variazioni.set('attuale', spiegaVariazione(foto.at(-1)!, attuale));

  // chiusura mensile: alla prima apertura dopo la fine di un mese dell'anno si fotografa il mese concluso
  const meseChiuso =
    meseCorrente > 1 ? `${anno}-${String(Math.min(12, meseCorrente - 1)).padStart(2, '0')}` : null;
  const chiusuraDaSalvare =
    attuale && meseChiuso && !p.fotografie.some((f) => f.mese === meseChiuso) ? { ...attuale, mese: meseChiuso } : null;

  const oggiMese = oggi.slice(0, 7);
  const prossimo = calendario.find((m) => m.mese >= oggiMese && m.totale > 0 && m.piuPesante) ??
    calendario.find((m) => m.mese >= oggiMese && m.totale > 0) ??
    null;

  return {
    anno,
    oggi,
    manca,
    ipotesi,
    dati,
    disponibili,
    proiezione,
    scenari,
    perMetodo,
    righe,
    calendario,
    prossimo,
    fotografie: p.fotografie,
    variazioni,
    chiusuraDaSalvare,
    attuale,
    primoAnno: raccolti.annoInizio === anno,
    annoPrima,
    variabilita: variabilitaReale(dati),
    netto: manca
      ? null
      : (() => {
          const futuro = Math.max(0, proiezione.scenari.atteso - proiezione.reale);
          const necessari = ipotesi.obiettivo_netto ? compensiPerNetto(base, ipotesi.obiettivo_netto) : null;
          return {
            previsto: nettoAnno(base, futuro),
            obiettivo: ipotesi.obiettivo_netto,
            compensiNecessari: necessari == null ? null : proiezione.reale + necessari,
          };
        })(),
  };
}

export const rigaDaFotografia = (anno: number, f: Fotografia, id: string): FotografiaRiga => ({
  id,
  versione: 0,
  anno,
  mese: f.mese,
  metodo: f.metodo as Metodo | null,
  compensi_reali: f.compensiReali,
  compensi_previsti: f.compensiPrevisti,
  reddito: f.reddito,
  imposte: f.imposte,
  contributi: f.contributi,
  totale: f.totale,
  aliquota_marginale: Math.round(f.aliquotaMarginale * 1000) / 1000,
});
