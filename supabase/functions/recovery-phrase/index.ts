// POST /functions/v1/recovery-phrase — ripristino con la frase di recupero (FR-023, FR-024).
// Azioni: avvia | stato | annulla | completa | imposta. La frase non salta mai il secondo fattore:
// avvia un ripristino con 48 ore di attesa e avviso via e-mail; un accesso valido lo annulla.

import { inviaAvviso, ErroreAvviso } from '../_shared/avviso.ts';
import { fraseAccettabile, hashFrase, verificaFrase } from '../_shared/crypto.ts';
import {
  clientServizio,
  eliminaSecondoFattore,
  errore,
  preliminari,
  rispostaJson,
  utenteDallaRichiesta,
  verificaRecente,
} from '../_shared/http.ts';

const NON_VALIDA = 'La frase non è corretta.';

Deno.serve(async (richiesta) => {
  const pre = preliminari(richiesta);
  if (pre) return pre;

  const utente = await utenteDallaRichiesta(richiesta);
  if (!utente) return errore(richiesta, 401, 'non_autenticato', 'Accedi prima con e-mail e password.');
  const corpo = (await richiesta.json().catch(() => ({}))) as { azione?: string; frase?: string };
  const db = clientServizio();

  switch (corpo.azione) {
    case 'stato': {
      const r = await db.rpc('recupero_stato_richiesta', { p_owner: utente.id });
      if (r.error) return errore(richiesta, 500, 'errore', 'Qualcosa non ha funzionato.');
      const [richiestaInCorso] = r.data as Array<{ stato: string; esegui_dopo: string; creata_il: string }>;
      return rispostaJson(richiesta, 200, { richiesta: richiestaInCorso ?? null });
    }

    case 'annulla': {
      const r = await db.rpc('recupero_annulla_richiesta', {
        p_owner: utente.id,
        p_motivo: 'annullata_dall_utente',
      });
      if (r.error) return errore(richiesta, 500, 'errore', 'Qualcosa non ha funzionato.');
      return rispostaJson(richiesta, 200, { annullata: r.data === true });
    }

    case 'avvia': {
      if (utente.aal === 'aal2') return errore(richiesta, 400, 'non_serve', 'Sei già entrato con il codice.');
      const dati = await db.rpc('recupero_dati_frase', { p_owner: utente.id });
      if (dati.error) return errore(richiesta, 500, 'errore', 'Qualcosa non ha funzionato.');
      const [frase] = dati.data as Array<{ hash: string | null; bloccata_fino: string | null }>;
      if (frase?.bloccata_fino && new Date(frase.bloccata_fino) > new Date()) {
        const secondi = Math.ceil((new Date(frase.bloccata_fino).getTime() - Date.now()) / 1000);
        return errore(
          richiesta,
          423,
          'bloccata',
          'Troppi tentativi: la frase è bloccata per 24 ore.',
          secondi,
        );
      }
      const giusta = frase?.hash ? await verificaFrase(String(corpo.frase ?? ''), frase.hash) : false;
      if (!giusta) {
        const blocco = await db.rpc('recupero_frase_errata', { p_owner: utente.id });
        if (blocco.data)
          return errore(
            richiesta,
            423,
            'bloccata',
            'Troppi tentativi: la frase è bloccata per 24 ore.',
            86400,
          );
        return errore(richiesta, 401, 'frase_non_valida', NON_VALIDA);
      }
      await db.rpc('recupero_frase_corretta', { p_owner: utente.id });

      const esistente = await db.rpc('recupero_stato_richiesta', { p_owner: utente.id });
      const [inCorso] = (esistente.data ?? []) as Array<{ stato: string; esegui_dopo: string }>;
      if (inCorso) return rispostaJson(richiesta, 200, { richiesta: inCorso });

      try {
        await inviaAvviso(
          utente.email,
          'Fiscal: è stato avviato il ripristino del tuo accesso',
          [
            "Qualcuno ha avviato il ripristino dell'accesso a Fiscal usando la tua frase di recupero.",
            'Il ripristino sarà possibile tra 48 ore.',
            '',
            'Se sei stato tu, non devi fare nulla.',
            'Se NON sei stato tu: entra in Fiscal con password e codice a 6 cifre. Il ripristino si annulla da solo.',
            'Poi cambia la frase di recupero dalle impostazioni di sicurezza.',
          ].join('\n'),
        );
      } catch (e) {
        if (e instanceof ErroreAvviso) {
          return errore(
            richiesta,
            503,
            'avviso_non_inviabile',
            "Non riusciamo a mandarti l'e-mail di avviso: il ripristino non è partito.",
          );
        }
        throw e;
      }
      const creata = await db.rpc('recupero_crea_richiesta', { p_owner: utente.id });
      if (creata.error) return errore(richiesta, 500, 'errore', 'Qualcosa non ha funzionato.');
      const [nuova] = creata.data as Array<{ stato: string; esegui_dopo: string }>;
      return rispostaJson(richiesta, 200, { richiesta: nuova });
    }

    case 'completa': {
      if (utente.aal === 'aal2') return errore(richiesta, 400, 'non_serve', 'Sei già entrato con il codice.');
      const r = await db.rpc('recupero_completa_richiesta', { p_owner: utente.id });
      if (r.error) return errore(richiesta, 500, 'errore', 'Qualcosa non ha funzionato.');
      if (r.data === 'nessuna')
        return errore(richiesta, 404, 'nessuna_richiesta', "Non c'è nessun ripristino in corso.");
      if (r.data === 'in_attesa')
        return errore(richiesta, 409, 'in_attesa', "L'attesa di 48 ore non è ancora finita.");
      await eliminaSecondoFattore(utente.id);
      return rispostaJson(richiesta, 200, { stato: 'completata', imposta_nuova_frase: true });
    }

    case 'imposta': {
      if (utente.aal !== 'aal2') return errore(richiesta, 403, 'serve_codice', 'Serve il codice a 6 cifre.');
      const frase = String(corpo.frase ?? '');
      if (!fraseAccettabile(frase)) {
        return errore(
          richiesta,
          400,
          'frase_corta',
          'Scegli una frase più lunga: almeno 6 parole o 24 caratteri.',
        );
      }
      const dati = await db.rpc('recupero_dati_frase', { p_owner: utente.id });
      const [attuale] = (dati.data ?? []) as Array<{ hash: string | null }>;
      if (attuale?.hash && !verificaRecente(utente)) {
        return errore(
          richiesta,
          403,
          'verifica_recente',
          'Per cambiare la frase scrivi di nuovo il codice a 6 cifre.',
        );
      }
      const r = await db.rpc('recupero_imposta_frase', {
        p_owner: utente.id,
        p_hash: await hashFrase(frase),
      });
      if (r.error) return errore(richiesta, 500, 'errore', 'Qualcosa non ha funzionato.');
      return rispostaJson(richiesta, 200, { impostata: true });
    }

    default:
      return errore(richiesta, 400, 'azione', 'Azione non valida.');
  }
});
