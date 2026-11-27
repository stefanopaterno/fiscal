import type { AddizionaliPerAnno, Approvazione } from '@/engine/parametri/anteprima';
import type { RigaRegistro } from '@/engine/parametri/tipi';
import type { AliquoteAddizionali } from '@/engine/irpef/anno';
import { ErroreFatturazione, nuovoId } from '@/features/fatturazione/dati';
import { getSupabase } from '@/lib/supabase/client';
import { leggiAliquote } from '@/features/tasse/dati';

/**
 * Dati della specifica 014 (data-model.md). Il registro si scrive solo online, con chiamate dirette (come le
 * fatture): niente coda senza rete, così un rifiuto del database (anno chiuso) si vede subito.
 */

export type Importazione = {
  id: string;
  creato_il: string;
  data_ricerca: string;
  anni: number[];
  conteggi: Record<string, number>;
  modifiche_programma: {
    titolo: string;
    descrizione: string;
    dal?: string;
    fonte: { titolo: string; url: string; data_atto: string; riferimento?: string };
    impronta: string;
    stato: 'aperta' | 'fatta' | 'non_riguarda';
  }[];
  versione: number;
};

function controlla<T>(r: { data: T; error: { message: string; details?: string | null } | null }): T {
  if (r.error) throw new ErroreFatturazione(r.error.message, r.error.details ?? undefined);
  return r.data;
}

export async function leggiRegistro(): Promise<RigaRegistro[]> {
  return controlla(
    await getSupabase()
      .from('aggiornamenti_parametri')
      .select('id, azione, annulla_id, importazione_id, chiave, anno, dal, valore, valore_precedente, fonte, stato, stato_norma, spiegazione, creato_il')
      .order('creato_il'),
  ) as RigaRegistro[];
}

export async function leggiImportazioni(): Promise<Importazione[]> {
  return controlla(
    await getSupabase().from('importazioni_parametri').select('*').order('creato_il', { ascending: false }),
  ) as Importazione[];
}

export async function approvaParametri(a: Approvazione): Promise<number> {
  return controlla(
    await getSupabase().rpc('approva_parametri', {
      p_importazione: a.importazione,
      p_righe: a.righe,
      p_addizionali: a.addizionali,
    }),
  ) as number;
}

export async function annullaParametro(rigaId: string): Promise<void> {
  controlla(await getSupabase().rpc('annulla_parametro', { p_id: nuovoId(), p_riga: rigaId }));
}

export async function segnaModifica(imp: Importazione, impronta: string, stato: 'aperta' | 'fatta' | 'non_riguarda'): Promise<void> {
  const modifiche = imp.modifiche_programma.map((m) => (m.impronta === impronta ? { ...m, stato } : m));
  controlla(await getSupabase().from('importazioni_parametri').update({ modifiche_programma: modifiche }).eq('id', imp.id));
}

/** Anni chiusi dalla Dichiarazione (004). */
export async function leggiAnniChiusi(): Promise<number[]> {
  const righe = controlla(await getSupabase().from('dichiarazioni').select('anno, chiuso_il').not('chiuso_il', 'is', null)) as {
    anno: number;
  }[];
  return [...new Set(righe.map((r) => r.anno))];
}

/** Aliquote delle addizionali per anno nel formato del motore. */
export async function leggiAddizionali(anni: number[]): Promise<AddizionaliPerAnno> {
  const righe = await Promise.all(anni.map((a) => leggiAliquote(a).catch(() => null)));
  const out: AddizionaliPerAnno = {};
  anni.forEach((a, i) => {
    const r = righe[i];
    out[a] = r
      ? ({
          regionale: r.regionale_scaglioni.map((s) => ({ finoA: s.fino_a, aliquota: Number(s.aliquota) })),
          comunale: { aliquota: Number(r.comunale_aliquota), soglia: r.comunale_soglia_esenzione },
          verificate: r.verificate,
        } satisfies AliquoteAddizionali)
      : null;
  });
  return out;
}

// --- Regione, comune e siti ufficiali: solo su questo dispositivo (mai nel database né nel repository) ---------

const CHIAVE_AMBITO = 'fiscal.parametri.ambito';
export type Ambito = { regione: string; comune: string; siti: string[] };

export function leggiAmbito(): Ambito | null {
  try {
    const a = JSON.parse(localStorage.getItem(CHIAVE_AMBITO) ?? 'null') as Ambito | null;
    return a && typeof a.regione === 'string' && typeof a.comune === 'string' ? { ...a, siti: Array.isArray(a.siti) ? a.siti : [] } : null;
  } catch {
    return null;
  }
}

export function salvaAmbito(a: Ambito | null): void {
  if (!a || (!a.regione.trim() && !a.comune.trim())) localStorage.removeItem(CHIAVE_AMBITO);
  else localStorage.setItem(CHIAVE_AMBITO, JSON.stringify(a));
}
