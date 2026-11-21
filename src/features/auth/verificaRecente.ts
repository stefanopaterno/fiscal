import { createClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { messaggioErroreAccesso } from './errori';

/**
 * Verifica recente (T086, FR-019): per le operazioni sensibili servono di nuovo password e codice a 6 cifre.
 * Vale per 5 minuti (le funzioni sul server controllano lo stesso orario nel token). Lo sblocco rapido non basta.
 */
export const SECONDI_VALIDITA = 280; // un po' meno dei 300 del server, per sicurezza

function orarioUltimoCodice(token: string | undefined): number | undefined {
  if (!token) return undefined;
  try {
    const parte = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const amr = JSON.parse(atob(parte)).amr as Array<{ method: string; timestamp: number }> | undefined;
    return amr?.find((v) => v.method === 'totp')?.timestamp;
  } catch {
    return undefined;
  }
}

/** Il codice a 6 cifre è stato inserito negli ultimi minuti? */
export async function verificaAncoraValida(): Promise<boolean> {
  const { data } = await getSupabase().auth.getSession();
  const orario = orarioUltimoCodice(data.session?.access_token);
  return orario !== undefined && Date.now() / 1000 - orario <= SECONDI_VALIDITA;
}

/**
 * Controlla la password con un accesso separato "usa e getta" (chiuso subito, la sessione in corso non cambia),
 * poi conferma il codice sulla sessione in corso: il token riceve l'orario nuovo dell'ultimo codice.
 * Restituisce null se tutto è giusto, altrimenti il messaggio da mostrare.
 */
export async function verificaDiNuovo(password: string, codice: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: sessione } = await supabase.auth.getSession();
  const email = sessione.session?.user.email;
  if (!email) return 'Accedi di nuovo.';

  const usaEGetta = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: 'fiscal-verifica' },
    },
  );
  const prova = await usaEGetta.auth.signInWithPassword({ email, password });
  if (prova.error) return messaggioErroreAccesso(prova.error);
  await usaEGetta.auth.signOut({ scope: 'local' }); // chiude subito l'accesso di controllo

  const fattori = await supabase.auth.mfa.listFactors();
  const fattore = fattori.data?.totp[0];
  if (!fattore) return 'Nessun telefono collegato.';
  const r = await supabase.auth.mfa.challengeAndVerify({
    factorId: fattore.id,
    code: codice.replace(/\D/g, ''),
  });
  return r.error ? messaggioErroreAccesso(r.error) : null;
}
