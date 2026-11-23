---

description: "Elenco dei lavori per la specifica 007 - Accantonamento consigliato"
---

# Tasks: Accantonamento consigliato

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md)

## Phase 1: Foundational

- [X] T001 [P] Test `tests/unit/accantonamento.test.ts` con i casi A–G di quickstart.md
- [X] T002 Motore `src/engine/accantonamento/{incasso,percentuale,copertura,piano}.ts` e regole `src/engine/regole/accantonamento/index.ts`
- [X] T003 [P] Test pgTAP `supabase/tests/database/013_accantonamento.test.sql` (data-model.md `salvadanaio.importo` ≠ 0, `salvadanaio.incasso_id` unico, `impostazioni_accantonamento.margine` 0–0,5, una riga di impostazioni per utente)
- [X] T004 Migrazione `supabase/migrations/20261123000200_accantonamento.sql`

## Phase 2: US1–US3, US5 (P1/P2)

- [X] T005 [US1] Dati `src/features/accantonamento/dati.ts`: effetto di ogni incasso, salvadanaio, impostazioni
- [X] T006 [US1] Promemoria dopo l'incasso (dettaglio fattura, home e pagina): fatto, importo diverso, dopo — `src/features/accantonamento/Promemoria.tsx`, `BoxHome.tsx`
- [X] T007 [US2] Percentuale del mese con motivi in home e nella pagina
- [X] T008 [US3] Pagina `app/salvadanaio/page.tsx` (voce di menu «Salvadanaio»): salvadanaio, copertura per scadenza, movimenti, controllo del saldo
- [X] T009 [US5] Netto reale disponibile in home

## Phase 3: US4, US6, US7 (P2/P3)

- [X] T010 [US4] Piano mensile del primo anno fino a giugno dell'anno dopo
- [X] T011 [US6, US7] Impostazioni: margine, metodo, avvisi, tasso e vincolo del conto; consigli 008 legati alla copertura

## Phase 4: Rifinitura

- [X] T012 [P] Test e2e `tests/e2e/accantonamento.spec.ts` e pagina nel test di impaginazione
