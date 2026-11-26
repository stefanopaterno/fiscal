# Feature Specification: Guide agli adempimenti (layer in home, sotto il calendario fiscale)

**Feature Branch**: `015-guide-adempimenti`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Un'altra spec da mettere sotto il calendario fiscale: la guida per la compilazione di qualsiasi documento, tipo apertura P.IVA, F24 per pagare le tasse, dichiarazione dei redditi da partita IVA ecc. Una bella guida come il calendario fiscale."

## Panoramica

Il calendario fiscale (013) dice **quando** succede cosa. Le guide dicono **come si fa**: per ogni adempimento, una scheda passo passo con a cosa serve, quando va fatto, dove si fa, cosa serve avere pronto, i passi numerati, i campi da compilare con i valori tipici dell'assetto dell'utente (codici tributo, quadri, sezioni), gli errori comuni e il collegamento alla pagina di Fiscal che prepara i numeri.

Come il calendario, le guide sono **informative e statiche**: non leggono né mostrano dati personali o importi. Si aprono come layer sopra la home, da un pulsante subito sotto «Calendario fiscale».

## Clarifications

### Session 2026-11-26 (default scelti senza domande, su indicazione dell'utente di procedere)

- Q: Dati veri o solo informativo? → A: solo informativo, come la 013. Le cifre restano nelle pagine di Fiscal; la guida porta lì con un collegamento («Apri in Fiscal»).
- Q: Dove? → A: pulsante «Guide agli adempimenti» in home sotto il calendario; si apre come layer con l'indice delle guide; ogni guida si apre dentro lo stesso layer, con «Indietro» all'indice. Le stesse guide sono raggiungibili anche dalla pagina Aiuto (011).
- Q: Assetto? → A: quello dell'utente: psicologo iscritto ENPAP, regime ordinario (contabilità semplificata), dipendente in cumulo, P.IVA da gennaio 2027, prestazioni sanitarie esenti come regola e IVA 22% come eccezione.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trovare la guida giusta (Priority: P1)

Dalla home l'utente tocca «Guide agli adempimenti» e vede un indice ordinato per momento della vita della partita IVA: **Apertura**, **Ogni fattura**, **Versamenti (F24 e ENPAP)**, **Dichiarazioni annuali**, **Situazioni particolari**. Ogni voce ha titolo, una riga di spiegazione e un'etichetta con la frequenza («una volta», «a ogni fattura», «ogni trimestre», «ogni anno», «se serve»). Può cercare per parola (es. «F24», «bollo», «730»).

**Why this priority**: senza un indice chiaro le guide non si trovano; il primo anno l'utente non sa nemmeno come si chiamano gli adempimenti.

**Independent Test**: dalla home si apre il layer, l'indice mostra i cinque gruppi e cercando «bollo» compare la guida sul versamento del bollo delle fatture elettroniche.

**Acceptance Scenarios**:

1. **Given** l'utente è in home, **When** tocca «Guide agli adempimenti» (sotto il calendario), **Then** si apre un layer con l'indice delle guide.
2. **Given** l'indice aperto, **When** scrive una parola nella ricerca, **Then** restano visibili solo le guide pertinenti (titolo, parole chiave, sinonimi come «740» → dichiarazione dei redditi).
3. **Given** il layer aperto, **When** tocca «Chiudi» o fuori dal layer, **Then** torna alla home senza cambiare pagina.

---

### User Story 2 - Seguire una guida passo passo (Priority: P1)

L'utente apre una guida e trova sempre la stessa struttura:

