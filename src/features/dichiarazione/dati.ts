import { checklist, type Elemento } from '@/engine/dichiarazione/checklist';
import { creditoDisponibile, esitoDichiarazione, type Esito } from '@/engine/dichiarazione/esito';
import { stimaVersamenti } from '@/engine/irpef/acconti';
import { calcolaAnno, type RisultatoAnno } from '@/engine/irpef/anno';
import { contributiEnpap } from '@/engine/irpef/enpap';
import { anniConRegoleIrpef } from '@/engine/regole/irpef';
import { calendarioAnno, type Contesto, type StatoUtente, type VoceCalendario } from '@/engine/scadenze/calendario';
import { leggiDocumenti } from '@/features/documenti/dati';
import { ErroreFatturazione, leggiFatture, leggiProfilo, type Fattura, type Metadati } from '@/features/fatturazione/dati';
import { quadroPrevisione } from '@/features/previsione/dati';
import { leggiDichiarazione, raccogliAnno, type DatiRaccolti, type Dichiarazione } from '@/features/tasse/dati';
import { getSupabase } from '@/lib/supabase/client';
import { annoCorrente, oggiIso } from '@/lib/oggi';

export { nuovoId, salva, spiegaErrore } from '@/features/fatturazione/dati';
export { leggiDichiarazione, type Dichiarazione } from '@/features/tasse/dati';

/**
 * Dati della specifica 004 (data-model.md): dichiarazioni (730 di partenza ed esito), stato delle scadenze e della
 * checklist; quadro calcolato con i motori di 001, 004 e 006.
 */
export type ScadenzaUtente = Metadati & StatoUtente;
export type RigaChecklist = Metadati & { anno: number; chiave: string; stato: 'completato' | 'non_applicabile' };

function controlla<T>(r: { data: T; error: { message: string; details?: string | null } | null }): T {
  if (r.error) throw new ErroreFatturazione(r.error.message, r.error.details ?? undefined);
  return r.data;
}

export async function leggiScadenzeUtente(anni: number[]): Promise<ScadenzaUtente[]> {
  return controlla(await getSupabase().from('scadenze_utente').select('*').in('anno', anni)) as ScadenzaUtente[];
}

export async function leggiChecklist(anno: number): Promise<RigaChecklist[]> {
  return controlla(await getSupabase().from('checklist_anno').select('*').eq('anno', anno)) as RigaChecklist[];
}

export async function eliminaRiga(tabella: 'scadenze_utente' | 'checklist_anno', id: string): Promise<void> {
  controlla(await getSupabase().from(tabella).delete().eq('id', id));
}

export const nuovaDichiarazione = (anno: number, tipo: '730' | 'redditi', id: string): Dichiarazione => ({
  id,
  versione: 0,
  anno,
  tipo,
  imposta_netta: null,
  differenza: null,
  acconti_trattenuti: null,
  credito: 0,
  debito: 0,
  rimborso_in_busta: null,
  credito_scelta: null,
  credito_stato: null,
  credito_usato: 0,
  credito_incassato_il: null,
  chiuso_il: null,
});

// ---------------------------------------------------------------------------
// Checklist ed esito
// ---------------------------------------------------------------------------

export type QuadroDichiarazione = {
  anno: number;
  raccolti: DatiRaccolti;
  risultato: RisultatoAnno | null;
  errore: string | null;
  esito: Esito | null;
  creditoAnnoPrima: number;
  dichiarazione: Dichiarazione | null;
  checklist: { elementi: Elemento[]; percentuale: number; mancanti: number };
  righeChecklist: RigaChecklist[];
};

function incoerenzeCu(r: DatiRaccolti): string[] {
  const out: string[] = [];
  r.cu.forEach((c, i) => {
    const n = r.cu.length > 1 ? ` (CU ${i + 1})` : '';
    if (c.reddito_lavoro === 0) out.push(`Reddito di lavoro a zero${n}: controlla i punti 1 e 2.`);
    if (c.ritenute_irpef > c.reddito_lavoro) out.push(`Ritenute più alte del reddito${n}: controlla il punto 21.`);
    if (c.reddito_lavoro > 0 && c.ritenute_irpef === 0) out.push(`CU senza ritenute IRPEF${n}: è giusto?`);
  });
  return out;
}

