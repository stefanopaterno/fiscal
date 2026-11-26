# Research: Aggiornamento dei parametri fiscali da file

## R-01 Dove vivono i valori in vigore

- **Decision**: i set di regole per anno nel codice restano la **base**; un **registro** nel database contiene solo
  le variazioni approvate; un **risolutore puro** (`src/engine/parametri/risolvi.ts`) calcola il valore in vigore.
  I getter esistenti (`regoleIrpefPerAnno`, `regolePerAnno`, `regoleSpesePerAnno`, `regoleScadenze`) chiamano il
  risolutore con il registro attivo, impostato in memoria dopo l'accesso (`attivi.ts`).
- **Rationale**: nessun consumatore del motore cambia firma (16 punti di chiamata oggi); con registro vuoto i
  risultati sono identici al bit, quindi la suite esistente è la prova di non regressione.
- **Alternatives**: passare il registro come argomento a ogni funzione del motore (troppo invasivo); generare un
  nuovo set di regole nel database al posto del codice (perde la base versionata e i test).

## R-02 Simulazioni per l'anteprima

- **Decision**: `conRegistro(registroAlternativo, fn)` sostituisce per la durata di `fn` (sincrona) il registro
  attivo e lo ripristina in `finally`. L'anteprima calcola l'anno due volte: con il registro attuale e con il
  registro + voci proposte. Impatto = differenza di `imposteAnno` (IRPEF, addizionali, soggettivo ENPAP).
- **Rationale**: copre tutte le aree (IRPEF, ENPAP, spese, addizionali) senza aggiungere parametri «regole
  alternative» a ogni funzione; il motore è sincrono, quindi lo scambio temporaneo è sicuro.
