# Contratto: pagine e database della 010

| Percorso | Contenuto |
|---|---|
| `/app/documenti/` | archivio: ricerca e filtri (anno, tipo, emittente, parola, stato), carica, importa fatture ricevute (XML, P7M, ZIP), "da classificare", non collegati, scadenze, cestino, esporta |
| `/app/documenti/scheda/?id=` | dettaglio: apri il file, dati, collegamenti alle voci, versioni, sostituisci, elimina; per le fatture ricevute "crea la spesa" o "non è una spesa" |

Voce di navigazione "Documenti" (sul telefono dentro "Altro"). Importi e nomi rispettano l'occhio.

Database: tabelle di [data-model.md](../data-model.md) conformi a `003_conformita`; test pgTAP
`012_documenti.test.sql` (unicità dell'impronta e della chiave fattura, cestino, collegamenti, isolamento).
I documenti non sono dati di prova: `cancella_dati_prova` non li tocca.
