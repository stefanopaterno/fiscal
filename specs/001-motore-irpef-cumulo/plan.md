# Implementation Plan: Motore IRPEF sul cumulo CU + P.IVA

**Branch**: `001-motore-irpef-cumulo` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-motore-irpef-cumulo/spec.md`

## Summary

Calcolo dell'IRPEF dell'anno sul cumulo tra lavoro dipendente (una o più CU) e reddito professionale
per cassa (dalle fatture della 003 meno le spese): reddito complessivo al netto dei contributi ENPAP
deducibili versati nell'anno, imposta per scaglioni, detrazioni per lavoro dipendente e ulteriore
detrazione ricalcolate sul reddito complessivo, addizionali con le aliquote dell'utente, ritenute e
conguaglio; scaglione e aliquota marginale; simulatore "e se fatturo ancora X"; acconti storico e
previsionale; piani di versamento per distribuire il picco (primo anno 2027 → giugno 2028).

Approccio (dettagli in [research.md](research.md)):

- **Motore puro** `src/engine/irpef/` con regole `src/engine/regole/irpef/{2026,2027}.ts` (principio I),
  casi al centesimo scritti prima (quickstart, 6 casi verificati con script indipendente).
- **Risultati spiegati e "provvisori"** quando usano regole da verificare o mancanti (FR-017): 2027 =
  regole 2026 da verificare; minimi ENPAP 2027 assenti ⇒ segnalati, mai inventati.
- **Dati** in 5 tabelle nuove dal modello RLS; aliquote delle addizionali solo nel database (dati di
  residenza); scenari mai salvati.
- **Pagine** sotto `/app/tasse/` con la voce "Tasse" nella navigazione; ogni numero con il suo "?".

## Technical Context

**Language/Version**: TypeScript 5.9 strict, Node 24; SQL Postgres 17 (Supabase).
**Primary Dependencies**: quelle della 002/003, nessuna nuova.
**Storage**: Supabase, 5 tabelle nuove (data-model.md); lettura della vista `reddito_cassa` (003).
**Testing**: Vitest (motore: casi quickstart, invarianti, scenari, acconti, piani), pgTAP (009), Playwright (pagina Tasse).
**Target Platform**: PWA telefono e PC (come 002).
**Project Type**: stessa app multipagina sotto `/app`.
**Performance Goals**: calcolo e scenario < 50 ms (SC-003 chiede < 5 s); quadro completo inserendo la CU in < 5 minuti (SC-002).
**Constraints**: centesimi interi; regole per anno con fonte e stato; nessun valore inventato; modalità prova della 003 invariata (le tabelle della 001 non sono "prove": sono dati dell'utente).
**Scale/Scope**: un utente, pochi anni; 4 pagine nuove.

## Constitution Check

| Principio / vincolo | Esito | Nota |
|---|---|---|
| I. Motore separato e versionato per anno | ✅ | `src/engine/irpef/`, `src/engine/regole/irpef/`; regola ESLint già attiva |
| II. Calcoli spiegabili e fedeli | ✅ | ogni voce con spiegazione e regola; fonti in research; stato (V)/(D) |
| III. Test-first | ✅ | 6 casi al centesimo + invarianti scritti prima |
| IV. Modello dati prima | ✅ | data-model.md, contracts/ |
| V. Configurabilità | ✅ | addizionali, ISA, reddito atteso, cassa previdenziale per attività |
| VI. UI minimalista, aiuti, mobile-first | ✅ | layout del mockup, test di impaginazione esteso |
| VII. Supabase, 2FA, RLS | ✅ | tabelle dal modello, test di conformità automatico |
| Dati personali fuori dal repository | ✅ | addizionali e residenza solo nel database; esempi di prova con aliquote generiche |
| TODO costituzione | ⚠️ | ENPAP_2027 parzialmente chiuso (integrativo 4% verificato); REGIONE resta dato dell'utente |

Nessuna violazione.

## Project Structure

### Documentation

```text
specs/001-motore-irpef-cumulo/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/{motore-irpef.md, database.md, pagine.md}
└── tasks.md
```

### Source Code

```text
src/engine/regole/irpef/{tipi,2026,2027,index}.ts   # scaglioni, detrazioni, acconti, ENPAP per anno
src/engine/irpef/
├── anno.ts          # calcolaAnno
├── scenario.ts      # confrontaScenario
├── acconti.ts       # calcolaAcconti, stimaVersamenti
├── enpap.ts         # contributiEnpap
├── cassa.ts         # redditoDiCassa (incassi → reddito e ritenute)
├── previsione.ts    # differenzaPrevista (metodo previsionale)
└── piani.ts         # pianiVersamento
src/features/tasse/  # quadro, dati dell'anno, versamenti, strategia
app/tasse/{,dati,versamenti,strategia}/page.tsx
supabase/migrations/20261122000200_imposte.sql
supabase/tests/database/009_imposte.test.sql
tests/unit/irpef-*.test.ts, tests/e2e/tasse.spec.ts
```

**Structure Decision**: come 003; il motore non importa nulla dell'interfaccia; la pagina raccoglie i
dati (CU, fatture, versamenti) e chiama il motore.

## Complexity Tracking

Nessuna violazione da giustificare.
