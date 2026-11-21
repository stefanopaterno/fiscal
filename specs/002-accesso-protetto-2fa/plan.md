# Implementation Plan: Accesso protetto con login e autenticazione a due fattori

**Branch**: `002-accesso-protetto-2fa` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-accesso-protetto-2fa/spec.md`

## Summary

Questa è la **funzione di base** di My Fiscal: crea lo scheletro dell'app (Next.js a esportazione
statica, multipagina, Fluent UI 9, PWA) e tutto ciò che protegge i dati: login con password e
secondo fattore (app di autenticazione), regole di accesso per riga su ogni tabella, blocco per
inattività con sblocco rapido, codici di recupero, frase di recupero con attesa, coda protetta
degli inserimenti senza rete, elenco e chiusura delle sessioni.

Approccio tecnico (dettagli in [research.md](research.md)):

- **Supabase Auth** con MFA TOTP per login e secondo fattore; il livello di garanzia `aal2`
  è **imposto dal database** con policy restrittive su ogni tabella, non solo dall'interfaccia.
- **Recupero** con funzioni Edge di Supabase (codici di recupero e frase di recupero verificati
  lato server, con attesa e avviso): i dati restano dentro il solo progetto Supabase.
- **Sblocco rapido** con WebAuthn (Face ID / impronta / PIN del dispositivo) che sblocca un token
  di sessione custodito cifrato sul dispositivo.
- **Coda offline** in IndexedDB cifrata con una chiave non esportabile (WebCrypto), con inserimenti
  idempotenti.
- Il motore fiscale **non** fa parte di questo piano; qui nasce solo la struttura delle cartelle
  che lo ospiterà.

## Technical Context

**Language/Version**: TypeScript 5.x (modalità `strict`), Node.js 24 LTS (decisione 2026-11-21: è la versione installata; da bloccare in `.nvmrc`
e in `package.json > engines`); SQL (Postgres 15/17 di Supabase); Deno/TypeScript per le funzioni Edge.

**Primary Dependencies**: Next.js (App Router, `output: 'export'`), React, `@fluentui/react-components`
(Fluent UI 9) con Griffel, `@supabase/supabase-js` v2, `@simplewebauthn/browser` (sblocco rapido),
Serwist (PWA, modalità configuratore; ripiego: `workbox-build`), `idb` (IndexedDB), `zod` (validazione).
Versioni esatte: fissate al primo `npm install` e bloccate nel file di lock (principio: nessuna
versione "latest" non verificata).

**Storage**: Supabase Postgres (fonte di verità); IndexedDB nel browser **solo** per la coda degli
inserimenti non inviati (nessuna copia completa dei dati, FR-022).

**Testing**: Vitest (unitari); pgTAP via `supabase test db` (regole di accesso per riga, test
automatici richiesti da FR-015 e SC-002/008); Vitest + `supabase-js` contro lo stack locale
(test di integrazione di login, MFA, recupero); Playwright (percorsi completi da browser, con
codici TOTP generati con la libreria `otpauth`). Richiede Docker sul computer di sviluppo per
lo stack locale di Supabase.

**Target Platform**: browser moderni su telefono (iOS Safari, Android Chrome) e PC; installabile
come PWA; pubblicazione su Vercel come file statici.

**Project Type**: applicazione web **multipagina** a esportazione statica + progetto Supabase
(migrazioni SQL, funzioni Edge). Nessun server proprio.

**Performance Goals**: accesso completo (password + codice) in meno di 30 s dall'avvio (SC-004);
primo caricamento di una pagina di accesso sotto 2 s su rete mobile 4G.

**Constraints**:
- Nessuna funzione server su Vercel; nessun dato personale fuori da Supabase (principio VII).
- Chiavi segrete (`service_role`, pepper dei codici) solo nei segreti di Supabase, mai nel
  repository né in Vercel (FR-005).
- La pagina di cortesia `index.html` alla radice resta **invariata** (vedi decisione D-12).
- Mobile-first da 360 px, aree toccabili 44 px, testi in italiano.

**Scale/Scope**: un solo utente, un solo progetto Supabase, 2-3 dispositivi; ~8 schermate di
accesso e sicurezza; 5 tabelle nuove di sicurezza in questa funzione.

## Constitution Check

*GATE: deve passare prima della Fase 0. Ricontrollato dopo la Fase 1.*

| Principio / vincolo | Esito | Nota |
|---|---|---|
| I. Motore fiscale separato e versionato | ✅ Non toccato | Creata solo la cartella `src/engine/` vuota con regola di import vietato dalla UI |
| II. Calcoli spiegabili | ✅ N/A | Nessun calcolo fiscale in questa funzione |
| III. Test-first sui calcoli | ✅ | Per le regole di accesso i test pgTAP si scrivono **prima** delle policy |
| IV. Architettura e modello dati prima del codice | ✅ | Questo piano + [data-model.md](data-model.md) + [contracts/](contracts/) |
| V. Configurabilità | ✅ | Tempi di blocco e di accesso completo sono impostazioni dell'utente (FR-010) |
| VI. UI minimalista, Fluent UI 9, mobile-first | ✅ | Schermate di accesso e sicurezza con Fluent UI 9; aiuto contestuale (011) previsto sui campi |
| VII. Supabase, 2FA, accesso per riga | ✅ | `aal2` imposto dal database; RLS su ogni tabella con test e trigger di controllo |
| Stack: multipagina, export statico, nessun server | ✅ | Next.js `output: 'export'`; funzioni solo su Supabase |
| Hosting Vercel: solo file statici, intestazioni di sicurezza | ✅ | `vercel.json` con CSP e intestazioni; anteprime disattivate |
| Pagina di cortesia invariata | ✅ | App sotto `/app`, copia verbatim di `index.html` nella build (D-12) |
| Segreti fuori dal repository pubblico | ✅ | Scansione automatica dei segreti nei controlli di qualità |

**Rischi residui da verificare con prove tecniche (vedi research.md, sezione "Prove da fare per prime")**:
(a) numero massimo di fattori MFA = 1 per impedire un secondo fattore aggiunto con sola password;
(b) rendering di Fluent UI 9 con esportazione statica; (c) service worker con esportazione statica;
(d) deploy Vercel di Next.js `output: 'export'` con `basePath` e file della cartella di cortesia.
Nessuna violazione che richieda Complexity Tracking.

**Ricontrollo dopo la Fase 1 (2026-11-21)**: il modello dati, i contratti e la guida di verifica
confermano tutti i punti sopra; nessun principio è violato. Le quattro prove tecniche (S1, S3-S6)
condizionano solo i ripieghi indicati, non l'architettura.

## Project Structure

### Documentation (this feature)

```text
specs/002-accesso-protetto-2fa/
├── plan.md              # Questo file
├── research.md          # Fase 0: decisioni, alternative, prove da fare
├── data-model.md        # Fase 1: tabelle, policy, stati
├── quickstart.md        # Fase 1: come verificare la funzione
├── contracts/
│   ├── edge-functions.md      # Funzioni Edge di recupero e sessioni
│   ├── rls-policy-contract.md # Regole obbligatorie per ogni tabella + test
│   └── app-routes-and-lock.md # Percorsi, stati di blocco, coda offline
└── tasks.md             # Fase 2 (/speckit-tasks, non creato qui)
```

### Source Code (repository root)

```text
index.html                    # pagina di cortesia: NON si modifica
robots.txt                    # NON si modifica
next.config.ts                # output: 'export', basePath: '/app', trailingSlash: true
vercel.json                   # intestazioni di sicurezza, cache
package.json  .nvmrc  tsconfig.json

