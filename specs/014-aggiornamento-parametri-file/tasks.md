---

description: "Elenco dei lavori per la specifica 014 - Aggiornamento dei parametri fiscali da file"
---

# Tasks: Aggiornamento dei parametri fiscali da file

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: richiesti dalla costituzione (principio III, test-first sui calcoli; principio VII, test delle regole di accesso). I test di ogni fase si scrivono prima del codice e devono fallire.

## Phase 1: Setup

- [X] T001 Emendamento costituzione 2.9.0 (research.md R-12: principio I valori aggiornabili da file, principio III test su catalogo/validatore/risolutore) in `.specify/memory/constitution.md`, con rapporto di sincronizzazione in testa e data
- [X] T002 [P] File di prova in `tests/fixtures/parametri/`: `valido.json`, `errori.json`, `malevolo.json`, `anno-chiuso.json`, `programma.json`, `bollo-marzo.json`, `anno-2028.json` conformi (o volutamente non conformi) a `contracts/file-aggiornamento.schema.json`, come descritto in quickstart.md

---

## Phase 2: Foundational (blocca tutte le storie)

**Obiettivo**: catalogo, conversioni, risolutore e registro; con registro vuoto l'app si comporta esattamente come oggi.

- [X] T003 [P] Test `tests/unit/parametri-catalogo.test.ts`: ogni `Regola<>` raggiungibile da `regoleIrpefPerAnno`, `regolePerAnno`, `regoleSpesePerAnno`, `regoleScadenze` e dal nuovo set F24 ha una chiave di catalogo oppure è nella lista «non aggiornabili da file» con motivo; chiavi uniche; `leggi`→`applica` con lo stesso valore restituisce regole uguali (data-model.md `ParametroCatalogo.chiave`, `ParametroCatalogo.decorrenza`, `ParametroCatalogo.unita`)
- [X] T004 [P] Test `tests/unit/parametri-unita.test.ts`: percentuale ↔ frazione, euro (stringa o numero, max 2 decimali) ↔ centesimi senza virgola mobile, date e mese-giorno, scaglioni con `fino_a: null` solo per l'ultimo (research.md R-05)
- [X] T005 [P] Test `tests/unit/parametri-risolvi.test.ts`: per anno, per data (`dal ≤ data`), anno solare; decorrenza più recente, a parità l'ultima approvata; righe annullate ignorate; nessuna riga → base; anno senza set (2028) → base riportata dall'ultimo anno con stato `da_verificare` (research.md R-03, R-07; data-model.md «Risoluzione»)
- [X] T006 Tipi in `src/engine/parametri/tipi.ts` (data-model.md `ParametroCatalogo`, `VoceFile`, `EsitoVoce`; riga del registro come `aggiornamenti_parametri`)
- [X] T007 Set dei codici tributo `src/engine/regole/f24/index.ts` (research.md R-11) e testi delle scadenze in `src/engine/regole/scadenze/index.ts` che citano i codici leggendoli da lì
- [X] T008 Conversioni `src/engine/parametri/unita.ts` (riusa `euroInCentesimi` di `src/engine/importi.ts` dove possibile) fino a far passare T004
- [X] T009 Catalogo `src/engine/parametri/catalogo.ts`: aree IRPEF, acconti, ENPAP, fatturazione, spese (per categoria e onere), scadenze, F24, addizionali; per ogni chiave nome, spiegazione, unità, decorrenza, limiti, soglia di anomalia, fonti (research.md R-03, R-06), `leggi`/`applica` immutabili; lista motivata dei non aggiornabili; fino a far passare T003
- [X] T010 Risolutore puro `src/engine/parametri/risolvi.ts` e registro attivo `src/engine/parametri/attivi.ts` (`impostaRegistro`, `registroAttivo`, `conRegistro` con ripristino in `finally`, research.md R-01, R-02) fino a far passare T005
- [X] T011 Getter delle regole attraverso il risolutore: `src/engine/regole/index.ts` (`regolePerAnno(anno, data?)`), `src/engine/regole/irpef/index.ts`, `src/engine/regole/spese/index.ts`, `src/engine/regole/scadenze/index.ts`, `src/engine/regole/f24/index.ts`; `anniConRegole*` includono gli anni con voci importate (R-07); memo per (anno, data, versione del registro)
- [X] T012 Fatture per data: `src/engine/fattura/calcola.ts` passa la data della fattura a `regolePerAnno`; `src/features/fatturazione/NuovaFattura.tsx` e `ConfigurazioneAttivita.tsx` passano la data della bozza (o oggi); le fatture emesse non si ricalcolano (research.md R-04)
- [X] T013 Non regressione: `npx vitest run` e `npx playwright test` con registro vuoto, nessun risultato cambiato; aggiungere a `tests/unit/parametri-risolvi.test.ts` un caso che confronta `calcolaAnno` dei dati d'esempio 2027 prima/dopo T011
- [X] T014 [P] Test pgTAP `supabase/tests/database/020_parametri.test.sql`: RLS proprietario e aal2 su entrambe le tabelle; anonimo 42501; `update`/`delete` su `aggiornamenti_parametri` rifiutati fuori dalla pulizia della prova; esattamente uno tra `anno` e `dal`; `annulla_id` obbligatorio solo con `azione = 'annullato'` e unico; inserimento e annullamento rifiutati per anno chiuso; `importazioni_parametri` modificabile solo in `modifiche_programma[*].stato` (data-model.md `aggiornamenti_parametri.azione`, `aggiornamenti_parametri.annulla_id`, `aggiornamenti_parametri.chiave`, `aggiornamenti_parametri.anno`, `aggiornamenti_parametri.dal`, `aggiornamenti_parametri.valore`, `aggiornamenti_parametri.stato`, `aggiornamenti_parametri.stato_norma`, `aggiornamenti_parametri.nota`, `importazioni_parametri.data_ricerca`, `importazioni_parametri.versione_schema`, `importazioni_parametri.anni`, `importazioni_parametri.modifiche_programma`)
- [X] T015 Migrazione `supabase/migrations/20261126000100_parametri.sql`: tipi, tabelle, `private.applica_regole_tabella`, trigger di sola aggiunta e di anno chiuso con controllo del ruolo in linea prima di `private.*`, inclusione nella pulizia della modalità prova; fino a far passare T014
- [ ] T016 Dati `src/features/parametri/dati.ts` (lettura registro e importazioni; scritture solo online, mai dalla coda) e `src/features/parametri/ProviderParametri.tsx` montato nel layout autenticato `app/layout.tsx`: carica il registro dopo l'accesso, chiama `impostaRegistro`, ricarica dopo ogni approvazione o annullamento

