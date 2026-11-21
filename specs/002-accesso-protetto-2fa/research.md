# Ricerca e decisioni tecniche: Accesso protetto con 2FA

**Data**: 2026-11-21 | **Spec**: [spec.md](spec.md) | **Piano**: [plan.md](plan.md)

Stato di verifica: **V** = verificato su documentazione ufficiale, **P** = da provare con una
prova tecnica (spike) prima di scrivere il resto del codice, **D** = decisione di progetto.

## D-01 — MFA: Supabase Auth con TOTP (V)

- **Decisione**: usare l'MFA TOTP nativa di Supabase Auth (`mfa.enroll`, `challenge`, `verify`).
  La sessione dopo la verifica ha il livello `aal2`.
- **Perché**: è il secondo fattore scelto (app di autenticazione), nessun SMS; i dati restano in
  Supabase.
- **Alternative scartate**: TOTP implementato a mano (rischio errori e segreti da custodire);
  SMS (escluso dalla specifica); passkey come secondo fattore (rinviata dalla specifica).
- **Fonte**: [documentazione MFA di Supabase](https://supabase.com/docs/guides/auth/auth-mfa).

## D-02 — L'`aal2` si impone nel database (V)

- **Decisione**: su ogni tabella una policy **restrittiva** (`as restrictive`) per il ruolo
  `authenticated` richiede `(select auth.jwt()->>'aal') = 'aal2'`, in aggiunta alla policy che
  lega la riga al proprietario. Senza `aal2` il database non restituisce nulla, anche se il client
  è stato manomesso.
- **Perché**: la specifica (FR-002, FR-003, FR-004) vuole che la protezione non dipenda
  dall'interfaccia. Le policy restrittive vanno combinate con quelle permissive.
- **Attenzione**: la richiesta del livello `aal2` va scritta in **ogni** policy; per questo c'è il
  trigger "ensure_rls" (D-03) e un test che elenca tutte le tabelle.
- **Fonte**: [MFA via RLS](https://supabase.com/blog/mfa-auth-via-rls).

## D-03 — Nessuna tabella senza RLS (V/D)

- **Decisione**: (1) trigger di evento `ensure_rls` che attiva la RLS a ogni `CREATE TABLE` nello
  schema `public`; (2) test pgTAP che fallisce se esiste una tabella pubblica senza RLS attiva e
  senza le due policy standard (proprietario + aal2); (3) un modello di migrazione obbligatorio
  (vedi [contracts/rls-policy-contract.md](contracts/rls-policy-contract.md)).
- **Perché**: FR-015, SC-008, scenario 3 della storia 2.

## D-04 — Un solo fattore MFA, per impedire l'aggiunta con sola password (P)

- **Rischio**: la documentazione dice che per **togliere** un fattore serve `aal2`; non ho trovato
  conferma che per **aggiungerne** uno serva `aal2`. Se non servisse, chi ha solo la password
  potrebbe registrare un proprio secondo fattore e diventare `aal2`, annullando la 2FA.
- **Decisione**: impostare nel progetto Supabase `max_enrolled_factors = 1`
  (`[auth.mfa]` in `config.toml` e nel pannello del progetto). Con un fattore già verificato non
  se ne può aggiungere un altro; per sostituirlo serve prima eliminarlo, e l'eliminazione richiede
  `aal2` oppure passa dalle funzioni di recupero (D-06/D-07).
- **Prova da fare per prima (spike S1)**: con un utente con fattore verificato e sessione `aal1`,
  tentare `mfa.enroll`: deve fallire. Se non fallisce, serve una barriera aggiuntiva (funzione
  di database che impedisca l'inserimento di fattori a un utente che ne ha già uno verificato).

## D-05 — Registrazioni disattivate e limiti di tentativi (V/D)

- **Decisione**: dopo aver creato l'account dell'utente, disattivare le registrazioni
  (`enable_signup = false`); usare i limiti di frequenza integrati di Supabase Auth per
  tentativi di password e di codici MFA; test di integrazione che verifica il rifiuto di una
  nuova registrazione. FR-012.

## D-06 — Codici di recupero monouso: funzione Edge (D)

- **Perché serve codice nostro**: l'MFA TOTP di Supabase non fornisce codici di recupero.
- **Decisione**: 10 codici casuali da 80 bit (generati con generatore crittografico, mostrati
  una sola volta, formato a gruppi leggibili). Nel database restano solo gli **HMAC-SHA256**
  con un "pepper" custodito nei segreti delle funzioni Edge; mai i codici in chiaro.
- **Uso**: la funzione `recovery-code` riceve una sessione `aal1` (password già verificata) e il
  codice; se valido e non usato lo segna usato, **elimina il fattore TOTP** con l'API di
  amministrazione e registra l'evento; l'utente deve configurare un nuovo fattore (e il sistema
  propone di rigenerare i codici). I tentativi sono limitati e conteggiati lato server.
- **Alternative scartate**: far passare il codice come secondo fattore alternativo (non
  supportato da Supabase); ripristino via e-mail (escluso dalla specifica).

## D-07 — Frase di recupero con attesa e avviso (D)

- **Decisione**: la frase (minimo 6 parole casuali o 24 caratteri) è conservata solo come hash
  **argon2id** (libreria JavaScript pura `@noble/hashes`, adatta a Deno) con "sale" per utente.
  La funzione `recovery-phrase` ha tre azioni: **avvia** (verifica frase + `aal1`, crea una
  richiesta in stato `in_attesa` con `esegui_dopo = adesso + 48 ore`, invia l'avviso),
  **annulla** (qualsiasi accesso `aal2` valido annulla la richiesta in corso; c'è anche il
  pulsante esplicito), **completa** (solo dopo la scadenza dell'attesa: elimina il fattore,
  invalida la frase, impone di impostarne una nuova).
- **Attesa**: **48 ore** (proposta; chiude `TODO(RECUPERO_ATTESA)` per la durata). Abbastanza lunga
  perché l'utente veda l'avviso, abbastanza corta da non bloccare mesi di lavoro.
- **Avviso**: (1) banner bloccante a ogni tentativo di accesso mentre c'è una richiesta
  pendente; (2) e-mail all'indirizzo dell'account inviata dalla funzione Edge tramite il
  **servizio di posta già configurato in Supabase Auth** (SMTP del progetto); il messaggio non
  contiene dati fiscali. La scelta del provider SMTP resta all'utente (è lui a configurarlo nel
  progetto). Se l'e-mail non è configurata, la richiesta **non parte** (fallire in sicurezza).
- **Limiti**: massimo 5 tentativi errati, poi blocco di 24 ore (FR-023, scenario 6).

## D-08 — Sblocco rapido con WebAuthn e token cifrato (P)

- **Decisione**: lo sblocco rapido usa un'asserzione **WebAuthn** con verifica dell'utente
  (`userVerification: "required"` → Face ID, impronta o PIN del dispositivo) fatta in locale.
  Il token di aggiornamento della sessione sul dispositivo è conservato **cifrato** con una chiave
  derivata dall'estensione **PRF** di WebAuthn, quando il browser la supporta; senza PRF lo sblocco
  rapido **non viene offerto** e serve il login completo (scenario 5 della storia 5).
- **Perché**: un semplice controllo di interfaccia dietro Face ID si aggira con gli strumenti del
  browser; con la chiave dal PRF la sessione resta inutilizzabile senza il dispositivo sbloccato.
- **Limite onesto**: dopo lo sblocco il token è in memoria come per qualsiasi app web; lo sblocco
  rapido non crea sessioni nuove (FR-020).
- **Prova da fare (spike S2)**: PRF su Safari iOS e Chrome Android con una pagina di prova.
- **Alternativa scartata**: PIN scelto dall'app (un altro segreto da gestire, più debole del
  dispositivo).

## D-09 — Durata dell'accesso completo e blocco per inattività (D/P)

- **Blocco per inattività (5 minuti, modificabile)**: gestito dal client con timer di inattività
  e dall'evento di visibilità (app in background → nasconde gli importi subito); al blocco il
  token cifrato resta sul dispositivo (D-08) e la memoria viene svuotata.
- **Accesso completo 14 giorni (modificabile)**: il limite deve valere anche lato database.
  Decisione: una funzione `private.accesso_completo_valido()` confronta l'orario dell'ultima
  verifica TOTP, presente nel token (`amr` con `method: totp` e `timestamp`), con
  `user_security.accesso_completo_giorni`; la policy restrittiva la richiama. **Prova da fare
  (spike S3)**: verificare che `amr` e il suo orario compaiano nel JWT dopo un rinnovo del token
  e che il rinnovo non riscriva l'orario del TOTP. Se non fosse così, ripiego: confronto con
  `auth.sessions.created_at` della sessione (claim `session_id`).
- **Durata del JWT**: 15 minuti (rinnovo automatico), per limitare il tempo di validità di un
  token rubato dopo la chiusura di una sessione.

## D-10 — Sessioni: elenco e chiusura (D)

- **Decisione**: due funzioni SQL `security definer` nello schema `public`, richiamabili solo da
  `authenticated` con `aal2`: `mie_sessioni()` (legge `auth.sessions` dove `user_id = auth.uid()`)
  e `chiudi_mia_sessione(id)` (cancella solo se la sessione è dell'utente). Il cambio password
  chiude le altre sessioni con `signOut({ scope: 'others' })`.
- **Limite noto**: un token di accesso già emesso resta valido fino alla scadenza (15 minuti,
  D-09); la chiusura impedisce il rinnovo.

## D-11 — Coda offline protetta (D)

- **Decisione**: IndexedDB (libreria `idb`) con un archivio `coda`; ogni voce è cifrata con
  AES-GCM; la chiave è un `CryptoKey` **non esportabile** generata alla prima apertura e
  conservata in IndexedDB. Ogni voce ha un `id` UUID generato sul dispositivo e usato come chiave
  primaria nel database (`insert ... on conflict (id) do nothing`): l'invio ripetuto non crea
  duplicati (FR-021). I conflitti (stessa riga modificata altrove: colonna `versione` diversa)
  sono presentati all'utente con le due versioni a fianco.
- **Pulizia**: la coda e la chiave si cancellano al logout e alla chiusura della sessione
  (FR-022); lo stato è "in attesa di invio" / "inviato" / "in conflitto".
- **Limite onesto**: una chiave non esportabile protegge da copie del file ma non da codice
  eseguito nella pagina; è un livello in più, non una cassaforte.
- **Chiude** `TODO(OFFLINE_CODA)`.

## D-12 — Pagina di cortesia invariata, app sotto `/app` (D/P)

- **Decisione**: `next.config.ts` con `basePath: '/app'`; tutte le pagine escono in `out/app/...`.
  Lo script `scripts/postbuild.mjs` copia **byte per byte** `index.html` e `robots.txt` in
  `out/`. Un test confronta l'impronta SHA-256 dei due file in `out/` con quelli alla radice.
- **Perché**: l'utente vuole che la pagina di cortesia non si tocchi e che l'accesso all'app si
  decida dopo (`TODO(ACCESSO_APP)`): l'app non è collegata dalla pagina di cortesia.
- **Rischio (spike S4)**: il preset Next.js di Vercel con `output: 'export'` e file aggiuntivi
  in `out/`. Prova su un progetto Vercel temporaneo o con `vercel build` in locale prima del
  collegamento a `main`; finché la prova non passa, **non si fa il merge su `main`** (un push
  su `main` ricostruirebbe il sito pubblico).

## D-13 — Fluent UI 9 con esportazione statica (P)

- **Decisione**: tutte le pagine protette sono componenti client; l'interfaccia di Fluent UI si
  rende **nel browser** dopo la verifica della sessione (nessun contenuto riservato nell'HTML
  esportato). Per le pagine pubbliche (accesso) si usa `RendererProvider`/`SSRProvider` di
  Griffel con raccolta degli stili al momento dell'esportazione, se funziona.
- **Dubbio**: la guida di Griffel per l'App Router usa `useServerInsertedHTML`, che dipende dal
  rendering sul server; con esportazione statica potrebbe non essere applicabile. **Spike S5**:
  una pagina di prova con `FluentProvider` esportata e aperta a JavaScript disattivato e attivo;
  se c'è uno sfarfallio di stili, ripiego: rendere l'intera app solo lato client dietro uno
  scheletro di caricamento.
- **Fonte**: [guida Griffel SSR](https://griffel.js.org/react/guides/ssr-usage),
  [esportazione statica di Next.js](https://nextjs.org/docs/app/guides/static-exports).

## D-14 — PWA con esportazione statica (P)

- **Decisione**: Serwist in "modalità configuratore" (costruisce il service worker **dopo** la
  generazione delle pagine, così vede tutte le pagine esportate). Il service worker mette in
  cache **solo** file statici dell'app (pagine, script, stili, icone), mai risposte di Supabase
  (richieste verso il dominio del progetto: sempre `NetworkOnly`).
- **Ripiego**: `workbox-build` con `injectManifest` su `out/`.
- **Prova (spike S6)**: l'app installata si apre senza rete mostrando lo scheletro e un messaggio
  chiaro ("serve la connessione"), senza dati. Chiude `TODO(PWA_NEXT)`.
- **Fonte**: [PWA con Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps) e
  documentazione Serwist (non ho trovato conferma esplicita sull'esportazione statica: da provare).

## D-15 — Intestazioni di sicurezza su Vercel (D)

- `Content-Security-Policy`: `default-src 'self'; connect-src 'self' https://aldiyymgvngvdrroluus.supabase.co
  wss://aldiyymgvngvdrroluus.supabase.co; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'
  (necessario per gli stili di Griffel, da stringere se possibile); script-src 'self' (con hash per gli script
  incorporati di Next.js); frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
- Anche: `Strict-Transport-Security` (2 anni, `includeSubDomains`), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy` (camera e geolocalizzazione disattivate;
  `publickey-credentials-get` abilitata per WebAuthn), cache `no-store` per le pagine HTML e
  per `sw.js`, cache lunga con impronta per gli script.

## D-16 — Strategia di test (D)

- **pgTAP (`supabase test db`)**: ogni tabella di `public` ha RLS attiva; utente anonimo → 0 righe
  e 0 scritture; altro utente → 0 righe; proprietario `aal1` → 0 righe; proprietario `aal2` →
  accesso; accesso completo scaduto → 0 righe; trigger `ensure_rls` attivo.
- **Integrazione (Vitest + stack locale)**: login senza secondo fattore, con un fattore,
  con entrambi; codice di recupero valido/usato/errato; frase di recupero con attesa; limiti di
  tentativi; registrazione rifiutata; secondo fattore aggiunto con `aal1` rifiutato (S1).
- **E2E (Playwright)**: percorso completo da telefono emulato (360 px): prima configurazione,
  codici di recupero, blocco per inattività, coda offline con rete spenta e riaccesa.
- **Scansione segreti**: controllo automatico (per esempio `gitleaks`) su ogni commit e sulla
  cartella `out/` (SC-003); test che `out/` non contiene la chiave `service_role`.

## Prove da fare per prime (in ordine, prima di costruire il resto)

| # | Prova | Se fallisce |
|---|---|---|
| S1 | `mfa.enroll` con sessione `aal1` e fattore già verificato | barriera in funzione di database |
| S3 | `amr`/`timestamp` TOTP nel JWT dopo il rinnovo | confronto con `auth.sessions.created_at` |
| S5 | `FluentProvider` con esportazione statica | app solo lato client con scheletro |
| S6 | Service worker con esportazione statica | `workbox-build` |
| S4 | Build Vercel di `output: 'export'` + `basePath` + copia della pagina di cortesia | preparare il progetto Vercel con comando di build personalizzato |
| S2 | PRF di WebAuthn su iOS e Android | sblocco rapido non offerto su quel dispositivo |

## Punti aperti per l'utente (fuori dal codice)

- Attivare la 2FA sull'account Supabase, verificare la regione UE, firmare l'accordo sul
  trattamento dei dati, disattivare le registrazioni dopo aver creato l'account (già in elenco).
- Configurare il servizio di posta (SMTP) del progetto Supabase per l'avviso di ripristino.
- Installare Docker sul computer di sviluppo (stack locale di Supabase per i test).
- Scegliere le frasi e conservare i codici di recupero fuori dall'app (per esempio su carta).
