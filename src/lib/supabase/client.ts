import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verificaChiavePubblica } from './chiave';

/**
 * Client Supabase del browser (T019).
 * - Usa SOLO l'indirizzo del progetto e la chiave pubblica: la protezione dei dati sta nel database
 *   (login, secondo fattore, regole per riga), non nella segretezza di questi valori.
 * - Si crea alla prima richiesta, solo nel browser: l'esportazione statica non lo esegue mai.
 */
let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('Il client Supabase si usa solo nel browser.');
  }
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    if (!url.startsWith('https://')) {
      throw new Error('Configurazione: manca l\'indirizzo del progetto Supabase (NEXT_PUBLIC_SUPABASE_URL).');
    }
    verificaChiavePubblica(chiave);
    client = createClient(url, chiave, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
