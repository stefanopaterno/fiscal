# Tasks: Prospetto per il commercialista

- [X] T001 Test `tests/unit/prospetto.test.ts`: sezioni e totali, periodo, codici, PDF ed Excel coerenti, controlli, ZIP AES con libarchive
- [X] T002 Motore `src/engine/prospetto/{contenuto,pdf,xlsx,zip-aes}.ts`; dipendenza `@noble/ciphers` 2.4.0
- [X] T003 Migrazione `20261124000100_prospetto.sql` e pgTAP `016_prospetto.test.sql`
- [X] T004 Dati `src/features/prospetto/dati.ts`
- [X] T005 [US1–US5] Pagina `/app/dichiarazione/pacchetto/`: periodo, sezioni, modelli, controlli, anteprima, generazione, password una volta, storico, richieste
- [X] T006 Test e2e `tests/e2e/prospetto.spec.ts` (pacchetto aperto con bsdtar, nessun cognome con i codici) e test di impaginazione
- [ ] T007 Confronto riga per riga tra pacchetti e giustificativi delle spese come allegati — rinviati
