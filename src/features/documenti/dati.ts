import { chiaveFattura, riconosciFileFattura, sembraP7m } from '@/engine/documenti/fatture';
import { estensioneDi, nomeFileSicuro } from '@/engine/documenti/nomi';
import { estraiXmlDaP7m } from '@/engine/documenti/p7m';
import { leggiZip } from '@/engine/documenti/zip';
import type { TipoDocumento } from '@/engine/regole/documenti';
import { leggiFatturaRicevuta, type DatiFatturaRicevuta } from '@/engine/spese/fattura-ricevuta';
import { ErroreFatturazione, nuovoId, type Metadati } from '@/features/fatturazione/dati';
import { getSupabase } from '@/lib/supabase/client';
import { oggiIso } from '@/lib/oggi';

/**
 * Dati dell'archivio documenti (specifica 010, data-model.md). Tutto online: i file vanno nel bucket privato
 * `documenti` (<owner_id>/<id>/<versione>-<nome>), le righe nelle tabelle con RLS. Nomi dei file generati
 * dall'app, impronta SHA-256 per i doppioni, foto ridotte salvo richiesta contraria.
 */
export type DatiFattura = {
  fornitore: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;
  numero: string | null;
  data: string | null;
  totale: number | null;
  iva: number;
  descrizione: string | null;
};

export type Documento = Metadati & {
  tipo: TipoDocumento;
  stato: 'da_classificare' | 'archiviato';
  anno: number;
  data: string | null;
  emittente: string | null;
  importo: number | null;
  descrizione: string | null;
  scadenza: string | null;
  file_percorso: string;
  file_nome: string;
  file_tipo: string;
  file_dimensione: number;
  file_impronta: string;
  versione_file: number;
  fattura: DatiFattura | null;
  non_spesa: boolean;
  eliminato_il: string | null;
  creato_il: string;
};

export type VoceCollegata =
  'fattura' | 'spesa' | 'onere' | 'versamento_previdenza' | 'versamento_imposta' | 'bene';
export type Collegamento = { id: string; documento_id: string; voce: VoceCollegata; voce_id: string };
export type Versione = { id: string; versione_file: number; file_percorso: string; sostituito_il: string };

const GIORNI_CESTINO = 30;
const sb = () => getSupabase();

function controlla<T>(r: {
  data: T;
  error: { message: string; code?: string; details?: string | null } | null;
}): T {
  if (r.error)
    throw new ErroreFatturazione(
      r.error.code === '23505' ? 'doppione' : r.error.message,
      r.error.details ?? undefined,
    );
  return r.data;
}

async function proprietario(): Promise<string> {
  const { data } = await sb().auth.getUser();
  if (!data.user) throw new ErroreFatturazione('non_autenticato', 'Accedi di nuovo.');
  return data.user.id;
}

async function evento(documento_id: string, azione: string) {
  await sb().from('eventi_documenti').insert({ id: nuovoId(), documento_id, azione });
}