- **Alternatives**: estendere `simulazione.applica` della 012 a tutte le aree (funziona solo per IRPEF).
- **Impatto per area**: IRPEF/ENPAP/addizionali/spese → differenza delle imposte dell'anno; fatturazione → effetto
  su una fattura tipo (media delle fatture dell'anno, o 100 € se non ce ne sono) e sul totale delle fatture future
  previste dalla 006; scadenze e codici tributo → nessun importo, si mostra il cambio di data/codice.

## R-03 Tipo di decorrenza per parametro

- **Decision** (fissato nel catalogo, non dal file):
  - **anno d'imposta**: scaglioni, detrazioni, acconti, rateizzazione, differimento, ENPAP soggettivo/minimi/
    maternità/scadenza saldo, spese e oneri, addizionali.
  - **data dell'operazione**: aliquota integrativo in fattura, IVA ordinaria, soglia e importo del bollo, ritenuta,
    diciture, codici tributo F24.
  - **anno solare della scadenza**: date delle scadenze (una proroga cambia la scadenza di quell'anno).
- **Regola di risoluzione**: tra le righe approvate e non annullate, per anno → quelle con `anno` uguale; per
  data → quelle con `dal ≤ data`; si prende la decorrenza più recente, a parità l'ultima approvata.
- **Integrativo**: una sola chiave (`fattura.aliquota_integrativo`, per data). I consumatori «per anno» (stima dei
  contributi ENPAP) usano il valore in vigore al 1° gennaio; i contributi effettivi usano l'integrativo già
  fatturato, quindi un cambio a metà anno non crea incoerenze.

## R-04 Storico protetto

- **Decision**: (1) le fatture emesse hanno gli importi salvati (`fatture.bollo`, `ritenuta`, `totale_integrativo`…)
  e non si ricalcolano: cambia solo il calcolo di bozze e nuove fatture; (2) un trigger rifiuta righe del registro
  per anni chiusi (`private.anno_chiuso`), sia per inserimento sia per annullamento; per i parametri per data
  l'anno è quello di `dal`; (3) il registro è a sola aggiunta: `update`/`delete` rifiutati (tranne la pulizia della
  modalità prova).

## R-05 Formato del file

- **Decision**: JSON con `versione_schema: 1` ([contracts/file-aggiornamento.schema.json](contracts/file-aggiornamento.schema.json)).
  Unità «umane» per ridurre gli errori di Claude: aliquote in **percentuale** (23 = 23%), importi in **euro** con
  al massimo 2 decimali, date `AAAA-MM-GG`; Fiscal converte in frazioni e centesimi (`unita.ts`), con aritmetica
  intera (stringa decimale → centesimi) senza virgola mobile.
- **Lettura tollerante**: si accetta testo incollato con intorno spiegazioni o un blocco ```json; si prende il primo
  oggetto JSON con `versione_schema`. Tutto il resto è ignorato. Limite 256 KB.
- **Alternatives**: Markdown con tabelle (fragile), YAML (ambiguità numeriche), unità interne del codice (frazioni
  e centesimi: Claude sbaglia più facilmente e i limiti non distinguono 0,23 da 23).

## R-06 Validazione

- **Decision**, per voce, in ordine: chiave nel catalogo → decorrenza coerente col tipo (anno o `dal`) → tipo e
  forma del valore → conversione → limiti di plausibilità del parametro (es. aliquota IRPEF 5–60%, bollo 0,50–20 €,
  scaglioni crescenti con l'ultimo senza limite) → fonte: `verificata` solo se dominio in elenco ufficiale **e**
  `stato_norma = in_vigore`, altrimenti declassata a `da_verificare` → anno chiuso → doppioni (vince la decorrenza
  più recente) → variazione anomala (oltre la soglia del parametro: conferma in più) → file vecchio (data della
  ricerca precedente all'ultima approvazione sullo stesso parametro: avviso).
- **Domini ufficiali**: gazzettaufficiale.it, normattiva.it, agenziaentrate.gov.it, finanze.gov.it, mef.gov.it,
  enpap.it, inps.it, sistemats.it, fatturapa.gov.it, più quelli di regione e comune indicati nel profilo.
  Confronto sull'host del collegamento (uguale o sottodominio), mai sul testo.
- **Sicurezza**: nessun `eval`, nessun HTML dal file (testi mostrati come testo), lunghezze massime per ogni
  stringa, collegamenti solo `https:` aperti con `rel="noopener noreferrer"`.

## R-07 Anni senza regole nel codice

- **Decision**: se il file porta voci per un anno senza set nel codice (es. 2028), il risolutore costruisce la base
  di quell'anno dall'ultimo anno disponibile marcando ogni valore `da_verificare` con fonte «riportato dal 2027»;
  le voci importate si sovrappongono. L'anno appare «provvisorio» finché ci sono valori riportati.
- **Rationale**: risponde all'edge case della spec senza inventare valori in silenzio (principio II: segnalato).
- **Limite**: solo se il catalogo copre tutte le chiavi necessarie al motore; altrimenti l'anno resta non
  disponibile con il messaggio attuale.

## R-08 Addizionali

- **Decision**: le chiavi `addizionali.*` scrivono nella tabella esistente `aliquote_addizionali` (per anno) e in
  più una riga del registro (storico e annullamento). Il file indica `ambito: { regione, comune }`; voci con ambito
  diverso dal profilo scartate. Con fonte ufficiale e norma in vigore `verificate = true`.
- **Privacy**: regione e comune entrano nella richiesta solo al momento della generazione; mai nel repository.

## R-09 Richiesta per Claude

- **Decision**: Markdown generato da `richiesta.ts` ([contracts/richiesta-template.md](contracts/richiesta-template.md)):
  prompt, regole di ricerca, priorità «da verificare», catalogo per area con valore in uso nelle unità del file,
  fonti per area, schema ed esempio. Scritto per Claude (che ha la ricerca sul web); niente dati dell'utente.
- **Test**: snapshot del documento con un profilo di prova; controllo automatico che non contenga codici fiscali,
  nomi, importi delle CU o delle fatture.

## R-10 Novità che richiedono il programma

- **Decision**: la sezione `modifiche_programma` del file è salvata in `importazioni_parametri.modifiche_programma`
  (jsonb); la pagina «Novità» le mostra come «da fare nel programma» deduplicate per impronta (titolo normalizzato +
  collegamento della fonte). Restano finché l'utente non le segna «fatte» o «non mi riguarda».

## R-11 Codici tributo F24

- **Decision**: nuovo set `src/engine/regole/f24/index.ts` con i codici oggi citati nei testi delle scadenze
  (4001, 4033, 4034, 3801, 3843, 3844, 2521–2524…), ciascuno `Regola<string>` con fonte. I testi delle scadenze li
  leggono da lì. Serve anche alla 015 (guide). Chiavi di catalogo per data.

## R-12 Emendamento della costituzione (2.9.0, minor)

- **Principio I**, aggiunta: «I valori del catalogo dei parametri possono essere aggiornati dall'utente con file di
  aggiornamento: ogni variazione è datata, con fonte e stato, approvata esplicitamente e registrata a sola aggiunta;
  i set per anno nel codice restano la base e il motore non cambia».
- **Principio III**, aggiunta: «I valori importati non richiedono test propri; MUST superare i limiti di
  plausibilità del catalogo e il ricalcolo in anteprima. Catalogo, conversioni, validatore e risolutore MUST avere
  test scritti prima».
