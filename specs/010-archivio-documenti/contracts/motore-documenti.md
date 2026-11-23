# Contratto: motore dei documenti (`src/engine/documenti/`)

TypeScript puro (principio I), nessun accesso a rete o database.

- `estraiXmlDaP7m(byte: Uint8Array): Uint8Array` — CMS SignedData in DER (o Base64) → contenuto firmato.
  Errore chiaro se il file non è un `.p7m` valido o non contiene dati.
- `leggiZip(byte: Uint8Array): Promise<{ nome: string; dati: Uint8Array }[]>` — metodi store e deflate.
- `scriviZip(file: { nome: string; dati: Uint8Array }[]): Uint8Array` — metodo store, CRC-32.
- `crc32(byte)`, `esadecimale(byte)`.
- `riconosciFileFattura(nome, testo) → 'fattura' | 'metadati' | 'altro'` — dalla radice XML
  (`FatturaElettronica` o `FileMetadati`).
- `chiaveFattura(dati) → string | null` — fornitore (partita IVA o CF) + numero + data.
- `nomeFileSicuro({ tipo, data, emittente, estensione }) → string` — niente nomi originali.
- `sembraClinico(testo) → string[]` — parole sospette (FR-012).
- `regoleDocumenti(anno)` in `src/engine/regole/documenti/`: conservazione per tipo con fonte e stato.

Lettura dei dati dall'XML: `leggiFatturaRicevuta(doc)` della 008 (con `DOMParser` nel browser).
