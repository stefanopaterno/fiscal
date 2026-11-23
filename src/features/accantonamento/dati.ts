import { copertura, type Scadenza, type ScadenzaCoperta } from '@/engine/accantonamento/copertura';
import {
  accantonamentoIncasso,
  imposteAnno,
  quoteIncasso,
  type Accantonamento,
} from '@/engine/accantonamento/incasso';
import { motiviCambio, percentualeMese, type PercentualeMese } from '@/engine/accantonamento/percentuale';
import { nettoReale, pianoMensile } from '@/engine/accantonamento/piano';
import { stimaVersamenti } from '@/engine/irpef/acconti';
import { calcolaAnno } from '@/engine/irpef/anno';
import { contributiEnpap } from '@/engine/irpef/enpap';
import { regoleAccantonamento } from '@/engine/regole/accantonamento';
import { anniConRegoleIrpef } from '@/engine/regole/irpef';
import { ErroreFatturazione, leggiFatture, leggiIncassi, type Metadati } from '@/features/fatturazione/dati';
import { raccogliAnno, type DatiRaccolti } from '@/features/tasse/dati';
import { getSupabase } from '@/lib/supabase/client';
import { oggiIso } from '@/lib/oggi';

export { nuovoId, salva, spiegaErrore } from '@/features/fatturazione/dati';

/**
 * Dati della specifica 007 (data-model.md): movimenti del salvadanaio e impostazioni, più il quadro
 * calcolato dal motore (research R-01…R-06). Le scadenze e il fabbisogno non si salvano: si calcolano.
 */
export type TipoMovimento = 'accantonamento' | 'scadenza_pagata' | 'rettifica' | 'interessi';

export type Movimento = Metadati & {
  data: string;
  importo: number;
  tipo: TipoMovimento;
  incasso_id: string | null;
  rimandato: boolean;
};

export type FotografiaPercentuale = {
  mese: string;
  per100: number;
  imposte: number;
  contributi: number;
  margine: number;
  aliquotaMarginale: number;
  aliquotaEnpap: number;
  detrazioneLavoro: number;
  motivi: string[];
};

export type ImpostazioniAccantonamento = Metadati & {
  margine: number;
  metodo: 'marginale' | 'media';
  avvisi: boolean;
  tasso_lordo: number | null;
  vincolato_fino: string | null;
  percentuale_mese: FotografiaPercentuale | null;
};

export const IMPOSTAZIONI_PREDEFINITE = (id: string, anno: number): ImpostazioniAccantonamento => ({
  id,
  versione: 0,
  margine: regoleAccantonamento(anno).marginePrimoAnno.valore,
  metodo: 'marginale',
  avvisi: true,
  tasso_lordo: null,
  vincolato_fino: null,
  percentuale_mese: null,
});

function controlla<T>(r: { data: T; error: { message: string; details?: string | null } | null }): T {
  if (r.error) throw new ErroreFatturazione(r.error.message, r.error.details ?? undefined);
  return r.data;
}

export async function leggiSalvadanaio(): Promise<Movimento[]> {
  const r = await getSupabase().from('salvadanaio').select('*').order('data', { ascending: false });
  return (controlla(r) as Movimento[]).map((m) => ({ ...m, importo: Number(m.importo) }));
}

export async function leggiImpostazioniAccantonamento(): Promise<ImpostazioniAccantonamento | null> {
  const r = await getSupabase().from('impostazioni_accantonamento').select('*').maybeSingle();
  const d = controlla(r) as ImpostazioniAccantonamento | null;
  return d
    ? { ...d, margine: Number(d.margine), tasso_lordo: d.tasso_lordo == null ? null : Number(d.tasso_lordo) }
    : null;
}

export async function eliminaMovimento(id: string): Promise<void> {
  controlla(await getSupabase().from('salvadanaio').delete().eq('id', id));
}

// ---------------------------------------------------------------------------
// Quadro calcolato
// ---------------------------------------------------------------------------