app/                          # percorsi Next.js (ogni cartella = una pagina)
├── layout.tsx                # provider Fluent UI 9, tema, struttura comune
├── page.tsx                  # reindirizza a /app/accesso/ o /app/home/
├── accesso/page.tsx          # password
├── accesso/secondo-fattore/page.tsx
├── accesso/configura/page.tsx        # prima configurazione 2FA + codici di recupero
├── accesso/recupero/page.tsx         # codice di recupero / frase di recupero
├── blocco/page.tsx                   # app bloccata, sblocco rapido
├── home/page.tsx                     # segnaposto protetto (le funzioni arrivano dopo)
└── impostazioni/sicurezza/page.tsx   # password, 2FA, codici, tempi, sessioni, sblocco rapido

src/
├── lib/supabase/             # client (solo URL e chiave pubblica), helper di livello aal
├── features/
│   ├── auth/                 # flussi di login, MFA, recupero (hook + componenti)
│   ├── lock/                 # blocco inattività, sblocco rapido WebAuthn, modalità "occhio"
│   ├── offline-queue/        # coda IndexedDB cifrata, invio idempotente, conflitti
│   └── sessions/             # elenco e chiusura sessioni
├── ui/                       # componenti comuni Fluent UI 9 (scheletro, aiuto contestuale)
└── engine/                   # (vuota) motore fiscale TypeScript puro: MAI importare React/rete

supabase/
├── config.toml               # MFA max 1 fattore, registrazioni disattivate, durata JWT
├── migrations/               # schema, RLS, funzioni di sicurezza, trigger "ensure_rls"
├── functions/
│   ├── recovery-code/        # rientro con codice di recupero
│   ├── recovery-phrase/      # avvio/annullamento/completamento ripristino
│   └── _shared/              # hash, limiti di tentativi, invio avviso
└── tests/                    # pgTAP: RLS, policy aal2, funzioni di sessione

public/                       # icone PWA, manifest
tests/
├── unit/                     # Vitest
├── integration/              # Vitest + supabase-js (stack locale)
└── e2e/                      # Playwright
scripts/postbuild.mjs         # copia index.html e robots.txt in out/ senza modificarli
```

**Structure Decision**: un solo progetto Next.js alla radice del repository (nessun "backend"
separato: la parte server è il progetto Supabase con migrazioni e funzioni Edge in `supabase/`).
L'app vive sotto il percorso `/app` così la radice del sito resta la pagina di cortesia.

## Complexity Tracking

Nessuna violazione della costituzione da giustificare.
