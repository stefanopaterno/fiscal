import type { AliquoteAddizionali, InputAnno } from '@/engine/irpef/anno';
import { redditoDiCassa, type RedditoDiCassa } from '@/engine/irpef/cassa';
import { contributiEnpap } from '@/engine/irpef/enpap';
import { anniConRegoleIrpef } from '@/engine/regole/irpef';
import { getSupabase } from '@/lib/supabase/client';
import {
  ErroreFatturazione,
  leggiFatture,
  leggiIncassi,
  leggiProfilo,
  type Metadati,
} from '@/features/fatturazione/dati';

export { nuovoId, salva, spiegaErrore } from '@/features/fatturazione/dati';

/**
 * Dati della specifica 001 (data-model.md). Letture dal database (RLS: proprietario e aal2), salvataggi
 * dalla coda senza rete. I nomi dei campi sono quelli delle colonne. Il motore non legge il database:
 * `raccogliAnno` prepara l'`InputAnno` (principio I).
 */
export type Cu = Metadati & {
  anno: number;
  sostituto: string | null;
  reddito_lavoro: number;
  giorni_lavoro: number;
  ritenute_irpef: number;
  addizionale_regionale: number;
  addizionale_comunale_acconto: number;
  addizionale_comunale_saldo: number;
  addizionale_comunale_acconto_anno_dopo: number | null;
  detrazioni_lavoro_fruite: number | null;
  detrazioni_familiari_fruite: number | null;
  contributi_previdenziali: number | null;
};

export type DatiAnno = Metadati & {
  anno: number;
  spese_professionali: number;
  reddito_professionale_manuale: number | null;
  altre_detrazioni: number;
  oneri_deducibili: number;
  soggetto_isa: boolean;
  reddito_atteso: number | null;
  anno_concluso: boolean;
};

export type AliquoteRiga = Metadati & {
  anno: number;
  regionale_scaglioni: { fino_a: number | null; aliquota: number }[];
  comunale_aliquota: number;
  comunale_soglia_esenzione: number | null;
  verificate: boolean;
};

export type VersamentoPrevidenzaRiga = Metadati & {
  data: string;
  importo: number;
  tipo: 'soggettivo' | 'integrativo' | 'maternita';
  cassa: 'enpap' | 'gestione_separata';
  anno_reddito: number;
};

export type VoceImposta =
  | 'irpef_acconto_1'
  | 'irpef_acconto_2'
  | 'irpef_saldo'
  | 'add_regionale'
  | 'add_comunale_saldo'
  | 'add_comunale_acconto';

export type VersamentoImpostaRiga = Metadati & {
  data: string;
  anno_imposta: number;
  voce: VoceImposta;
  importo: number;
};

function controlla<T>(r: { data: T; error: { message: string; details?: string | null } | null }): T {
  if (r.error) throw new ErroreFatturazione(r.error.message, r.error.details ?? undefined);
  return r.data;
}

export const nuovaCu = (anno: number, id: string): Cu => ({
  id,
  versione: 0,
  anno,
  sostituto: null,
  reddito_lavoro: 0,
  giorni_lavoro: 365,
  ritenute_irpef: 0,
  addizionale_regionale: 0,
  addizionale_comunale_acconto: 0,
  addizionale_comunale_saldo: 0,
  addizionale_comunale_acconto_anno_dopo: null,
  detrazioni_lavoro_fruite: null,
  detrazioni_familiari_fruite: null,
  contributi_previdenziali: null,
});

export const nuoviDatiAnno = (anno: number, id: string): DatiAnno => ({
  id,
  versione: 0,
  anno,
  spese_professionali: 0,
  reddito_professionale_manuale: null,
  altre_detrazioni: 0,
  oneri_deducibili: 0,
  soggetto_isa: false,
  reddito_atteso: null,
  anno_concluso: false,
});

export const nuoveAliquote = (anno: number, id: string): AliquoteRiga => ({
  id,
  versione: 0,
  anno,
  regionale_scaglioni: [{ fino_a: null, aliquota: 0 }],
  comunale_aliquota: 0,
  comunale_soglia_esenzione: null,
  verificate: false,
});

// --- Letture -------------------------------------------------------------

export async function leggiCu(anno: number): Promise<Cu[]> {
  return controlla(
    await getSupabase().from('certificazioni_uniche').select('*').eq('anno', anno).order('creato_il'),
  ) as Cu[];
}

export async function leggiDatiAnno(anno: number): Promise<DatiAnno | null> {
  return controlla(
    await getSupabase().from('dati_anno').select('*').eq('anno', anno).maybeSingle(),
  ) as DatiAnno | null;
}

export async function leggiAliquote(anno: number): Promise<AliquoteRiga | null> {
  return controlla(
    await getSupabase().from('aliquote_addizionali').select('*').eq('anno', anno).maybeSingle(),
  ) as AliquoteRiga | null;
}

export async function leggiVersamentiPrevidenza(): Promise<VersamentoPrevidenzaRiga[]> {
  return controlla(
    await getSupabase().from('versamenti_previdenza').select('*').order('data', { ascending: false }),
  ) as VersamentoPrevidenzaRiga[];
}

export async function leggiVersamentiImposte(): Promise<VersamentoImpostaRiga[]> {
  return controlla(
    await getSupabase().from('versamenti_imposte').select('*').order('data', { ascending: false }),
  ) as VersamentoImpostaRiga[];
}

