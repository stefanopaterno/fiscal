import { nascitaDaCodiceFiscale } from '@/engine/consensi/paziente';
import { statoPaziente, type EsitoPaziente, type RuoloFirmatario, type VersioneInVigore } from '@/engine/consensi/stato';
import { estensioneDi, sembraClinico } from '@/engine/documenti/nomi';
import { impronta, riduciFoto } from '@/features/documenti/dati';
import { ErroreFatturazione, nuovoId, type Cliente } from '@/features/fatturazione/dati';
import { getSupabase } from '@/lib/supabase/client';
import { oggiIso } from '@/lib/oggi';

/**
 * Dati dei consensi informati (specifica 005). Tutto online (come l'archivio documenti): le righe nelle tabelle
 * con RLS, le copie firmate e i modelli nel bucket privato `consensi` (<owner_id>/<id>/<nome dato da Fiscal>).
 * Nessun dato clinico: le motivazioni sono brevi e solo amministrative (FR-010).
 */
export type Modalita = 'carta' | 'email' | 'altro';
export type TipoConsenso = { id: string; versione: number; nome: string; descrizione: string | null; archiviato: boolean };
export type Modello = {
  id: string;
  genere: 'consenso' | 'informativa';
  tipo_consenso_id: string | null;
  titolo: string;
  versione_testo: string;
  in_vigore_dal: string;
  file_percorso: string | null;
  file_nome: string | null;
};
export type Firmatario = { id: string; consenso_id: string; nome: string; ruolo: RuoloFirmatario; data_firma: string };
export type Consenso = {
  id: string;
  versione: number;
  cliente_id: string;
  tipo_consenso_id: string;
  modello_id: string | null;
  versione_testo: string;
  data_firma: string;
  registrato_il: string;
  modalita: Modalita;
  motivazione: string | null;
  revocato_il: string | null;
  motivazione_revoca: string | null;
  file_percorso: string | null;
  file_nome: string | null;
  file_tipo: string | null;
  creato_il: string;
};
export type ConsensoConFirme = Consenso & { firmatari: Firmatario[] };
export type Evento = { id: string; consenso_id: string | null; cliente_id: string | null; azione: string; avvenuto_il: string };

export const ETICHETTE_RUOLO: Record<RuoloFirmatario, string> = {
  paziente: 'Paziente',
  genitore: 'Genitore',
  rappresentante_legale: 'Rappresentante legale',
};
export const ETICHETTE_MODALITA: Record<Modalita, string> = {
  carta: 'Firma su carta',
  email: 'E-mail di accettazione',
  altro: 'Altro',
};

const MAX_FILE = 10 * 1024 * 1024;
const sb = () => getSupabase();

function controlla<T>(r: { data: T; error: { message: string; code?: string; details?: string | null } | null }): T {
  if (r.error) throw new ErroreFatturazione(r.error.code === '23505' ? 'doppione' : r.error.message, r.error.details ?? undefined);
  return r.data;
}

async function proprietario(): Promise<string> {
  const { data } = await sb().auth.getUser();
  if (!data.user) throw new ErroreFatturazione('non_autenticato', 'Accedi di nuovo.');
  return data.user.id;
}

async function evento(azione: string, consenso_id: string | null, cliente_id: string | null) {
  await sb().from('eventi_consensi').insert({ id: nuovoId(), azione, consenso_id, cliente_id });
}

/** Motivazioni: brevi e senza parole che fanno pensare a dati clinici (FR-010). */
export function controllaMotivazione(t: string): string | null {
  if (t.length > 200) return 'Al massimo 200 caratteri: solo il motivo amministrativo.';
  const parole = sembraClinico(t);
  return parole.length ? `Togli i dati clinici (${parole.join(', ')}): qui va solo il motivo amministrativo.` : null;
}

// --- Letture -------------------------------------------------------------

