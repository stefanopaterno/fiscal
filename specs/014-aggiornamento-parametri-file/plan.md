# Implementation Plan: Aggiornamento dei parametri fiscali da file

**Branch**: `014-aggiornamento-parametri-file` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

## Summary

Un **catalogo** dei parametri aggiornabili (chiave, unità, tipo di decorrenza, limiti, fonti ufficiali) descrive
come leggere e sovrascrivere ogni valore nei set di regole per anno già esistenti. Fiscal genera dal catalogo una
**richiesta per Claude** (Markdown con prompt, valori in uso e schema), riceve un **file JSON** versionato, lo
**valida** voce per voce, mostra **prima → dopo e impatto in euro** ricalcolando l'anno con un registro simulato,
e salva le voci approvate in un **registro a sola aggiunta** nel database. Un **risolutore** puro sovrappone il
registro ai valori base: i getter delle regole (`regoleIrpefPerAnno`, `regolePerAnno`, `regoleSpesePerAnno`,
`regoleScadenze`) restituiscono i valori in vigore senza che il motore cambi. Dettagli in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 strict; SQL Postgres 17 (Supabase).
**Primary Dependencies**: nessuna nuova (validazione scritta a mano come per gli XML della 010).
**Storage**: 2 tabelle nuove (`importazioni_parametri`, `aggiornamenti_parametri`), aggiornamento di
`aliquote_addizionali` per le addizionali ([data-model.md](data-model.md)).
**Testing**: Vitest (catalogo, conversione unità, validatore, risolutore, anteprima, casi A–H), pgTAP (RLS, sola
aggiunta, anno chiuso), Playwright (prepara → importa → approva → annulla).
**Target Platform**: export statico Next.js su Vercel, browser moderni, offline per la lettura.
**Project Type**: web app (SPA multipagina statica + Supabase).
**Performance Goals**: anteprima di un file con 60 voci in meno di 1 s sul telefono.
**Constraints**: nessun dato personale nella richiesta (tranne regione e comune); scritture del registro solo
online (come le fatture); il file è solo dati, mai eseguito.
**Scale/Scope**: ~60 chiavi di catalogo, 1 utente, poche importazioni l'anno.

## Constitution Check

| Principio | Esito | Nota |
|---|---|---|
| I. Motore separato e versionato | ⚠️ → ✅ con emendamento | I set per anno restano la base nel codice; il risolutore sovrappone valori approvati e datati. Il motore non cambia. Serve emendamento 2.9.0 (vedi Complexity Tracking) |
| II. Spiegabile e con fonte | ✅ | Ogni valore importato porta fonte, stato e data; le spiegazioni dei calcoli citano l'origine (FR-021) |
| III. Test-first | ⚠️ → ✅ con emendamento | Test prima del codice per catalogo, validatore e risolutore; i valori importati non hanno test propri ma limiti di plausibilità, ricalcolo nell'anteprima e approvazione |
| IV. Modello dati prima | ✅ | data-model.md e contratti prima del codice |
| V. Configurabilità | ✅ | Le addizionali restano per utente; il catalogo copre ENPAP e i parametri di fatturazione |
| VI. UI | ✅ | Pagina «Parametri fiscali» con tre schede, Fluent UI 9, «?» ovunque, 360 px |
| VII. Dati su Supabase con RLS | ✅ | Tabelle con `applica_regole_tabella`, sola aggiunta via trigger, aal2 |

**Post-design**: rivalutato dopo data-model e contratti, nessuna nuova violazione.

## Project Structure

### Documentation (this feature)

