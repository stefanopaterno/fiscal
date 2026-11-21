---

description: "Elenco dei lavori per la specifica 003 - Configurazione della partita IVA e fatturazione"
---

# Tasks: Configurazione della partita IVA e fatturazione

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Test**: inclusi e scritti prima (costituzione principio III: test-first sui calcoli).

## Formato: `[ID] [P?] [Storia] Descrizione`

Storie: US1 configurazione, US2 fattura sanitaria, US3 fattura non sanitaria, US4 incassi, US5 STS e fattura elettronica, US6 anagrafica e storico, US7 più attività e pro-rata.

---

## Phase 1: Setup

- [x] T001 Navigazione del mockup in `src/ui/Navigazione.tsx` (barra laterale da 900 px, barra in basso sul telefono) montata in `src/ui/Shell.tsx`, con voci verso le pagine della 002 e della 003

## Phase 2: Foundational (motore fiscale e database)

- [x] T002 [P] Test `tests/unit/fattura-calcolo.test.ts` con i 6 casi al centesimo di [quickstart.md](quickstart.md) e le invarianti di [contracts/motore-fattura.md](contracts/motore-fattura.md) (devono fallire)
- [x] T003 [P] Test `tests/unit/prorata.test.ts` (quota imponibile e arrotondamento art. 19-bis)
- [x] T004 [P] Test `tests/unit/codice-fiscale.test.ts` e `tests/unit/partita-iva.test.ts`
- [x] T005 Regole per anno in `src/engine/regole/{tipi,2026,2027,index}.ts` con fonte e stato di verifica (research R-01)
- [x] T006 Motore `src/engine/fattura/calcola.ts` (research R-02) con spiegazioni in parole semplici
- [x] T007 [P] `src/engine/fattura/prorata.ts` (research R-03)
- [x] T008 [P] Validatori `src/engine/validazioni/{codice-fiscale,partita-iva}.ts` (research R-09)
- [x] T009 Test pgTAP `supabase/tests/database/006_fatturazione.test.sql` (numerazione, immutabilità, incassi; data-model.md `fatture.numero`, `fatture.stato`, `incassi.importo`)
- [x] T010 Migrazione `supabase/migrations/20261121000400_fatturazione.sql`: tabelle di [data-model.md](data-model.md) dal modello RLS, funzioni e trigger di [contracts/database.md](contracts/database.md)

## Phase 3: US1 configurazione (P1) 🎯

- [x] T011 [US1] Pagina `app/impostazioni/attivita/` con profilo professionale (`data-model.md` + `profilo_professionale.*`), validazione CF/P.IVA, indicatore "pronto a fatturare" e dati mancanti, aiuti
- [x] T012 [US1] Gestione attività (`data-model.md` + `attivita.natura_iva`, `attivita.previdenza`) nella stessa pagina

## Phase 4: US2 fattura sanitaria (P1) 🎯

- [x] T013 [US2] Test di integrazione `tests/integration/fatture.test.ts` (emissione, numerazione, data anteriore rifiutata, immutabilità)
- [x] T014 [US2] Anagrafica minima clienti `app/clienti/` (`data-model.md` + `clienti.sostituto_imposta`, `clienti.opposizione_sts`, `clienti.pagato_da`)
- [x] T015 [US2] Nuova fattura `app/fatture/nuova/` con calcolo in tempo reale e spiegazioni, salva bozza ed emetti
- [x] T016 [US2] Dettaglio `app/fatture/dettaglio/?id=` e stampa/PDF `app/fatture/stampa/?id=` con diciture (SC-005)
- [x] T017 [US2] Test e2e `tests/e2e/fatture.spec.ts` (caso 1 da telefono, numerazione, stampa)

## Phase 5: US4 incassi (P2)

- [x] T018 [US4] Incassi nel dettaglio e "già incassata" nella nuova fattura (`data-model.md` + `incassi.modalita`, `incassi.tracciabile`), reddito per cassa

## Phase 6: US3 + US7 attività non sanitarie e pro-rata (P2)

- [x] T019 [US3] Righe imponibili e miste nella nuova fattura
- [x] T020 [US7] Riepilogo IVA con quota imponibile, pro-rata e avviso di soglia (`data-model.md` + `profilo_professionale.soglia_attenzione_imponibile`)

## Phase 7: US5 adempimenti (P2)

- [ ] T021 [US5] `app/adempimenti/`: elenco STS, CSV, segna inviate; riepilogo per la fattura elettronica

## Phase 8: US6 storico (P3)

- [ ] T022 [US6] Elenco fatture con filtri e totali; nota di credito dal dettaglio

## Phase 9: Polish

- [ ] T023 Test di impaginazione esteso alle pagine nuove; nessun dato clinico (SC-007); aiuti su ogni campo
- [ ] T024 Aggiornare la costituzione e lo stato di verifica delle regole 2027 dopo conferma con ENPAP e commercialista

## Dipendenze

Phase 2 (motore e database) prima di tutto; US1 prima di US2; US4, US3/US7, US5, US6 dopo US2.
MVP: Phase 1–4 (configurare e emettere una fattura sanitaria corretta, stampabile).
