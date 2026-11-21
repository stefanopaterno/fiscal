---

description: "Elenco dei lavori per la specifica 002 - Accesso protetto con login e 2FA"
---

# Tasks: Accesso protetto con login e autenticazione a due fattori

**Input**: documenti in `specs/002-accesso-protetto-2fa/` ([plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md))

**Prerequisiti**: plan.md e spec.md (presenti). Costituzione 2.6.1.

**Test**: **inclusi**. La costituzione (principio VII) e FR-015 richiedono test automatici delle regole di accesso; il piano prevede pgTAP, Vitest, integrazione e Playwright. Per ogni storia i test si scrivono **prima** e devono fallire prima dell'implementazione.

**Organizzazione**: per storia utente, così ogni storia si può costruire e provare da sola.

## Formato: `[ID] [P?] [Storia] Descrizione con percorso del file`

- **[P]**: si può fare in parallelo (file diversi, nessuna dipendenza da lavori incompleti)
- **[USn]**: storia della specifica (US1 accesso con 2FA, US2 solo il proprietario, US3 PC e telefono, US4 recupero, US5 blocco e occhio, US6 impostazioni di sicurezza)
- `[x]` = già fatto prima di questo elenco (con il commit di riferimento)
- Citazioni dei campi con vincoli: `data-model.md` + `Entità.campo`

## Percorsi (da plan.md)

Progetto Next.js alla radice: `app/`, `src/`, `public/`, `tests/`, `scripts/`; parte server in `supabase/`. La pagina di cortesia `index.html` e `robots.txt` **non si modificano**.

---

## Phase 1: Setup (scheletro del progetto)

**Scopo**: creare il progetto multipagina senza toccare la pagina di cortesia.