```text
specs/014-aggiornamento-parametri-file/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── file-aggiornamento.schema.json   # formato del file restituito da Claude (v1)
│   └── richiesta-template.md            # bozza della richiesta generata da Fiscal
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/engine/parametri/            # nuovo modulo, puro (nessun accesso al database)
├── tipi.ts                      # ParametroCatalogo, VoceFile, RigaRegistro, Esito
├── catalogo.ts                  # tutte le chiavi: leggi/applica sui set per anno, unità, limiti, fonti
├── unita.ts                     # conversioni file ↔ regole (percentuali → frazioni, euro → centesimi, date)
├── leggi-file.ts                # estrae il JSON dal testo incollato (anche dentro ```json)
├── valida.ts                    # schema, chiavi, plausibilità, fonti ufficiali, anni chiusi, doppioni
├── risolvi.ts                   # base + registro → valore in vigore (per anno o per data)
├── attivi.ts                    # registro attivo in memoria + conRegistro() per le simulazioni
├── anteprima.ts                 # prima→dopo, gruppi, impatto in euro (ricalcolo dell'anno)
└── richiesta.ts                 # genera il Markdown per Claude dal catalogo
src/engine/regole/f24/index.ts   # codici tributo F24 come regole (oggi solo nei testi delle scadenze)
src/engine/regole/{index,irpef/index,spese/index,scadenze/index}.ts
                                 # i getter passano dal risolutore; regolePerAnno(anno, data?)
src/features/parametri/
├── dati.ts                      # letture/scritture Supabase (registro, importazioni, addizionali)
├── ProviderParametri.tsx        # carica il registro dopo l'accesso e lo imposta in attivi.ts
├── ParametriInUso.tsx           # elenco per area, origine, cronologia, annulla
├── PreparaRichiesta.tsx         # scelta anni, copia/scarica
└── Importa.tsx                  # incolla/carica → anteprima → approva voce per voce
app/impostazioni/parametri/page.tsx
supabase/migrations/20261126000100_parametri.sql
supabase/tests/database/020_parametri.test.sql
tests/e2e/parametri.spec.ts
```

**Structure Decision**: stesso schema delle feature precedenti: logica in `src/engine/parametri/` senza
dipendenze dall'interfaccia, dati in `src/features/parametri/dati.ts`, pagina sotto `app/impostazioni/`.

## Fasi di implementazione (per tasks.md)

1. **Emendamento costituzione 2.9.0** (principi I e III) prima del codice.
2. **Catalogo + unità + test** (copertura: ogni valore usato dal motore con `Regola<>` ha una chiave o è
   dichiarato «non aggiornabile da file» con motivo).
3. **Risolutore + getter + test di non regressione**: con registro vuoto tutti i test esistenti passano identici.
4. **Fatturazione per data**: `regolePerAnno(anno, data)`; `calcola.ts` e `NuovaFattura.tsx` passano la data
   della fattura; le fatture emesse non si ricalcolano (gli importi sono già salvati).
5. **Migrazione + pgTAP**: tabelle, sola aggiunta, blocco anni chiusi, pulizia in modalità prova.
6. **Lettura file + validatore + test** con file di prova validi e malevoli.
7. **Anteprima e impatto** (registro simulato con `conRegistro`).
8. **Richiesta per Claude** (Markdown) + test «nessun dato personale».
9. **UI**: pagina, provider, promemoria in home e in «Novità», «da fare nel programma» in «Novità».
10. **Spiegazioni dei calcoli** con l'origine del valore (FR-021).
11. **e2e + quickstart**.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Valori normativi anche nel database (principio I) | L'utente vuole aggiornare i valori durante l'anno senza una nuova pubblicazione | Solo codice (flusso 012): richiede sempre l'assistente e una pubblicazione; è proprio ciò che la funzione vuole evitare. Il codice resta la base, il database contiene solo variazioni datate e con fonte |
| Valori senza test dedicati (principio III) | I valori arrivano dopo la pubblicazione | Generare test da file importati non aggiunge garanzie: i test controllerebbero lo stesso valore appena scritto. Si testano invece catalogo, conversioni, limiti e risolutore; ogni valore passa limiti di plausibilità e ricalcolo prima dell'approvazione |
