# Feature Specification: Consenso informato dei pazienti

**Feature Branch**: `005-consenso-informato-pazienti` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Per i pazienti voglio conservare anche il consenso informato."

## Clarifications

### Session 2026-11-20

- Q: Quali tipi di consenso sono già pronti nell'app? → A: Nessuno: i tipi di consenso li crea l'utente (nome e descrizione), perché i testi e la loro suddivisione sono scelte professionali dell'utente. L'app non propone tipi predefiniti.
- Q: Cosa si conserva di un consenso acquisito (anche online)? → A: Sempre data di firma, tipo, versione del testo e modalità di acquisizione (firma su carta, e-mail di accettazione, altro); l'allegato (copia firmata o e-mail) è facoltativo, scelto caso per caso.
- Q: Le copie dei consensi sono cifrate con una chiave dell'utente? → A: No: restano in chiaro, con la stessa protezione degli altri dati (login, 2FA, regole per riga, accesso al file riservato). Rischio residuo accettato dall'utente, titolare del trattamento: restano da fare l'accordo sul trattamento dei dati con il fornitore del database, la regione UE del progetto e l'informativa ai pazienti.
- Q: Un consenso scade? → A: No: vale fino a fine percorso o revoca; il rinnovo è richiesto solo se cambia la versione del testo o il tipo di intervento; promemoria facoltativo a 12 mesi per rivedere i consensi. La durata esatta è da verificare con l'Ordine.
- Q: Come compare il paziente per impostazione predefinita? → A: Con iniziali e anno di nascita (per esempio "M.R. 2008"); un'icona mostra il nome completo dopo una verifica con Face ID, impronta o PIN del dispositivo, e il nome torna nascosto dopo pochi secondi.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrare il consenso informato di un paziente (Priority: P1)

Quando prende in carico un paziente, l'utente registra il suo consenso informato: data, tipo di consenso, versione del testo firmato, chi lo ha firmato (il paziente, o chi esercita la responsabilità genitoriale o la tutela) e, se disponibile, la copia firmata. Dalla scheda del paziente vede subito se il consenso c'è, da quando e se è ancora valido.

**Why this priority**: è lo scopo della richiesta; senza un consenso registrato non c'è nulla da conservare né da controllare.

**Independent Test**: dopo aver registrato un consenso per un paziente di prova, la scheda mostra "consenso presente" con data e versione; per un paziente senza consenso mostra "consenso mancante".

**Acceptance Scenarios**:

1. **Given** un paziente in anagrafica senza consenso, **When** l'utente registra data, tipo, versione del testo e firmatario, **Then** la scheda mostra il consenso come presente con questi dati.
2. **Given** un consenso registrato, **When** l'utente allega la copia firmata (PDF o foto), **Then** la copia resta collegata al consenso e può essere riaperta o scaricata.
3. **Given** un paziente senza consenso, **When** l'utente apre l'elenco dei pazienti, **Then** il paziente è segnalato come "consenso mancante".

---

### User Story 2 - Consenso per minori e per chi non può firmare (Priority: P1)

Per un paziente minorenne o sotto tutela, il consenso è dato da chi ha la responsabilità genitoriale o la tutela. L'utente registra chi ha firmato (uno o entrambi i genitori, il tutore) con nome, ruolo e data, e il sistema indica se il consenso è completo oppure se ne manca una parte.

**Why this priority**: per i minori il consenso mancante di un genitore è il caso più frequente e più delicato.

**Independent Test**: per un minore con un solo genitore firmatario il sistema segna il consenso come "incompleto"; registrando il secondo genitore, o la motivazione per cui non è richiesto, passa a "completo".

**Acceptance Scenarios**:

1. **Given** un paziente minorenne, **When** l'utente registra il consenso di un solo genitore, **Then** il sistema lo segna come incompleto e indica cosa manca.
2. **Given** un consenso incompleto, **When** l'utente registra il secondo genitore o annota il motivo per cui non è richiesto, **Then** il sistema lo segna come completo.
3. **Given** un paziente che compie 18 anni, **When** si apre la scheda, **Then** il sistema segnala che serve un nuovo consenso firmato dalla persona stessa.

---

### User Story 3 - Revocare, rinnovare e tenere lo storico (Priority: P2)

