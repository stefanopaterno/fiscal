import { getSupabase } from '@/lib/supabase/client';

/**
 * Chiamate alle funzioni di recupero su Supabase (contracts/edge-functions.md).
 * Usa la sessione corrente; gli errori seguono la convenzione { errore, messaggio, riprova_dopo }.
 */
export type RispostaFunzione<T> =
  | { ok: true; dati: T }
  | { ok: false; stato: number; errore: string; messaggio: string; riprovaDopo: number | null };

export async function chiamaRecupero<T>(
  funzione: 'recovery-codes' | 'recovery-code' | 'recovery-phrase',
  corpo: Record<string, unknown>,
): Promise<RispostaFunzione<T>> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${funzione}`, {
      method: 'POST',
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${data.session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(corpo),
    });
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (r.ok) return { ok: true, dati: json as T };
    return {
      ok: false,
      stato: r.status,
      errore: String(json.errore ?? 'errore'),
      messaggio: String(json.messaggio ?? 'Qualcosa non ha funzionato. Riprova tra poco.'),
      riprovaDopo: typeof json.riprova_dopo === 'number' ? json.riprova_dopo : null,
    };
  } catch {
    return {
      ok: false,
      stato: 0,
      errore: 'rete',
      messaggio: 'Sei senza connessione o il servizio non risponde. Riprova tra poco.',
      riprovaDopo: null,
    };
  }
}

export type RichiestaRipristino = { stato: string; esegui_dopo: string; creata_il?: string };

/** Stessa regola delle funzioni: almeno 24 caratteri oppure almeno 6 parole. */
export function fraseAccettabile(frase: string): boolean {
  const f = frase.trim().toLowerCase().replace(/\s+/g, ' ');
  return f.length >= 24 || f.split(' ').length >= 6;
}
