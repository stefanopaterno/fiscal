import { imposteAnno } from '../accantonamento/incasso';
import { calcolaFattura } from '../fattura/calcola';
import { formattaEuro } from '../importi';
import { calcolaAnno, type AliquoteAddizionali, type InputAnno } from '../irpef/anno';
import { contributiEnpap } from '../irpef/enpap';
import { regolePerAnno } from '../regole';
import { regoleF24 } from '../regole/f24';
import { regoleIrpefPerAnno } from '../regole/irpef';
import { regoleScadenze } from '../regole/scadenze';
import { regoleSpesePerAnno } from '../regole/spese';
import type { Regola } from '../regole/tipi';
import { conRegistro, registroAttivo } from './attivi';
import { improntaModifica } from './leggi-file';
import type { EsitoVoce, FileAggiornamento, GruppoEsito, ParametroCatalogo, RigaRegistro } from './tipi';

/**
 * Anteprima e approvazione (specifica 014, research.md R-02, FR-014..FR-018). L'impatto in euro si calcola
 * ricalcolando l'anno con il registro attuale e con il registro più la voce (registro simulato): il motore non
 * cambia e il registro vero torna quello di prima anche se il calcolo fallisce.
 */

/** Addizionali dell'utente per anno (dai suoi dati; non sono nel programma). */
export type AddizionaliPerAnno = Record<number, AliquoteAddizionali | null | undefined>;

/** Valore in uso di un parametro (programma + registro attivo), o undefined se l'anno non ha regole. */
export function valoreInUso(
  p: ParametroCatalogo,
  contesto: { anno: number; data?: string },
  addizionali: AddizionaliPerAnno = {},
): Regola<unknown> | undefined {
  if (p.insieme === 'addizionali') {
    const a = addizionali[contesto.anno];
    if (!a) return undefined;
    const stato = a.verificate ? 'verificata' : 'da_verificare';
    const fonte = 'Aliquote inserite in Tasse → Dati dell\'anno';
    if (p.chiave === 'addizionali.regionale.scaglioni') return { valore: a.regionale, fonte, stato };
    if (p.chiave === 'addizionali.comunale.aliquota') return { valore: a.comunale.aliquota, fonte, stato };
    if (p.chiave === 'addizionali.comunale.soglia_esenzione') return a.comunale.soglia == null ? undefined : { valore: a.comunale.soglia, fonte, stato };
    return undefined;
  }
  try {
    const set: unknown =
      p.insieme === 'irpef'
        ? regoleIrpefPerAnno(contesto.anno)
        : p.insieme === 'fatturazione'
          ? regolePerAnno(contesto.anno, contesto.data)
          : p.insieme === 'spese'
            ? regoleSpesePerAnno(contesto.anno)
            : p.insieme === 'scadenze'
              ? regoleScadenze(contesto.anno)
              : regoleF24(contesto.anno, contesto.data);
    return p.leggi?.(set);
  } catch {
    return undefined;
  }
}

let simulate = 0;
/** Riga del registro che rappresenta la voce come se fosse approvata (unità delle regole). */
export function rigaSimulata(e: EsitoVoce, creato = '9999-12-31T00:00:00Z'): RigaRegistro {
  return {
    id: `simulata-${++simulate}`,
    azione: 'approvato',
    annulla_id: null,
    chiave: e.chiave,
    anno: e.anno ?? null,
    dal: e.dal ?? null,
    valore: e.dopo,
    fonte: e.fonte ?? null,
    stato: e.statoFinale ?? 'da_verificare',
    stato_norma: e.statoNorma ?? 'in_vigore',
    creato_il: creato,
  };
}

/** Addizionali con la voce applicata (le addizionali non passano dal registro ma dai dati dell'utente). */
function conAddizionale(a: AliquoteAddizionali | null, e: EsitoVoce): AliquoteAddizionali | null {
  const base: AliquoteAddizionali = a ?? { regionale: [{ finoA: null, aliquota: 0 }], comunale: { aliquota: 0, soglia: null }, verificate: false };
  if (e.chiave === 'addizionali.regionale.scaglioni') return { ...base, regionale: e.dopo as AliquoteAddizionali['regionale'] };
  if (e.chiave === 'addizionali.comunale.aliquota') return { ...base, comunale: { ...base.comunale, aliquota: e.dopo as number } };
  if (e.chiave === 'addizionali.comunale.soglia_esenzione') return { ...base, comunale: { ...base.comunale, soglia: e.dopo as number } };
  return base;
}

