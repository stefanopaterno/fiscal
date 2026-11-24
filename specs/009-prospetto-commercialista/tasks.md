# Tasks: Prospetto per il commercialista

- [X] T001 Test `tests/unit/prospetto.test.ts`: sezioni e totali, periodo, codici, PDF ed Excel coerenti, controlli, ZIP AES con libarchive
- [X] T002 Motore `src/engine/prospetto/{contenuto,pdf,xlsx,zip-aes}.ts`; dipendenza `@noble/ciphers` 2.4.0
- [X] T003 Migrazione `20261124000100_prospetto.sql` e pgTAP `016_prospetto.test.sql`
- [X] T004 Dati `src/features/prospetto/dati.ts`
- [X] T005 [US1–US5] Pagina `/app/dichiarazione/pacchetto/`: periodo, sezioni, modelli, controlli, anteprima, generazione, password una volta, storico, richieste
- [X] T006 Test e2e `tests/e2e/prospetto.spec.ts` (pacchetto aperto con bsdtar, nessun cognome con i codici) e test di impaginazione
- [X] T007 Confronto riga per riga (`src/engine/prospetto/confronto.ts`: impronte SHA-256 abbreviate di chiave e riga, mai contenuti; migrazione `20261124000500_impronte_pacchetti.sql`), anteprima delle righe nuove o cambiate prima di generare, conteggi nello storico; giustificativi delle spese del periodo nella cartella `giustificativi/` con nomi dati da Fiscal
