---

description: "Elenco dei lavori per la specifica 015 - Guide agli adempimenti"
---

# Tasks: Guide agli adempimenti

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/guida.md](contracts/guida.md), [quickstart.md](quickstart.md)

**Tests**: richiesti dalla costituzione (principio III per i valori citati; principio VI per l'impaginazione). I test di ogni fase si scrivono prima e devono fallire.

## Phase 1: Setup

- [X] T001 Cartelle `src/engine/regole/guide-adempimenti/` e `src/features/guide-adempimenti/`; file vuoti come da plan.md

---

## Phase 2: Foundational (blocca tutte le storie)

**Obiettivo**: tipi, segnaposto e valori nuovi nelle regole (aggiornabili dalla 014).

- [X] T002 [P] Test `tests/unit/guide-adempimenti.test.ts` (parte segnaposto): `componi` risolve `{{f24.*}}`, `{{scadenza.*}}` (con spostamento al primo giorno lavorativo), `{{fattura.*}}` (percentuali ed euro formattati), `{{adempimenti.*}}`, `{{enpap.*}}`; segnaposto sconosciuto = errore; valore «da verificare» segnalato in `daVerificare`; con un registro della 014 che cambia `f24.irpef_saldo` dal giorno X, `componi` con `oggi = X` mostra il codice nuovo (data-model.md «Testo e segnaposto»)
- [X] T003 [P] Test in `tests/unit/parametri-catalogo.test.ts`: le chiavi nuove `f24.bollo_sanzione`, `f24.bollo_interessi`, `f24.ravv_*` e `adempimenti.*` sono nel catalogo, con decorrenza «data» e conversione andata/ritorno (data-model.md «Regole nuove»)
- [X] T004 Tipi `src/engine/regole/guide-adempimenti/tipi.ts` (data-model.md `Guida.id`, `Guida.gruppo`, `Guida.titolo` ≤ 60, `Guida.riga` ≤ 120, `Guida.frequenza`, `Guida.pertinenza`, `Guida.passi` ≥ 2, `Guida.fonti` ≥ 1 https, `Guida.ultimoControllo`, `Guida.stato`, `Guida.disegno`; `Passo`, `Campo`, `Disegno`)
- [X] T005 Codici F24 nuovi in `src/engine/regole/f24/base.ts` con fonte e stato di research.md R-03 (`bollo_sanzione` 2525, `bollo_interessi` 2526, `ravv_irpef_sanzione` 8901, `ravv_irpef_interessi` 1989, `ravv_add_regionale_sanzione` 8902, `ravv_add_regionale_interessi` 1994, `ravv_add_comunale_sanzione` 8926, `ravv_add_comunale_interessi` 1998)
- [X] T006 Set `src/engine/regole/adempimenti/index.ts` (data-model.md «Regole nuove»: `codiceAteco` 86.93.00, `naturaEsente` N4, `giorniIscrizioneEnpap` 90, `sogliaAccorpamentoBollo` 5.000 €) con getter `regoleAdempimenti(anno, data?)` attraverso il risolutore della 014, e insieme `adempimenti` nel catalogo `src/engine/parametri/catalogo.ts` (+ `valoreInUso` in `src/engine/parametri/anteprima.ts`, `origine.ts`); fino a far passare T003
- [X] T007 Segnaposto `src/engine/regole/guide-adempimenti/valori.ts` (`componi(testo, { anno, oggi })`) fino a far passare T002

**Checkpoint**: i valori citati si leggono dalle regole e seguono gli aggiornamenti della 014.

---

## Phase 3: User Story 3 - Le guide del primo anno (P1) 🎯 contenuti

**Obiettivo**: le 22 guide di contracts/guida.md con fonte e stato.
**Test indipendente**: quickstart.md, test automatici della prima riga.

- [X] T008 [P] [US3] Test in `tests/unit/guide-adempimenti.test.ts` (parte catalogo): 22 guide con gli id di contracts/guida.md; sezioni obbligatorie presenti; id unici e validi; fonti https; ogni segnaposto di ogni testo si risolve per 2027; **nessun valore scritto a mano** nei testi (regex per codici tributo a 4 cifre, date `gg/mm`, `MM-GG`, percentuali) (FR-005, FR-007, FR-008, SC-003, SC-005)
- [X] T009 [P] [US3] Guide di apertura in `src/engine/regole/guide-adempimenti/apertura.ts` (5)
- [X] T010 [P] [US3] Guide di fattura in `src/engine/regole/guide-adempimenti/fattura.ts` (4)
- [X] T011 [P] [US3] Guide dei versamenti in `src/engine/regole/guide-adempimenti/versamenti.ts` (6; ravvedimento con l'avviso sui codici delle addizionali contraddittori)
- [X] T012 [P] [US3] Guide delle dichiarazioni in `src/engine/regole/guide-adempimenti/dichiarazioni.ts` (4; Redditi PF e non 730, quadri RE, RN, RV, RP)
- [X] T013 [P] [US3] Guide delle situazioni particolari in `src/engine/regole/guide-adempimenti/particolari.ts` (3)
- [X] T014 [US3] Indice `src/engine/regole/guide-adempimenti/index.ts`: `GUIDE_ADEMPIMENTI`, `guida(id)`, `cercaGuide(testo)` (titolo, riga, parole chiave, sinonimi; senza accenti), `daRicontrollare(guida, oggi)` (> 12 mesi); fino a far passare T008

---

## Phase 4: User Story 1 - Trovare la guida giusta (P1) 🎯 MVP

**Test indipendente**: quickstart.md scenario 1.

- [X] T015 [P] [US1] Test in `tests/unit/guide-adempimenti.test.ts`: `cercaGuide('bollo')` → `f24-bollo`; `'740'` e `'unico'` → `redditi-pf`; `''` → tutte; ricerca senza accenti
- [X] T016 [US1] `src/features/guide-adempimenti/GuideAdempimenti.tsx`: pulsante come il calendario («Guide agli adempimenti», sottotitolo) + Dialog con stato indice/guida, «Indietro», «Chiudi»; prop `guidaIniziale`
- [X] T017 [US1] Indice dentro `src/features/guide-adempimenti/GuideAdempimenti.tsx` (un file solo invece di `Indice.tsx`): ricerca, 5 gruppi, titolo, riga, etichetta di frequenza e di pertinenza («solo se emetti fatture con IVA»)
- [X] T018 [US1] Home: `<GuideAdempimenti />` sotto `<CalendarioFiscale />` in `src/features/home/Cruscotto.tsx`; apertura automatica con `?guida=<id>` (letto nel browser, id validato con `guida(id)`)

---

## Phase 5: User Story 2 - Seguire una guida passo passo (P1)

**Test indipendente**: quickstart.md scenari 2, 5, 6.

- [X] T019 [P] [US2] Test in `tests/unit/guide-adempimenti.test.ts`: spunte per guida (aggiungi, togli, azzera) sullo store di `src/features/guide-adempimenti/spunte.ts` con `localStorage` finto
- [X] T020 [US2] `src/features/guide-adempimenti/spunte.ts` (useSyncExternalStore, chiave `fiscal.guide.spunte`, data-model.md «Spunte»)
- [X] T021 [US2] `src/features/guide-adempimenti/Guida.tsx`: sezioni nell'ordine di FR-004 (omesse se vuote), passi con spunta, «Cosa scrivere» con «?» (Popover come gli aiuti), errori comuni, quando chiedere un parere, fonte con stato e ultimo controllo, «da verificare» con motivi, «da ricontrollare», Apri in Fiscal che chiude il layer

---

## Phase 6: User Story 4 - Disegno del modulo (P2)

**Test indipendente**: quickstart.md scenario 2 (disegno → passo).

- [X] T022 [US4] `src/features/guide-adempimenti/Disegno.tsx`: schemi di `f24`, `redditi`, `inizio_attivita`, `fattura` con caselle numerate evidenziate; tocco su un numero → scorre al passo; una colonna sotto i 480 px; testo alternativo per lettori di schermo (research.md R-04)

---

## Phase 7: User Story 5 - Guide aggiornate (P3)

**Test indipendente**: quickstart.md scenari 3 e 4.

- [X] T023 [US5] Avviso «Aggiornata il …» quando un valore citato viene da un aggiornamento della 014 (`testoOrigine` di `src/engine/parametri/origine.ts`) e «Da ricontrollare» oltre 12 mesi, in `Guida.tsx`

---

## Phase 8: Polish

- [X] T024 [P] Collegamenti alle guide: sezione «Guide agli adempimenti» in `app/aiuto/page.tsx`; «?» di Tasse → Versamenti verso `f24-tasse`; scadenzario della Dichiarazione verso `redditi-pf` e `dichiarazione-enpap` (`/home/?guida=…`) (FR-012)
- [X] T025 [P] Tour: tappa «Guide agli adempimenti» in `src/features/tour/Tour.tsx` (e conteggio in `tests/e2e/tour.spec.ts`); voce di glossario se serve
- [X] T026 e2e `tests/e2e/guide-adempimenti.spec.ts` (scenari 1, 2, 5, 6, 7) e controllo di impaginazione del layer in `tests/e2e/layout.spec.ts`
- [X] T027 Suite completa (unit, integrazione, pgTAP, e2e), lint, build, scan segreti; quickstart.md per intero

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T007) → US3 (contenuti) → US1 → US2 → US4 → US5 → Polish.
- T002/T003 prima di T005–T007; T008 prima di T009–T014; T014 prima di US1.
- US4 dipende da US2 (passi a cui scorrere); US5 da US2.

## Parallel Opportunities

- T002 e T003; T009–T013 (file diversi); T015 e T019; T024 e T025.

## Implementation Strategy

1. **MVP = Foundational + US3 + US1 + US2**: le guide si trovano e si seguono, con i valori dalle regole.
2. Poi i disegni (US4) e gli avvisi di aggiornamento (US5).
3. Nessuna migrazione: si pubblica con «unisci e pubblica», senza `db push`.