Il paziente può revocare il consenso, oppure il testo del consenso può cambiare nel tempo. L'utente registra la revoca con la data, oppure un nuovo consenso con la nuova versione del testo. Il sistema conserva tutto lo storico senza cancellare né sovrascrivere i consensi precedenti.

**Why this priority**: un consenso senza storia non dimostra cosa era stato accettato e quando; ma si può usare l'app anche senza questa parte.

**Independent Test**: registrando una revoca e poi un nuovo consenso, la scheda mostra lo stato attuale e i tre eventi in ordine cronologico, tutti ancora consultabili.

**Acceptance Scenarios**:

1. **Given** un consenso valido, **When** l'utente registra la revoca con la data, **Then** lo stato diventa "revocato" e il consenso originale resta consultabile.
2. **Given** un consenso revocato, **When** l'utente registra un nuovo consenso, **Then** lo stato torna "presente" e lo storico mostra entrambi.
3. **Given** una nuova versione del testo, **When** l'utente vuole aggiornare i pazienti, **Then** il sistema elenca quelli che hanno firmato una versione precedente.

---

### User Story 4 - Modelli di consenso e informativa (Priority: P2)

L'utente conserva i propri testi di consenso informato (e dell'informativa privacy) come modelli con un numero di versione e una data di entrata in vigore. Alla registrazione di un consenso sceglie la versione firmata. L'app non fornisce testi legali: l'utente carica i propri.

**Why this priority**: serve a sapere sempre quale testo ha firmato ciascun paziente.

**Independent Test**: dopo aver caricato due versioni di un modello, per ogni paziente di prova l'app indica quale versione ha firmato.

**Acceptance Scenarios**:

1. **Given** nessun modello, **When** l'utente carica il testo del consenso con versione e data, **Then** il modello è disponibile nella registrazione dei consensi.
2. **Given** due versioni di un modello, **When** l'utente registra un consenso, **Then** deve scegliere la versione firmata e il consenso resta legato a quella versione.

---

### User Story 5 - Promemoria e collegamento con le fatture (Priority: P3)

L'utente vede nel calendario e nella scheda del paziente i promemoria sui consensi (mancanti, incompleti, da rinnovare, minori prossimi ai 18 anni). Quando emette una fattura a un paziente senza consenso valido, il sistema lo avvisa senza bloccare l'emissione.

**Why this priority**: evita dimenticanze, ma il valore principale è già nelle storie precedenti.

**Independent Test**: emettendo una fattura per un paziente senza consenso compare un avviso; per uno con consenso valido non compare.

**Acceptance Scenarios**:

1. **Given** un paziente senza consenso valido, **When** l'utente emette una fattura per lui, **Then** compare un avviso e l'emissione resta possibile.
2. **Given** consensi mancanti o incompleti, **When** l'utente apre il calendario, **Then** vede il numero di pazienti da sistemare con l'elenco.

---

### Edge Cases

