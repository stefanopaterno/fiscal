import { getSupabase } from '@/lib/supabase/client';
import { accodaEInvia, getCoda } from '@/features/offline-queue/istanza';

/**
 * Accesso ai dati della fatturazione (specifica 003, data-model.md).
 * - Le letture vanno al database (soggette alla RLS: proprietario e aal2).
 * - Gli inserimenti e le modifiche passano dalla coda senza rete (idempotenti, con controllo di versione).
 * - Emissione, nota di credito e invio STS sono funzioni del database e richiedono la rete.
 * I nomi dei campi sono quelli delle colonne (snake_case) per evitare conversioni.
 */
export type Metadati = { id: string; versione: number };

export type Profilo = Metadati & {
  nome: string | null;
  cognome: string | null;
  codice_fiscale: string | null;
  partita_iva: string | null;
  inizio_attivita: string | null;
  regime_fiscale: 'ordinario';
  indirizzo: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  pec: string | null;
  codice_destinatario: string | null;
  iban: string | null;
  albo_ordine: string | null;
  albo_numero: string | null;
  enpap_matricola: string | null;
  bollo_a_carico: 'paziente' | 'professionista';
  gia_incassata_predefinita: boolean;
  soglia_attenzione_imponibile: number;
};

export type NaturaIva = 'esente_sanitaria' | 'imponibile';

export type Attivita = Metadati & {
  nome: string;
  codice_ateco: string | null;
  natura_iva: NaturaIva;
  previdenza: 'enpap' | 'gestione_separata' | 'da_verificare';
  predefinita: boolean;
};

export type Cliente = Metadati & {
  tipo: 'persona_fisica' | 'ente';
  nome: string | null;
  cognome: string | null;
  denominazione: string | null;
  codice_fiscale: string | null;
  partita_iva: string | null;
  indirizzo: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  nazione: string;
  pec: string | null;
  codice_destinatario: string | null;
  sostituto_imposta: boolean;
  opposizione_sts: boolean;
  pagato_da: string | null;
};

export type StatoFattura = 'bozza' | 'emessa' | 'annullata';
export type StatoSts = 'non_dovuto' | 'da_inviare' | 'inviata';

export type Fattura = Metadati & {
  tipo: 'fattura' | 'nota_credito';
  stato: StatoFattura;
  data: string;
  anno: number;
  numero: number | null;
  cliente_id: string;
  attivita_id: string;
  fattura_rif_id: string | null;
  fotografia: Record<string, unknown>;
  totale_compensi: number;
  totale_integrativo: number;
  imponibile_iva: number;
  iva: number;
  importo_esente: number;
  bollo: number;
  bollo_addebitato: boolean;
  ritenuta: number;
  totale: number;
  netto: number;
  dicitura: string | null;
  stato_sts: StatoSts;
  creato_il: string;
};

export type RigaFattura = Metadati & {
  fattura_id: string;
  posizione: number;
  descrizione: string;
  quantita: number;
  compenso: number;
  natura: NaturaIva;
  integrativo: number;
  iva: number;
};

export type ModalitaIncasso = 'contanti' | 'carta_pos' | 'bonifico' | 'altro';

export type Incasso = Metadati & {
  fattura_id: string;
  data: string;
  importo: number;
  modalita: ModalitaIncasso;
  tracciabile: boolean;
};

/** Errore con il codice del database (es. "data_anteriore_inizio") e la spiegazione in italiano. */
export class ErroreFatturazione extends Error {
  constructor(
    readonly codice: string,
    readonly dettaglio?: string,
  ) {
    super(dettaglio || codice);
  }
}

function controlla<T>(r: { data: T; error: { message: string; details?: string | null } | null }): T {
  if (r.error) throw new ErroreFatturazione(r.error.message, r.error.details ?? undefined);
  return r.data;
}

const METADATI = ['id', 'owner_id', 'versione', 'creato_il', 'aggiornato_il'];
/** Colonne calcolate dal database, da non inviare (nelle fatture `anno` deriva dalla data). */
const CALCOLATE: Record<string, string[]> = { fatture: ['anno'] };
function soloDati(tabella: string, riga: Record<string, unknown>): Record<string, unknown> {
  const escluse = [...METADATI, ...(CALCOLATE[tabella] ?? [])];
  return Object.fromEntries(Object.entries(riga).filter(([k]) => !escluse.includes(k)));
}

/**
 * Salva una riga dalla coda: nuova se `versione` è 0, altrimenti modifica sulla versione vista.
 * Restituisce la versione da usare per la modifica successiva: se la voce è ancora in coda (senza rete)
 * la versione non cambia, così una seconda modifica sostituisce la prima invece di andare in conflitto.
 * `inviata` dice se il database ha già confermato.
 */