- [x] T001 Cartella `supabase/` con `config.toml` (registrazioni chiuse, un solo fattore MFA, JWT 15 min, `site_url` su fiscal.soarlyai.com) — commit `5b5b46c`, `213c647`; applicata al progetto con `supabase config push --remote`
- [x] T002 Inizializzare il progetto Next.js (App Router) con TypeScript `strict` in `package.json`, `tsconfig.json`, `.nvmrc` (Node 24) e `engines`; bloccare le versioni nel file di lock; **non** creare né modificare `index.html` alla radice
- [x] T003 Configurare `next.config.ts` con `output: 'export'`, `basePath: '/app'`, `trailingSlash: true`, `images.unoptimized: true` (research D-12)
- [x] T004 [P] Aggiungere `.gitignore` per `.next/`, `out/`, `node_modules/`, `.env.local`, `test-results/` (senza rimuovere le voci già presenti)
- [x] T005 [P] Configurare ESLint e Prettier in `eslint.config.mjs` e `.prettierrc`, e le regole di import vietato: `src/engine/**` non può importare `react`, `next`, `@supabase/*` né moduli di rete (principio I)
- [x] T006 [P] Configurare Vitest in `vitest.config.ts` e Playwright in `playwright.config.ts` (schermo 360×740 per telefono e 1280×800 per PC)
- [x] T007 [P] Creare `.env.example` con soli `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la chiave pubblica `sb_publishable_...`); verificare che `.env.local` sia ignorato (FR-005)
- [x] T008 Scrivere `scripts/postbuild.mjs` che copia **byte per byte** `index.html` e `robots.txt` in `out/` e lo collega al comando `npm run build` (research D-12)
- [x] T009 [P] Test Vitest `tests/unit/postbuild.test.ts`: dopo la build, SHA-256 di `out/index.html` e `out/robots.txt` identici a quelli alla radice (SC: pagina di cortesia invariata)
- [x] T010 [P] Creare `vercel.json` con le intestazioni di sicurezza (CSP verso `aldiyymgvngvdrroluus.supabase.co`, HSTS, nosniff, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `frame-ancestors 'none'`) e cache `no-store` per HTML e `sw.js` (research D-15)
- [x] T011 [P] Creare `scripts/scan-secrets.mjs` (o configurare `gitleaks`) e lo script npm `scan:secrets` che controlla repository e `out/` (nessuna `service_role`, nessun dato personale) (SC-003)
- [x] T012 Aggiungere gli script npm `typecheck`, `test`, `test:integration`, `test:e2e`, `build`, `scan:secrets` come in [quickstart.md](quickstart.md)

---

## Phase 2: Foundational (blocca tutte le storie)

**Scopo**: tutto ciò che serve a ogni storia. **Nessuna storia parte prima del completamento.**

### Base dati già pronta

- [x] T013 Migrazione `supabase/migrations/20261121000100_sicurezza_base.sql`: schema `private`, trigger `ensure_rls`, tabelle `user_security`, `recovery_codes`, `recovery_requests`, `security_events`, funzione `private.accesso_completo_valido()`, policy (proprietario + restrittiva `aal2`), funzioni `mie_sessioni`, `chiudi_mia_sessione`, `codici_recupero_residui` — commit `ac1a162`; applicata con `supabase db push --remote`
- [x] T014 Test pgTAP `supabase/tests/database/001_rls_sicurezza.test.sql` (14/14 superati in locale) — commit `b088e00`
- [x] T015 Verifica da estraneo sul progetto vero (anonimo: lettura/scrittura/cancellazione rifiutate, registrazione rifiutata, schema `private` non esposto)

### Prove tecniche di fondazione (research.md, "Prove da fare per prime")

- [x] T016 Prova **S5**: pagina di prova `app/_prove/fluent/page.tsx` con `FluentProvider` e `RendererProvider`; `npm run build`; aprirla con JavaScript attivo e disattivo e annotare esito e ripiego (app solo lato client con scheletro) in fondo a `research.md`
- [x] T017 Prova **S6**: generare il service worker dopo `next build` con Serwist in modalità configuratore (ripiego `workbox-build`) in `scripts/build-sw.mjs`; verificare che le pagine esportate siano nella precache e che le richieste a `*.supabase.co` siano sempre `NetworkOnly`; annotare l'esito in `research.md` (chiude `TODO(PWA_NEXT)`)
- [ ] T018 Prova **S4** (richiede l'utente): `vercel build` in locale o progetto Vercel temporaneo con preset Next.js, `output: 'export'`, `basePath`, file di cortesia copiati; annotare l'esito in `research.md`. **Nessun merge su `main` finché non passa**. Le variabili di Supabase su Vercel MUST essere impostate **solo** per l'ambiente Production: l'anteprima del ramo non si collega mai al database (costituzione, Hosting); anteprima protetta con Vercel Authentication

### Infrastruttura comune

- [x] T019 Creare il client in `src/lib/supabase/client.ts` (solo URL e chiave pubblica da variabili `NEXT_PUBLIC_*`, `persistSession` e rinnovo automatico attivi) e un controllo che fallisce se compare una chiave `service_role` (FR-005)
- [x] T020 [P] Helper del livello di garanzia in `src/lib/supabase/aal.ts`: `getStatoAccesso()` che restituisce `anonimo | aal1 | aal1_senza_fattore | aal2` usando `auth.mfa.getAuthenticatorAssuranceLevel()` e `auth.mfa.listFactors()`
- [x] T021 [P] Test unitari `tests/unit/aal.test.ts` della macchina a stati di [contracts/app-routes-and-lock.md](contracts/app-routes-and-lock.md) (tutte le transizioni elencate)
- [x] T022 Layout radice `app/layout.tsx` con `FluentProvider` (tema chiaro e scuro), lingua `it`, `viewport` mobile-first, e struttura comune in `src/ui/Shell.tsx` (area toccabile minima 44 px, nessuno scroll orizzontale da 360 px)
- [x] T023 [P] Componente di protezione pagina `src/ui/ProtectedPage.tsx`: mostra solo uno scheletro finché non verifica sessione e `aal2`, poi reindirizza al login se manca; nessun dato nell'HTML esportato
- [x] T024 [P] Componente di aiuto contestuale `src/ui/AiutoContestuale.tsx` (testo semplicissimo, esempio, "perché mi viene chiesto", "da dove viene") predisposto per la specifica 011
- [x] T025 [P] Catalogo dei messaggi in italiano `src/lib/messaggi.ts` (errori di accesso senza rivelare se l'utente esiste, limiti di tentativi, rete assente)
- [x] T026 [P] Manifest e icone PWA in `public/manifest.webmanifest` e `public/icons/` (nome mostrato coerente con la pagina di cortesia)
- [x] T027 Percorso di smistamento `app/page.tsx` (senza sessione → `/app/accesso/`, con sessione completa → `/app/home/`)

**Checkpoint**: scheletro, client Supabase, prove S4–S6 registrate. Le storie possono partire.

---

## Phase 3: User Story 1 - Accedere con login e secondo fattore (Priorità: P1) 🎯 MVP

**Obiettivo**: senza password **e** codice non si vede nessun dato; con entrambi sì (FR-001, FR-002, FR-012).

**Test indipendente**: solo password → nessun dato e richiesta del codice; solo codice → impossibile; entrambi → home.

### Test per US1 (da scrivere prima; devono fallire)

- [x] T028 [P] [US1] Test di integrazione `tests/integration/login-mfa.test.ts` contro lo stack locale: sola password → `aal1` e 0 righe su ogni tabella; password + TOTP → `aal2` e dati visibili; TOTP errato rifiutato; tentativi ripetuti rallentati (FR-012)
- [x] T029 [P] [US1] Test di integrazione `tests/integration/mfa-un-solo-fattore.test.ts` (**S1**): con fattore già verificato e sessione `aal1`, `mfa.enroll` deve fallire
- [x] T030 [P] [US1] Test E2E Playwright `tests/e2e/accesso.spec.ts` a 360 px: prima configurazione (QR, codice), accesso, rifiuto con solo password; genera i codici TOTP con la libreria `otpauth`
- [x] T031 [P] [US1] Test pgTAP `supabase/tests/database/005_eventi.test.sql`: ogni trigger di sicurezza scrive in `security_events` il tipo atteso e nessun contenuto oltre all'etichetta del dispositivo

### Implementazione per US1

- [x] T032 [US1] Pagina password `app/accesso/page.tsx` con `src/features/auth/FormPassword.tsx` (`signInWithPassword`, messaggio generico in caso di errore, gestione del limite di tentativi) con i relativi aiuti contestuali (specifica 011), scritti insieme alla pagina
- [x] T033 [US1] Pagina del codice `app/accesso/secondo-fattore/page.tsx` con `src/features/auth/FormCodice.tsx` (`mfa.challengeAndVerify`, 6 cifre, avviso se l'orologio del dispositivo è sbagliato) con i relativi aiuti contestuali (specifica 011), scritti insieme alla pagina
- [x] T034 [US1] Pagina di prima configurazione `app/accesso/configura/page.tsx` con `src/features/auth/ConfiguraSecondoFattore.tsx`: `mfa.enroll` (QR e chiave testuale), verifica del primo codice; i **codici di recupero e la frase** si aggiungono in US4 con i relativi aiuti contestuali (specifica 011), scritti insieme alla pagina
- [x] T035 [US1] Hook di sessione `src/features/auth/useSessione.ts` (stato di accesso, rinnovo del token, logout che chiama `pulisci` della coda quando esisterà) e reindirizzamenti in `src/ui/ProtectedPage.tsx`
- [x] T036 [US1] Home protetta segnaposto `app/home/page.tsx` dentro `ProtectedPage` (nessun dato fiscale ancora)
- [ ] T037 [US1] (Script pronto; manca l'esecuzione sul progetto vero da parte dell'utente) Script locale `scripts/prova-supabase.mjs` per le prove **S1** e **S3** sul progetto vero: legge email, password e codice dalla tastiera (mai salvati), verifica che `enroll` con `aal1` fallisca e che `amr` con l'orario del TOTP compaia nel token anche dopo il rinnovo; annotare gli esiti in `research.md`
- [x] T038 [US1] (Non necessario: S3 superata sullo stack locale, vedi research.md) Se S3 fallisce: aggiornare `private.accesso_completo_valido()` per usare `auth.sessions.created_at` (claim `session_id`) in una nuova migrazione `supabase/migrations/<data>_accesso_completo_ripiego.sql` e adattare il test pgTAP (lavoro condizionato all'esito di T037)
- [x] T039 [US1] Migrazione `supabase/migrations/<data>_eventi_sicurezza.sql` con trigger `security definer` che scrivono gli eventi da database (`data-model.md` + `security_events.tipo`): nuova riga in `auth.sessions` → `login_ok`; fattore in `auth.mfa_factors` passato a `verified` → `mfa_configurato`; cambio password in `auth.users` → `password_cambiata`; cancellazione da `auth.sessions` → `sessione_chiusa`; modifica di `user_security.sblocco_rapido_attivo` → `sblocco_rapido_attivato`/`disattivato`

**Checkpoint**: accesso con 2FA completo e provato; MVP consegnabile.

---

## Phase 4: User Story 2 - Solo il proprietario vede i suoi dati (Priorità: P1)

**Obiettivo**: chi ha l'indirizzo e la chiave pubblica non legge né scrive nulla; nessuna tabella resta senza regole (FR-003, FR-004, FR-005, FR-015).

**Test indipendente**: con anonimo, altro utente, `aal1` e accesso scaduto ogni tabella dà 0 righe e 0 scritture.

### Test per US2

- [x] T040 [P] [US2] Estendere `supabase/tests/database/001_rls_sicurezza.test.sql` (o nuovo `002_tabelle_future.test.sql`): crea una tabella di prova **senza** policy e verifica che il trigger `ensure_rls` attivi la RLS e che il test "ogni tabella conforme" la segnali come non conforme (scenario 3 della storia 2)
- [x] T041 [P] [US2] Test di integrazione `tests/integration/estraneo.test.ts` con la sola chiave pubblica: lettura, inserimento, modifica e cancellazione su ogni tabella di `public` rifiutati; `private` non esposto; registrazione rifiutata (`signup_disabled`) (SC-002, D-05)
- [x] T042 [P] [US2] Test `tests/unit/segreti-nel-bundle.test.ts`: dopo `npm run build`, `out/` non contiene `service_role`, pepper o dati personali (SC-003)

### Implementazione per US2

- [x] T043 [US2] Modello di migrazione per le tabelle future in `supabase/templates/nuova_tabella.sql` copiato da [contracts/rls-policy-contract.md](contracts/rls-policy-contract.md) (colonne `id`, `owner_id`, `versione`, `creato_il`, `aggiornato_il`, RLS, policy, revoca ad `anon`)
- [x] T044 [US2] Rendere esplicito nel test "ogni tabella conforme" l'elenco delle eccezioni (vuoto) in `supabase/tests/database/003_conformita.test.sql` e fallire se una tabella di `public` non ha le due policy
- [x] T045 [P] [US2] Flusso di integrazione continua in `.github/workflows/controlli.yml`: `typecheck`, `npm test`, `supabase test db` (stack locale), `scan:secrets`, build con verifica d'impronta della pagina di cortesia
- [x] T046 [US2] Dichiarazione chiara in `app/impostazioni/sicurezza/page.tsx` (sezione "Dove sono i tuoi dati") che i dati sono in chiaro nel database e che chi ha accesso amministrativo al progetto può leggerli; promemoria sulla 2FA dell'account Supabase (FR-016)

**Checkpoint**: ogni tabella presente e futura è protetta e provata automaticamente.

---

## Phase 5: User Story 3 - PC e telefono con lo stesso account (Priorità: P2)

**Obiettivo**: stessi dati su più dispositivi, elenco e chiusura delle sessioni, inserimenti senza rete mai persi (FR-006, FR-007, FR-014, FR-021, FR-022).

**Test indipendente**: un dato inserito dal telefono compare sul PC; chiudere una sessione impedisce il rinnovo; un inserimento con rete spenta parte alla riaccensione senza duplicati.

### Test per US3

- [ ] T047 [US3] Tabella di prova `prove_sincronizzazione` in `supabase/seed.sql`, conforme al contratto RLS (`data-model.md` + `prove_sincronizzazione`): esiste solo nello stack locale (il seed non viene applicato con `supabase db push`)
- [ ] T048 [P] [US3] Test di integrazione `tests/integration/sessioni.test.ts`: `mie_sessioni()` elenca solo le proprie; `chiudi_mia_sessione()` rifiuta l'id altrui e la sessione corrente; con `aal1` è rifiutata
- [ ] T049 [P] [US3] Test unitari `tests/unit/offline-queue.test.ts`: accodamento, invio idempotente (stesso `id` due volte → una riga), conflitto per `versioneBase`, cancellazione al logout, nessuna copia completa dei dati (FR-022)
- [ ] T050 [P] [US3] Test E2E `tests/e2e/rete-assente.spec.ts`: rete spenta durante un inserimento di prova nella tabella `prove_sincronizzazione` → "in attesa di invio"; riaccesa → inviato senza duplicati; sessione scaduta nel frattempo → la coda aspetta il nuovo accesso
- [ ] T051 [P] [US3] Test E2E `tests/e2e/due-dispositivi.spec.ts` con due contesti di browser: un dato inserito in `prove_sincronizzazione` dal primo è visibile dal secondo entro pochi secondi dall'aggiornamento (SC-005)

### Implementazione per US3

- [ ] T052 [P] [US3] Modulo coda in `src/features/offline-queue/queue.ts` con IndexedDB (`idb`), AES-GCM e chiave `CryptoKey` non esportabile (research D-11); tipi `VoceCoda` come in [contracts/app-routes-and-lock.md](contracts/app-routes-and-lock.md)
- [ ] T053 [US3] Invio e conflitti in `src/features/offline-queue/sync.ts`: `insert ... on conflict (id) do nothing`, modifiche con `versione = versioneBase`, `svuotaVersoServer()` e `risolviConflitto()`; parte solo con sessione `aal2` valida
- [ ] T054 [US3] Componente `src/features/offline-queue/StatoCoda.tsx` con stati "in attesa di invio", "inviato", "in conflitto" e confronto delle due versioni
- [ ] T055 [P] [US3] Elenco sessioni in `src/features/sessions/ElencoSessioni.tsx` (`rpc('mie_sessioni')`, etichetta del dispositivo, ultimo uso, pulsante "Chiudi" tranne per la corrente) montato in `app/impostazioni/sicurezza/page.tsx` con i relativi aiuti contestuali (specifica 011), scritti insieme alla pagina
- [ ] T056 [US3] Conservare il dato in corso quando la sessione scade durante un inserimento (FR-014): salvataggio della bozza nella coda prima del reindirizzamento al login in `src/features/auth/useSessione.ts`
- [ ] T057 [US3] Regola di rete nel service worker (da T017): richieste a `*.supabase.co` sempre `NetworkOnly`, nessuna risposta con dati dell'utente in cache; test che lo verifica in `tests/unit/sw-regole.test.ts`

**Checkpoint**: uso su più dispositivi e inserimenti senza rete affidabili.

---

## Phase 6: User Story 4 - Recuperare l'accesso (Priorità: P2)

**Obiettivo**: si rientra con i codici di recupero o con la frase (con attesa e avviso) senza mai saltare il secondo fattore (FR-008, FR-009, FR-023, FR-024).

**Test indipendente**: dopo la perdita simulata del fattore l'utente rientra con un codice, configura un nuovo fattore e non perde dati; il codice usato non vale più.

### Preparazione contratti

- [x] T058 [US4] Completare [contracts/edge-functions.md](contracts/edge-functions.md) con la funzione **`recovery-codes`** (azioni `genera`/`rigenera`, richiede `aal2` per la rigenerazione, mostra i 10 codici una sola volta, invalida il lotto precedente, scrive `codici_rigenerati`): oggi il contratto descrive solo l'uso dei codici e manca la generazione lato server (necessaria perché esistono solo gli HMAC)

### Test per US4

- [x] T059 [P] [US4] Test di integrazione `tests/integration/recovery-code.test.ts`: codice valido → fattore rimosso e codice segnato usato; stesso codice rifiutato; codice errato 5 volte → 429; con sessione `aal2` → 400
- [x] T060 [P] [US4] Test di integrazione `tests/integration/recovery-phrase.test.ts`: `avvia` crea una sola richiesta in attesa con `esegui_dopo = +48 h` (`data-model.md` + `recovery_requests.esegui_dopo`); `completa` prima della scadenza rifiutata; dopo la scadenza elimina il fattore e invalida la frase; 5 frasi errate → blocco 24 h (`data-model.md` + `user_security.frase_recupero_bloccata_fino`); accesso `aal2` valido annulla la richiesta; avviso non inviabile → nessuna richiesta
- [x] T061 [P] [US4] (Fatto con Vitest in `tests/unit/recupero-crypto.test.ts`: la libreria è la stessa in Deno e Node; Deno non installato) Test unitari `supabase/functions/_shared/*.test.ts` (Deno): HMAC dei codici stabile con lo stesso pepper e diverso con un altro; argon2id con sale per utente; limite di tentativi
- [x] T062 [P] [US4] Test pgTAP `supabase/tests/database/004_recupero.test.sql`: una sola richiesta `in_attesa` per utente (`data-model.md` + `recovery_requests.stato`); `recovery_codes` mai leggibile dal client; transizioni di stato ammesse

### Implementazione per US4

- [x] T063 [P] [US4] Libreria condivisa `supabase/functions/_shared/crypto.ts`: generazione di 10 codici da 80 bit, HMAC-SHA256 con pepper dai segreti, argon2id (`@noble/hashes`) per la frase (`data-model.md` + `recovery_codes.codice_hmac`, `user_security.frase_recupero_hash`)
- [x] T064 [P] [US4] (Limiti di tentativi ed eventi realizzati nel database, migrazione 0300, così valgono per qualsiasi chiamante) Libreria condivisa `supabase/functions/_shared/limiti.ts` (tentativi per finestra, aggiornamento di `data-model.md` + `user_security.frase_recupero_tentativi`) e `_shared/eventi.ts` (scrittura in `security_events` con `tipo` tra i valori di `data-model.md` + `security_events.tipo`, etichetta del dispositivo senza IP completo)
- [x] T065 [P] [US4] Libreria condivisa `supabase/functions/_shared/avviso.ts` per l'e-mail di avviso tramite l'SMTP del progetto (nessun dato fiscale nel testo); se non configurato restituisce errore `avviso_non_inviabile`
- [x] T066 [US4] Funzione `supabase/functions/recovery-codes/index.ts` (genera/rigenera, lotto incrementale: `data-model.md` + `recovery_codes.lotto`, invalida i vecchi)
- [x] T067 [US4] Funzione `supabase/functions/recovery-code/index.ts` come da [contracts/edge-functions.md](contracts/edge-functions.md): verifica `aal1`, limite tentativi, HMAC, `usato_il` (`data-model.md` + `recovery_codes.usato_il`), eliminazione del fattore TOTP con l'API di amministrazione, evento
- [x] T068 [US4] Funzione `supabase/functions/recovery-phrase/index.ts` con azioni `avvia`, `stato`, `annulla`, `completa`, `imposta`; stati e transizioni di `recovery_requests.stato`, scadenza dopo 7 giorni (`data-model.md` + `recovery_requests.stato`); annullamento automatico a ogni accesso `aal2` valido; blocco dopo 5 errori (`data-model.md` + `user_security.frase_recupero_bloccata_fino`) e attesa (`data-model.md` + `recovery_requests.esegui_dopo`)
- [x] T069 [US4] Registrare le funzioni in `supabase/config.toml` (`[functions.recovery-code]`, `[functions.recovery-codes]`, `[functions.recovery-phrase]` con `verify_jwt = true`) e documentare i segreti da impostare (pepper, SMTP) in `supabase/README.md` **senza** valori
- [x] T070 [US4] Estendere `app/accesso/configura/page.tsx`: dopo la verifica del primo codice mostra i **codici di recupero una sola volta**, chiede la conferma di averli conservati (`data-model.md` + `user_security.codici_confermati_il`) e l'impostazione della frase di recupero (lunghezza minima) con i relativi aiuti contestuali (specifica 011), scritti insieme alla pagina
- [x] T071 [US4] Pagina `app/accesso/recupero/page.tsx` con `src/features/auth/Recupero.tsx`: scelta codice o frase, stato dell'attesa con conto alla rovescia, pulsante "Annulla ripristino", spiegazione dei limiti se tutto è perso (scenario 4.4) con i relativi aiuti contestuali (specifica 011), scritti insieme alla pagina
- [x] T072 [US4] Banner bloccante `src/features/auth/BannerRipristino.tsx` mostrato a ogni accesso mentre una richiesta è in attesa
- [x] T073 [US4] Test E2E `tests/e2e/recupero.spec.ts`: perdita simulata del fattore → rientro con codice → nuova configurazione; frase → attesa → annullamento da accesso valido
- [ ] T074 [US4] (Istruzioni pronte in `supabase/README.md`) **Azione dell'utente**: impostare i segreti delle funzioni (`supabase secrets set ...`, pepper e SMTP) e distribuirle (`supabase functions deploy --remote`); annotare l'esito in `supabase/README.md`
- [x] T075 [US4] Sezione "Ripristino da amministratore" in `supabase/README.md`: ultima risorsa quando fattore, codici e frase sono tutti persi; passi nel pannello Supabase (con la 2FA dell'account) per eliminare il fattore MFA dell'utente; testo che l'app mostra nello scenario 4.4 (T071)

**Checkpoint**: recupero provato; nessuna via per saltare il secondo fattore.

---

## Phase 7: User Story 5 - Blocco automatico e occhio (Priorità: P2)

**Obiettivo**: l'app si blocca e nasconde gli importi; sblocco rapido sicuro; occhio a comando (FR-010, FR-011, FR-019, FR-020).

**Test indipendente**: dopo 5 minuti di inattività o in background l'app si blocca; con l'occhio chiuso nessun importo è leggibile.

### Test per US5

- [ ] T076 [P] [US5] Test unitari `tests/unit/blocco.test.ts` con orologio simulato: blocco dopo `user_security.blocco_minuti` (`data-model.md` + `user_security.blocco_minuti`), blocco immediato in background, sblocco rapido rifiutato oltre `user_security.accesso_completo_giorni` (`data-model.md`), su nuovo dispositivo e per operazioni sensibili
- [ ] T077 [P] [US5] Test E2E `tests/e2e/blocco.spec.ts`: inattività → pagina `/app/blocco/` senza importi; occhio chiuso → importi nascosti; dopo 3 rifiuti dello sblocco rapido chiede password e codice

### Implementazione per US5

- [ ] T078 [US5] Prova **S2**: pagina di prova `app/_prove/webauthn/page.tsx` per l'estensione PRF su Safari iOS e Chrome Android; annotare in `research.md`; se non supportata, lo sblocco rapido non viene offerto su quel dispositivo (research D-08)
- [ ] T079 [P] [US5] Timer di inattività e rilevamento dello sfondo in `src/features/lock/useBlocco.ts` (svuota la memoria dei dati, mantiene il token cifrato)
- [ ] T080 [P] [US5] Modalità occhio in `src/features/lock/useOcchio.ts` e `src/ui/ImportoNascosto.tsx` (si ripristina nascosta all'avvio, FR-011)
- [ ] T081 [US5] Sblocco rapido con WebAuthn in `src/features/lock/sbloccoRapido.ts` (`@simplewebauthn/browser`, `userVerification: required`, chiave di cifratura dal PRF per il token di sessione; nessuna sessione nuova, FR-020)
- [ ] T082 [US5] Pagina `app/blocco/page.tsx` con sblocco rapido o login completo, 3 rifiuti → login completo, regole di "sempre login completo" del contratto con i relativi aiuti contestuali (specifica 011), scritti insieme alla pagina
- [ ] T083 [US5] Interruttore "sblocco rapido" (attiva/disattiva, `data-model.md` + `user_security.sblocco_rapido_attivo`) in `app/impostazioni/sicurezza/page.tsx`

**Checkpoint**: blocco e sblocco rapido funzionano senza indebolire il login.

---

## Phase 8: User Story 6 - Impostazioni di sicurezza (Priorità: P3)

**Obiettivo**: cambiare password, riconfigurare il fattore, rigenerare i codici, regolare i tempi (FR-013).

**Test indipendente**: dopo il cambio password la vecchia non funziona e la nuova sì; le altre sessioni devono rifare l'accesso.

### Test per US6

- [ ] T084 [P] [US6] Test di integrazione `tests/integration/impostazioni.test.ts`: cambio password con verifica recente richiesta; altre sessioni invalidate (`signOut({ scope: 'others' })`); tempi di blocco fuori limite rifiutati (`user_security.blocco_minuti` 1–60, `user_security.accesso_completo_giorni` 1–30 in `data-model.md`); rigenerazione codici invalida il lotto precedente
- [ ] T085 [P] [US6] Test E2E `tests/e2e/impostazioni.spec.ts` da telefono: cambio password e rigenerazione codici con nuova verifica

### Implementazione per US6

- [ ] T086 [US6] Verifica recente in `src/features/auth/useVerificaRecente.ts`: chiede di nuovo password e codice a 6 cifre per le operazioni sensibili (entro 5 minuti) e non accetta lo sblocco rapido
- [ ] T087 [US6] Sezioni in `app/impostazioni/sicurezza/page.tsx`: password (`updateUser` + `signOut({ scope: 'others' })`), sostituzione del secondo fattore (mai la disattivazione), rigenerazione dei codici (chiama `recovery-codes`), modifica della frase, tempi di blocco e di accesso completo con i limiti (`data-model.md` + `user_security.blocco_minuti`, `data-model.md` + `user_security.accesso_completo_giorni`) con i relativi aiuti contestuali (specifica 011), scritti insieme alla pagina
- [ ] T088 [US6] Registro eventi di sicurezza in `src/features/sessions/RegistroEventi.tsx` (lettura di `security_events`, senza contenuti)

**Checkpoint**: manutenzione ordinaria della sicurezza completa.

---

## Phase 9: Polish e verifiche trasversali

- [ ] T089 [P] Controllo finale degli aiuti contestuali (specifica 011): ogni schermata e campo di accesso e sicurezza ha il suo aiuto, scritto insieme alla pagina; testi raccolti e riletti in `src/features/auth/aiuti.ts` e `src/features/lock/aiuti.ts`
- [ ] T090 [P] Controllo di usabilità: nessuno scroll orizzontale da 360 px e aree toccabili da 44 px su tutte le pagine di `app/` (test Playwright `tests/e2e/layout.spec.ts`)
- [ ] T091 Avviso di export non cifrato (FR-018): componente `src/ui/AvvisoExportInChiaro.tsx` pronto per le funzioni di esportazione future
- [ ] T092 Eseguire tutti gli scenari 1–14 di [quickstart.md](quickstart.md) da telefono e PC e annotare gli esiti
- [ ] T093 Aggiornare `.specify/memory/constitution.md`: chiudere `TODO(OFFLINE_CODA)`, `TODO(RECUPERO_ATTESA)`, `TODO(PWA_NEXT)` e `TODO(STACK_UI)` con le decisioni prese, e (con l'utente) `TODO(VERCEL_PIANO)` e `TODO(ACCESSO_APP)`
- [ ] T094 Revisione di sicurezza finale: rilettura di [contracts/rls-policy-contract.md](contracts/rls-policy-contract.md), controllo che nessun segreto sia in repository, bundle o log, verifica che le anteprime di Vercel siano disattivate o protette; verificare che su Vercel le variabili di Supabase siano presenti solo nell'ambiente Production

---

## Dipendenze e ordine

### Tra le fasi

- **Setup (Phase 1)** → **Foundational (Phase 2)** → storie. Le prove T016–T018 vanno fatte **prima** di costruire le pagine che ne dipendono.
- **US1** parte dopo la Foundational e non dipende da altre storie. È l'MVP.
- **US2** è indipendente da US1 per il database (già pronto), ma i test di integrazione si appoggiano all'accesso di US1.
- **US3** dipende da US1 (sessione) e da T017/T057 (service worker).
- **US4** dipende da US1 (`configura` e il rientro) e da T058 (contratto).
- **US5** dipende da US1 (sessione) e da T078 (S2).
- **US6** dipende da US1 e da US4 (rigenerazione dei codici).
- **Polish** dopo le storie desiderate.

### Dentro ogni storia

Test (devono fallire) → librerie/moduli → funzioni e pagine → integrazione → verifica del checkpoint.

### Opportunità di parallelismo

- Setup: T004–T007, T009–T011 in parallelo.
- Foundational: T020, T021, T023–T026 in parallelo dopo T019 e T022.
- Dopo la Foundational, US2, US3 e US5 possono procedere in parallelo mentre si completa US1; US4 e US6 seguono US1.
- Dentro US4: T059–T062 (test) e T063–T065 (librerie) in parallelo.

## Esempio di parallelo: User Story 4

```text
# Test insieme:
T059 tests/integration/recovery-code.test.ts
T060 tests/integration/recovery-phrase.test.ts
T061 supabase/functions/_shared/*.test.ts
T062 supabase/tests/database/004_recupero.test.sql

# Librerie condivise insieme:
T063 supabase/functions/_shared/crypto.ts
T064 supabase/functions/_shared/limiti.ts e eventi.ts
T065 supabase/functions/_shared/avviso.ts
```

## Strategia di realizzazione

### MVP (solo US1)

1. Setup (T002–T012) → Foundational (T016–T027, incluse le tre prove).
2. US1 (T028–T039): accesso con password + codice, prove S1 e S3 sul progetto vero.
3. **Fermarsi e verificare** con lo scenario 1–4 di quickstart.
4. Merge su `main` solo dopo la prova S4 (T018), per non rompere la pagina di cortesia.

### Consegna a incrementi

US1 → US2 (protezione provata in continuo) → US4 (recupero, per non restare mai fuori) → US5 (blocco) → US3 (multi-dispositivo e coda) → US6 → Polish. Ogni storia si prova da sola.

## Note

- Le prove tecniche S1–S6 sono lavori veri: se una fallisce si applica il ripiego indicato in `research.md` prima di proseguire.
- T018, T037 e T074 richiedono azioni dell'utente (progetto Vercel, accesso al progetto Supabase con la 2FA, segreti delle funzioni).
- Commit dopo ogni lavoro o gruppo logico; non versionare `supabase/.temp/` né file `.env*` (già in `.gitignore`).
- Il motore fiscale **non** fa parte di questa funzione: `src/engine/` nasce vuoto con la sola regola di import (T005).