export type FonteDati = {
  /** Dati dell'anno pronti per il motore, calcolati con il registro attivo in quel momento (null se mancano). */
  inputAnno: (anno: number) => InputAnno | null;
  /** Compenso tipico di una fattura (centesimi) per l'impatto dei parametri di fatturazione. */
  fatturaTipo?: number;
};

/** Tasse e contributi dell'anno: IRPEF e addizionali dovute + ENPAP soggettivo e maternità. */
function caricoAnno(input: InputAnno): number {
  const r = calcolaAnno(input);
  let enpap = 0;
  try {
    enpap = contributiEnpap(input.anno, { redditoProfessionale: input.redditoProfessionale, volumeAffari: 0 }).deducibili;
  } catch {
    enpap = 0;
  }
  return imposteAnno(r) + enpap;
}

const dataIt = (mg: string) => `${mg.slice(3, 5)}/${mg.slice(0, 2)}`;

/** Impatto di ogni voce «cambia» (e «conferma» con valore diverso non c'è): euro o testo. */
export function calcolaImpatti(esiti: EsitoVoce[], fonte: FonteDati): EsitoVoce[] {
  const registro = registroAttivo();
  return esiti.map((e) => {
    if (e.gruppo !== 'cambia') return e;
    const anno = e.anno ?? Number(e.dal!.slice(0, 4));
    if (e.chiave.startsWith('scadenze.'))
      return { ...e, impatto: null, impattoTesto: `La scadenza passa dal ${e.prima ? dataIt(String(e.prima)) : '—'} al ${dataIt(String(e.dopo))}.` };
    if (e.chiave.startsWith('f24.'))
      return { ...e, impatto: null, impattoTesto: `Nell'F24 il codice passa da ${String(e.prima ?? '—')} a ${String(e.dopo)}.` };
    if (e.chiave.startsWith('fattura.')) {
      const compenso = fonte.fatturaTipo && fonte.fatturaTipo > 0 ? fonte.fatturaTipo : 100_00;
      try {
        const f = () =>
          calcolaFattura({
            anno,
            data: e.dal,
            righe: [{ compenso, natura: e.chiave === 'fattura.aliquota_iva' ? 'imponibile' : 'esente_sanitaria' }],
            sostitutoImposta: e.chiave === 'fattura.aliquota_ritenuta',
            bolloACarico: 'paziente',
          });
        const prima = f();
        const dopo = conRegistro([...registro, rigaSimulata(e)], f);
        const voci: [string, number, number][] = [
          ['contributo integrativo', prima.totaleIntegrativo, dopo.totaleIntegrativo],
          ['IVA', prima.iva, dopo.iva],
          ['bollo', prima.bollo, dopo.bollo],
          ['ritenuta', prima.ritenuta, dopo.ritenuta],
          ['totale', prima.totale, dopo.totale],
          ['a te restano', prima.netto, dopo.netto],
        ];
        const cambiate = voci.filter(([, a, b]) => a !== b).map(([n, a, b]) => `${n} da ${formattaEuro(a)} a ${formattaEuro(b)}`);
        return {
          ...e,
          impatto: null,
          impattoTesto: cambiate.length
            ? `Su una fattura da ${formattaEuro(compenso)}: ${cambiate.join('; ')}.`
            : `Su una fattura da ${formattaEuro(compenso)} non cambia nulla.`,
        };
      } catch {
        return { ...e, impatto: null, impattoTesto: 'Impatto non calcolabile per questo anno.' };
      }
    }
    try {
      const prima = fonte.inputAnno(anno);
      if (!prima) return { ...e, impatto: null, impattoTesto: 'Mancano i dati dell\'anno per calcolare l\'impatto (CU o fatture).' };
      const carico = (input: InputAnno) => caricoAnno(input);
      const conVoce = (): number => {
        const input = fonte.inputAnno(anno);
        if (!input) throw new Error('dati mancanti');
        return carico(e.chiave.startsWith('addizionali.') ? { ...input, addizionali: conAddizionale(input.addizionali, e) } : input);
      };
      const valorePrima = carico(prima);
      const valoreDopo = e.chiave.startsWith('addizionali.') ? conVoce() : conRegistro([...registro, rigaSimulata(e)], conVoce);
      return { ...e, impatto: valoreDopo - valorePrima };
    } catch {
      return { ...e, impatto: null, impattoTesto: 'Impatto non calcolabile: il programma non ha ancora tutte le regole di questo anno.' };
    }
  });
}