export type IncassoAccantonato = Accantonamento & {
  incassoId: string;
  data: string;
  fatturaId: string;
  numero: string;
  /** Movimento collegato (promemoria chiuso) o rimandato. */
  movimento: Movimento | null;
  stato: 'fatto' | 'da_fare' | 'rimandato';
};

export type QuadroAccantonamento = {
  anno: number;
  /** Perché il calcolo non si può fare: manca la CU dell'anno o mancano le regole. */
  manca: 'cu' | 'regole' | null;
  oggi: string;
  raccolti: DatiRaccolti;
  impostazioni: ImpostazioniAccantonamento;
  movimenti: Movimento[];
  saldo: number;
  incassi: IncassoAccantonato[];
  promemoria: IncassoAccantonato[];
  percentuale: PercentualeMese;
  /** Cosa è cambiato rispetto alla fotografia salvata del mese (vuoto se nessuna fotografia). */
  cambiamenti: string[];
  /** La fotografia salvata è di un mese precedente: va aggiornata. */
  fotografiaDaAggiornare: boolean;
  scadenze: ScadenzaCoperta[];
  mancaTotale: number;
  eccedenza: number;
  fabbisogno: number;
  /** Accantonamenti necessari dell'anno per la P.IVA (imposte, contributi, integrativo, IVA, bollo). */
  necessari: { imposte: number; contributi: number; integrativo: number; iva: number; bollo: number; ritenute: number; totale: number };
  netto: { incassato: number; spese: number; necessari: number; disponibile: number };
  primoAnno: boolean;
  piano: ReturnType<typeof pianoMensile> | null;
  /** Somme non disponibili alla prima scadenza perché il conto è vincolato (FR-016). */
  vincoloOltreScadenza: string | null;
};

const fineMese = (mese: string) => {
  const [a, m] = mese.split('-').map(Number) as [number, number];
  return `${mese}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`;
};

/** Trimestre di un incasso → data del versamento di IVA e bollo (date indicative dalle regole). */
function dataIvaBollo(anno: number, data: string): string {
  const giorni = regoleAccantonamento(anno).scadenzeIvaBollo.valore;
  const t = Math.floor((Number(data.slice(5, 7)) - 1) / 3);
  return `${t === 3 ? anno + 1 : anno}-${giorni[t]}`;
}

export function fotografa(p: PercentualeMese, mese: string): FotografiaPercentuale {
  return { mese, ...p };
}

export async function quadroAccantonamento(anno: number): Promise<QuadroAccantonamento> {
  const [raccolti, fatture, incassiTutti, movimenti, imp] = await Promise.all([
    raccogliAnno(anno),
    leggiFatture(),
    leggiIncassi(),
    leggiSalvadanaio(),
    leggiImpostazioniAccantonamento(),
  ]);
  return calcolaQuadro({ anno, oggi: oggiIso(), raccolti, fatture, incassi: incassiTutti, movimenti, imp });
}