export type Quadro = {
  pazienti: Cliente[];
  tipi: TipoConsenso[];
  modelli: Modello[];
  consensi: ConsensoConFirme[];
  stati: Map<string, EsitoPaziente>;
};

export function versioniInVigore(modelli: Modello[]): VersioneInVigore[] {
  return modelli
    .filter((m) => m.genere === 'consenso' && m.tipo_consenso_id)
    .map((m) => ({ tipo_consenso_id: m.tipo_consenso_id!, versione_testo: m.versione_testo, in_vigore_dal: m.in_vigore_dal }));
}

export function calcolaStati(pazienti: Cliente[], consensi: ConsensoConFirme[], modelli: Modello[], oggi = oggiIso()) {
  const versioni = versioniInVigore(modelli);
  return new Map(
    pazienti.map((p) => [
      p.id,
      statoPaziente({
        consensi: consensi.filter((c) => c.cliente_id === p.id),
        nascita: nascitaDaCodiceFiscale(p.codice_fiscale, oggi),
        versioni,
        oggi,
      }),
    ]),
  );
}

export async function leggiQuadro(): Promise<Quadro> {
  const [clienti, tipi, modelli, consensi, firmatari] = await Promise.all([
    sb().from('clienti').select('*').eq('tipo', 'persona_fisica').order('cognome').order('nome'),
    sb().from('tipi_consenso').select('id, versione, nome, descrizione, archiviato').order('nome'),
    sb().from('modelli_consenso').select('id, genere, tipo_consenso_id, titolo, versione_testo, in_vigore_dal, file_percorso, file_nome').order('in_vigore_dal', { ascending: false }),
    sb().from('consensi').select('*').order('data_firma', { ascending: false }),
    sb().from('firmatari_consenso').select('id, consenso_id, nome, ruolo, data_firma').order('data_firma'),
  ]);
  const pazienti = controlla(clienti) as Cliente[];
  const f = controlla(firmatari) as Firmatario[];
  const c = (controlla(consensi) as Consenso[]).map((x) => ({ ...x, firmatari: f.filter((y) => y.consenso_id === x.id) }));
  const m = controlla(modelli) as Modello[];
  return { pazienti, tipi: controlla(tipi) as TipoConsenso[], modelli: m, consensi: c, stati: calcolaStati(pazienti, c, m) };
}

export async function leggiEventi(cliente: string, consensi: string[]): Promise<Evento[]> {
  const q = sb().from('eventi_consensi').select('id, consenso_id, cliente_id, azione, avvenuto_il');
  const filtro = consensi.length ? `cliente_id.eq.${cliente},consenso_id.in.(${consensi.join(',')})` : `cliente_id.eq.${cliente}`;
  return controlla(await q.or(filtro).order('avvenuto_il', { ascending: false }).limit(100)) as Evento[];
}

/** Stato dei consensi per l'avviso in fattura e i promemoria (null se la lettura non riesce, es. senza rete). */
export async function statiConsensi(): Promise<Map<string, EsitoPaziente> | null> {
  try {
    return (await leggiQuadro()).stati;
  } catch {
    return null;
  }
}

// --- File ---------------------------------------------------------------

async function carica(cartella: string, base: string, file: File): Promise<{ percorso: string; nome: string; tipo: string; dimensione: number; impronta: string }> {
  if (file.size > MAX_FILE * 2) throw new ErroreFatturazione('troppo_grande', 'Il file supera 10 MB.');
  const contenuto = await riduciFoto(file);
  if (contenuto.byte.byteLength > MAX_FILE) throw new ErroreFatturazione('troppo_grande', 'Il file supera 10 MB.');
  const io = await proprietario();
  // nome dato da Fiscal: mai quello originale, che potrebbe contenere il nome del paziente
  const nome = `${base}.${contenuto.estensione || estensioneDi(file.name)}`;
  const percorso = `${io}/${cartella}/${nome}`;
  const { error } = await sb().storage.from('consensi').upload(percorso, contenuto.byte, { contentType: contenuto.tipo, upsert: true });
  if (error) throw new ErroreFatturazione('caricamento', error.message);
  return { percorso, nome, tipo: contenuto.tipo, dimensione: contenuto.byte.byteLength, impronta: await impronta(contenuto.byte) };
}

