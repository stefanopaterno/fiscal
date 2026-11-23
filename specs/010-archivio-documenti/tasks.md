---

description: "Elenco dei lavori per la specifica 010 - Archivio documenti e fatture ricevute"
---

# Tasks: Archivio documenti e fatture ricevute

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

Storie: US1 archiviare, US2 trovare, US3 collegare, US4 sicurezza e conservazione, US5 esportare, US6 fatture ricevute (FR-016, FR-017).

## Phase 1: Foundational

- [x] T001 [P] Test `tests/unit/documenti-motore.test.ts`: casi A, B, C (P7M DER e Base64, ZIP store e deflate, riconoscimento dei metadati), CRC-32, chiave fattura, nomi sicuri, parole cliniche
- [x] T002 Motore `src/engine/documenti/{p7m,zip,fatture,nomi}.ts` e regole `src/engine/regole/documenti/index.ts`
- [x] T003 [P] Test pgTAP `supabase/tests/database/012_documenti.test.sql` (data-model.md `documenti.file_impronta` unico, chiave fattura unica, `documenti.file_dimensione`, `collegamenti_documenti` unico, isolamento)
- [x] T004 Migrazione `supabase/migrations/20261123000100_documenti.sql` e bucket `documenti`

## Phase 2: US1–US4 archivio (P1)

- [x] T005 [US1] Dati `src/features/documenti/dati.ts`: caricamento con impronta e nome sicuro, riduzione delle foto, versioni, cestino e pulizia dopo 30 giorni, registro
- [x] T006 [US2] Pagina `app/documenti/page.tsx`: ricerca, filtri, stato, non collegati, scadenze, cestino
- [x] T007 [US3] Pagina `app/documenti/scheda/page.tsx`: collegamenti alle voci; la spesa collegata risulta con giustificativo
- [x] T008 [US4] Avvisi di conservazione a norma e sui dati clinici; voce "Documenti" nella navigazione

## Phase 3: US6 fatture ricevute (P1)

- [x] T009 [US6] Importazione XML/P7M/ZIP con riepilogo (importate, già presenti, scartate) e lista "da classificare"
- [x] T010 [US6] "Crea la spesa" (008) precompilata e collegata; "non è una spesa"

## Phase 4: US5 esportazione (P3)

- [x] T011 [US5] Esportazione ZIP con indice CSV e avviso di file in chiaro

## Phase 5: Rifinitura

- [x] T012 [P] Test e2e `tests/e2e/documenti.spec.ts` e pagine nel test di impaginazione
- [ ] T013 Conferme: durata di conservazione e adesione al servizio dell'Agenzia, cifratura dell'esportazione
