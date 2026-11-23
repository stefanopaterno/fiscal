# Guida di verifica: Archivio documenti e fatture ricevute

| Caso | Dati | Atteso |
|---|---|---|
| A | XML firmato `.p7m` (DER) generato in locale con una fattura | l'XML estratto è identico all'originale |
| B | lo stesso `.p7m` in Base64 | stesso risultato |
| C | ZIP con 2 fatture (una `.xml`, una `.xml.p7m`), 2 file di metadati e un PDF | 2 fatture importate, 2 metadati scartati, 1 file "non è una fattura" |
| D | ricaricare lo stesso ZIP | 0 importate, 2 "già presenti" |
| E | fattura importata → "crea la spesa" | spesa con fornitore, data, importo; categoria scelta dall'utente; collegata e "con giustificativo" |
| F | elimina un documento | va nel cestino, si ripristina; dopo 30 giorni sparisce (data simulata) |
| G | esportazione di un anno | ZIP con i file e `indice.csv`; CRC verificato |
| H | descrizione "referto diagnosi" | avviso sui dati clinici |
| I | un altro utente | non vede righe né file (anche conoscendo il percorso) |

Comandi: `npm test`, `supabase test db`, `npm run test:e2e`.