export async function salva(
  tabella: string,
  riga: Metadati & Record<string, unknown>,
): Promise<{ versione: number; inviata: boolean }> {
  await accodaEInvia({
    id: riga.id,
    tabella,
    operazione: riga.versione === 0 ? 'inserisci' : 'modifica',
    versioneBase: riga.versione === 0 ? undefined : riga.versione,
    payload: soloDati(tabella, riga),
  });
  const inCoda = (await getCoda().elenco()).some((v) => v.id === riga.id);
  return inCoda
    ? { versione: riga.versione, inviata: false }
    : { versione: riga.versione + 1, inviata: true };
}

export const nuovoId = () => crypto.randomUUID();

// --- Letture -------------------------------------------------------------

export async function leggiProfilo(): Promise<Profilo | null> {
  return controlla(
    await getSupabase().from('profilo_professionale').select('*').maybeSingle(),
  ) as Profilo | null;
}

export async function leggiAttivita(): Promise<Attivita[]> {
  return controlla(
    await getSupabase().from('attivita').select('*').order('predefinita', { ascending: false }).order('nome'),
  ) as Attivita[];
}

export async function leggiClienti(): Promise<Cliente[]> {
  return controlla(
    await getSupabase().from('clienti').select('*').order('cognome').order('nome').order('denominazione'),
  ) as Cliente[];
}

export async function leggiCliente(id: string): Promise<Cliente | null> {
  return controlla(
    await getSupabase().from('clienti').select('*').eq('id', id).maybeSingle(),
  ) as Cliente | null;
}

export async function leggiFatture(anno?: number): Promise<Fattura[]> {
  let q = getSupabase().from('fatture').select('*');
  if (anno) q = q.eq('anno', anno);
  return controlla(
    await q.order('anno', { ascending: false }).order('numero', { ascending: false, nullsFirst: true }),
  ) as Fattura[];
}

export async function leggiFattura(
  id: string,
): Promise<{ fattura: Fattura; righe: RigaFattura[]; incassi: Incasso[] } | null> {
  const sb = getSupabase();
  const fattura = controlla(
    await sb.from('fatture').select('*').eq('id', id).maybeSingle(),
  ) as Fattura | null;
  if (!fattura) return null;
  const [righe, incassi] = await Promise.all([
    sb.from('righe_fattura').select('*').eq('fattura_id', id).order('posizione'),
    sb.from('incassi').select('*').eq('fattura_id', id).order('data'),
  ]);
  return { fattura, righe: controlla(righe) as RigaFattura[], incassi: controlla(incassi) as Incasso[] };
}

export async function leggiIncassiAnno(anno: number): Promise<Incasso[]> {
  return controlla(
    await getSupabase().from('incassi').select('*').gte('data', `${anno}-01-01`).lte('data', `${anno}-12-31`),
  ) as Incasso[];
}

// --- Funzioni del database (richiedono la rete) ---------------------------

export async function emettiFattura(id: string): Promise<{ anno: number; numero: number }> {
  const r = controlla(await getSupabase().rpc('emetti_fattura', { p_id: id })) as {
    anno: number;
    numero: number;
  }[];
  return r[0]!;
}

export async function creaNotaDiCredito(
  fattura: string,
  data: string,
): Promise<{ id: string; anno: number; numero: number }> {
  const id = nuovoId();
  const r = controlla(
    await getSupabase().rpc('crea_nota_di_credito', { p_fattura: fattura, p_id_nota: id, p_data: data }),
  ) as { anno: number; numero: number }[];
  return { id, ...r[0]! };
}

export async function segnaStsInviate(ids: string[]): Promise<number> {
  return controlla(await getSupabase().rpc('segna_sts_inviate', { p_ids: ids })) as number;
}

/** Messaggi in parole semplici per gli errori del database. */
export function spiegaErrore(e: unknown): string {
  if (e instanceof ErroreFatturazione) {
    const noti: Record<string, string> = {
      configurazione_incompleta: 'Prima completa la configurazione della partita IVA in Impostazioni.',
      data_anteriore_inizio: "La data della fattura è precedente all'inizio dell'attività.",
      data_anteriore_ultima:
        "La data è precedente all'ultima fattura emessa: i numeri devono seguire l'ordine delle date.",
      fattura_vuota: 'Aggiungi almeno una prestazione.',
      totali_incoerenti: 'I totali non tornano con le righe: ricarica la pagina e riprova.',
      non_bozza: 'Questa fattura è già stata emessa.',
      non_emessa: 'Questa operazione si fa solo su una fattura emessa.',
      oltre_il_netto: "L'importo supera quanto resta da incassare.",
      fattura_immutabile: 'Una fattura emessa non si può modificare: si corregge con una nota di credito.',
      non_in_prova: 'Sei in produzione: le fatture emesse non si cancellano più.',
      conferma_mancante: 'Scrivi PRODUZIONE in maiuscolo per confermare.',
      verifica_recente: 'Per sicurezza inserisci di nuovo password e codice, poi riprova.',
    };
    return noti[e.codice] ?? e.dettaglio ?? e.message;
  }
  return 'Qualcosa non ha funzionato. Controlla la connessione e riprova.';
}

