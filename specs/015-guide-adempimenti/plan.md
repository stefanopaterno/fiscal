# Implementation Plan: Guide agli adempimenti

**Branch**: `015-guide-adempimenti` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

## Summary

Un layer in home, subito sotto il calendario fiscale (013), con l'indice delle guide e la guida scelta. Le guide
sono **contenuto statico nel codice** (come il calendario), con una struttura fissa di sezioni, passi, campi da
compilare e disegni schematici dei moduli. I **valori normativi citati** (codici tributo, scadenze, aliquote,
codice ATECO, natura IVA) non sono scritti nei testi: i testi usano segnaposto risolti dalle regole per anno, che
dalla 014 si aggiornano anche da file. Nessun dato dell'utente, nessuna tabella nuova. Dettagli in
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 strict. **Dependencies**: nessuna nuova (disegni in JSX + token Fluent).
**Storage**: nessuna tabella; spunte dei passi in `localStorage` (`fiscal.guide.spunte`), solo sul dispositivo.
**Testing**: Vitest (catalogo delle guide, segnaposto, nessun valore scritto a mano, ricerca, «da ricontrollare»),
Playwright (layer in home, ricerca, guida F24, disegno → passo, Apri in Fiscal, 360 px).
**Target Platform**: export statico Next.js, funziona senza rete (contenuto nel pacchetto).
**Project Type**: web app (SPA multipagina statica).
**Performance Goals**: apertura del layer e ricerca istantanee (contenuto in memoria, ~22 guide).
**Constraints**: nessun dato personale né importo; nessuna schermata dei siti ufficiali; testi italiani semplici.
**Scale/Scope**: 22 guide in 5 gruppi; 4 disegni di modulo (F24, Redditi PF, inizio attività, fattura).

## Constitution Check

| Principio | Esito | Nota |
|---|---|---|
| I. Motore separato e versionato | ✅ | Contenuti in `src/engine/regole/guide-adempimenti/`; valori citati dai set per anno tramite segnaposto (FR-007) |
| II. Spiegabile e con fonte | ✅ | Ogni guida ha fonte, ultimo controllo e stato; parti incerte «da verificare» con il motivo |
| III. Test-first | ✅ | Test su catalogo, segnaposto e assenza di valori scritti a mano prima dei contenuti |
| IV. Modello dati prima | ✅ | [data-model.md](data-model.md) e [contracts/guida.md](contracts/guida.md) |
| VI. UI | ✅ | Fluent UI 9, Dialog come il calendario, 360 px, 44 px, tema chiaro/scuro |
| VII. Dati e privacy | ✅ | Nessun dato dell'utente; esempi con dati e importi fittizi dichiarati |
| Natura dell'app | ✅ | Le guide spiegano; l'invio lo fa l'utente sui canali ufficiali; segnalano quando serve un parere (FR-013) |

**Post-design**: nessuna violazione, nessuna deroga.

## Project Structure

### Documentation (this feature)

```text
specs/015-guide-adempimenti/
├── spec.md
├── plan.md
├── research.md            # fatti normativi con fonte e stato
├── data-model.md          # tipi delle guide (nessuna tabella)
├── quickstart.md
├── contracts/guida.md     # struttura di una guida, segnaposto, catalogo delle 22 guide
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/engine/regole/guide-adempimenti/
├── tipi.ts                # Guida, Sezione, Passo, Campo, Disegno, Segnaposto
├── valori.ts              # risolve i segnaposto {{f24.irpef_saldo}}, {{scadenza.saldo_acconto}}, … dalle regole
├── apertura.ts            # 5 guide
├── fattura.ts             # 4 guide
├── versamenti.ts          # 6 guide
├── dichiarazioni.ts       # 4 guide
├── particolari.ts         # 3 guide
└── index.ts               # GUIDE_ADEMPIMENTI, guida(id), cercaGuide(testo), daRicontrollare(guida, oggi)
src/engine/regole/adempimenti/index.ts   # valori nuovi: codice ATECO, natura IVA N4, termine iscrizione ENPAP…
src/engine/regole/f24/base.ts            # + codici di ravvedimento (sanzioni e interessi), bollo sanzioni/interessi
src/engine/parametri/catalogo.ts         # + chiavi «adempimenti.*» (aggiornabili da file come gli altri valori)
src/features/guide-adempimenti/
├── GuideAdempimenti.tsx   # pulsante in home + Dialog (indice ↔ guida), apertura da ?guida=
├── Indice.tsx             # gruppi, frequenza, ricerca
├── Guida.tsx              # sezioni, passi con spunte, campi con «?», fonte e stato, Apri in Fiscal
├── Disegno.tsx            # disegni schematici dei moduli con caselle numerate
└── spunte.ts              # spunte su questo dispositivo (useSyncExternalStore)
src/features/home/Cruscotto.tsx          # <GuideAdempimenti /> sotto <CalendarioFiscale />
app/aiuto/page.tsx                       # sezione «Guide agli adempimenti» con collegamenti /home/?guida=…
tests/unit/guide-adempimenti.test.ts
tests/e2e/guide-adempimenti.spec.ts
```

**Structure Decision**: come il calendario (013) per la parte visiva; contenuti accanto alle altre regole, perché
citano valori normativi e devono seguire gli aggiornamenti della 014.

## Fasi di implementazione (per tasks.md)

1. Tipi, segnaposto e test (valori risolti dalle regole; nessun codice a 4 cifre, data o aliquota scritta nei testi).
2. Regole nuove: codici di ravvedimento in F24, set «adempimenti» (ATECO, natura N4, termini ENPAP) e chiavi nel
   catalogo della 014.
3. Contenuti delle 22 guide, gruppo per gruppo, con fonte e stato (research.md).
4. Layer, indice e ricerca; guida con passi e spunte; Apri in Fiscal.
5. Disegni dei 4 moduli collegati ai passi.
6. Collegamenti da Aiuto, scadenzario e Versamenti (`/home/?guida=…`); avviso «da ricontrollare».
7. e2e, impaginazione, tour e glossario.

## Complexity Tracking

Nessuna deroga.
