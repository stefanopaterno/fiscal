# Contratto: funzioni Edge e funzioni di database

**Piano**: [../plan.md](../plan.md) | **Modello**: [../data-model.md](../data-model.md)

Le funzioni Edge girano **su Supabase** (non su Vercel). Hanno accesso alla chiave di servizio
e ai segreti (pepper dei codici, credenziali SMTP) che **non** compaiono mai nel client, nel
repository o nei log. Tutte rispondono in JSON, accettano solo `POST`, richiedono l'intestazione
`Authorization: Bearer <JWT>` e limitano le origini a quella dell'app.

Convenzione errori: `{ "errore": "<codice>", "messaggio": "<testo in italiano>", "riprova_dopo": <secondi|null> }`
con stato HTTP 400/401/403/423/429. I messaggi non rivelano se un utente, un codice o una frase
esistono (nessuna enumerazione).

## `POST /functions/v1/recovery-code`

Rientro con un codice di recupero (FR-009). Richiede una sessione **aal1** (password già verificata).

**Richiesta**: `{ "codice": "XXXX-XXXX-XXXX-XXXX" }`

**Comportamento**:
1. Verifica JWT (`aal1` o superiore); se la sessione è già `aal2` risponde 400 (non serve).
2. Applica il limite di tentativi: 5 errori in 15 minuti → 429 con `riprova_dopo`.
3. Calcola l'HMAC con il pepper e cerca un codice non usato del lotto corrente.
4. Se valido: segna `usato_il = now()`, **elimina il fattore TOTP** dell'utente con l'API di
   amministrazione, scrive l'evento `codice_recupero_usato`, restituisce lo stato.
5. Se non valido (errato o già usato, scenario 4.3): 401 `codice_non_valido`, evento di errore.

**Risposta 200**: `{ "stato": "fattore_rimosso", "codici_residui": 9, "avviso": "Configura subito un nuovo secondo fattore e rigenera i codici." }`

Dopo la risposta il client porta l'utente alla configurazione del nuovo fattore
(`/app/accesso/configura/`); finché non è ricompletata la verifica TOTP la sessione resta `aal1`
e il database non restituisce dati.

## `POST /functions/v1/recovery-phrase`

Ripristino con la frase di recupero (FR-023, FR-024). Richiede sessione **aal1**.

**Azioni** (campo `azione`):

| Azione | Dati | Effetto |
|---|---|---|
| `avvia` | `{ "frase": "..." }` | verifica l'hash argon2id; se corretta crea `recovery_requests` in stato `in_attesa` con `esegui_dopo = now() + 48h`, invia l'e-mail di avviso, scrive `frase_avviata`. Se esiste già una richiesta in attesa, la restituisce senza crearne altre |
| `stato` | — | restituisce la richiesta in corso (stato, `esegui_dopo`) per il banner |
| `annulla` | — | porta la richiesta a `annullata` (`motivo_chiusura = annullata_dall_utente`), scrive `frase_annullata` |
| `completa` | — | solo se `now() >= esegui_dopo` e stato `in_attesa`: elimina il fattore TOTP, **invalida la frase** (`frase_recupero_hash = null`), stato `completata`, evento `frase_completata`; il client impone di impostare una nuova frase |
| `imposta` | `{ "frase": "...", "password_attuale_verificata": true }` | richiede sessione **aal2** e verifica recente; controlla la lunghezza minima; salva l'hash argon2id; azzera i tentativi |

**Regole**:
- Mai accetta la frase da una sessione già `aal2` per saltare qualcosa: serve solo a ripristinare.
- 5 frasi errate → `frase_recupero_bloccata_fino = now() + 24h`, risposta 423, evento e avviso
  (scenario 6). Il contatore si azzera solo dopo un successo.
- Se l'invio dell'e-mail di avviso fallisce, la richiesta **non viene creata** (risposta 503
  `avviso_non_inviabile`): meglio nessun ripristino che un ripristino silenzioso.
- Qualsiasi login `aal2` riuscito annulla in automatico la richiesta in attesa
  (`motivo_chiusura = accesso_valido`) e il banner dice all'utente cosa è successo.

## Funzioni di database (richiamate con `supabase.rpc`)

| Funzione | Argomenti | Risposta | Autorizzazione |
|---|---|---|---|
| `mie_sessioni()` | — | righe `{ id, creata_il, ultimo_uso, browser, corrente }` | `aal2` + accesso completo valido |
| `chiudi_mia_sessione(p_id uuid)` | id sessione | `true` / errore se non è dell'utente | `aal2` + accesso completo valido; sessione corrente esclusa (usare il logout) |
| `codici_recupero_residui()` | — | intero | `aal2` |

## Operazioni sensibili (riautenticazione)

Cambio password, rigenerazione dei codici, esportazione dei dati, disattivazione della 2FA e
impostazione/modifica della frase richiedono una **verifica recente** (FR-019): il client chiede
di nuovo password e codice a 6 cifre; la funzione o la policy controlla che l'orario dell'ultima
verifica TOTP nel token sia entro 5 minuti. Lo sblocco rapido non è accettato.
