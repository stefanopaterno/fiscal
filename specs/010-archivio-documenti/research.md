# Ricerca: Archivio documenti e fatture ricevute

**Spec**: [spec.md](spec.md) | **Piano**: [plan.md](plan.md) | **Data**: 2026-11-23

Legenda: (V) verificata su fonte ufficiale; (D) da verificare.

## R-01 — Fatture ricevute: da dove arrivano (FR-015..FR-017)

- **Decisione**: l'utente scarica le fatture ricevute dal portale "Fatture e Corrispettivi" dell'Agenzia delle
  Entrate (consultazione, download singolo o massivo) e le carica nell'app: XML, XML firmati `.p7m` o lo ZIP del
  download massivo. Il download massivo è gratuito, senza adesione, per una partita IVA e fino a 3 mesi per
  richiesta, evaso di solito entro 24 ore (D, fonti di settore). Lo ZIP delle fatture ricevute contiene per ogni
  fattura il file `.xml` o `.xml.p7m` e un file di metadati (nome con `_metaDato`, `_MT_` o simili, radice XML
  `FileMetadati`): l'app riconosce i metadati dal contenuto, non dal nome, e li scarta (o ne usa
  l'identificativo SdI per i duplicati).
- **Alternative scartate**: scarico automatico dal Sistema di Interscambio (canale accreditato + server, contro
  la costituzione: niente server con dati); lettura della posta PEC (credenziali di posta nell'app).
- Fonti: [elevenhats, download massivo](https://www.elevenhats.it/guide/download-massivo-fatture-elettroniche),
  [NTS, download massivo da AdE](https://servizi.ntsinformatica.it/BusHelpWs/helpnet2017sr8/html/bsfescft.htm),
  [Fattutto, importazione](https://support.fattutto.com/support/solutions/articles/48001218344-come-importare-le-fatture-elettroniche-ricevute-attraverso-altre-modalit%C3%A0).

## R-02 — File firmati `.p7m` (CAdES)

- **Decisione**: estrazione dell'XML nel browser, senza librerie: il `.p7m` è una struttura CMS SignedData in
  DER (a volte codificata in Base64); il motore legge l'ASN.1 fino a `encapContentInfo.eContent` e ricompone
  l'OCTET STRING (anche spezzata in più parti o a lunghezza indefinita). La firma **non** viene verificata:
  l'app archivia l'originale `.p7m` com'è e legge solo i dati. Test con file firmati generati in locale.

## R-03 — ZIP nel browser

- **Decisione**: lettura dello ZIP con un piccolo lettore del "central directory" e `DecompressionStream
  ('deflate-raw')` (Safari 16.4+, Chrome, Firefox, Node 18+), nessuna dipendenza nuova. Scrittura dello ZIP
  per l'esportazione con metodo "store" (senza compressione) e CRC-32 calcolato nel motore.

## R-04 — Duplicati (FR-002, FR-017)

- **Decisione**: impronta SHA-256 del file (Web Crypto) unica per utente; per le fatture anche la chiave
  partita IVA o codice fiscale del fornitore + numero + data. Un duplicato non si carica e compare nel
  riepilogo dell'importazione ("già presente").

## R-05 — Conservazione (FR-008, FR-014)

- **Decisione**: regole per tipo nel set dell'anno (`src/engine/regole/documenti/`): fatture e documenti
  contabili 10 anni (art. 2220 c.c., art. 22 DPR 600/1973) (D); fatture elettroniche: conservazione digitale a
  norma con il servizio gratuito dell'Agenzia delle Entrate (adesione da attivare in "Fatture e Corrispettivi")
  o un conservatore accreditato; le fonti divulgative parlano anche di 15 anni nel servizio dell'Agenzia (D).
  L'app lo spiega con un avviso e non è conservazione a norma.
- Fonti: [fiscoetasse, conservazione](https://www.fiscoetasse.com/rassegna-stampa/27453-conservazione-fatture-elettroniche-operatori-iva.html),
  [money.it, scadenza del 31 gennaio](https://www.money.it/conservazione-fatture-elettroniche-occhio-alla-scadenza-del-31-gennaio-2026),
  [dirittobancario, servizi gratuiti AdE](https://www.dirittobancario.it/wp-content/uploads/sites/default/files/allegati/la_fattura_elettronica_e_i_servizi_gratuiti_dellagenzia_delle_entrate.pdf).

## R-06 — File e foto

- **Decisione**: bucket privato `documenti`, percorso `<owner_id>/<documento_id>/<versione_file>-<nome sicuro>`,
  policy proprietario + aal2 come i giustificativi della 008; 20 MB per file; PDF, immagini, XML e `.p7m`.
  Nomi dei file generati dall'app (tipo, data, emittente abbreviato), mai il nome originale (potrebbe contenere
  il nome di un paziente, FR-011). Foto ridotte nel browser a 2000 px sul lato lungo, JPEG 0,85 (testo
  leggibile), con interruttore "conserva l'originale". PDF e XML mai modificati.

## R-07 — Cestino (FR-007) e registro (FR-013)

- **Decisione**: eliminazione = `eliminato_il`; dopo 30 giorni l'app, all'apertura dell'archivio, cancella file
  e righe scaduti (nessun processo sul server). Svuota subito con conferma. Avviso per i tipi da conservare per
  legge. Registro `eventi_documenti` con azione e data, senza contenuti.

## R-08 — Collegamenti (FR-004, FR-005, SC-004)

- **Decisione**: tabella di collegamento documento ↔ voce (fattura, spesa, onere, versamento ENPAP, versamento
  di imposte, bene). Collegare un documento a una spesa la segna "con giustificativo". La spesa creata
  dall'importazione nasce già collegata alla fattura ricevuta.

## R-09 — Esportazione (FR-010)

- **Decisione**: ZIP con i file selezionati o dell'anno e un indice CSV. Nella prima versione lo ZIP non è
  cifrato: compare l'avviso già usato per gli export in chiaro (002) (D: cifratura da valutare). FR-010
  "protetto" resta parziale e dichiarato.

## R-10 — Dati clinici (FR-012)

- **Decisione**: nessuna lettura del contenuto di PDF e foto; avviso se descrizione o nome del file contengono
  parole tipiche di dati clinici (diagnosi, anamnesi, terapia, referto…), con invito a non archiviarli.
