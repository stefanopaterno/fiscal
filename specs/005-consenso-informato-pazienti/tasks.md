# Attività: Consenso informato dei pazienti

- [X] T001 Migrazione `supabase/migrations/20261124000200_consensi.sql` e pgTAP `supabase/tests/database/017_consensi.test.sql`
- [X] T002 [P] Motore `src/engine/consensi/paziente.ts` (nascita dal codice fiscale, iniziali) e `stato.ts`; test `tests/unit/consensi.test.ts`
- [X] T003 [US1] Nomi riservati e pulsante dei nomi `src/features/consensi/nomi.tsx`; verifica del dispositivo in `src/features/lock/sbloccoRapido.ts`; sostituzione in rubrica, fatture, home, adempimenti
- [X] T004 [US1] Dati `src/features/consensi/dati.ts` (letture, registrazione, firmatari, revoca, allegati, esportazione, DPA)
- [X] T005 [US1][US2][US3] Pagine `/app/consensi/` e `/app/consensi/paziente/` (`Consensi.tsx`, `SchedaConsensi.tsx`)
- [X] T006 [US4] Pagina `/app/consensi/modelli/` (`ModelliConsenso.tsx`)
- [X] T007 [US5] Avviso in Nuova fattura e promemoria in home e Scadenze (`AvvisoFattura.tsx`)
- [X] T008 Menu, tappa del tour, guida passo passo; e2e `tests/e2e/consensi.spec.ts`, aggiornati fatture, modalità e tour
- [ ] T009 Conferme con l'Ordine (durata, firme dei genitori, conservazione) e DPA con Supabase (azione dell'utente)
