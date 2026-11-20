# Feature Specification: Accesso protetto con login e autenticazione a due fattori

**Feature Branch**: `002-accesso-protetto-2fa` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Autenticazione a due fattori per My Fiscal. I dati fiscali sono centralizzati in un database Supabase (https://aldiyymgvngvdrroluus.supabase.co) usato da PC e telefono, conservati in chiaro lato server e protetti da login, 2FA e regole di accesso per riga."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accedere con login e secondo fattore (Priority: P1)

L'utente apre l'app da PC o telefono e, per vedere qualsiasi dato, accede con le proprie credenziali **e** con un secondo fattore (per esempio il codice di un'app di autenticazione). Senza entrambi non vede nessun importo, fattura o dato fiscale.

**Why this priority**: i dati fiscali ed economici sono molto sensibili e sono conservati online. Questa è la protezione di base dell'app.

**Independent Test**: un tentativo di accesso con solo le credenziali, o con solo il secondo fattore, non mostra alcun dato; con entrambi i dati compaiono.

**Acceptance Scenarios**:

1. **Given** un utente con account e secondo fattore configurati, **When** inserisce credenziali e secondo fattore corretti, **Then** accede ai propri dati.
2. **Given** lo stesso utente, **When** inserisce solo le credenziali, **Then** non vede nessun dato e gli viene richiesto il secondo fattore.
3. **Given** un tentativo di lettura dei dati senza essere autenticati, **When** la richiesta arriva al database, **Then** il database non restituisce nulla.
4. **Given** più tentativi errati consecutivi, **When** si supera il limite consentito, **Then** l'accesso viene rallentato o temporaneamente bloccato.

---

### User Story 2 - Solo il proprietario vede i suoi dati (Priority: P1)

Anche se qualcuno ottenesse l'indirizzo del database e la chiave pubblica dell'app (che stanno nel codice pubblicato), non può leggere né modificare nessun dato, perché ogni riga è accessibile solo al proprietario autenticato.

**Why this priority**: l'app e il suo codice sono pubblici; la riservatezza dei dati dipende interamente da queste regole di accesso. Un errore qui espone tutta la contabilità.

**Independent Test**: con un utente diverso, o senza login, ogni tabella risulta vuota in lettura e rifiuta le scritture; con il proprietario autenticato tutto funziona.

**Acceptance Scenarios**:

1. **Given** dati del proprietario nel database, **When** un utente non autenticato prova a leggere ciascuna tabella, **Then** non ottiene nessuna riga.
2. **Given** un secondo utente autenticato, **When** tenta di leggere o modificare le righe del proprietario, **Then** l'operazione è rifiutata o non restituisce nulla.
3. **Given** una nuova tabella aggiunta in futuro, **When** viene creata, **Then** non è accessibile finché non ha le regole di accesso per riga.
4. **Given** il codice pubblicato e il repository, **When** vengono esaminati, **Then** non contengono chiavi segrete né dati personali.

---

### User Story 3 - Usare PC e telefono con lo stesso account (Priority: P2)

L'utente accede da un secondo dispositivo con le stesse credenziali e lo stesso secondo fattore e ritrova subito gli stessi dati. Può vedere i dispositivi con una sessione attiva e chiudere quelle che non riconosce.

**Why this priority**: l'uso su PC e telefono è un requisito dell'app.

**Independent Test**: un dato inserito dal telefono compare sul PC dopo l'accesso e viceversa; chiudere una sessione da un dispositivo impedisce l'accesso da quello.

**Acceptance Scenarios**:

1. **Given** un dato inserito da un dispositivo, **When** l'utente accede dall'altro, **Then** vede lo stesso dato.
2. **Given** due sessioni attive, **When** l'utente chiude la sessione di un dispositivo, **Then** quel dispositivo deve effettuare di nuovo l'accesso.

---

### User Story 4 - Recuperare l'accesso se si perde il secondo fattore (Priority: P2)

Se l'utente perde il telefono con l'app di autenticazione, riprende l'accesso con i **codici di recupero** generati alla configurazione e conservati fuori dall'app, poi configura un nuovo secondo fattore.

**Why this priority**: senza un modo per rientrare, perdere il telefono significherebbe perdere l'accesso alla contabilità.

**Independent Test**: simulando la perdita del secondo fattore, l'utente rientra con un codice di recupero e configura un nuovo secondo fattore, senza perdita di dati.

**Acceptance Scenarios**:

1. **Given** la configurazione iniziale della 2FA, **When** viene completata, **Then** l'app mostra i codici di recupero una sola volta e chiede di confermare di averli conservati.
2. **Given** un secondo fattore perso, **When** l'utente usa un codice di recupero, **Then** rientra e può configurare un nuovo secondo fattore.
3. **Given** un codice di recupero già usato, **When** viene inserito di nuovo, **Then** viene rifiutato.
4. **Given** credenziali, secondo fattore e codici di recupero tutti persi, **When** l'utente tenta di rientrare, **Then** l'app spiega quale procedura di ripristino dell'account è disponibile e quali sono i suoi limiti.

---

### User Story 5 - Bloccarsi da soli e nascondere gli importi (Priority: P2)

Quando l'app resta inattiva o va in background, si blocca e nasconde gli importi. Per rivedere i dati l'utente deve ripetere la verifica. L'utente può anche nascondere gli importi a comando con l'occhio, come in My Money.

**Why this priority**: telefono e PC possono essere lasciati sbloccati o usati in pubblico.

**Independent Test**: dopo il tempo di inattività impostato, l'app si blocca e richiede di nuovo la verifica; con l'occhio chiuso nessun importo è leggibile.

**Acceptance Scenarios**:

1. **Given** un tempo di blocco impostato, **When** l'app resta inattiva per quel tempo, **Then** si blocca e nasconde i dati.
2. **Given** l'app che va in background, **When** l'utente torna, **Then** gli importi sono nascosti finché non li mostra o ripete la verifica.

---

### User Story 6 - Gestire le impostazioni di sicurezza (Priority: P3)

L'utente può cambiare la password, riconfigurare il secondo fattore, rigenerare i codici di recupero e regolare il tempo di blocco, dopo aver ripetuto la verifica.

**Why this priority**: manutenzione ordinaria, non bloccante per l'uso.

**Independent Test**: dopo il cambio password, la vecchia non funziona più e la nuova sì.

**Acceptance Scenarios**:

1. **Given** l'utente autenticato, **When** cambia password, **Then** le altre sessioni devono rieseguire l'accesso.
2. **Given** codici di recupero rigenerati, **When** l'utente li conferma, **Then** i vecchi codici non sono più validi.

---

### Edge Cases

- Il telefono con l'app di autenticazione viene perso o sostituito.
- L'orologio del dispositivo è sbagliato e il codice temporaneo viene rifiutato.
- Nessuna connessione disponibile: l'accesso ai dati potrebbe non essere possibile (comportamento offline da definire).
- Il servizio del database è temporaneamente non disponibile.
- La chiave pubblica nel codice viene copiata da terzi: non deve bastare per leggere dati.
- Una tabella nuova viene creata senza regole di accesso per riga.
- La sessione scade mentre l'utente sta inserendo un dato: il dato non va perso.
- Tentativi di accesso ripetuti da fonti sconosciute.
- Un export di backup in chiaro viene richiesto: l'utente va avvertito del rischio.
- L'account del progetto del database, non quello dell'app, viene compromesso: l'accesso amministrativo ai dati in chiaro è un rischio accettato dall'utente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST richiedere un login con credenziali e un secondo fattore per qualsiasi accesso ai dati fiscali, da PC e da telefono.
- **FR-002**: Il sistema MUST NOT mostrare dati fiscali, importi o riepiloghi prima del completamento di entrambe le verifiche.
- **FR-003**: Il database MUST accettare letture e scritture solo da un utente autenticato e solo sulle righe di cui è proprietario; ogni tabella MUST avere queste regole attive.
- **FR-004**: Il sistema MUST NOT permettere a un utente non autenticato o a un altro utente di leggere o modificare dati del proprietario, anche conoscendo l'indirizzo del database e la chiave pubblica.
- **FR-005**: Chiavi segrete (compresa la chiave di servizio) MUST NOT comparire nel codice dell'app, nel repository, nei log o nel browser; nel codice pubblicato possono stare solo l'indirizzo del progetto e la chiave pubblica.
- **FR-006**: Il sistema MUST permettere l'accesso allo stesso account da più dispositivi e MUST mostrare gli stessi dati su tutti.
- **FR-007**: Il sistema MUST mostrare le sessioni attive e permettere di chiuderle.
- **FR-008**: Il sistema MUST generare alla configurazione della 2FA dei codici di recupero monouso, mostrarli una sola volta, chiedere conferma di averli conservati e permettere di rigenerarli.
- **FR-009**: Il sistema MUST permettere il rientro con un codice di recupero e la riconfigurazione del secondo fattore.
- **FR-010**: Il sistema MUST bloccare l'app e nascondere gli importi dopo un periodo di inattività configurabile e quando l'app va in background.
- **FR-011**: Il sistema MUST offrire la modalità che nasconde gli importi a comando.
- **FR-012**: Il sistema MUST limitare i tentativi di accesso errati con rallentamenti o blocchi temporanei.
- **FR-013**: Il sistema MUST permettere di cambiare password, riconfigurare il secondo fattore e rigenerare i codici di recupero, dopo una nuova verifica.
- **FR-014**: Il sistema MUST impedire che le sessioni scadute causino perdita di dati inseriti: il dato in corso va conservato fino al nuovo accesso.
- **FR-015**: Il sistema MUST rendere obbligatorie le regole di accesso per riga su ogni nuova tabella e MUST avere test automatici che verifichino il rifiuto degli accessi non autorizzati.
- **FR-016**: Il sistema MUST avvisare l'utente, con una dichiarazione chiara, che i dati sono conservati in chiaro nel database e che chi ha accesso amministrativo al progetto può leggerli; l'account di gestione del progetto del database MUST essere protetto con la 2FA.
- **FR-017**: Il sistema MUST NOT inviare i dati a servizi diversi dal database dell'utente.
- **FR-018**: Il sistema MUST avvisare quando l'utente sceglie un export o un backup non cifrato.

### Key Entities *(include if feature involves data)*

- **Account utente**: identità del proprietario dei dati, con credenziali.
- **Secondo fattore**: verifica aggiuntiva associata all'account (es. app di autenticazione).
- **Codici di recupero**: codici monouso generati alla configurazione.
- **Sessione**: accesso attivo di un dispositivo, con scadenza e possibilità di chiusura.
- **Regola di accesso per riga**: criterio che lega ogni riga di dati al suo proprietario.
- **Dato fiscale**: ogni riga di contabilità (CU, fatture, spese, parametri), sempre legata al proprietario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In tutti i test di accesso, nessun dato è visibile con un solo fattore (0 casi di esposizione).
- **SC-002**: In tutti i test, un utente non autenticato o diverso ottiene 0 righe e 0 scritture riuscite su ogni tabella.
- **SC-003**: Una scansione del codice pubblicato e del repository non trova chiavi segrete né dati personali (0 ritrovamenti).
- **SC-004**: Un utente con entrambi i fattori accede in meno di 30 secondi dall'avvio.
- **SC-005**: Un dato inserito da un dispositivo è visibile dall'altro entro pochi secondi dal nuovo accesso o aggiornamento.
- **SC-006**: Dopo la perdita simulata del secondo fattore, l'utente rientra con un codice di recupero e non perde dati.
- **SC-007**: L'app si blocca entro il tempo impostato nel 100% dei casi di prova di inattività o di passaggio in background.
- **SC-008**: Ogni nuova tabella introdotta nel progetto supera il test degli accessi non autorizzati prima di essere accettata.

## Assumptions

- **Decisione dell'utente (2026-11-20)**: i dati sono centralizzati nel database Supabase `https://aldiyymgvngvdrroluus.supabase.co`, usato da PC e telefono. Sostituisce la scelta precedente di nessun server e sincronizzazione manuale con un file.
- **Riservatezza**: i dati sono conservati **in chiaro** lato server, per scelta esplicita dell'utente, protetti da login, 2FA e regole di accesso per riga. È stata scartata, per ora, la cifratura applicata dall'app prima dell'invio.
- L'indirizzo del progetto e la chiave pubblica sono visibili nel codice pubblicato; la sicurezza dei dati NON dipende dalla loro segretezza.
- Il secondo fattore predefinito è un codice temporaneo generato da un'app di autenticazione; altri metodi (chiave di sicurezza, biometria del dispositivo) sono da valutare nel piano in base a ciò che il servizio di autenticazione supporta.
- Un solo utente (il proprietario) usa l'app; la registrazione di nuovi utenti MUST essere disabilitata dopo la creazione dell'account.
- Il comportamento senza connessione (consultazione e inserimento offline) è da definire nel piano; finché non è deciso, l'accesso ai dati richiede la connessione.
- La regione del progetto è da verificare, preferibilmente nell'Unione Europea.
- Il progetto del database è gestito da un account protetto con 2FA e senza altri membri.
- **Fuori ambito**: nuovi utenti e condivisione dei dati, accessi con account di terzi (login social), cifratura dei dati lato app, calcoli fiscali, grafica dell'interfaccia (a parte le schermate di accesso e di sicurezza), schema delle tabelle fiscali (definito nei piani delle singole funzioni).
