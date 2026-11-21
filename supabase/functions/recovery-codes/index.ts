// POST /functions/v1/recovery-codes — genera i codici di recupero (contracts/edge-functions.md).
// Richiede accesso completo (aal2). "rigenera" richiede anche una verifica recente (codice entro 5 minuti).

import { generaCodici, hmacCodice } from '../_shared/crypto.ts';
import {
  ambiente,
  clientServizio,
  errore,
  preliminari,
  rispostaJson,
  utenteDallaRichiesta,
  verificaRecente,
} from '../_shared/http.ts';

Deno.serve(async (richiesta) => {
  const pre = preliminari(richiesta);
  if (pre) return pre;

  const utente = await utenteDallaRichiesta(richiesta);
  if (!utente) return errore(richiesta, 401, 'non_autenticato', 'Accedi di nuovo.');
  if (utente.aal !== 'aal2') return errore(richiesta, 403, 'serve_codice', 'Serve il codice a 6 cifre.');

  const { azione } = (await richiesta.json().catch(() => ({}))) as { azione?: string };
  if (azione !== 'genera' && azione !== 'rigenera')
    return errore(richiesta, 400, 'azione', 'Azione non valida.');

  const db = clientServizio();
  if (azione === 'genera') {
    const residui = await db.rpc('recupero_codici_residui', { p_owner: utente.id });
    if (residui.error) return errore(richiesta, 500, 'errore', 'Qualcosa non ha funzionato.');
    if ((residui.data as number) > 0)
      return rispostaJson(richiesta, 200, { gia_presenti: true, residui: residui.data });
  } else if (!verificaRecente(utente)) {
    return errore(richiesta, 403, 'verifica_recente', 'Per sicurezza scrivi di nuovo il codice a 6 cifre.');
  }

  const codici = generaCodici();
  const pepe = ambiente('RECOVERY_PEPPER');
  const impronte = await Promise.all(codici.map((c) => hmacCodice(c, pepe)));
  const lotto = await db.rpc('recupero_salva_codici', {
    p_owner: utente.id,
    p_hmac: impronte,
    p_rigenera: azione === 'rigenera',
  });
  if (lotto.error) return errore(richiesta, 500, 'errore', 'Qualcosa non ha funzionato.');
  // I codici in chiaro esistono solo in questa risposta: non vengono mai salvati.
  return rispostaJson(richiesta, 200, { codici, lotto: lotto.data });
});
