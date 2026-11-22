---

description: "Elenco dei lavori per la specifica 001 - Motore IRPEF sul cumulo CU + P.IVA"
---

# Tasks: Motore IRPEF sul cumulo CU + P.IVA

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Test**: inclusi e scritti prima (costituzione principio III; FR-021, SC-001, SC-007).

## Formato: `[ID] [P?] [Storia] Descrizione`

Storie: US1 conguaglio dell'anno, US2 simulatore, US3 primo anno, US4 regole per anno, US5 strategia dei versamenti.

---

## Phase 1: Setup

- [ ] T001 Voce "Tasse" in `src/ui/Navigazione.tsx` (tra Clienti e Adempimenti), verificata dal test di impaginazione sul telefono

## Phase 2: Foundational (regole e aritmetica)

- [ ] T002 [P] Test `tests/unit/irpef-regole.test.ts`: `regoleIrpefPerAnno` per 2026 e 2027, errore per anno mancante, ogni regola con fonte e stato, scaglioni ordinati con ultimo `finoA` null
- [ ] T003 Tipi e regole in `src/engine/regole/irpef/{tipi,2026,2027,index}.ts` (research R-01, R-02, R-05, R-06, R-07, R-10): scaglioni 2027 del DDL (D), minimi ENPAP 2027 `null`
- [ ] T004 [P] Aritmetica intera in `src/engine/irpef/aritmetica.ts`: percentuale in centesimi con arrotondamento commerciale, coefficiente a 4 decimali (R-09)

## Phase 3: US1 conguaglio dell'anno (P1) 🎯 MVP

- [ ] T005 [US1] Test `tests/unit/irpef-anno.test.ts` con i casi 1, 2, 3, 5, 7, 8 di [quickstart.md](quickstart.md) al centesimo e le invarianti (contributi che non cambiano la detrazione, integrativo mai dedotto, addizionali zero con IRPEF netta zero, provvisorio con regole (D), errori per dati non validi)
- [ ] T006 [US1] `calcolaAnno` in `src/engine/irpef/anno.ts` (contracts/motore-irpef.md, research R-02..R-04, R-08) con spiegazioni per ogni voce
- [ ] T007 [P] [US1] Test pgTAP `supabase/tests/database/009_imposte.test.sql` (data-model.md `dati_anno.anno` e `aliquote_addizionali.anno` unici per utente, `certificazioni_uniche.giorni_lavoro` 1–365, importi non negativi, `aliquote_addizionali.regionale_scaglioni` valido, `aliquote_addizionali.comunale_aliquota` 0–0,009, `versamenti_previdenza.importo` e `versamenti_imposte.importo` > 0)
- [ ] T008 [US1] Migrazione `supabase/migrations/20261122000200_imposte.sql`: le 5 tabelle di [data-model.md](data-model.md) dal modello RLS (`private.applica_regole_tabella`), enum e vincoli
- [ ] T009 [US1] Dati in `src/features/tasse/dati.ts`: letture delle 5 tabelle, salvataggio dalla coda, raccolta di `InputAnno` dalle fatture incassate (vista `reddito_cassa`, ritenute in proporzione agli incassi)
- [ ] T010 [US1] Pagina `app/tasse/dati/page.tsx` con `src/features/tasse/DatiAnno.tsx`: CU (una o più, `data-model.md` + `certificazioni_uniche.*`), spese, altre detrazioni, oneri, addizionali (`aliquote_addizionali.*`), ISA, reddito atteso; un "?" per campo con il punto della CU
- [ ] T011 [US1] Pagina `app/tasse/page.tsx` con `src/features/tasse/QuadroAnno.tsx`: scelta dell'anno, quadro (complessivo, imponibile, scaglione e marginale, IRPEF, detrazioni, addizionali, conguaglio), "provvisorio" con elenco delle regole (D), spiegazioni, importi con l'occhio

## Phase 4: US2 simulatore (P2)

- [ ] T012 [US2] Test `tests/unit/irpef-scenario.test.ts`: caso 4 (+2.123,62), passaggio di scaglione, scenario con spesa, input non modificato (FR-014)
- [ ] T013 [US2] `confrontaScenario` in `src/engine/irpef/scenario.ts` (contributi ENPAP dovuti sulla variazione, stima di giugno con e senza)
- [ ] T014 [US2] Simulatore "E se fatturo ancora…" in `src/features/tasse/Simulatore.tsx` nella pagina Tasse

## Phase 5: US3 primo anno e acconti (P2)

- [ ] T015 [US3] Test `tests/unit/irpef-acconti.test.ts`: caso 2 (1.767,32 / 2.650,97), soglie 51,65 e 257,52, ISA 50/50, previsionale, caso 6 (nessun acconto nel 2027), acconto addizionale comunale con e senza punto 29
- [ ] T016 [US3] `calcolaAcconti` e `contributiEnpap` in `src/engine/irpef/{acconti,enpap}.ts` (R-05, R-07): minimi mancanti ⇒ segnalati
- [ ] T017 [US3] Riquadro "Da accantonare per giugno e novembre" e avviso del primo anno nel quadro (SC-006)
- [ ] T018 [US3] Pagina `app/tasse/versamenti/page.tsx` con `src/features/tasse/Versamenti.tsx`: versamenti ENPAP (`data-model.md` + `versamenti_previdenza.*`) e imposte (`versamenti_imposte.*`)

## Phase 6: US5 strategia dei versamenti (P2)

- [ ] T019 [US5] Test `tests/unit/irpef-piani.test.ts`: versamenti per mese al centesimo per i 5 piani, totale d'imposta identico (SC-007), interessi della rateizzazione, maggiorazione 0,40%, rischio del previsionale, piano consigliato
- [ ] T020 [US5] `pianiVersamento` in `src/engine/irpef/piani.ts` (R-06)
- [ ] T021 [US5] Pagina `app/tasse/strategia/page.tsx` con `src/features/tasse/Strategia.tsx`

## Phase 7: US4 regole per anno (P3)

- [ ] T022 [US4] Test di riproducibilità in `tests/unit/irpef-regole.test.ts`: caso 7 diverso tra 2026 e 2027, nessun anno usa regole di un altro (SC-005)

## Phase 8: Rifinitura

- [ ] T023 [P] Test e2e `tests/e2e/tasse.spec.ts` (telefono e PC): inserimento CU, quadro, simulatore, strategia; pagina Tasse nel test di impaginazione `tests/e2e/layout.spec.ts`
- [ ] T024 Scorciatoia "Tasse" nella home e aggiornamento della costituzione se serve
- [ ] T025 Conferme da raccogliere (ENPAP, commercialista): aliquota del soggettivo sui redditi 2027, minimi e maternità 2027, ISA dal 2028, testo finale della Legge di Bilancio 2027 (scaglione 55.000 € e clausola sugli acconti 2028)

## Dipendenze

Setup → Foundational → US1 → (US2, US3) → US5; US4 in qualsiasi momento dopo T003. Ogni storia ha i
suoi test prima del codice.

## Esecuzione in parallelo

T002 e T004; T005 e T007; T012, T015 e T019 (file diversi) dopo T006.

## Strategia

MVP = US1 (quadro del conguaglio con i dati della CU). Poi simulatore e acconti, infine la strategia.
