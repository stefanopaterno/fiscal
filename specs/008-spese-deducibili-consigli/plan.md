# Implementation Plan: Spese deducibili e consigli di risparmio fiscale

**Branch**: `008-spese-deducibili-consigli` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-spese-deducibili-consigli/spec.md`

## Summary

Registro delle spese professionali per cassa con la deducibilità della categoria (e i tetti annui), registro
dei beni durevoli con ammortamento, oneri personali deducibili e detraibili con limiti e residui ("fino a
esaurimento"), consigli ordinati per risparmio calcolato con il motore IRPEF della 001, simulatore, box in
home e promemoria di fine anno, budget per un ufficio. Le spese alimentano il reddito professionale e gli
oneri le deduzioni e detrazioni della 001.

Approccio (dettagli in [research.md](research.md)):

- **Motore puro** `src/engine/spese/` con regole `src/engine/regole/spese/{tipi,2026,2027,index}.ts`
  (catalogo categorie, coefficienti, voci con limiti, tetto 16-ter), casi di riferimento scritti prima.
- **Risparmio sempre dal motore 001** (con e senza la voce): nessuna aliquota scritta nei consigli.
- **Dati** in 4 tabelle nuove dal modello RLS + un campo nella CU; giustificativi in un bucket privato.
- **Pagine** sotto `/app/spese/`; box "Come abbassare le tasse" in home.

## Technical Context

**Language/Version**: TypeScript 5.9 strict, Node 24; SQL Postgres 17 (Supabase).
**Primary Dependencies**: quelle esistenti (Fluent UI 9, DatePicker Fluent, supabase-js); Supabase Storage per i giustificativi.
**Storage**: 4 tabelle nuove + bucket `giustificativi`; lettura di incassi (003) e tabelle della 001.
**Testing**: Vitest (motore: casi quickstart, invarianti, consigli), pgTAP (011), Playwright (spese, consigli, home).
**Target Platform**: PWA telefono e PC.
**Project Type**: stessa app multipagina sotto `/app`.
**Performance Goals**: lista dei consigli < 200 ms (ogni voce = 2 calcoli della 001); SC-008 box in home entro 3 s.
**Constraints**: centesimi interi; regole per anno con fonte e stato; nessun dato clinico; foto del
giustificativo da telefono in meno di 1 minuto (SC-003); spese non cancellate dalla modalità prova.
**Scale/Scope**: un utente, qualche centinaio di spese l'anno; 5 pagine nuove.

## Constitution Check

| Principio / vincolo | Esito | Nota |
|---|---|---|
| I. Motore separato e versionato per anno | ✅ | `src/engine/spese/`, `src/engine/regole/spese/`; ESLint vieta import di UI nel motore |
| II. Calcoli spiegabili e fedeli | ✅ | ogni deducibile e ogni consiglio con spiegazione, regola e stato; fonti in research |
| III. Test-first | ✅ | casi A–K di quickstart prima del codice |
| IV. Modello dati prima | ✅ | data-model.md, contracts/ |
| V. Configurabilità | ✅ | percentuale personalizzabile con motivazione, categorie dello studio attivabili, parametri ufficio |
| VI. UI minimalista, aiuti, mobile-first | ✅ | Fluent UI 9, "?" a fumetto, layout liquido, navigazione con "Altro" sul telefono |
| VII. Supabase, 2FA, RLS | ✅ | tabelle dal modello, Storage con policy proprietario + aal2 |
| Dati personali e clinici | ✅ | figli a carico solo nel database; nessuna descrizione medica nelle spese sanitarie |

Nessuna violazione.

## Project Structure

### Documentation

```text
specs/008-spese-deducibili-consigli/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/{motore-spese.md, database.md, pagine.md}
└── tasks.md
```

### Source Code

```text
src/engine/regole/spese/{tipi,2026,2027,index}.ts
src/engine/spese/
├── deducibilita.ts   # deducibileSpesa, totaleSpeseAnno
├── ammortamento.ts   # pianoAmmortamento
├── oneri.ts          # oneriAnno (limiti, residui, 16-ter)
├── consigli.ts       # consigli, simulaSpesa
└── ufficio.ts        # budgetUfficio
src/features/spese/   # elenco, scheda, beni, oneri, consigli, box home
app/spese/{,scheda,beni,oneri,consigli}/page.tsx
supabase/migrations/20261122000500_spese.sql
supabase/tests/database/011_spese.test.sql
tests/unit/spese-*.test.ts, tests/e2e/spese.spec.ts
```

**Structure Decision**: come 001 e 003; `raccogliAnno` della 001 prende spese e oneri dal database e li
passa al motore; il motore delle spese non legge il database.

## Complexity Tracking

Nessuna violazione da giustificare.