- Consenso verbale o registrato in seguito: data di firma diversa dalla data di registrazione nell'app (devono essere due date distinte).
- Consenso firmato prima dell'inizio dell'attività o dell'uso dell'app (inserimento retroattivo).
- Paziente maggiorenne con consenso dato da un terzo (non valido: il sistema lo segnala).
- Genitori separati o con disaccordo: nota libera sul motivo per cui un solo genitore ha firmato, ma nessuna nota sul caso clinico.
- Copia firmata illeggibile, di grandi dimensioni o in formato non supportato.
- Revoca che arriva dopo fatture già emesse: le fatture restano valide e immutabili (specifica 003), la revoca incide sul trattamento futuro.
- Richiesta di cancellazione dei dati da parte del paziente (GDPR) in conflitto con l'obbligo di conservare fatture e consenso: il sistema deve indicare cosa va conservato e cosa può essere cancellato.
- Paziente eliminato dall'anagrafica: il consenso collegato non deve restare orfano né sparire senza avviso.
- Consenso a più trattamenti distinti (percorso individuale, di coppia, in teleconsulto, trattamento dati): tipi di consenso separati.
- Contenuto clinico inserito per errore in un campo di nota: il sistema scoraggia l'uso di testo libero e lo limita.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST permettere di registrare per ogni paziente uno o più consensi, ciascuno con tipo, data di firma, data di registrazione, versione del testo e firmatario (nome e ruolo). Il sistema MUST registrare sempre la modalità di acquisizione (per esempio firma su carta, e-mail di accettazione, altro) e MUST trattare l'allegato come facoltativo.
- **FR-002**: Il sistema MUST permettere all'utente di creare e modificare i propri tipi di consenso (nome e descrizione) e MUST NOT imporre tipi predefiniti; ogni consenso registrato MUST essere collegato a un tipo scelto dall'utente.
- **FR-003**: Il sistema MUST permettere di allegare a un consenso la copia firmata o l'e-mail di accettazione (PDF o immagine), facoltativa, e di riaprirla o scaricarla.
- **FR-004**: Il sistema MUST gestire il consenso di minori e persone sotto tutela, registrando uno o più firmatari e indicando se il consenso è completo, incompleto o non richiesto con motivazione.
- **FR-005**: Il sistema MUST mostrare per ogni paziente lo stato attuale del consenso (presente, mancante, incompleto, revocato, da rinnovare) e l'elenco dei pazienti per stato. Un consenso MUST valere fino a fine percorso o revoca; lo stato "da rinnovare" MUST comparire solo se cambia la versione del testo o il tipo di intervento, e il sistema MAY mostrare un promemoria facoltativo a 12 mesi per rivedere i consensi.
- **FR-006**: Il sistema MUST permettere di registrare la revoca con data e MUST conservare lo storico completo senza sovrascrivere né cancellare i consensi precedenti.
- **FR-007**: Il sistema MUST segnalare quando un paziente minorenne diventa maggiorenne e richiede un nuovo consenso.
- **FR-008**: Il sistema MUST permettere di caricare modelli di consenso e informativa con numero di versione e data di entrata in vigore, di legare ogni consenso alla versione firmata e di elencare i pazienti con una versione precedente.
- **FR-009**: Il sistema MUST NOT fornire né generare testi legali di consenso; MUST permettere all'utente di caricare i propri.
- **FR-010**: Il sistema MUST NOT conservare nel consenso né nei suoi allegati o note alcun dato clinico (diagnosi, motivi dell'invio, contenuti delle sedute) e MUST limitare il testo libero ai soli motivi amministrativi del consenso.
- **FR-011**: Il sistema MUST segnalare con un avviso non bloccante l'emissione di una fattura per un paziente senza consenso valido (collegamento con la specifica 003).
- **FR-012**: Il sistema MUST mostrare nel calendario (specifica 004) i promemoria sui consensi mancanti, incompleti, revocati o da rinnovare.
- **FR-013**: Il sistema MUST trattare consensi e copie firmate con le stesse protezioni dei dati dei pazienti: accesso solo al proprietario, accesso per riga, oscuramento con la modalità "occhio" e inclusione nelle esportazioni cifrate. Nell'elenco dei pazienti e nelle schermate dei consensi il paziente MUST comparire per impostazione predefinita con iniziali e anno di nascita; un'icona MUST mostrare il nome completo solo dopo una verifica del dispositivo (Face ID, impronta o PIN, come per lo sblocco rapido della specifica 002) e il nome MUST tornare nascosto dopo pochi secondi o alla chiusura della schermata.
- **FR-014**: Le copie firmate MUST essere conservate con un accesso riservato al solo proprietario, mai tramite indirizzi pubblici o condivisibili.
- **FR-015**: Il sistema MUST permettere di esportare tutti i dati e i consensi di un singolo paziente (richiesta di accesso) e di indicare quali dati vanno conservati per obbligo di legge e quali possono essere cancellati (richiesta di cancellazione).
- **FR-016**: Il sistema MUST registrare in un registro delle modifiche chi e quando ha creato, modificato o revocato un consenso, senza contenuti sensibili.
- **FR-017**: Il sistema MUST NOT cancellare i consensi quando viene eliminato un paziente senza un avviso esplicito e senza una conferma dell'utente.
- **FR-018**: Se la verifica del dispositivo non è disponibile o fallisce, il sistema MUST NOT mostrare il nome completo e MUST offrire la verifica completa della specifica 002; ogni visualizzazione del nome completo MAY essere registrata nel registro delle modifiche senza contenuti.

### Key Entities *(include if feature involves data)*

- **Paziente**: anagrafica minima della specifica 003 con data di nascita (necessaria per distinguere minori e maggiorenni) e riferimento ai consensi.
- **Consenso**: tipo, data di firma, data di registrazione, versione del testo, stato (presente, incompleto, revocato, da rinnovare), motivazione amministrativa, copia firmata.
- **Firmatario**: nome, ruolo (paziente, genitore, tutore), data di firma, collegato a un consenso.
- **Modello di consenso**: testo caricato dall'utente, tipo, numero di versione, data di entrata in vigore.
- **Revoca**: data, consenso collegato, motivazione amministrativa facoltativa.
- **Registro delle modifiche**: evento (creazione, modifica, revoca), data e ora, riferimento al consenso, senza contenuti.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: L'utente registra un consenso con copia firmata da telefono in meno di 2 minuti.
- **SC-002**: In ogni caso di prova (adulto, minore con uno o due genitori, revoca, rinnovo, passaggio ai 18 anni) lo stato del consenso mostrato coincide con quello atteso al 100%.
- **SC-003**: Per ogni paziente l'utente sa quale versione del testo ha firmato e quando, senza cercare altrove.
- **SC-004**: Dopo una revoca o un rinnovo nessun consenso precedente viene perso (0 dati cancellati nei casi di prova).
- **SC-005**: Un utente non autorizzato non riesce a leggere né i consensi né le copie firmate (0 accessi riusciti nelle prove, incluse quelle sugli indirizzi dei file).
- **SC-006**: Nessun consenso, allegato o esportazione di prova contiene dati clinici (0 ritrovamenti in verifica).
- **SC-007**: L'elenco dei pazienti con consenso mancante o incompleto è visibile in meno di 3 tocchi dalla schermata iniziale.

## Assumptions

- Il consenso informato dello psicologo è richiesto dal Codice Deontologico degli psicologi italiani (art. 24, e art. 31 per i minori) e il trattamento dei dati sulla salute richiede informativa e, ove necessario, consenso (GDPR, art. 9). Gli obblighi esatti, i testi e la necessità del consenso di entrambi i genitori sono da verificare con l'Ordine degli Psicologi o con un consulente; l'app registra, non stabilisce, cosa sia dovuto.
- L'app **non** fornisce né valida testi legali: i modelli sono caricati dall'utente.
- Il consenso e il suo stato non sono dati clinici, ma confermano che una persona è paziente di uno psicologo e quindi sono dati sulla salute di categoria particolare (GDPR). Per questo seguono le protezioni della specifica 002 e della costituzione (principio VII e vincolo "Dati dei pazienti"). Il rischio residuo del dato in chiaro, già accettato dall'utente, qui è più alto per le **copie firmate**: l'utente ha deciso di NON cifrare le copie dei consensi (rischio residuo accettato); restano da definire il rapporto con il fornitore (accordo sul trattamento dei dati), la regione dei dati nell'Unione Europea e l'informativa ai pazienti.
- Le copie firmate stanno nello storage riservato del database (specifica 002), con accesso solo al proprietario; formati, dimensioni massime e comportamento senza connessione sono da definire nel piano (TODO(OFFLINE) nella costituzione).
- Il sistema usa la data di nascita del paziente solo per distinguere minori e maggiorenni; l'anagrafica resta minima (specifica 003).
- I tempi di conservazione dei consensi, delle fatture e dei dati dei pazienti sono da verificare (obblighi di conservazione della documentazione professionale e diritto alla cancellazione del GDPR); finché non verificati, l'app non cancella nulla in automatico.
- Il consenso all'invio dei dati al Sistema Tessera Sanitaria è un'altra cosa: lì esiste solo l'**opposizione** del paziente (specifica 003) e resta gestita nelle fatture; qui si tratta del consenso informato al trattamento e al trattamento dei dati.
- **Fuori ambito**: firma elettronica o firma grafometrica dei documenti, invio dei consensi ai pazienti, generazione dei testi legali, dati clinici, cartella clinica, agenda delle sedute, notifiche esterne al telefono (e-mail, SMS), fatturazione (003), autenticazione (002).
