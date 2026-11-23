# Implementation Plan: Archivio documenti e fatture ricevute

**Branch**: `010-archivio-documenti` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

## Summary

Archivio privato dei documenti (PDF, foto, XML e P7M) con ricerca, collegamenti alle voci (spese, fatture,
versamenti…), versioni, cestino di 30 giorni, scadenze, registro delle azioni ed esportazione; importazione in
blocco delle **fatture ricevute** scaricate da "Fatture e Corrispettivi" (XML, P7M, ZIP) con lista "da
classificare" e creazione della spesa della 008. Dettagli in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 strict; SQL Postgres 17.
**Primary Dependencies**: nessuna nuova: ZIP e P7M letti con codice proprio e `DecompressionStream`.
**Storage**: 4 tabelle nuove, bucket privato `documenti`.
**Testing**: Vitest (P7M, ZIP, chiavi, nomi), pgTAP (012), Playwright (archivio e importazione).
**Constraints**: nessun server; file mai pubblici; nomi dei file generati; documenti non toccati dalla
modalità prova; 20 MB per file.

## Constitution Check

| Principio | Esito | Nota |
|---|---|---|
| I. Motore separato | ✅ | `src/engine/documenti/`, regole di conservazione per anno |
| II. Spiegabile | ✅ | avvisi su conservazione a norma, duplicati, dati clinici |
| III. Test-first | ✅ | casi A–I prima del codice |
| IV. Modello dati prima | ✅ | data-model.md |
| VI. UI e aiuti | ✅ | Fluent UI 9, "?" a fumetto, liquida |
| VII. Supabase, 2FA, RLS | ✅ | tabelle dal modello, Storage proprietario + aal2 |
| Dati clinici | ✅ | nessun testo libero oltre la descrizione con avviso; nessuna lettura di PDF e foto |

Nessuna violazione.

## Project Structure

```text
src/engine/documenti/{p7m,zip,fatture,nomi}.ts
src/engine/regole/documenti/index.ts
src/features/documenti/{dati,Archivio,SchedaDocumento,Importa}.tsx
app/documenti/{,scheda}/page.tsx
supabase/migrations/20261123000100_documenti.sql
supabase/tests/database/012_documenti.test.sql
tests/unit/documenti-*.test.ts, tests/e2e/documenti.spec.ts
```
