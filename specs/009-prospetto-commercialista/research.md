# Ricerca: Prospetto per il commercialista

## R-01 — File protetto (FR-005, SC-004)
- **Decisione**: ZIP cifrato **AES-256 WinZip (AE-2)**: PBKDF2-HMAC-SHA1 con 1000 iterazioni e sale di 16 byte, AES-CTR
  a contatore little-endian da 1, HMAC-SHA1 (10 byte) sul cifrato, contenuto compresso (deflate). Si apre con
  7-Zip, WinRAR, Keka, The Unarchiver e libarchive (verificato con `bsdtar` nei test).
- PBKDF2 e HMAC dal crittografo del browser; il blocco AES da `@noble/ciphers` 2.4.0 (libreria verificata, versione
  esatta), perché il browser non offre AES-ECB per il contatore little-endian di WinZip.
- **Alternative scartate**: ZipCrypto (debole), PDF cifrato ed Excel con password (formati complessi da produrre
  senza librerie pesanti). Limite noto: l'Archivio di macOS e l'Esplora file di Windows non aprono gli ZIP AES.
- Password generata dall'app: 24 caratteri da un alfabeto senza simboli ambigui (~120 bit), mostrata una volta,
  mai salvata.

## R-02 — PDF (FR-001)
- **Decisione**: generatore minimo (PDF 1.4, Helvetica WinAnsi con accenti ed €, tabelle con intestazione ripetuta e
  totale). Verificato con PDFKit di macOS.

## R-03 — Excel (FR-001)
- **Decisione**: .xlsx minimo (Office Open XML) con un foglio per sezione più «Avvertenze», importi come numeri con
  formato «#,##0.00». Righe e totali vengono dalle stesse sezioni del PDF: i totali coincidono per costruzione.

## R-04 — Riservatezza (FR-006, FR-008, FR-011)
- Clienti con nome e codice fiscale come in fattura; con «usa i codici» le persone diventano `C-XXXXXX` (SHA-256
  dell'identificativo interno: stabile, non ricostruibile senza l'app). Nessun dato clinico: le tabelle non lo hanno.
- Controllo dei testi liberi (descrizioni delle righe di fattura e delle spese) contro i nomi dei clienti persone.
