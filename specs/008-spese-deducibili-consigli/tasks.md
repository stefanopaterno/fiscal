---

description: "Elenco dei lavori per la specifica 008 - Spese deducibili e consigli di risparmio fiscale"
---

# Tasks: Spese deducibili e consigli di risparmio fiscale

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Test**: inclusi e scritti prima (principio III; SC-001, SC-002, SC-007, SC-009, SC-010).

Storie: US1 spese professionali, US2 oneri personali, US3 consigli, US4 simulazione, US5 promemoria di fine
anno, US6 giustificativi e riepilogo, US7 box in home, US8 ufficio.

## Phase 1: Setup

- [ ] T001 Navigazione con la voce "Spese" in `src/ui/Navigazione.tsx`; sul telefono le voci oltre la quinta vanno in "Altro" (Adempimenti, Impostazioni)

## Phase 2: Foundational

- [ ] T002 [P] Test `tests/unit/spese-regole.test.ts`: regole 2026 e 2027 con fonte e stato, catalogo completo, categorie dello studio disattivate di default, errore per anno mancante
- [ ] T003 Regole in `src/engine/regole/spese/{tipi,2026,2027,index}.ts` (research R-01..R-03)
- [ ] T004 [P] Test pgTAP `supabase/tests/database/011_spese.test.sql` (data-model.md `spese.importo`, `spese.iva_detraibile`, `spese.percentuale` + `spese.motivazione`, `beni.data_dismissione`, `impostazioni_spese.figli_a_carico`, una riga di `impostazioni_spese` per utente)
- [ ] T005 Migrazione `supabase/migrations/20261122000500_spese.sql`: tabelle di [data-model.md](data-model.md), campo `certificazioni_uniche.previdenza_complementare`, bucket `giustificativi` con policy

## Phase 3: US1 spese professionali (P1) 🎯

- [ ] T006 [US1] Test `tests/unit/spese-deducibilita.test.ts` e `tests/unit/spese-ammortamento.test.ts` (casi A–E2 di quickstart)
- [ ] T007 [US1] `src/engine/spese/{deducibilita,ammortamento}.ts`
- [ ] T008 [US1] Dati `src/features/spese/dati.ts` e integrazione con `raccogliAnno` della 001 (`src/features/tasse/dati.ts`)
- [ ] T009 [US1] Pagine `app/spese/page.tsx` (elenco e totali) e `app/spese/scheda/page.tsx` (`data-model.md` + `spese.*`), `app/spese/beni/page.tsx` (`beni.*`)

## Phase 4: US2 oneri personali (P1)

- [ ] T010 [US2] Test `tests/unit/spese-oneri.test.ts` (casi F, G, H)
- [ ] T011 [US2] `src/engine/spese/oneri.ts`, integrazione con deduzioni e detrazioni della 001
- [ ] T012 [US2] Pagina `app/spese/oneri/page.tsx` (`data-model.md` + `oneri_personali.*`), campo previdenza complementare nella CU

## Phase 5: US3–US5 consigli, simulazione, fine anno (P1/P2)

- [ ] T013 [US3] Test `tests/unit/spese-consigli.test.ts` (casi J, K; ordine; esauriti; avvertenze; nessun consiglio su incassi)
- [ ] T014 [US3] `src/engine/spese/consigli.ts` (consigli, simulaSpesa)
- [ ] T015 [US3] Pagina `app/spese/consigli/page.tsx` con lista, esauriti e simulatore (US4)
- [ ] T016 [US7] Box "Come abbassare le tasse" in `src/features/home/Cruscotto.tsx` e promemoria di fine anno da ottobre (US5)

## Phase 6: US6 giustificativi (P3)

- [ ] T017 [US6] Foto o file del giustificativo nella scheda (Storage), riepilogo per categoria in CSV

## Phase 7: US8 ufficio (P3)

- [ ] T018 [US8] Test `tests/unit/spese-ufficio.test.ts` (caso I) e `src/engine/spese/ufficio.ts`; sezione nella pagina dei consigli

## Phase 8: Rifinitura

- [ ] T019 Impostazioni delle spese (`impostazioni_spese.*`) in `app/impostazioni/`
- [ ] T020 [P] Test e2e `tests/e2e/spese.spec.ts` e pagine nel test di impaginazione
- [ ] T021 Conferme col commercialista: percentuali e tetti (R-01), primo anno di ammortamento, coefficienti 16-ter, aliquota volontaria ENPAP

## Dipendenze

Setup → Foundational → US1 → US2 → US3/US7 → US6, US8. Test prima del codice in ogni storia.