/** Scarica il file con la sessione (mai indirizzi pubblici o condivisibili, FR-014) e lo apre in locale. */
export async function apriFile(percorso: string, nome: string) {
  const { data, error } = await sb().storage.from('consensi').download(percorso);
  if (error || !data) throw new ErroreFatturazione('scaricamento', error?.message ?? 'File non trovato.');
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// --- Scritture ------------------------------------------------------------

export async function salvaTipo(t: { id?: string; versione?: number; nome: string; descrizione: string; archiviato?: boolean }) {
  const riga = { nome: t.nome.trim(), descrizione: t.descrizione.trim() || null, archiviato: t.archiviato ?? false };
  if (t.id) controlla(await sb().from('tipi_consenso').update({ ...riga, versione: (t.versione ?? 1) + 1 }).eq('id', t.id));
  else controlla(await sb().from('tipi_consenso').insert({ id: nuovoId(), ...riga }));
}

export async function caricaModello(m: {
  genere: 'consenso' | 'informativa';
  tipo_consenso_id: string | null;
  titolo: string;
  versione_testo: string;
  in_vigore_dal: string;
  file: File | null;
}) {
  const id = nuovoId();
  const file = m.file ? await carica(`modelli/${id}`, `${m.genere}-v${m.versione_testo.replace(/[^a-z0-9.]/gi, '-')}`, m.file) : null;
  controlla(
    await sb().from('modelli_consenso').insert({
      id,
      genere: m.genere,
      tipo_consenso_id: m.genere === 'consenso' ? m.tipo_consenso_id : null,
      titolo: m.titolo.trim(),
      versione_testo: m.versione_testo.trim(),
      in_vigore_dal: m.in_vigore_dal,
      file_percorso: file?.percorso ?? null,
      file_nome: file?.nome ?? null,
      file_tipo: file?.tipo ?? null,
      file_dimensione: file?.dimensione ?? null,
      file_impronta: file?.impronta ?? null,
    }),
  );
  await evento('modello_caricato', null, null);
}

export type NuovoConsenso = {
  cliente_id: string;
  tipo_consenso_id: string;
  modello_id: string | null;
  versione_testo: string;
  data_firma: string;
  modalita: Modalita;
  motivazione: string;
  firmatari: { nome: string; ruolo: RuoloFirmatario; data_firma: string }[];
  file: File | null;
};

export async function registraConsenso(n: NuovoConsenso): Promise<string> {
  const id = nuovoId();
  const file = n.file ? await carica(id, `consenso-${n.data_firma}`, n.file) : null;
  controlla(
    await sb().from('consensi').insert({
      id,
      cliente_id: n.cliente_id,
      tipo_consenso_id: n.tipo_consenso_id,
      modello_id: n.modello_id,
      versione_testo: n.versione_testo.trim(),
      data_firma: n.data_firma,
      registrato_il: oggiIso(),
      modalita: n.modalita,
      motivazione: n.motivazione.trim() || null,
      file_percorso: file?.percorso ?? null,
      file_nome: file?.nome ?? null,
      file_tipo: file?.tipo ?? null,
      file_dimensione: file?.dimensione ?? null,
      file_impronta: file?.impronta ?? null,
    }),
  );
  if (n.firmatari.length)
    controlla(await sb().from('firmatari_consenso').insert(n.firmatari.map((f) => ({ id: nuovoId(), consenso_id: id, nome: f.nome.trim(), ruolo: f.ruolo, data_firma: f.data_firma }))));
  await evento('creato', id, n.cliente_id);
  return id;
}

export async function aggiungiFirmatario(c: Consenso, f: { nome: string; ruolo: RuoloFirmatario; data_firma: string }) {
  controlla(await sb().from('firmatari_consenso').insert({ id: nuovoId(), consenso_id: c.id, nome: f.nome.trim(), ruolo: f.ruolo, data_firma: f.data_firma }));
  await evento('modificato', c.id, c.cliente_id);
}

export async function revocaConsenso(c: Consenso, data: string, motivazione: string) {
  controlla(
    await sb().from('consensi').update({ revocato_il: data, motivazione_revoca: motivazione.trim() || null, versione: c.versione + 1 }).eq('id', c.id),
  );
  await evento('revocato', c.id, c.cliente_id);
}

export async function allegaCopia(c: Consenso, file: File) {
  const f = await carica(c.id, `consenso-${c.data_firma}`, file);
  controlla(
    await sb().from('consensi').update({
      file_percorso: f.percorso,
      file_nome: f.nome,
      file_tipo: f.tipo,
      file_dimensione: f.dimensione,
      file_impronta: f.impronta,
      versione: c.versione + 1,
    }).eq('id', c.id),
  );
  await evento('allegato', c.id, c.cliente_id);
}

/**
 * Richiesta di accesso del paziente (FR-015): tutti i suoi dati in un file JSON, con l'indicazione di cosa va
 * conservato per legge e cosa si può cancellare su richiesta. Le copie firmate si scaricano a parte.
 */
export async function esportaPaziente(cliente: Cliente, consensi: ConsensoConFirme[], tipi: TipoConsenso[]) {
  const fatture = controlla(
    await sb().from('fatture').select('anno, numero, data, tipo, totale, stato').eq('cliente_id', cliente.id).neq('stato', 'bozza').order('data'),
  ) as { anno: number; numero: number | null; data: string; tipo: string; totale: number; stato: string }[];
  const contenuto = {
    generato_il: new Date().toISOString(),
    anagrafica: {
      nome: cliente.nome,
      cognome: cliente.cognome,
      codice_fiscale: cliente.codice_fiscale,
      indirizzo: [cliente.indirizzo, cliente.cap, cliente.comune, cliente.provincia].filter(Boolean).join(' '),
      opposizione_tessera_sanitaria: cliente.opposizione_sts,
    },
    consensi: consensi.map((c) => ({
      tipo: tipi.find((t) => t.id === c.tipo_consenso_id)?.nome ?? '',
      versione_testo: c.versione_testo,
      data_firma: c.data_firma,
      registrato_il: c.registrato_il,
      modalita: ETICHETTE_MODALITA[c.modalita],
      motivazione: c.motivazione,
      revocato_il: c.revocato_il,
      firmatari: c.firmatari.map((f) => ({ nome: f.nome, ruolo: ETICHETTE_RUOLO[f.ruolo], data_firma: f.data_firma })),
      copia_firmata: c.file_nome,
    })),
    fatture: fatture.map((f) => ({ ...f, totale: f.totale / 100 })),
    conservazione: {
      da_conservare:
        'Fatture e dati per la fattura: obbligo di conservazione fiscale (in genere 10 anni). Consensi e loro copie: documentazione professionale, conservare finché serve a dimostrare il consenso (durata da verificare con l\'Ordine).',
      cancellabile_su_richiesta:
        'Recapiti non necessari alla fattura e, trascorsi i tempi di conservazione, il resto. Fiscal non cancella nulla in automatico.',
    },
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(contenuto, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `dati-paziente-${oggiIso()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  await evento('esportato', null, cliente.id);
}

// --- Accordo sul trattamento dei dati (DPA) -------------------------------

export async function leggiDpa(): Promise<string | null> {
  const r = controlla(await sb().from('profilo_professionale').select('dpa_firmato_il').maybeSingle()) as { dpa_firmato_il: string | null } | null;
  return r?.dpa_firmato_il ?? null;
}

export async function segnaDpa(data: string | null) {
  controlla(await sb().from('profilo_professionale').update({ dpa_firmato_il: data }).eq('owner_id', await proprietario()));
}
