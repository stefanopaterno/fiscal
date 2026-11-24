import type { BeneInput } from '@/engine/spese/ammortamento';
import type { ModalitaPagamento, SpesaInput } from '@/engine/spese/deducibilita';
import type { OnereInput } from '@/engine/spese/oneri';
import { ErroreFatturazione, type Metadati } from '@/features/fatturazione/dati';
import { getSupabase } from '@/lib/supabase/client';

export { nuovoId, salva, spiegaErrore } from '@/features/fatturazione/dati';

/**
 * Dati della specifica 008 (data-model.md). Letture dal database (RLS proprietario + aal2), salvataggi
 * dalla coda senza rete; giustificativi nel bucket privato `giustificativi/<owner_id>/<id>`.
 */
export type Spesa = Metadati & {
  data: string;
  importo: number;
  iva_detraibile: number;
  fornitore: string | null;
  descrizione: string | null;
  categoria: string;
  percentuale: number | null;
  motivazione: string | null;
  modalita: ModalitaPagamento;
  ha_giustificativo: boolean;
  rimborsata: boolean;
  bene_id: string | null;
};

export type Bene = Metadati & {
  descrizione: string;
  categoria: string;
  costo: number;
  data_acquisto: string;
  coefficiente: number | null;
  motivazione: string | null;
  data_dismissione: string | null;
  valore_cessione: number | null;
};

export type OnerePersonale = Metadati & {
  data: string;
  importo: number;
  voce: string;
  modalita: ModalitaPagamento;
  ha_giustificativo: boolean;
};

export type ImpostazioniSpese = Metadati & {
  categorie_attive: string[];
  figli_a_carico: number;
  accantonamento_coperto: boolean;
  margine_ufficio: number;
  rapporto_ufficio: number;
};

function controlla<T>(r: { data: T; error: { message: string; details?: string | null } | null }): T {
  if (r.error) throw new ErroreFatturazione(r.error.message, r.error.details ?? undefined);
  return r.data;
}

export const IMPOSTAZIONI_PREDEFINITE = (id: string): ImpostazioniSpese => ({
  id,
  versione: 0,
  categorie_attive: [],
  figli_a_carico: 0,
  accantonamento_coperto: false,
  margine_ufficio: 0.2,
  rapporto_ufficio: 0.15,
});

export async function leggiSpese(anno?: number): Promise<Spesa[]> {
  let q = getSupabase().from('spese').select('*');
  if (anno) q = q.gte('data', `${anno}-01-01`).lte('data', `${anno}-12-31`);
  return controlla(await q.order('data', { ascending: false })) as Spesa[];
}

export async function leggiSpesa(id: string): Promise<Spesa | null> {
  return controlla(await getSupabase().from('spese').select('*').eq('id', id).maybeSingle()) as Spesa | null;
}

export async function leggiBeni(): Promise<Bene[]> {
  return controlla(
    await getSupabase().from('beni').select('*').order('data_acquisto', { ascending: false }),
  ) as Bene[];
}

export async function leggiOneri(anno?: number): Promise<OnerePersonale[]> {
  let q = getSupabase().from('oneri_personali').select('*');
  if (anno) q = q.gte('data', `${anno}-01-01`).lte('data', `${anno}-12-31`);
  return controlla(await q.order('data', { ascending: false })) as OnerePersonale[];
}

export async function leggiImpostazioniSpese(): Promise<ImpostazioniSpese | null> {
  const r = controlla(
    await getSupabase().from('impostazioni_spese').select('*').maybeSingle(),
  ) as ImpostazioniSpese | null;
  return r
    ? { ...r, margine_ufficio: Number(r.margine_ufficio), rapporto_ufficio: Number(r.rapporto_ufficio) }
    : null;
}

export async function elimina(tabella: 'spese' | 'beni' | 'oneri_personali', id: string): Promise<void> {
  controlla(await getSupabase().from(tabella).delete().eq('id', id));
}

// --- Giustificativi --------------------------------------------------------

async function cartella(): Promise<string> {
  const { data } = await getSupabase().auth.getUser();
  if (!data.user) throw new ErroreFatturazione('non_autenticato', 'Accedi di nuovo.');
  return data.user.id;
}

/** Carica il file del giustificativo (sostituisce l'eventuale precedente). */
export async function caricaGiustificativo(id: string, file: File): Promise<void> {
  const percorso = `${await cartella()}/${id}`;
  const { error } = await getSupabase()
    .storage.from('giustificativi')
    .upload(percorso, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });
  if (error)
    throw new ErroreFatturazione(
      'caricamento',
      'Non riesco a caricare il file. Controlla la connessione e riprova.',
    );
}

/** Il file del giustificativo, per il pacchetto del commercialista (specifica 009, T007). */
export async function scaricaGiustificativo(id: string): Promise<{ dati: Uint8Array; tipo: string }> {
  const { data, error } = await getSupabase().storage.from('giustificativi').download(`${await cartella()}/${id}`);
  if (error || !data) throw new ErroreFatturazione('scaricamento', 'Giustificativo non trovato.');
  return { dati: new Uint8Array(await data.arrayBuffer()), tipo: data.type };
}

/** Link temporaneo (5 minuti) per aprire il giustificativo. */
export async function apriGiustificativo(id: string): Promise<string | null> {
  const { data } = await getSupabase()
    .storage.from('giustificativi')
    .createSignedUrl(`${await cartella()}/${id}`, 300);
  return data?.signedUrl ?? null;
}

// --- Conversione per il motore ----------------------------------------------

export const spesaPerMotore = (s: Spesa): SpesaInput => ({
  data: s.data,
  categoria: s.categoria,
  importo: s.importo,
  ivaDetraibile: s.iva_detraibile,
  percentuale: s.percentuale == null ? null : Number(s.percentuale),
  modalita: s.modalita,
  rimborsata: s.rimborsata,
  haGiustificativo: s.ha_giustificativo,
  beneDurevole: s.bene_id != null,
});

export const benePerMotore = (b: Bene): BeneInput => ({
  costo: b.costo,
  dataAcquisto: b.data_acquisto,
  categoria: b.categoria,
  coefficiente: b.coefficiente == null ? null : Number(b.coefficiente),
  dataDismissione: b.data_dismissione,
});

export const onerePerMotore = (o: OnerePersonale): OnereInput => ({
  voce: o.voce,
  importo: o.importo,
  data: o.data,
  modalita: o.modalita,
});