export async function elimina(
  tabella: 'certificazioni_uniche' | 'versamenti_previdenza' | 'versamenti_imposte',
  id: string,
) {
  controlla(await getSupabase().from(tabella).delete().eq('id', id));
}

// --- Raccolta per il motore ----------------------------------------------

export type DatiRaccolti = {
  anno: number;
  input: InputAnno;
  cu: Cu[];
  dati: DatiAnno | null;
  aliquote: AliquoteRiga | null;
  cassa: RedditoDiCassa;
  /** Anno di inizio dell'attività (dal profilo), se c'è. */
  annoInizio: number | null;
  /** Reddito professionale inserito a mano invece che dalle fatture. */
  manuale: boolean;
};

const aliquoteMotore = (a: AliquoteRiga | null): AliquoteAddizionali | null =>
  a
    ? {
        regionale: a.regionale_scaglioni.map((s) => ({ finoA: s.fino_a, aliquota: Number(s.aliquota) })),
        comunale: { aliquota: Number(a.comunale_aliquota), soglia: a.comunale_soglia_esenzione },
        verificate: a.verificate,
      }
    : null;

/** Contributi ENPAP sul reddito dell'anno prima, dovuti quest'anno e non ancora versati (FR-005). */
function contributiPrevisti(
  anno: number,
  datiPrima: { reddito: number; volume: number } | null,
  versamenti: VersamentoPrevidenzaRiga[],
): number {
  if (!datiPrima || !anniConRegoleIrpef().includes(anno - 1)) return 0;
  const dovuti = contributiEnpap(anno - 1, {
    redditoProfessionale: datiPrima.reddito,
    volumeAffari: datiPrima.volume,
  }).deducibili;
  const versati = versamenti
    .filter(
      (v) =>
        v.anno_reddito === anno - 1 &&
        v.tipo !== 'integrativo' &&
        v.cassa === 'enpap' &&
        v.data.startsWith(`${anno}-`),
    )
    .reduce((t, v) => t + v.importo, 0);
  return Math.max(0, dovuti - versati);
}

export async function raccogliAnno(anno: number): Promise<DatiRaccolti> {
  const [cu, dati, aliquote, versPrev, versImp, fatture, incassi, profilo, datiPrima] = await Promise.all([
    leggiCu(anno),
    leggiDatiAnno(anno),
    leggiAliquote(anno),
    leggiVersamentiPrevidenza(),
    leggiVersamentiImposte(),
    leggiFatture(),
    leggiIncassi(),
    leggiProfilo(),
    leggiDatiAnno(anno - 1),
  ]);
  const cassa = redditoDiCassa(anno, fatture, incassi);
  const manuale = dati?.reddito_professionale_manuale != null;
  const redditoProfessionale = manuale
    ? dati!.reddito_professionale_manuale!
    : cassa.compensi - (dati?.spese_professionali ?? 0);

  // anno prima: c'è attività professionale solo se ci sono incassi o un reddito inserito a mano
  const cassaPrima = redditoDiCassa(anno - 1, fatture, incassi);
  const attivitaPrima = cassaPrima.incassato > 0 || datiPrima?.reddito_professionale_manuale != null;
  const previsti =
    dati?.anno_concluso || !attivitaPrima
      ? 0
      : contributiPrevisti(
          anno,
          {
            reddito:
              datiPrima?.reddito_professionale_manuale ??
              cassaPrima.compensi - (datiPrima?.spese_professionali ?? 0),
            volume: cassaPrima.compensi,
          },
          versPrev,
        );

  const accontiAnno = versImp.filter((v) => v.anno_imposta === anno);
  const somma = (voci: VoceImposta[]) =>
    accontiAnno.filter((v) => voci.includes(v.voce)).reduce((t, v) => t + v.importo, 0);

  const input: InputAnno = {
    anno,
    cu: cu.map((c) => ({
      redditoLavoro: c.reddito_lavoro,
      giorniLavoro: c.giorni_lavoro,
      ritenuteIrpef: c.ritenute_irpef,
      addRegionale: c.addizionale_regionale,
      addComunaleAcconto: c.addizionale_comunale_acconto,
      addComunaleSaldo: c.addizionale_comunale_saldo,
      addComunaleAccontoAnnoDopo: c.addizionale_comunale_acconto_anno_dopo,
      detrazioniLavoroFruite: c.detrazioni_lavoro_fruite,
      detrazioniFamiliariFruite: c.detrazioni_familiari_fruite,
    })),
    redditoProfessionale,
    ritenuteSubite: manuale ? 0 : cassa.ritenute,
    versamentiPrevidenza: versPrev.map((v) => ({
      data: v.data,
      importo: v.importo,
      tipo: v.tipo,
      cassa: v.cassa,
    })),
    contributiPrevisti: previsti,
    oneriDeducibili: dati?.oneri_deducibili ?? 0,
    altreDetrazioni: dati?.altre_detrazioni ?? 0,
    addizionali: aliquoteMotore(aliquote),
    accontiVersati: {
      irpef: somma(['irpef_acconto_1', 'irpef_acconto_2']),
      addComunale: somma(['add_comunale_acconto']),
    },
  };
  const annoInizio = profilo?.inizio_attivita ? Number(profilo.inizio_attivita.slice(0, 4)) : null;
  return { anno, input, cu, dati, aliquote, cassa, annoInizio, manuale };
}
