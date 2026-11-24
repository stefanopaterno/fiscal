import { diciottoAnni, eta, type Nascita } from './paziente';

/**
 * Stato del consenso informato di un paziente (specifica 005, FR-004, FR-005, FR-007, SC-002).
 * Regole (da verificare con l'Ordine: l'app registra, non stabilisce cosa sia dovuto):
 * - un consenso vale fino a revoca o fino a quando cambia la versione del testo (nessuna scadenza);
 * - paziente minorenne alla firma: completo con la firma di ENTRAMBI i genitori oppure di un rappresentante
 *   legale unico (genitore unico esercente la responsabilità, tutore, amministratore di sostegno…);
 * - paziente maggiorenne alla firma: completo con la sua firma o con quella del rappresentante legale; la sola
 *   firma di un genitore non basta;
 * - chi ha firmato da minorenne e poi compie 18 anni deve dare un nuovo consenso.
 */
export type RuoloFirmatario = 'paziente' | 'genitore' | 'rappresentante_legale';
export type StatoConsenso = 'mancante' | 'incompleto' | 'revocato' | 'da_rinnovare' | 'presente';

export type ConsensoPerStato = {
  id: string;
  tipo_consenso_id: string;
  versione_testo: string;
  data_firma: string;
  revocato_il: string | null;
  firmatari: { ruolo: RuoloFirmatario }[];
};

export type VersioneInVigore = { tipo_consenso_id: string; versione_testo: string; in_vigore_dal: string };

export type EsitoTipo = { tipo_consenso_id: string; stato: Exclude<StatoConsenso, 'mancante'>; motivo: string; consenso: ConsensoPerStato };
export type EsitoPaziente = {
  stato: StatoConsenso;
  motivo: string;
  perTipo: EsitoTipo[];
  /** Il paziente compie 18 anni entro 60 giorni (promemoria). */
  diciottoVicini: string | null;
  /** Firmato da più di 12 mesi: promemoria facoltativo per rivederlo (non cambia lo stato). */
  daRivedere: boolean;
};

const GRAVITA: Record<StatoConsenso, number> = { mancante: 5, revocato: 4, incompleto: 3, da_rinnovare: 2, presente: 1 };

/** Completezza delle firme di un consenso (alla data della firma). */
export function completezza(c: Pick<ConsensoPerStato, 'firmatari' | 'data_firma'>, nascita: Nascita | null): { completo: boolean; motivo: string } {
  const quanti = (r: RuoloFirmatario) => c.firmatari.filter((f) => f.ruolo === r).length;
  if (quanti('rappresentante_legale') > 0) return { completo: true, motivo: 'Firmato dal rappresentante legale.' };
  const minore = nascita ? eta(nascita, c.data_firma) < 18 : false;
  if (minore) {
    if (quanti('genitore') >= 2) return { completo: true, motivo: 'Firmato da entrambi i genitori.' };
    if (quanti('genitore') === 1)
      return { completo: false, motivo: 'Manca la firma del secondo genitore (o indica il rappresentante legale unico).' };
    return { completo: false, motivo: 'Paziente minorenne: firmano entrambi i genitori o il rappresentante legale.' };
  }
  if (quanti('paziente') > 0) return { completo: true, motivo: 'Firmato dal paziente.' };
  if (quanti('genitore') > 0) return { completo: false, motivo: 'Paziente maggiorenne: deve firmare la persona stessa o il rappresentante legale.' };
  return { completo: false, motivo: 'Nessun firmatario registrato.' };
}

/** Il giorno dopo `data` aggiungendo n giorni (UTC, solo date). */
const piuGiorni = (data: string, n: number) => {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function statoPaziente(input: {
  consensi: ConsensoPerStato[];
  nascita: Nascita | null;
  versioni: VersioneInVigore[];
  oggi: string;
}): EsitoPaziente {
  const { nascita, oggi } = input;
  const diciotto = nascita ? diciottoAnni(nascita) : null;
  const diciottoVicini = diciotto && diciotto > oggi && diciotto <= piuGiorni(oggi, 60) ? diciotto : null;

  // per ogni tipo vale l'ultimo consenso firmato (gli altri restano nello storico)
  const ultimi = new Map<string, ConsensoPerStato>();
  for (const c of [...input.consensi].sort((a, b) => a.data_firma.localeCompare(b.data_firma) || a.id.localeCompare(b.id)))
    ultimi.set(c.tipo_consenso_id, c);

  const perTipo: EsitoTipo[] = [...ultimi.values()].map((c) => {
    if (c.revocato_il && c.revocato_il <= oggi)
      return { tipo_consenso_id: c.tipo_consenso_id, stato: 'revocato', motivo: `Revocato il ${c.revocato_il.split('-').reverse().join('/')}.`, consenso: c };
    const firme = completezza(c, nascita);
    if (!firme.completo) return { tipo_consenso_id: c.tipo_consenso_id, stato: 'incompleto', motivo: firme.motivo, consenso: c };
    if (nascita && eta(nascita, c.data_firma) < 18 && eta(nascita, oggi) >= 18)
      return { tipo_consenso_id: c.tipo_consenso_id, stato: 'da_rinnovare', motivo: 'Ha compiuto 18 anni: serve un nuovo consenso firmato dalla persona stessa.', consenso: c };
    const nuova = input.versioni
      .filter((v) => v.tipo_consenso_id === c.tipo_consenso_id && v.in_vigore_dal <= oggi && v.in_vigore_dal > c.data_firma && v.versione_testo !== c.versione_testo)
      .sort((a, b) => b.in_vigore_dal.localeCompare(a.in_vigore_dal))[0];
    if (nuova)
      return { tipo_consenso_id: c.tipo_consenso_id, stato: 'da_rinnovare', motivo: `È in vigore la versione ${nuova.versione_testo} del testo (firmata la ${c.versione_testo}).`, consenso: c };
    return { tipo_consenso_id: c.tipo_consenso_id, stato: 'presente', motivo: firme.motivo, consenso: c };
  });

  if (!perTipo.length) return { stato: 'mancante', motivo: 'Nessun consenso registrato.', perTipo, diciottoVicini, daRivedere: false };
  const peggiore = perTipo.reduce((a, b) => (GRAVITA[b.stato] > GRAVITA[a.stato] ? b : a));
  const daRivedere = perTipo.some((t) => t.stato === 'presente' && t.consenso.data_firma <= piuGiorni(oggi, -365));
  return { stato: peggiore.stato, motivo: peggiore.motivo, perTipo, diciottoVicini, daRivedere };
}

export const ETICHETTE_STATO: Record<StatoConsenso, string> = {
  mancante: 'Consenso mancante',
  incompleto: 'Incompleto',
  revocato: 'Revocato',
  da_rinnovare: 'Da rinnovare',
  presente: 'Presente',
};

/** Stati che richiedono un'azione (promemoria, avviso in fattura). */
export const daSistemare = (s: StatoConsenso) => s !== 'presente';