**Checkpoint**: catalogo e risolutore pronti, app identica a prima con registro vuoto.

---

## Phase 3: User Story 1 - Preparare la richiesta per Claude (P1) 🎯 MVP

**Obiettivo**: documento Markdown con prompt, priorità «da verificare», catalogo, fonti e schema.
**Test indipendente**: quickstart.md scenario 1.

- [X] T017 [P] [US1] Test `tests/unit/parametri-richiesta.test.ts`: struttura come `contracts/richiesta-template.md` (sezioni 1–5), «da verificare» in cima, solo anni scelti, valori nelle unità del file, addizionali solo con regione e comune impostati; controllo automatico che il testo non contenga codici fiscali, nomi, importi di CU/fatture/spese del profilo di prova (FR-006, SC-007)
- [X] T018 [US1] Generatore `src/engine/parametri/richiesta.ts` (research.md R-09) fino a far passare T017
- [ ] T019 [US1] Scheda `src/features/parametri/PreparaRichiesta.tsx`: scelta anni (corrente, successivo, entrambi), anteprima, «Copia» e «Scarica .md», avviso se mancano regione/comune; aiuti «?» (011)
- [ ] T020 [US1] Pagina `app/impostazioni/parametri/page.tsx` con le schede In uso / Prepara richiesta / Importa e voce in `app/impostazioni/` che la apre; collegamento dalla pagina «Novità» (`src/features/novita/Novita.tsx`)

**Checkpoint**: la richiesta si genera e si copia.

---

## Phase 4: User Story 2 - Importare il file e vedere cosa cambia (P1)

**Obiettivo**: lettura tollerante, validazione voce per voce, anteprima con impatto in euro; nessun valore cambia.
**Test indipendente**: quickstart.md scenari 2, 3, 7 (parte anteprima), 9.