// --- Bozze (chiamate dirette: servono la rete come l'emissione) -----------

export type BozzaDaSalvare = Omit<
  Fattura,
  'versione' | 'anno' | 'numero' | 'stato' | 'stato_sts' | 'creato_il'
>;
export type RigaDaSalvare = Omit<RigaFattura, 'versione' | 'fattura_id'>;

/** Salva (o sostituisce) una bozza con le sue righe. Le fatture emesse sono protette dal database. */
export async function salvaBozza(fattura: BozzaDaSalvare, righe: RigaDaSalvare[]): Promise<void> {
  const sb = getSupabase();
  controlla(await sb.from('fatture').upsert({ ...fattura, stato: 'bozza' }, { onConflict: 'id' }));
  controlla(await sb.from('righe_fattura').delete().eq('fattura_id', fattura.id));
  if (righe.length > 0)
    controlla(await sb.from('righe_fattura').insert(righe.map((r) => ({ ...r, fattura_id: fattura.id }))));
}

export async function eliminaBozza(id: string): Promise<void> {
  controlla(await getSupabase().from('fatture').delete().eq('id', id).eq('stato', 'bozza'));
}

/** Incasso (anche parziale). Diretto, così un rifiuto del database (oltre il netto) si vede subito. */
export async function registraIncasso(incasso: Omit<Incasso, 'versione'>): Promise<void> {
  controlla(await getSupabase().from('incassi').insert(incasso));
}

export async function eliminaIncasso(id: string): Promise<void> {
  controlla(await getSupabase().from('incassi').delete().eq('id', id));
}

export type RiepilogoIva = { anno: number; imponibile_iva: number; iva: number; importo_esente: number };

/** Imponibili ed esenti delle fatture emesse nell'anno, note di credito sottratte (vista riepilogo_iva). */
export async function leggiRiepilogoIva(anno: number): Promise<RiepilogoIva | null> {
  return controlla(
    await getSupabase()
      .from('riepilogo_iva')
      .select('anno, imponibile_iva, iva, importo_esente')
      .eq('anno', anno)
      .maybeSingle(),
  ) as RiepilogoIva | null;
}

/** Tutti gli incassi (per gli adempimenti: data e tracciabilità del pagamento). */
export async function leggiIncassi(): Promise<Incasso[]> {
  return controlla(await getSupabase().from('incassi').select('*').order('data')) as Incasso[];
}

export async function leggiRighe(fatturaIds: string[]): Promise<RigaFattura[]> {
  if (fatturaIds.length === 0) return [];
  return controlla(
    await getSupabase().from('righe_fattura').select('*').in('fattura_id', fatturaIds).order('posizione'),
  ) as RigaFattura[];
}

// --- Modalità prova (FR-027..FR-030) ----------------------------------------

export type Modalita = { in_prova: boolean; produzione_dal: string | null };

export async function leggiModalita(): Promise<Modalita> {
  const r = controlla(
    await getSupabase().from('user_security').select('in_prova, produzione_dal').maybeSingle(),
  ) as Modalita | null;
  // senza la riga, per prudenza si considera produzione (come il database)
  return r ?? { in_prova: false, produzione_dal: null };
}

/** Solo in prova: cancella una fattura emessa con i suoi incassi e le note di credito collegate. */
export async function eliminaFatturaProva(id: string): Promise<void> {
  controlla(await getSupabase().rpc('elimina_fattura_prova', { p_id: id }));
}

export async function cancellaDatiProva(
  anagrafiche: boolean,
): Promise<{ fatture: number; incassi: number; anagrafiche: number }> {
  const r = controlla(await getSupabase().rpc('cancella_dati_prova', { p_anagrafiche: anagrafiche })) as {
    fatture: number;
    incassi: number;
    anagrafiche: number;
  }[];
  return r[0] ?? { fatture: 0, incassi: 0, anagrafiche: 0 };
}

/** Irreversibile: cancella le prove e passa alla produzione. Serve la verifica recente. */
export async function passaAProduzione(conferma: string, tieniAnagrafiche: boolean): Promise<void> {
  controlla(
    await getSupabase().rpc('passa_a_produzione', {
      p_conferma: conferma,
      p_tieni_anagrafiche: tieniAnagrafiche,
    }),
  );
}