1. **In breve**: a cosa serve, in due righe.
2. **Quando**: scadenza o momento (con richiamo al calendario).
3. **Dove si fa**: canale ufficiale (es. servizi online dell'Agenzia delle Entrate, home banking, area riservata ENPAP, Sistema TS) e chi può farlo (da solo, tramite intermediario).
4. **Cosa ti serve**: credenziali (SPID/CIE), documenti, dati da avere pronti, e quale pagina di Fiscal li prepara.
5. **Passo per passo**: passi numerati, brevi, uno per azione.
6. **Cosa scrivere**: i campi chiave con i valori tipici del suo assetto (es. codici tributo F24, quadri del Modello Redditi, codice destinatario, natura IVA N4 per le esenti), ciascuno con un «?» che spiega.
7. **Errori comuni** e come evitarli.
8. **Fonte**: riferimento normativo o pagina ufficiale, con data dell'ultimo controllo e stato «verificata» o «da verificare».
9. **Apri in Fiscal**: collegamento alla pagina dell'app dove ci sono i suoi numeri (se esiste).

**Why this priority**: è il valore della funzione: fare un adempimento da soli, senza errori, senza cercare in giro.

**Independent Test**: aprendo la guida «Pagare le tasse con l'F24», si vedono le nove sezioni, la tabella dei codici tributo con 4001, 4033, 4034, 3801, 3843, 3844, e il collegamento «Apri in Fiscal» porta allo scadenzario dei versamenti.

**Acceptance Scenarios**:

1. **Given** una guida aperta, **When** l'utente la legge, **Then** trova le sezioni nell'ordine indicato; le sezioni non pertinenti per quella guida sono omesse, non lasciate vuote.
2. **Given** un campo con un valore tipico, **When** tocca «?», **Then** vede la spiegazione in parole semplici con un esempio senza importi personali.
3. **Given** una guida con un'informazione non ancora confermata, **When** la legge, **Then** quella parte è segnata «da verificare» con il motivo.
4. **Given** una guida con «Apri in Fiscal», **When** lo tocca, **Then** il layer si chiude e si apre la pagina indicata.
5. **Given** una guida lunga, **When** l'utente segna un passo come fatto, **Then** la spunta resta solo su quel dispositivo (nessun dato salvato online) e può azzerarla.

---

### User Story 3 - Le guide del primo anno (Priority: P1)

Il catalogo minimo copre tutto quello che serve dall'apertura alla prima dichiarazione:

**Apertura (una volta)**
- Aprire la partita IVA (modello di dichiarazione di inizio attività per persone fisiche, codice attività, regime, domicilio digitale).
- Iscriversi a ENPAP come libero professionista (o comunicare l'inizio dell'attività se già iscritti).
- Accesso al Sistema Tessera Sanitaria e credenziali per l'invio delle spese sanitarie.
- Ricevere le fatture elettroniche: registrare l'indirizzo telematico (codice destinatario o PEC) sul sito dell'Agenzia delle Entrate.
- Comunicare la PEC/domicilio digitale e i dati all'Ordine, se richiesto.

**Ogni fattura**
- Emettere la fattura elettronica (esente art. 10 n. 18 con natura N4, bollo, integrativo, ritenuta) e inviarla al Sistema di Interscambio.
- Gestire l'opposizione del paziente all'invio al Sistema TS.
- Inviare i dati della prestazione al Sistema TS (scadenza e modalità).
- Nota di credito (storno o rimborso).

**Versamenti**
- Pagare le tasse con l'F24 (sezione Erario e Regioni/Enti locali: saldo e acconti IRPEF, addizionali, compensazioni); obbligo di F24 telematico per chi ha la partita IVA.
- Pagare il bollo delle fatture elettroniche (codici trimestrali, soglia minima e accorpamenti).
- Pagare i contributi ENPAP (saldo e acconti, canale di pagamento ENPAP).
- Liquidazione e versamento IVA (solo se l'utente emette anche fatture con IVA).
- Rateizzare saldo e primo acconto.
- Rimediare a un versamento dimenticato o sbagliato (ravvedimento operoso, codici sanzioni e interessi).

**Dichiarazioni annuali**
- Dichiarazione dei redditi con P.IVA (Modello Redditi PF, non 730): quadri RE per il lavoro autonomo, RN, RV per le addizionali, RP per oneri e spese, LM escluso perché non forfettario; dati della CU da lavoro dipendente; ISA se dovuti; scadenza di invio.
- Dichiarazione reddituale ENPAP (comunicazione annuale dei redditi e del volume d'affari).
- Dichiarazione IVA annuale: quando non è dovuta (solo operazioni esenti) e quando sì.
- Certificazioni Uniche ricevute dai clienti sostituti d'imposta: controllo e uso in dichiarazione.

**Situazioni particolari**
- Variare i dati della partita IVA (indirizzo, codice attività).
- Chiudere la partita IVA.
- Ricevere un avviso di irregolarità (comunicazione dall'Agenzia): come leggerlo e come rispondere.

**Why this priority**: sono gli adempimenti che l'utente incontra nei primi 18 mesi; senza questi la funzione non raggiunge lo scopo.

**Independent Test**: l'indice contiene almeno tutte le guide elencate, ciascuna con le sezioni obbligatorie (In breve, Quando, Dove si fa, Passo per passo, Fonte).

**Acceptance Scenarios**:

1. **Given** il catalogo, **When** si controllano le guide, **Then** ogni guida dell'elenco esiste e ha fonte e stato.
2. **Given** la guida sulla dichiarazione dei redditi, **When** l'utente la legge, **Then** capisce perché deve usare il Modello Redditi PF e non il 730, e quali quadri lo riguardano.
3. **Given** la guida sull'F24, **When** l'utente la legge, **Then** trova un esempio di modello compilato con importi d'esempio chiaramente finti (non i suoi).

---

### User Story 4 - Disegno del modulo (Priority: P2)

Per i documenti con un modulo (F24, frontespizio e quadri del Modello Redditi, dichiarazione di inizio attività, fattura elettronica), la guida mostra un **disegno schematico** del modulo con le righe/caselle da compilare evidenziate e numerate, collegate ai passi. Stesso stile del calendario: blocchi, colori del tema, leggibile da telefono.

**Why this priority**: vedere *dove* si scrive riduce gli errori più di qualsiasi testo; ma la guida è utile anche senza disegno.

**Independent Test**: la guida F24 mostra il disegno della sezione Erario con le colonne codice tributo, rateazione/regione, anno di riferimento, importi a debito, importi a credito, e i numeri dei passi corrispondenti.

**Acceptance Scenarios**:

1. **Given** una guida con disegno, **When** l'utente tocca un numero sul disegno, **Then** la guida scorre al passo corrispondente.
2. **Given** lo schermo di un telefono (360 px), **When** apre il disegno, **Then** è leggibile senza scorrere in orizzontale.

---

### User Story 5 - Guide aggiornate (Priority: P3)

Le guide hanno data dell'ultimo controllo e stato. Quando la 012 (novità) o la 014 (parametri da file) cambiano un valore usato in una guida (codice tributo, scadenza, aliquota citata), la guida mostra il valore aggiornato e la scritta «aggiornata il …». Le guide con ultimo controllo più vecchio di 12 mesi sono segnalate «da ricontrollare».

**Why this priority**: una guida sbagliata è peggio di nessuna guida; ma il primo rilascio è comunque controllato a mano.

**Independent Test**: cambiando una scadenza nel set di regole, la guida che la cita mostra la nuova data senza modifiche al testo della guida.

**Acceptance Scenarios**:

1. **Given** una guida che cita una scadenza o un codice tributo, **When** il valore cambia nelle regole, **Then** la guida mostra il valore nuovo (i valori citati vengono dalle regole, non sono scritti nel testo).

---

### Edge Cases

- Adempimento che non riguarda l'utente nell'assetto standard (es. liquidazione IVA, se emette solo fatture esenti): la guida resta nell'indice con l'etichetta «solo se emetti fatture con IVA».
- Scadenze che cadono di sabato o festivo: la guida dice che slittano al primo giorno lavorativo e mostra la data effettiva presa dallo scadenzario.
- Proroghe annunciate ma non ufficiali: la guida riporta la data ufficiale e una nota «proroga annunciata, da verificare».
- Procedure dei portali che cambiano aspetto: i passi descrivono cosa fare («cerca la voce…») senza dipendere da posizioni dei pulsanti; nessuna schermata copiata dai siti ufficiali.
- Uso senza rete: le guide funzionano offline come il calendario (contenuto statico).
- Guide che toccano dati di pazienti (STS, opposizione): esempi solo con dati inventati e iniziali, mai dati reali.
- Primo anno senza acconti: le guide dei versamenti lo dicono e rimandano al calendario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La home MUST offrire, subito sotto «Calendario fiscale», un pulsante «Guide agli adempimenti» che apre un layer (dialog modale) sopra al resto; la chiusura MUST riportare alla home senza navigare.
- **FR-002**: Il layer MUST mostrare l'indice delle guide raggruppate in: Apertura, Ogni fattura, Versamenti, Dichiarazioni annuali, Situazioni particolari; ogni voce con titolo, riga di spiegazione e frequenza.
- **FR-003**: L'indice MUST avere una ricerca per parola che considera titolo, parole chiave e sinonimi d'uso comune (es. «740», «Unico», «partita IVA», «delega»).
- **FR-004**: Ogni guida MUST seguire la struttura: In breve, Quando, Dove si fa, Cosa ti serve, Passo per passo, Cosa scrivere, Errori comuni, Fonte, Apri in Fiscal; le sezioni obbligatorie sono In breve, Quando, Dove si fa, Passo per passo, Fonte.
- **FR-005**: Il catalogo MUST contenere almeno le guide elencate nella User Story 3.
- **FR-006**: Le guide MUST essere solo informative: nessun dato personale, nessun importo dell'utente, nessun nome di paziente; gli esempi MUST usare importi e dati chiaramente fittizi.
- **FR-007**: I valori normativi citati nelle guide (scadenze, codici tributo, aliquote, soglie) MUST provenire dal set di regole per anno (o dagli aggiornamenti approvati della 014), non essere scritti nel testo.
- **FR-008**: Ogni guida MUST indicare fonte, data dell'ultimo controllo e stato («verificata» o «da verificare»); le parti incerte MUST essere marcate «da verificare» con il motivo.
- **FR-009**: Le guide per F24, Modello Redditi PF (frontespizio e quadri RE, RN, RV, RP), dichiarazione di inizio attività e fattura elettronica MUST avere un disegno schematico del modulo con le caselle da compilare numerate e collegate ai passi.
- **FR-010**: Il collegamento «Apri in Fiscal» MUST portare alla pagina dell'app che contiene i numeri dell'utente per quell'adempimento (es. scadenzario versamenti, dichiarazione, fatture, pacchetto per il commercialista) e chiudere il layer.
- **FR-011**: L'utente MUST poter segnare i passi di una guida come fatti; lo stato MUST restare solo sul dispositivo e MUST poter essere azzerato.
- **FR-012**: Le guide MUST essere raggiungibili anche dalla pagina Aiuto (011) e dal «?» delle pagine collegate (es. dallo scadenzario alla guida F24).
- **FR-013**: Le guide MUST indicare quando un caso esce dall'ordinario e conviene un parere professionale (costituzione, natura dell'app).
- **FR-014**: Le guide MUST funzionare senza rete e rispettare il principio VI (Fluent UI 9, tema chiaro/scuro, nessuno scroll orizzontale dai 360 px, aree toccabili da 44 px, italiano semplice).
- **FR-015**: Le guide MUST segnalare «da ricontrollare» quando l'ultimo controllo ha più di 12 mesi.

### Key Entities

- **Guida**: identificativo, gruppo, titolo, riga di spiegazione, frequenza, parole chiave e sinonimi, sezioni, valori citati (riferimenti alle regole), disegno del modulo (opzionale), pagina di Fiscal collegata, fonte, data dell'ultimo controllo, stato, condizione di pertinenza (es. «solo se emetti fatture con IVA»).
- **Passo**: numero, testo, casella del disegno collegata (opzionale), avvertenza.
- **Campo da compilare**: nome del campo nel modulo, valore tipico o riferimento a una regola, spiegazione «?».
- **Stato di avanzamento locale**: guida, passi segnati come fatti; solo sul dispositivo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dalla home, in due tocchi l'utente apre la guida che cerca (pulsante + voce dell'indice, o ricerca).
- **SC-002**: Seguendo la guida F24, l'utente compila un F24 di prova (saldo e primo acconto IRPEF e addizionali) con i codici giusti al primo tentativo, senza altre fonti.
- **SC-003**: Il 100% delle guide ha fonte, data dell'ultimo controllo e stato visibili.
- **SC-004**: Nessuna cifra personale o dato di paziente compare nelle guide (0 casi nelle verifiche).
- **SC-005**: Nessun valore normativo citato nelle guide è scritto a mano nel testo (verifica automatica: 0 casi).
- **SC-006**: Tutte le guide sono leggibili su uno schermo da 360 px senza scorrere in orizzontale.

## Assumptions

- Le guide le scrive l'assistente sulle fonti ufficiali (Agenzia delle Entrate: istruzioni del Modello Redditi PF e dell'F24, modello di inizio attività, specifiche della fattura elettronica; ENPAP: regolamenti e guide all'area riservata; Sistema TS: disciplinare e scadenze) e le rilegge l'utente; le parti non confermate restano «da verificare».
- Codici e valori indicati qui (es. codici tributo 4001, 4033, 4034, 3801, 3843, 3844; natura IVA N4; quadri RE, RN, RV, RP) sono quelli in uso oggi e verranno confermati sulle fonti in fase di piano e scrittura delle guide; i codici del bollo trimestrale, del ravvedimento e dell'IVA saranno presi dalle risoluzioni dell'Agenzia delle Entrate.
- Il codice attività per gli psicologi (classificazione ATECO in vigore dal 2025) e i termini di iscrizione e di dichiarazione ENPAP sono da verificare sulle fonti ufficiali prima di segnarli «verificata».
- Nessuna compilazione automatica dei moduli ufficiali e nessun invio: le guide spiegano, i numeri li danno le pagine di Fiscal (004, 009) e l'invio lo fa l'utente sui canali ufficiali (costituzione: l'app non trasmette al posto suo).
- Nessuna schermata dei siti ufficiali: i disegni dei moduli sono schemi ridisegnati.
- Fuori ambito: regime forfettario, società, dipendenti dell'utente, adempimenti antiriciclaggio e privacy (questi ultimi già in parte nella 005).