- [X] T021 [P] [US2] Test `tests/unit/parametri-leggi-file.test.ts`: JSON puro, dentro ```json con testo intorno, più blocchi (prende il primo con `versione_schema`), testo oltre 256 KB rifiutato, versione diversa da 1 rifiutata con messaggio su come chiedere a Claude di correggere
- [X] T022 [P] [US2] Test `tests/unit/parametri-valida.test.ts` con `tests/fixtures/parametri/*.json`: chiave sconosciuta, decorrenza incoerente, tipo errato, 0,23 al posto di 23, scaglioni non crescenti, fonte non ufficiale «verificata» → `da_verificare`, `stato_norma` non in vigore → `da_verificare`, dominio come sottodominio accettato e come testo nell'URL rifiutato, anno chiuso → bloccata, doppioni, variazione anomala, file vecchio, ambito addizionali diverso dal profilo → scartata, stringhe oltre i limiti dello schema (research.md R-06; data-model.md `VoceFile.fonte`, `VoceFile.stato_norma`, `EsitoVoce.gruppo`)
- [X] T023 [P] [US2] Test `tests/unit/parametri-anteprima.test.ts`: gruppi cambia/conferma/scartata/bloccata/programma; impatto IRPEF uguale alla differenza di `imposteAnno` tra registro attuale e registro + voce (dati d'esempio 2027); impatto di fatturazione su fattura tipo; scadenze senza importo; dopo l'anteprima il registro attivo è quello di prima (research.md R-02)
- [X] T024 [US2] Lettura `src/engine/parametri/leggi-file.ts` fino a far passare T021
- [X] T025 [US2] Validatore `src/engine/parametri/valida.ts` (domini ufficiali + domini di regione e comune dal profilo; nessun `eval`, testi solo come testo) fino a far passare T022
- [X] T026 [US2] Anteprima `src/engine/parametri/anteprima.ts` con `conRegistro` e `calcolaAnno`/`imposteAnno`; input dell'anno da `raccogliAnno` di `src/features/tasse/dati.ts`; fino a far passare T023
- [ ] T027 [US2] Scheda `src/features/parametri/Importa.tsx`: incolla o carica (.json, .md, .txt), elenco per gruppi con prima → dopo, decorrenza, fonte (link `https:` con `rel="noopener noreferrer"`), stato, motivi, impatto in euro rispettando l'occhio che nasconde gli importi; voci bloccate con la spiegazione sull'anno chiuso

**Checkpoint**: l'anteprima è completa e non modifica nulla.

---

## Phase 5: User Story 3 - Approvare voce per voce senza toccare lo storico (P1)

**Obiettivo**: le voci approvate entrano nel registro e i calcoli le usano dalla decorrenza giusta.
**Test indipendente**: quickstart.md scenari 4 e 5.

- [X] T028 [P] [US3] Test `tests/unit/parametri-approva.test.ts`: dall'esito alla riga del registro (unità delle regole, `valore_precedente` = valore in vigore, `stato` finale), conteggi dell'importazione con «rifiutata»; bollo 2,50 € dal 2027-03-01 → fattura del 15/02 invariata, bozza del 02/03 con 2,50 €; scaglioni 2027 → 2026 invariato (data-model.md `aggiornamenti_parametri.valore_precedente`, `aggiornamenti_parametri.fonte`, `aggiornamenti_parametri.importazione_id`, `importazioni_parametri.conteggi`)
- [X] T029 [US3] Funzione pura `preparaApprovazione` in `src/engine/parametri/anteprima.ts` fino a far passare T028
- [ ] T030 [US3] Salvataggio in `src/features/parametri/dati.ts`: crea l'importazione e le righe approvate in un'unica chiamata (funzione SQL `public.approva_parametri` nella migrazione T015, transazione unica), poi ricarica il registro; per `addizionali.*` aggiorna `aliquote_addizionali` con `verificate` (research.md R-08)
- [ ] T031 [US3] In `Importa.tsx`: selezione voce per voce, «Approva tutte», conferma in più per le voci anomale, riepilogo finale con link a «In uso»; parametri per data con decorrenza passata: elenco delle bozze che verranno ricalcolate
- [ ] T032 [US3] Spiegazioni dei calcoli con l'origine del valore (FR-021): il risolutore espone l'origine (`programma` o `aggiornamento` con data e fonte) e le spiegazioni in `src/engine/irpef/anno.ts`, `src/engine/fattura/calcola.ts` e `src/engine/irpef/enpap.ts` la citano; test in `tests/unit/irpef-anno.test.ts` e `tests/unit/fattura-calcolo.test.ts`
- [ ] T033 [US3] Allineamento con il programma (FR-022): se la base ha lo stesso valore e una fonte ufficiale, la voce risulta «allineata al programma» in `risolvi.ts`; test in `tests/unit/parametri-risolvi.test.ts`

**Checkpoint**: MVP completo (US1–US3).

---

## Phase 6: User Story 4 - Vedere il registro e annullare (P2)

**Test indipendente**: quickstart.md scenari 6 e 7 (parte annullamento).

- [ ] T034 [US4] Scheda `src/features/parametri/ParametriInUso.tsx`: per area, valore in uso, origine, fonte, stato, cronologia; «Annulla» con conferma, bloccato e spiegato per gli anni chiusi
- [ ] T035 [US4] Annullamento in `src/features/parametri/dati.ts` (riga `annullato` con `annulla_id`, data-model.md `aggiornamenti_parametri.annulla_id`; per `addizionali.*` ripristino di `aliquote_addizionali` dal `valore_precedente`) e ricarica del registro
- [ ] T036 [US4] e2e in `tests/e2e/parametri.spec.ts`: approva, annulla, calcolo tornato uguale, due righe in cronologia

---

## Phase 7: User Story 5 - Novità che il file non può gestire (P2)

**Test indipendente**: quickstart.md scenario 8.

- [ ] T037 [P] [US5] Test in `tests/unit/novita.test.ts`: impronta delle modifiche (titolo normalizzato + URL), nessun duplicato tra importazioni, stati aperta/fatta/non_riguarda (research.md R-10; data-model.md `importazioni_parametri.modifiche_programma`)
- [ ] T038 [US5] Sezione «Da fare nel programma» in `src/features/novita/Novita.tsx` letta da `importazioni_parametri`, con azioni «fatta» e «non mi riguarda»; impronta in `src/engine/novita/modifiche.ts`

---

## Phase 8: User Story 6 - Promemoria per aggiornare (P3)

**Test indipendente**: quickstart.md scenario 10.

- [ ] T039 [P] [US6] Test in `tests/unit/novita.test.ts`: promemoria a gennaio, gennaio–marzo, date addizionali (012), «da verificare» sull'anno in corso da più di 30 giorni, ultima importazione oltre 90 giorni; usa `oggiIso` di `src/lib/oggi.ts` (data di prova)
- [ ] T040 [US6] Regole del promemoria in `src/engine/novita/controlli.ts` e avviso in `src/features/novita/AvvisoNovita.tsx` con pulsante «Prepara aggiornamento»

---

## Phase 9: Polish

- [ ] T041 [P] Aiuti «?» e voci del glossario (catalogo, decorrenza, registro) in `src/engine/regole/glossario/index.ts` e guida in `/app/aiuto/`
- [ ] T042 [P] Tour: passo sulla pagina Parametri fiscali in `src/features/tour/`
- [ ] T043 e2e completo `tests/e2e/parametri.spec.ts` (scenari 1–5, 9) e `tests/e2e/layout.spec.ts` sulla nuova pagina (360 px, 44 px, nessuno scroll orizzontale)
- [ ] T044 Verifica di sicurezza: file malevolo (HTML, script, istruzioni nel testo), URL non `https:`, chiave con caratteri strani; nessun contenuto del file finisce in `innerHTML`
- [ ] T045 Aggiornare `contracts/richiesta-template.md` con l'output reale del generatore e rieseguire quickstart.md per intero

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T016)** → US1 → US2 → US3 (MVP) → US4, US5, US6 (indipendenti tra loro) → Polish.
- Dentro Foundational: T003–T005 prima di T008–T010; T010 prima di T011; T011 prima di T012–T013; T014 prima di T015; T015 e T010 prima di T016.
- US2 dipende da US1 solo per la pagina (T020). US3 dipende da US2 (esiti). US4 dipende da US3 (righe da annullare).

## Parallel Opportunities

- T002 con T001.
- T003, T004, T005, T014 insieme (file diversi).
- T017 con T021, T022, T023 (test di storie diverse) dopo Foundational.
- US4, US5, US6 in parallelo dopo l'MVP; T041 e T042 in parallelo.

## Implementation Strategy

1. **MVP = US1 + US2 + US3**: preparo la richiesta, importo, vedo l'impatto, approvo. Da pubblicare solo dopo il `supabase db push --remote` dell'utente e il suo «unisci e pubblica».
2. Poi US4 (annullamento) prima di usare la funzione sul serio: un errore deve essere reversibile.
3. US5 e US6 come rifinitura.