/** Separato dalla lettura per i test (principio I: il calcolo non dipende dal database). */
export function calcolaQuadro(p: {
  anno: number;
  oggi: string;
  raccolti: DatiRaccolti;
  fatture: Awaited<ReturnType<typeof leggiFatture>>;
  incassi: Awaited<ReturnType<typeof leggiIncassi>>;
  movimenti: Movimento[];
  imp: ImpostazioniAccantonamento | null;
}): QuadroAccantonamento {
  const { anno, raccolti } = p;
  const impostazioni = p.imp ?? IMPOSTAZIONI_PREDEFINITE('', anno);
  const margine = impostazioni.margine;
  const input = raccolti.input;
  // Il motore 001 parte dalla CU: senza, l'effetto sul cumulo sarebbe sottostimato e non si propone nulla.
  const manca: QuadroAccantonamento['manca'] = !anniConRegoleIrpef().includes(anno)
    ? 'regole'
    : raccolti.cu.length === 0
      ? 'cu'
      : null;
  const conRegole = manca === null;

  // Incassi dell'anno in ordine di data: ogni incasso si calcola sopra a quelli precedenti (R-01), così la
  // somma degli effetti coincide con il totale dell'anno.
  const perFattura = new Map(p.fatture.map((f) => [f.id, f]));
  const incassiAnno = p.incassi
    .filter((i) => i.data.startsWith(`${anno}-`) && (perFattura.get(i.fattura_id)?.netto ?? 0) > 0)
    .sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
  const quote = incassiAnno.map((i) => quoteIncasso(perFattura.get(i.fattura_id)!, i.importo));
  const compensiTotali = quote.reduce((t, q) => t + q.compenso, 0);
  // reddito professionale senza nessun incasso (spese e oneri restano)
  const base = input.redditoProfessionale - (raccolti.manuale ? 0 : compensiTotali);
  const perIncasso = new Map(p.movimenti.filter((m) => m.incasso_id).map((m) => [m.incasso_id!, m]));

  let cumulato = 0;
  const incassi: IncassoAccantonato[] = conRegole
    ? incassiAnno.map((i, k) => {
        const q = quote[k]!;
        cumulato += q.compenso;
        const a = accantonamentoIncasso(
          { ...input, redditoProfessionale: raccolti.manuale ? input.redditoProfessionale : base + cumulato },
          q,
          { margine },
        );
        const f = perFattura.get(i.fattura_id)!;
        const m = perIncasso.get(i.id) ?? null;
        return {
          ...a,
          incassoId: i.id,
          data: i.data,
          fatturaId: f.id,
          numero: f.numero != null ? `${f.numero}/${f.anno}` : 'bozza',
          movimento: m,
          stato: m == null ? 'da_fare' : m.rimandato ? 'rimandato' : 'fatto',
        };
      })
    : [];
  const promemoria = incassi
    .filter((i) => i.stato !== 'fatto' && i.totale > 0)
    .sort((a, b) => Number(a.stato === 'rimandato') - Number(b.stato === 'rimandato') || b.data.localeCompare(a.data));

  const vuota: PercentualeMese = {
    per100: 0, imposte: 0, contributi: 0, margine: 0, aliquotaMarginale: 0, aliquotaEnpap: 0, detrazioneLavoro: 0,
    motivi: [
      manca === 'cu'
        ? `Serve la Certificazione Unica ${anno}: lo stipendio decide in che scaglione cade la partita IVA.`
        : 'Mancano le regole fiscali di questo anno.',
    ],
  };
  const percentuale = conRegole ? percentualeMese(input, { margine }) : vuota;
  const mese = p.oggi.slice(0, 7);
  const foto = impostazioni.percentuale_mese;
  const cambiamenti = foto ? motiviCambio(foto, percentuale) : [];

  // Necessari dell'anno per la P.IVA: imposte con e senza la partita IVA, contributi ENPAP, integrativo, IVA, bollo
  const cassa = raccolti.cassa;
  const ivaBollo = incassiAnno.reduce(
    (t, i, k) => ({ iva: t.iva + quote[k]!.iva, bollo: t.bollo + quote[k]!.bollo }),
    { iva: 0, bollo: 0 },
  );
  let imposte = 0;
  let stima: ReturnType<typeof stimaVersamenti> | null = null;
  let enpap = { soggettivo: 0, maternita: 0, integrativo: 0, scadenza: `${anno + 1}-10-01` };
  if (conRegole) {
    const con = calcolaAnno(structuredClone(input));
    const senza = calcolaAnno({ ...structuredClone(input), redditoProfessionale: 0, ritenuteSubite: 0 });
    imposte = Math.max(0, imposteAnno(con) - imposteAnno(senza));
    stima = stimaVersamenti(con, { metodo: 'storico', soggettoIsa: raccolti.dati?.soggetto_isa ?? false });
    if (cassa.incassato > 0 || raccolti.manuale) {
      const c = contributiEnpap(anno, { redditoProfessionale: input.redditoProfessionale, volumeAffari: cassa.compensi });
      enpap = { soggettivo: c.soggettivo, maternita: c.maternita, integrativo: c.integrativo, scadenza: c.scadenza };
    }
  }
  const contributiTot = enpap.soggettivo + enpap.maternita;
  const totNecessari = Math.max(
    0,
    imposte + contributiTot + enpap.integrativo + ivaBollo.iva + ivaBollo.bollo - cassa.ritenute,
  );
  const necessari = {
    imposte,
    contributi: contributiTot,
    integrativo: enpap.integrativo,
    iva: ivaBollo.iva,
    bollo: ivaBollo.bollo,
    ritenute: cassa.ritenute,
    totale: totNecessari,
  };

  // Scadenze dell'anno dopo (R-03)
  const scadenze: Scadenza[] = [];
  if (stima) {
    scadenze.push({ voce: `Saldo e primo acconto (giugno ${anno + 1})`, data: fineMese(stima.meseGiugno), importo: stima.giugno });
    scadenze.push({ voce: `Secondo acconto (novembre ${anno + 1})`, data: fineMese(stima.meseNovembre), importo: stima.novembre });
  }
  const totEnpap = enpap.soggettivo + enpap.maternita + enpap.integrativo;
  if (totEnpap > 0)
    scadenze.push({ voce: `Contributi ENPAP (${enpap.scadenza.split('-').reverse().join('/')})`, data: enpap.scadenza, importo: totEnpap });
  const ivaPerData = new Map<string, number>();
  incassiAnno.forEach((i, k) => {
    const v = quote[k]!.iva + quote[k]!.bollo;
    if (v > 0) ivaPerData.set(dataIvaBollo(anno, i.data), (ivaPerData.get(dataIvaBollo(anno, i.data)) ?? 0) + v);
  });
  for (const [data, importo] of ivaPerData)
    scadenze.push({ voce: `IVA e bollo (${data.split('-').reverse().join('/')})`, data, importo });
  // solo le scadenze ancora da pagare
  const future = scadenze.filter((s) => s.data >= p.oggi);

  const saldo = p.movimenti.filter((m) => !m.rimandato).reduce((t, m) => t + m.importo, 0);
  const cop = copertura(saldo, future);

  const spese = raccolti.registrati.spese.reduce((t, s) => t + s.importo, 0) + (raccolti.dati?.spese_professionali ?? 0);
  const netto = {
    incassato: cassa.incassato,
    spese,
    necessari: totNecessari,
    disponibile: nettoReale({ incassato: cassa.incassato, spese, necessari: totNecessari }),
  };

  const primoAnno = raccolti.annoInizio === anno;
  const piano =
    primoAnno && stima
      ? pianoMensile({
          fabbisogno: cop.fabbisogno,
          saldo,
          oggi: p.oggi,
          scadenza: fineMese(stima.meseGiugno),
          tasso: impostazioni.tasso_lordo,
          ritenuta: regoleAccantonamento(anno).ritenutaInteressi.valore,
        })
      : null;

  const prima = cop.scadenze[0];
  const vincoloOltreScadenza =
    impostazioni.vincolato_fino && prima && impostazioni.vincolato_fino > prima.data ? prima.voce : null;

  return {
    anno,
    manca,
    oggi: p.oggi,
    raccolti,
    impostazioni,
    movimenti: p.movimenti,
    saldo,
    incassi,
    promemoria,
    percentuale,
    cambiamenti,
    fotografiaDaAggiornare: !foto || foto.mese !== mese,
    scadenze: cop.scadenze,
    mancaTotale: cop.mancaTotale,
    eccedenza: cop.eccedenza,
    fabbisogno: cop.fabbisogno,
    necessari,
    netto,
    primoAnno,
    piano,
    vincoloOltreScadenza,
  };
}