export async function quadroDichiarazione(anno: number): Promise<QuadroDichiarazione> {
  const [raccolti, dichiarazione, primaRedditi, righe, fatture, documenti] = await Promise.all([
    raccogliAnno(anno),
    leggiDichiarazione(anno),
    leggiDichiarazione(anno - 1),
    leggiChecklist(anno),
    leggiFatture(),
    leggiDocumenti().catch(() => []),
  ]);
  const partenza = primaRedditi?.tipo === '730' ? primaRedditi : null;
  const creditoPrima =
    primaRedditi?.tipo === 'redditi' && primaRedditi.credito_scelta === 'compensazione'
      ? creditoDisponibile({ credito: primaRedditi.credito, scelta: 'compensazione', stato: primaRedditi.credito_stato, usato: primaRedditi.credito_usato }).residuo
      : 0;

  let risultato: RisultatoAnno | null = null;
  let errore: string | null = null;
  let esito: Esito | null = null;
  if (anniConRegoleIrpef().includes(anno) && raccolti.cu.length > 0) {
    try {
      risultato = calcolaAnno(raccolti.input);
      esito = esitoDichiarazione(risultato, creditoPrima);
    } catch (e) {
      errore = e instanceof Error ? e.message : String(e);
    }
  }

  const fattureAnno = fatture.filter((f) => f.anno === anno && f.stato === 'emessa');
  const partitaIva = raccolti.annoInizio != null && anno >= raccolti.annoInizio;
  const c = checklist({
    anno,
    partitaIva,
    primoAnno: raccolti.annoInizio === anno,
    cu: { quante: raccolti.cu.length, incoerenze: incoerenzeCu(raccolti) },
    annoPartenza: partenza != null,
    aliquoteVerificate: raccolti.aliquote?.verificate === true,
    incassi: raccolti.cassa.incassato,
    spese: raccolti.registrati.spese.length + (raccolti.dati?.spese_professionali ?? 0),
    senzaGiustificativo: raccolti.spese?.senzaGiustificativo ?? 0,
    versamentiEnpap: (raccolti.input.versamentiPrevidenza ?? []).filter((v) => v.data.startsWith(`${anno}-`) && v.tipo !== 'integrativo').length,
    oneri: raccolti.registrati.oneri.length,
    impostazioniFamiliari: raccolti.impostazioniSpese != null,
    stsDaInviare: fattureAnno.filter((f) => f.stato_sts === 'da_inviare').length,
    cuInArchivio: documenti.some((d) => d.tipo === 'cu' && d.anno === anno && !d.eliminato_il),
    manuali: new Map(righe.map((r) => [r.chiave, r.stato])),
  });

  return { anno, raccolti, risultato, errore, esito, creditoAnnoPrima: creditoPrima, dichiarazione, checklist: c, righeChecklist: righe };
}

// ---------------------------------------------------------------------------
// Scadenze
// ---------------------------------------------------------------------------

export type ImportoStimato = { importo: number; voci: string; stima: boolean };

export type QuadroScadenze = {
  anno: number;
  oggi: string;
  voci: VoceCalendario[];
  importi: Map<string, ImportoStimato>;
  stati: ScadenzaUtente[];
  contesto: Contesto;
};

function contestoDa(fatture: Fattura[], annoInizio: number | null): Contesto {
  const emesse = fatture.filter((f) => f.stato === 'emessa' && f.tipo === 'fattura');
  return {
    partitaIvaDal: annoInizio,
    conIva: emesse.some((f) => f.iva > 0),
    // senza fatture si suppone il caso tipico dello psicologo: prestazioni esenti con bollo e Tessera Sanitaria
    conBollo: emesse.length === 0 || emesse.some((f) => f.bollo > 0),
    conSts: emesse.length === 0 || emesse.some((f) => f.stato_sts !== 'non_dovuto'),
  };
}

