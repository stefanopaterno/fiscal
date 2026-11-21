// POST /functions/v1/recovery-code — rientro con un codice di recupero (FR-009, contracts/edge-functions.md).
// Richiede la sola password (aal1). Se il codice è valido toglie il secondo fattore perso: l'utente
// deve subito configurarne uno nuovo. Non salta mai il secondo fattore: senza di esso nessun dato è visibile.

import { hmacCodice } from '../_shared/crypto.ts';
import {
  ambiente,
  clientServizio,
  eliminaSecondoFattore,
  errore,
  preliminari,
  rispostaJson,
  utenteDallaRichiesta,
} from '../_shared/http.ts';

Deno.serve(async (richiesta) => {
  const pre = preliminari(richiesta);
  if (pre) return pre;

  const utente = await utenteDallaRichiesta(richiesta);
  if (!utente) return errore(richiesta, 401, 'non_autenticato', 'Accedi prima con e-mail e password.');
  if (utente.aal === 'aal2') return errore(richiesta, 400, 'non_serve', 'Sei già entrato con il codice.');

  const { codice } = (await richiesta.json().catch(() => ({}))) as { codice?: string };
  const impronta = await hmacCodice(String(codice ?? ''), ambiente('RECOVERY_PEPPER'));
  const esito = await clientServizio().rpc('recupero_usa_codice', { p_owner: utente.id, p_hmac: impronta });
  if (esito.error) return errore(richiesta, 500, 'errore', 'Qualcosa non ha funzionato.');
  const [riga] = esito.data as Array<{ esito: string; residui: number }>;

  if (riga?.esito === 'bloccato') {
    return errore(richiesta, 429, 'troppi_tentativi', 'Troppi tentativi. Riprova tra 15 minuti.', 900);
  }
  if (riga?.esito !== 'valido') {
    return errore(richiesta, 401, 'codice_non_valido', 'Codice non valido o già usato.');
  }

  await eliminaSecondoFattore(utente.id);
  return rispostaJson(richiesta, 200, {
    stato: 'fattore_rimosso',
    codici_residui: riga.residui,
    avviso: 'Configura subito un nuovo secondo fattore e, se vuoi, rigenera i codici.',
  });
});
