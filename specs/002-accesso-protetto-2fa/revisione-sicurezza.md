# Revisione di sicurezza: Accesso protetto con 2FA (T094)

**Data**: 2026-11-21 | **Ramo**: `002-accesso-protetto-2fa` | **Contratto**: [contracts/rls-policy-contract.md](contracts/rls-policy-contract.md)

## Controlli eseguiti

| Controllo | Esito | Come |
|---|---|---|
| Ogni tabella con RLS attiva e forzata, policy del proprietario e restrittiva `aal2` + accesso completo, nessun privilegio ad `anon` | OK | pgTAP `003_conformita.test.sql` (elenco eccezioni vuoto), `001`, `002` |
| Tabelle future protette anche se create senza regole | OK | trigger `ensure_rls`, pgTAP `002_tabelle_future.test.sql` |
| Estraneo con la sola chiave pubblica: nessuna lettura, scrittura, modifica, cancellazione | OK | `tests/integration/estraneo.test.ts` (elenco tabelle automatico) e prova sul progetto vero |
| Secondo fattore non aggiungibile né rimovibile con la sola password (S1) | OK | `tests/integration/mfa-un-solo-fattore.test.ts` |
| Limite di 14 giorni anche dopo il rinnovo del token (S3) | OK | `tests/integration/login-mfa.test.ts` |
| Funzioni `security definer` con `search_path` fisso | OK | controllo automatico di tutte le migrazioni |
| Funzioni di recupero (`recupero_*`) eseguibili solo dal server | OK | pgTAP `004_recupero.test.sql` |
| Funzioni Edge sul progetto vero: rispondono solo a `https://fiscal.soarlyai.com`, 401 senza accesso | OK | prova `curl` del 2026-11-21 |
| Nessun segreto in repository e build (`service_role`, `sb_secret_`, pepe, codici fiscali) | OK | `npm run scan:secrets`, `tests/unit/segreti-nel-bundle.test.ts` |
| Codice di prova assente dalla build pubblicata | OK | `tests/unit/segreti-nel-bundle.test.ts` |
| Log: nessun dato personale | OK | unico messaggio: tipo di errore dell'avviso e-mail |
| Service worker: solo file dell'app, mai risposte di Supabase | OK | `tests/unit/service-worker.test.ts` |
| CSP con impronte degli script, `frame-ancestors 'none'`, HSTS, `nosniff` | OK | `postbuild.mjs`, `vercel.json`, test della build |
| Pagina di cortesia invariata | OK | test d'impronta SHA-256 |
| Anteprime Vercel protette e senza variabili di Supabase | OK | anteprima del ramo reindirizza all'accesso Vercel; nessuna variabile sul progetto (verificato dall'utente) |
| Segreti delle funzioni sul progetto vero | OK | `supabase secrets list` (solo nomi) |

## Rischi residui accettati (da conoscere)

1. **Dati in chiaro sul server**: chi amministra il progetto Supabase può leggerli (scelta dell'utente,
   costituzione principio VII). Mitigazione: 2FA sull'account Supabase, nessun altro membro.
2. **`style-src 'unsafe-inline'`** nella CSP: necessario agli stili di Fluent UI (Griffel). Gli script
   restano limitati alle impronte.
3. **Cambio password**: la verifica recente è controllata dall'app, non dal server (Supabase non la impone
   senza l'e-mail di riautenticazione). Chi avesse già una sessione completa avrebbe comunque accesso ai dati.
4. **Sostituzione del telefono**: il vecchio fattore va tolto prima di collegare il nuovo (un solo fattore
   per utente): per pochi istanti l'account ha solo la password. Completare la sostituzione subito.
5. **Sessione chiusa da un altro dispositivo**: il permesso già rilasciato vale fino a 15 minuti.
6. **Chi conosce la password** può annullare un ripristino con la frase in corso o vederne lo stato
   (non i dati): accettabile, il proprietario resta avvisato.
7. **Coda e sblocco rapido**: la cifratura sul dispositivo protegge dalla copia dei file, non da codice
   eseguito nella pagina.
8. **Avviso via e-mail del ripristino**: provato con la posta finta locale; l'invio reale con SMTP 465
   va confermato con una prova sul progetto vero.

## Da fare fuori dal codice (utente)

- Confermare la regione del progetto Supabase (preferibilmente UE) e l'accordo sul trattamento dei dati.
- Verificare i termini del piano Hobby di Vercel per questo uso (`TODO(VERCEL_PIANO)`).
- Ridurre a uno i due progetti Vercel collegati al repository.
