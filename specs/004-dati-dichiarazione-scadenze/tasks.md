# Tasks: Dati per la dichiarazione e scadenze

- [X] T001 Test `tests/unit/dichiarazione.test.ts`: festivi e slittamenti, pertinenza, stati, file di calendario, esito, credito, checklist
- [X] T002 Regole `src/engine/regole/scadenze/`, `src/engine/regole/dichiarazione/` e motore `src/engine/scadenze/`, `src/engine/dichiarazione/`
- [X] T003 Migrazione `20261123000400_dichiarazione.sql` e pgTAP `015_dichiarazione.test.sql`
- [X] T004 Dati `src/features/dichiarazione/dati.ts`; acconti del 730 in `raccogliAnno`
- [X] T005 [US1, US7, US6] Pagina `/app/dichiarazione/`: checklist, esito, credito, chiusura
- [X] T006 [US4] Pagina `/app/dichiarazione/scadenze/`: calendario, fatta, proroghe, personali, esportazione; promemoria in home
- [X] T007 [US8] Pagina `/app/dichiarazione/partenza/` con la guida al 730
- [X] T008 [US5] Pagina `/app/dichiarazione/riepilogo/` stampabile
- [X] T009 Test e2e `tests/e2e/dichiarazione.spec.ts` e pagine nel test di impaginazione
- [X] T010 Anni chiusi protetti (migrazione `20261124000300_anni_chiusi.sql`, pgTAP 018: CU, dati dell'anno, aliquote, spese e oneri non si modificano finché l'anno non è riaperto; registro `eventi_anno` di chiusure e riaperture), Dati dell'anno in sola lettura con il collegamento per riaprire, controllo prima di salvare spese e oneri; precompilazione delle aliquote e dei dati stabili dall'anno prima, da verificare (FR-006); e2e `tests/e2e/anni-chiusi.spec.ts`
- [ ] T011 Notifiche da job schedulati lato server — release successiva (decisione dell'utente)