export async function impronta(byte: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', byte as BufferSource);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Foto ridotta a 2000 px sul lato lungo, JPEG 0,85 (testo leggibile). Altri file invariati. */
export async function riduciFoto(
  file: File,
): Promise<{ byte: Uint8Array; tipo: string; estensione: string }> {
  const originale = {
    byte: new Uint8Array(await file.arrayBuffer()),
    tipo: file.type || 'application/octet-stream',
    estensione: estensioneDi(file.name),
  };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return originale;
  try {
    const img = await createImageBitmap(file);
    const lato = Math.max(img.width, img.height);
    if (lato <= 2000 && file.size < 1_500_000) return originale;
    const k = Math.min(1, 2000 / lato);
    const tela = new OffscreenCanvas(Math.round(img.width * k), Math.round(img.height * k));
    tela.getContext('2d')!.drawImage(img, 0, 0, tela.width, tela.height);
    const blob = await tela.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    return blob.size < file.size
      ? { byte: new Uint8Array(await blob.arrayBuffer()), tipo: 'image/jpeg', estensione: 'jpg' }
      : originale;
  } catch {
    return originale;
  }
}

// --- Letture -------------------------------------------------------------

export async function leggiDocumenti(): Promise<Documento[]> {
  return controlla(
    await sb()
      .from('documenti')
      .select('*')
      .order('data', { ascending: false, nullsFirst: false })
      .order('creato_il', { ascending: false }),
  ) as Documento[];
}

export async function leggiDocumento(id: string): Promise<Documento | null> {
  return controlla(await sb().from('documenti').select('*').eq('id', id).maybeSingle()) as Documento | null;
}

export async function leggiCollegamenti(): Promise<Collegamento[]> {
  return controlla(
    await sb().from('collegamenti_documenti').select('id, documento_id, voce, voce_id'),
  ) as Collegamento[];
}

export async function leggiVersioni(documento: string): Promise<Versione[]> {
  return controlla(
    await sb()
      .from('documenti_versioni')
      .select('id, versione_file, file_percorso, sostituito_il')
      .eq('documento_id', documento)
      .order('versione_file', { ascending: false }),
  ) as Versione[];
}

/** Link temporaneo (5 minuti) al file. */
export async function apriFile(percorso: string): Promise<string | null> {
  const { data } = await sb().storage.from('documenti').createSignedUrl(percorso, 300);
  return data?.signedUrl ?? null;
}

export async function scaricaFile(percorso: string): Promise<Uint8Array> {
  const { data, error } = await sb().storage.from('documenti').download(percorso);
  if (error || !data) throw new ErroreFatturazione('scaricamento', 'Non riesco a scaricare il file.');
  return new Uint8Array(await data.arrayBuffer());
}

// --- Caricamento ---------------------------------------------------------

export type NuovoDocumento = {
  byte: Uint8Array;
  tipoFile: string;
  estensione: string;
  tipo: TipoDocumento;
  stato?: Documento['stato'];
  anno?: number;
  data?: string | null;
  emittente?: string | null;
  importo?: number | null;
  descrizione?: string | null;
  scadenza?: string | null;
  fattura?: DatiFattura | null;
};

/** Carica un documento; `doppione` se lo stesso file o la stessa fattura è già in archivio. */
export async function caricaDocumento(d: NuovoDocumento): Promise<{ esito: 'ok' | 'doppione'; id: string }> {
  const owner = await proprietario();
  const id = nuovoId();
  const hash = await impronta(d.byte);
  const gia = controlla(
    await sb().from('documenti').select('id').eq('file_impronta', hash).maybeSingle(),
  ) as { id: string } | null;
  if (gia) return { esito: 'doppione', id: gia.id };
  const nome = nomeFileSicuro({
    tipo: d.tipo,
    data: d.data ?? null,
    emittente: d.emittente ?? null,
    estensione: d.estensione,
  });
  const percorso = `${owner}/${id}/1-${nome}`;
  const su = await sb()
    .storage.from('documenti')
    .upload(percorso, new Blob([d.byte as BlobPart], { type: d.tipoFile }), { contentType: d.tipoFile });
  if (su.error)
    throw new ErroreFatturazione(
      'caricamento',
      'Non riesco a caricare il file (formato o dimensione non supportati, massimo 20 MB).',
    );
  const r = await sb()
    .from('documenti')
    .insert({
      id,
      tipo: d.tipo,
      stato: d.stato ?? 'archiviato',
      anno: d.anno ?? Number((d.data ?? oggiIso()).slice(0, 4)),
      data: d.data ?? null,
      emittente: d.emittente?.slice(0, 120) ?? null,
      importo: d.importo ?? null,
      descrizione: d.descrizione?.slice(0, 200) ?? null,
      scadenza: d.scadenza ?? null,
      file_percorso: percorso,
      file_nome: nome,
      file_tipo: d.tipoFile,
      file_dimensione: d.byte.length,
      file_impronta: hash,
      fattura: d.fattura ?? null,
    });
  if (r.error) {
    await sb().storage.from('documenti').remove([percorso]);
    if (r.error.code === '23505') return { esito: 'doppione', id };
    throw new ErroreFatturazione(r.error.message, r.error.details ?? undefined);
  }
  await evento(id, 'caricato');
  return { esito: 'ok', id };
}

/** Sostituisce il file conservando il precedente tra le versioni (FR-007). */
export async function sostituisciFile(doc: Documento, file: File, conservaOriginale: boolean): Promise<void> {
  const owner = await proprietario();
  const f = conservaOriginale
    ? {
        byte: new Uint8Array(await file.arrayBuffer()),
        tipo: file.type || 'application/octet-stream',
        estensione: estensioneDi(file.name),
      }
    : await riduciFoto(file);
  const v = doc.versione_file + 1;
  const nome = nomeFileSicuro({
    tipo: doc.tipo,
    data: doc.data,
    emittente: doc.emittente,
    estensione: f.estensione,
  });
  const percorso = `${owner}/${doc.id}/${v}-${nome}`;
  const su = await sb()
    .storage.from('documenti')
    .upload(percorso, new Blob([f.byte as BlobPart], { type: f.tipo }), { contentType: f.tipo });
  if (su.error) throw new ErroreFatturazione('caricamento', 'Non riesco a caricare il nuovo file.');
  controlla(
    await sb().from('documenti_versioni').insert({
      id: nuovoId(),
      documento_id: doc.id,
      versione_file: doc.versione_file,
      file_percorso: doc.file_percorso,
      file_impronta: doc.file_impronta,
      file_dimensione: doc.file_dimensione,
    }),
  );
  controlla(
    await sb()
      .from('documenti')
      .update({
        file_percorso: percorso,
        file_nome: nome,
        file_tipo: f.tipo,
        file_dimensione: f.byte.length,
        file_impronta: await impronta(f.byte),
        versione_file: v,
      })
      .eq('id', doc.id),
  );
  await evento(doc.id, 'sostituito');
}

export async function aggiornaDocumento(
  id: string,
  campi: Partial<
    Pick<
      Documento,
      'tipo' | 'stato' | 'anno' | 'data' | 'emittente' | 'importo' | 'descrizione' | 'scadenza' | 'non_spesa'
    >
  >,
) {
  controlla(await sb().from('documenti').update(campi).eq('id', id));
}

// --- Cestino ---------------------------------------------------------------

export async function cestina(id: string) {
  controlla(await sb().from('documenti').update({ eliminato_il: new Date().toISOString() }).eq('id', id));
  await evento(id, 'cestinato');
}

export async function ripristina(id: string) {
  controlla(await sb().from('documenti').update({ eliminato_il: null }).eq('id', id));
  await evento(id, 'ripristinato');
}

/** Eliminazione definitiva: file (anche le versioni) e riga. */
export async function eliminaDefinitivo(doc: Documento) {
  const versioni = await leggiVersioni(doc.id);
  await sb()
    .storage.from('documenti')
    .remove([doc.file_percorso, ...versioni.map((v) => v.file_percorso)]);
  controlla(await sb().from('documenti').delete().eq('id', doc.id));
  await evento(doc.id, 'eliminato');
}

/** Cancella per sempre i documenti nel cestino da più di 30 giorni (all'apertura dell'archivio). */
export async function puliziaCestino(documenti: Documento[]): Promise<number> {
  const limite = Date.now() - GIORNI_CESTINO * 86_400_000;
  const scaduti = documenti.filter((d) => d.eliminato_il && Date.parse(d.eliminato_il) < limite);
  for (const d of scaduti) await eliminaDefinitivo(d);
  return scaduti.length;
}

export const giorniAllaPulizia = (eliminato: string) =>
  Math.max(0, GIORNI_CESTINO - Math.floor((Date.now() - Date.parse(eliminato)) / 86_400_000));

// --- Collegamenti ----------------------------------------------------------

export async function collega(documento_id: string, voce: VoceCollegata, voce_id: string) {
  controlla(await sb().from('collegamenti_documenti').insert({ id: nuovoId(), documento_id, voce, voce_id }));
  // una spesa con un documento collegato ha il giustificativo (SC-004)
  if (voce === 'spesa') await sb().from('spese').update({ ha_giustificativo: true }).eq('id', voce_id);
  if (voce === 'onere')
    await sb().from('oneri_personali').update({ ha_giustificativo: true }).eq('id', voce_id);
  await evento(documento_id, 'collegato');
}

export async function scollega(c: Collegamento) {
  controlla(await sb().from('collegamenti_documenti').delete().eq('id', c.id));
  await evento(c.documento_id, 'scollegato');
}

// --- Fatture ricevute (FR-016, FR-017) -------------------------------------

export type EsitoImportazione = {
  importate: number;
  gia: number;
  scartate: { nome: string; motivo: string }[];
  metadati: number;
};

const daFatturaRicevuta = (d: DatiFatturaRicevuta): DatiFattura => ({
  fornitore: d.fornitore,
  partita_iva: d.partitaIva,
  codice_fiscale: null,
  numero: d.numero,
  data: d.data,
  totale: d.totale,
  iva: d.iva,
  descrizione: d.descrizione,
});

/** Importa XML, P7M e ZIP che li contengono. Ogni fattura diventa un documento "da classificare". */
export async function importaFatture(file: File[]): Promise<EsitoImportazione> {
  const esito: EsitoImportazione = { importate: 0, gia: 0, scartate: [], metadati: 0 };
  const voci: { nome: string; byte: Uint8Array }[] = [];
  for (const f of file) {
    const byte = new Uint8Array(await f.arrayBuffer());
    if (/\.zip$/i.test(f.name) || (byte[0] === 0x50 && byte[1] === 0x4b)) {
      try {
        for (const x of await leggiZip(byte)) voci.push({ nome: x.nome, byte: x.dati });
      } catch (e) {
        esito.scartate.push({ nome: f.name, motivo: e instanceof Error ? e.message : 'ZIP non leggibile' });
      }
    } else voci.push({ nome: f.name, byte });
  }
  const chiaviViste = new Set<string>();
  for (const v of voci) {
    const nomeBreve = v.nome.split('/').pop() ?? v.nome;
    const firmato = sembraP7m(nomeBreve, v.byte);
    let xml: Uint8Array;
    try {
      xml = firmato ? estraiXmlDaP7m(v.byte) : v.byte;
    } catch (e) {
      esito.scartate.push({
        nome: nomeBreve,
        motivo: e instanceof Error ? e.message : 'file firmato non leggibile',
      });
      continue;
    }
    const testo = new TextDecoder().decode(xml);
    const tipo = riconosciFileFattura(nomeBreve, testo);
    if (tipo === 'metadati') {
      esito.metadati += 1;
      continue;
    }
    if (tipo !== 'fattura') {
      esito.scartate.push({ nome: nomeBreve, motivo: 'non è una fattura elettronica' });
      continue;
    }
    const doc = new DOMParser().parseFromString(testo, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      esito.scartate.push({ nome: nomeBreve, motivo: 'XML non valido' });
      continue;
    }
    const dati = daFatturaRicevuta(leggiFatturaRicevuta(doc));
    const chiave = chiaveFattura({
      partitaIva: dati.partita_iva,
      codiceFiscale: dati.codice_fiscale,
      numero: dati.numero,
      data: dati.data,
    });
    if (chiave && chiaviViste.has(chiave)) {
      esito.gia += 1;
      continue;
    }
    if (chiave) chiaviViste.add(chiave);
    const r = await caricaDocumento({
      byte: v.byte, // si archivia l'originale, firmato compreso
      tipoFile: firmato ? 'application/pkcs7-mime' : 'text/xml',
      estensione: firmato ? 'xml.p7m' : 'xml',
      tipo: 'fattura_ricevuta',
      stato: 'da_classificare',
      data: dati.data,
      emittente: dati.fornitore,
      importo: dati.totale,
      descrizione: dati.numero ? `Fattura n. ${dati.numero}` : null,
      fattura: dati,
    });
    if (r.esito === 'doppione') esito.gia += 1;
    else esito.importate += 1;
  }
  return esito;
}

/** Crea la spesa (008) da una fattura ricevuta, collegata e con giustificativo; la fattura è archiviata. */
export async function creaSpesaDaFattura(doc: Documento, categoria: string): Promise<string> {
  const f = doc.fattura;
  const id = nuovoId();
  controlla(
    await sb()
      .from('spese')
      .insert({
        id,
        data: f?.data ?? doc.data ?? oggiIso(),
        importo: f?.totale ?? doc.importo ?? 0,
        fornitore: (f?.fornitore ?? doc.emittente)?.slice(0, 120) ?? null,
        descrizione: (f?.descrizione ?? doc.descrizione)?.slice(0, 200) ?? null,
        categoria,
        modalita: 'bonifico',
        ha_giustificativo: true,
      }),
  );
  await collega(doc.id, 'spesa', id);
  await aggiornaDocumento(doc.id, { stato: 'archiviato', non_spesa: false });
  return id;
}