// ---------------------------------------------------------------------------------------------------------
// Approvazione
// ---------------------------------------------------------------------------------------------------------

export type RigaDaApprovare = {
  id: string;
  chiave: string;
  anno: number | null;
  dal: string | null;
  valore: unknown;
  valore_precedente: unknown;
  fonte: EsitoVoce['fonte'];
  stato: 'verificata' | 'da_verificare';
  stato_norma: string;
  spiegazione: string | null;
};

export type AddizionaliDaScrivere = {
  anno: number;
  regionale_scaglioni?: { fino_a: number | null; aliquota: number }[];
  comunale_aliquota?: number;
  comunale_soglia_esenzione?: number;
  verificate?: boolean;
};

export type Approvazione = {
  importazione: {
    id: string;
    data_ricerca: string;
    versione_schema: 1;
    anni: number[];
    conteggi: Record<GruppoEsito | 'rifiutata', number>;
    modifiche_programma: { titolo: string; descrizione: string; dal?: string; fonte: EsitoVoce['fonte']; impronta: string; stato: 'aperta' }[];
  };
  righe: RigaDaApprovare[];
  addizionali: AddizionaliDaScrivere[];
};

/** Nelle addizionali si salva il formato della tabella dei dati (`fino_a`), così l'annullamento lo ripristina. */
const perTabella = (chiave: string, v: unknown): unknown =>
  chiave === 'addizionali.regionale.scaglioni' && Array.isArray(v)
    ? (v as { finoA: number | null; aliquota: number }[]).map((s) => ({ fino_a: s.finoA, aliquota: s.aliquota }))
    : v;

/** Righe, conteggi e addizionali da salvare per le voci scelte (FR-016, FR-018). */
export function preparaApprovazione(
  file: FileAggiornamento,
  esiti: EsitoVoce[],
  scelte: Set<number>,
  nuovoId: () => string,
): Approvazione {
  const approvabili = esiti.filter((e) => e.gruppo === 'cambia' || e.gruppo === 'conferma');
  const scelti = approvabili.filter((e) => scelte.has(e.indice));
  const conteggi: Approvazione['importazione']['conteggi'] = { cambia: 0, conferma: 0, scartata: 0, bloccata: 0, programma: 0, rifiutata: 0 };
  for (const e of esiti) {
    if ((e.gruppo === 'cambia' || e.gruppo === 'conferma') && !scelte.has(e.indice)) conteggi.rifiutata++;
    else conteggi[e.gruppo]++;
  }
  conteggi.programma = file.modifiche_programma.length;

  const righe: RigaDaApprovare[] = scelti.map((e) => ({
    id: nuovoId(),
    chiave: e.chiave,
    anno: e.anno ?? null,
    dal: e.dal ?? null,
    valore: perTabella(e.chiave, e.dopo),
    valore_precedente: e.prima === undefined ? null : perTabella(e.chiave, e.prima),
    fonte: e.fonte,
    stato: e.statoFinale ?? 'da_verificare',
    stato_norma: e.statoNorma ?? 'in_vigore',
    spiegazione: e.nota ?? null,
  }));

  const perAnno = new Map<number, AddizionaliDaScrivere>();
  const tutteVerificate = new Map<number, boolean>();
  for (const e of scelti.filter((x) => x.chiave.startsWith('addizionali.'))) {
    const anno = e.anno!;
    const a = perAnno.get(anno) ?? { anno };
    if (e.chiave === 'addizionali.regionale.scaglioni') a.regionale_scaglioni = perTabella(e.chiave, e.dopo) as AddizionaliDaScrivere['regionale_scaglioni'];
    if (e.chiave === 'addizionali.comunale.aliquota') a.comunale_aliquota = e.dopo as number;
    if (e.chiave === 'addizionali.comunale.soglia_esenzione') a.comunale_soglia_esenzione = e.dopo as number;
    perAnno.set(anno, a);
    tutteVerificate.set(anno, (tutteVerificate.get(anno) ?? true) && e.statoFinale === 'verificata');
  }
  const addizionali = [...perAnno.values()].map((a) => (tutteVerificate.get(a.anno) ? { ...a, verificate: true } : a));

  return {
    importazione: {
      id: nuovoId(),
      data_ricerca: file.data_ricerca,
      versione_schema: 1,
      anni: file.anni,
      conteggi,
      modifiche_programma: file.modifiche_programma.map((m) => ({ ...m, impronta: improntaModifica(m), stato: 'aperta' as const })),
    },
    righe,
    addizionali,
  };
}