const bolloTrimestre = (fatture: Fattura[], anno: number, t: number) =>
  fatture
    .filter((f) => f.stato === 'emessa' && f.anno === anno && Math.floor((Number(f.data.slice(5, 7)) - 1) / 3) === t)
    .reduce((s, f) => s + f.bollo, 0);

/** Importi stimati dei versamenti (FR-012): redditi passati dal motore 001, anno in corso dalla previsione 006. */
async function importiStimati(anno: number, fatture: Fattura[]): Promise<Map<string, ImportoStimato>> {
  const out = new Map<string, ImportoStimato>();
  const rif = anno - 1;
  if (anniConRegoleIrpef().includes(rif)) {
    try {
      if (rif >= annoCorrente()) {
        const p = await quadroPrevisione(rif);
        const a = p.scenari?.atteso;
        if (a) {
          out.set('giugno', { importo: a.stima.giugno, voci: 'saldo, addizionali e primo acconto (previsione)', stima: true });
          out.set('novembre', { importo: a.stima.novembre, voci: 'secondo acconto (previsione)', stima: true });
          out.set('enpap', { importo: a.enpap.importo, voci: 'soggettivo, integrativo e maternità (previsione)', stima: true });
        }
      } else {
        const r = await raccogliAnno(rif);
        if (r.cu.length > 0) {
          const ris = calcolaAnno(r.input);
          const s = stimaVersamenti(ris, { metodo: 'storico', soggettoIsa: r.dati?.soggetto_isa ?? false });
          out.set('giugno', { importo: s.giugno, voci: 'saldo, addizionali e primo acconto', stima: ris.provvisorio });
          out.set('novembre', { importo: s.novembre, voci: 'secondo acconto', stima: ris.provvisorio });
          if (r.cassa.incassato > 0 || r.manuale) {
            const c = contributiEnpap(rif, { redditoProfessionale: r.input.redditoProfessionale, volumeAffari: r.cassa.compensi });
            out.set('enpap', { importo: c.soggettivo + c.integrativo + c.maternita, voci: 'soggettivo, integrativo e maternità', stima: c.provvisorio });
          }
        }
      }
    } catch {
      /* dati incompleti: nessun importo */
    }
  }
  out.set('bollo_t4', { importo: bolloTrimestre(fatture, anno - 1, 3), voci: 'bollo delle fatture di ottobre–dicembre', stima: false });
  for (const t of [0, 1, 2]) out.set(`bollo_t${t + 1}`, { importo: bolloTrimestre(fatture, anno, t), voci: 'bollo delle fatture del trimestre', stima: false });
  return out;
}

export async function quadroScadenze(anno: number): Promise<QuadroScadenze> {
  const oggi = oggiIso();
  const [fatture, profilo, stati] = await Promise.all([leggiFatture(), leggiProfilo(), leggiScadenzeUtente([anno])]);
  const contesto = contestoDa(fatture, profilo?.inizio_attivita ? Number(profilo.inizio_attivita.slice(0, 4)) : null);
  const importi = await importiStimati(anno, fatture);
  return { anno, oggi, voci: calendarioAnno(anno, oggi, contesto, stati), importi, stati, contesto };
}

/** Promemoria per la home: scadenze pertinenti di quest'anno e del prossimo entro l'anticipo. */
export async function scadenzeInArrivo(anticipo: number): Promise<VoceCalendario[]> {
  const oggi = oggiIso();
  const anno = Number(oggi.slice(0, 4));
  const [fatture, profilo, stati] = await Promise.all([leggiFatture(), leggiProfilo(), leggiScadenzeUtente([anno, anno + 1])]);
  const contesto = contestoDa(fatture, profilo?.inizio_attivita ? Number(profilo.inizio_attivita.slice(0, 4)) : null);
  const voci = [...calendarioAnno(anno, oggi, contesto, stati), ...calendarioAnno(anno + 1, oggi, contesto, stati)];
  return voci.filter((v) => v.pertinente && v.stato !== 'fatta' && v.giorni <= anticipo && (v.giorni >= 0 || v.giorni >= -60));
}
