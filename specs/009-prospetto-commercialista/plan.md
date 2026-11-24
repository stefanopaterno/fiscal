# Piano: Prospetto per il commercialista

**Spec**: [spec.md](spec.md) | **Ricerca**: [research.md](research.md) | **Data**: 2026-11-24

- Motore `src/engine/prospetto/`: `contenuto.ts` (sezioni, totali, controlli, codici), `pdf.ts`, `xlsx.ts`,
  `zip-aes.ts`. Nessun calcolo fiscale nuovo: spese per categoria e ammortamenti dalla 008, esito dalla 004,
  scadenze e importi dalla 004/006.
- Dati `src/features/prospetto/dati.ts`: raccolta del periodo, generazione, storico, richieste, modelli.
- Migrazione `20261124000100_prospetto.sql`: `pacchetti` (solo metadati e totali per il confronto), `richieste_commercialista`,
  `modelli_pacchetto`. File e password non si salvano.
- Pagina `/app/dichiarazione/pacchetto/` dalla Dichiarazione.
- Promemoria: nessuno automatico (FR-014); dalla password si rimanda alle scadenze personali della 004.

## Rinviato
- Confronto dettagliato riga per riga tra due pacchetti (oggi: sezioni con totali cambiati).
- Giustificativi delle spese come allegati (oggi: documenti dell'archivio 010 nel periodo).
