import { messaggi } from '@/lib/messaggi';

/**
 * Traduce gli errori di Supabase Auth in messaggi semplici.
 * Regola (FR-012, sicurezza): mai dire se un'e-mail esiste o no.
 */
export function messaggioErroreAccesso(
  errore: { status?: number; code?: string } | null | undefined,
): string {
  if (!errore) return messaggi.generico.errore;
  if (errore.status === 429 || errore.code === 'over_request_rate_limit')
    return messaggi.accesso.troppiTentativi;
  if (errore.code === 'mfa_verification_failed' || errore.code === 'mfa_challenge_expired') {
    return messaggi.accesso.codiceErrato;
  }
  if (errore.status === 400 || errore.code === 'invalid_credentials')
    return messaggi.accesso.credenzialiErrate;
  return messaggi.generico.errore;
}
