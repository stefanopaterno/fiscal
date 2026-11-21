import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Stati dell'accesso (contracts/app-routes-and-lock.md, "Macchina a stati").
 * - anonimo: nessuna sessione;
 * - aal1: password giusta, manca il codice a 6 cifre;
 * - aal1_senza_fattore: password giusta, il secondo fattore non è ancora configurato;
 * - aal2: password e codice, accesso completo.
 * Il database rifiuta comunque qualsiasi dato senza aal2: questo serve solo a guidare l'utente.
 */
export type StatoAccesso = 'anonimo' | 'aal1' | 'aal1_senza_fattore' | 'aal2';

// Supabase dichiara i livelli come stringhe generiche: qualsiasi valore diverso da 'aal2' non dà accesso.
type Livello = string | null | undefined;

export function statoDaLivelli(input: {
  sessione: boolean;
  currentLevel?: Livello;
  nextLevel?: Livello;
}): StatoAccesso {
  if (!input.sessione) return 'anonimo';
  if (input.currentLevel === 'aal2') return 'aal2';
  if (input.nextLevel === 'aal2') return 'aal1';
  return 'aal1_senza_fattore';
}

/** Pagine raggiungibili per ogni stato (percorsi senza il prefisso /app). */
const PAGINE_PERMESSE: Record<Exclude<StatoAccesso, 'aal2'>, string[]> = {
  anonimo: ['/accesso/'],
  aal1: ['/accesso/secondo-fattore/', '/accesso/recupero/'],
  aal1_senza_fattore: ['/accesso/configura/', '/accesso/recupero/'],
};

const PAGINA_PRINCIPALE: Record<StatoAccesso, string> = {
  anonimo: '/accesso/',
  aal1: '/accesso/secondo-fattore/',
  aal1_senza_fattore: '/accesso/configura/',
  aal2: '/home/',
};

/**
 * Dove mandare l'utente: `null` se può restare sulla pagina, altrimenti il percorso giusto.
 * Con accesso completo le pagine di accesso rimandano alla home; senza, ogni altra pagina è chiusa.
 */
export function destinazione(stato: StatoAccesso, pagina: string): string | null {
  const percorso = pagina.endsWith('/') ? pagina : `${pagina}/`;
  if (stato === 'aal2') {
    return percorso.startsWith('/accesso/') ? PAGINA_PRINCIPALE.aal2 : null;
  }
  return PAGINE_PERMESSE[stato].includes(percorso) ? null : PAGINA_PRINCIPALE[stato];
}

/** Legge lo stato attuale da Supabase Auth (solo nel browser). */
export async function getStatoAccesso(supabase: SupabaseClient): Promise<StatoAccesso> {
  const { data: sessione } = await supabase.auth.getSession();
  if (!sessione.session) return 'anonimo';
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return statoDaLivelli({ sessione: true });
  return statoDaLivelli({ sessione: true, currentLevel: data.currentLevel, nextLevel: data.nextLevel });
}
