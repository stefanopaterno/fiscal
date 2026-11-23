# Implementation Plan: Accantonamento consigliato

**Branch**: `007-accantonamento-consigliato` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

## Summary

Per ogni incasso: quanto mettere da parte (imposte e soggettivo dal motore 001 con e senza l'incasso, più
integrativo, IVA e bollo incassati, meno la ritenuta) e quanto resta da spendere; percentuale del mese con i
suoi motivi; salvadanaio con promemoria dopo ogni incasso; copertura delle scadenze; piano mensile per il
primo anno; netto reale disponibile; margine di sicurezza e conto con interessi. Dettagli in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 strict; SQL Postgres 17. **Dependencies**: nessuna nuova.
**Storage**: 2 tabelle (data-model.md). **Testing**: Vitest (casi A–G), pgTAP 013, Playwright.
**Constraints**: base = anno in corso fino a oggi (la 006 porterà la previsione di fine anno); stime dichiarate.

## Constitution Check

| Principio | Esito | Nota |
|---|---|---|
| I. Motore separato | ✅ | `src/engine/accantonamento/`; ritenuta sugli interessi e margine predefinito nelle regole per anno |
| II. Spiegabile | ✅ | ogni quota con spiegazione, motivi del cambio di percentuale |
| III. Test-first | ✅ | casi A–G prima del codice |
| VI. UI | ✅ | home: netto reale, percentuale, promemoria; pagina Accantonamento |
| VII. RLS | ✅ | tabelle dal modello |

## Project Structure

```text
src/engine/accantonamento/{incasso,percentuale,copertura,piano}.ts
src/engine/regole/accantonamento/index.ts
src/features/accantonamento/{dati,Accantonamento,Promemoria}.tsx
app/accantonamento/page.tsx
supabase/migrations/20261123000200_accantonamento.sql
supabase/tests/database/013_accantonamento.test.sql
tests/unit/accantonamento.test.ts, tests/e2e/accantonamento.spec.ts
```
