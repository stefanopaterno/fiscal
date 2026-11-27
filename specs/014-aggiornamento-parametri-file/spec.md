# Feature Specification: Aggiornamento dei parametri fiscali da file

**Feature Branch**: `014-aggiornamento-parametri-file`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Durante l'anno possono cambiare aliquote, scaglioni, soglie e scadenze. Fiscal crea un template con tutti i parametri aggiornabili, i valori attuali, le fonti ufficiali dove cercarli e un prompt pronto da dare a Claude; Claude fa la ricerca e restituisce un file nel formato del template; l'utente lo importa in Fiscal, che aggiorna i valori solo dalla data (o dall'anno) che interessa, senza toccare lo storico. Estende la 012."

## Panoramica

Oggi i parametri fiscali (scaglioni, aliquote, soglie, scadenze) vivono nel set di regole per anno dentro il programma: per cambiarne uno serve una modifica al codice e una nuova pubblicazione (flusso della 012). Questa funzione aggiunge un secondo canale, più rapido, **solo per i valori**:

1. Fiscal prepara il **pacchetto di richiesta**: catalogo dei parametri aggiornabili, valore in uso, fonte e stato di ciascuno, fonti ufficiali dove cercarli, formato della risposta e un **prompt** pronto da incollare a Claude.
2. Claude cerca sulle fonti ufficiali e restituisce un **file di aggiornamento** in formato fisso.
3. L'utente importa il file: Fiscal lo **controlla**, mostra **prima → dopo** e **impatto in euro**, e applica solo le voci approvate, a partire dalla decorrenza indicata.

I valori scritti nel programma restano la **base**; gli aggiornamenti approvati si **sovrappongono** a essa e restano in un **registro** a cui si aggiunge soltanto. Le novità che richiedono una logica nuova (una formula diversa, un'imposta nuova) restano fuori dal file e tornano al flusso della 012.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preparare la richiesta per Claude (Priority: P1)

Dalla pagina «Novità» (o da Impostazioni → Parametri fiscali) l'utente preme «Prepara aggiornamento». Fiscal genera un documento che contiene: il prompt da incollare a Claude, l'elenco completo dei parametri aggiornabili raggruppati per area (IRPEF, acconti, addizionali, ENPAP, fatturazione, spese, scadenze e F24), per ognuno il valore in uso, la decorrenza, la fonte, lo stato («verificata» o «da verificare») e il tipo di decorrenza, le fonti ufficiali da consultare per ogni area e lo schema esatto della risposta con un esempio. L'utente lo copia con un pulsante o lo scarica come file.

**Why this priority**: senza una richiesta completa e precisa Claude non sa cosa cercare né in che formato rispondere; è il punto di partenza di tutto il flusso.

**Independent Test**: con le regole 2026 e 2027 attuali, il documento generato elenca tutti i parametri del catalogo con valore, fonte e stato coerenti con quelli usati dal motore, e mette in evidenza quelli «da verificare».

**Acceptance Scenarios**:

1. **Given** regole con alcuni valori «da verificare» (per esempio minimi ENPAP 2027), **When** l'utente prepara la richiesta, **Then** quei parametri compaiono in una sezione «priorità: da verificare» in cima al documento.
2. **Given** regione e comune impostati nel profilo, **When** l'utente prepara la richiesta, **Then** il documento chiede le addizionali di quella regione e di quel comune, e non contiene altri dati personali (né redditi, né nomi, né codici fiscali, né importi).
3. **Given** regione o comune non impostati, **When** l'utente prepara la richiesta, **Then** la parte addizionali è omessa con un avviso «imposta regione e comune per includerle».
4. **Given** l'utente sceglie un anno d'imposta (corrente, successivo o entrambi), **When** prepara la richiesta, **Then** il documento chiede i valori solo per gli anni scelti.

---

### User Story 2 - Importare il file e vedere cosa cambia (Priority: P1)

L'utente carica (o incolla) il file restituito da Claude. Fiscal lo controlla e mostra per ogni voce: parametro in parole semplici, valore prima → dopo, decorrenza, fonte con collegamento, stato proposto e **impatto in euro** sui conti dell'utente per l'anno interessato. Le voci identiche al valore in uso sono raggruppate come «confermate» (eventualmente con passaggio da «da verificare» a «verificata»). Le voci scartate sono elencate con il motivo.

**Why this priority**: è il momento in cui l'utente decide; deve capire in meno di due minuti che cosa cambia e quanto pesa.

**Independent Test**: un file di prova che cambia uno scaglione 2027 e conferma l'integrativo ENPAP produce un'anteprima con una voce «cambia» (con impatto pari alla differenza calcolata dal motore tra vecchio e nuovo valore) e una voce «confermata».

**Acceptance Scenarios**:

1. **Given** un file valido, **When** l'utente lo importa, **Then** vede l'anteprima e **nessun** valore cambia finché non approva.
2. **Given** un file con una chiave sconosciuta, un valore fuori dai limiti plausibili o una struttura errata, **When** viene importato, **Then** quella voce è scartata con un motivo comprensibile e le altre restano utilizzabili.
3. **Given** un file con una voce «verificata» ma con fonte non ufficiale, **When** viene importato, **Then** la voce è proposta come «da verificare» con la spiegazione.
4. **Given** un file che non rispetta lo schema nel suo insieme (non leggibile, versione dello schema diversa), **When** viene importato, **Then** è rifiutato per intero con un messaggio che dice come chiedere a Claude di correggerlo.
5. **Given** una voce che cambia un parametro di un anno già chiuso, **When** compare nell'anteprima, **Then** è bloccata e segnalata («anno chiuso: cambia solo con una norma retroattiva, riapri l'anno se è il caso»).

---

### User Story 3 - Approvare voce per voce senza toccare lo storico (Priority: P1)

L'utente approva tutto, nessuna voce o solo alcune. Le voci approvate entrano nel registro con la loro decorrenza e da quel momento i calcoli le usano: per i parametri **per anno d'imposta** valgono per tutto l'anno indicato; per i parametri **per data dell'operazione** valgono per fatture, incassi e scadenze con data uguale o successiva alla decorrenza. Le fatture già emesse mantengono gli importi calcolati al momento dell'emissione e gli anni chiusi non cambiano.

**Why this priority**: è l'obiettivo della funzione: valori aggiornati senza alterare quello che è già successo.

**Independent Test**: approvando un nuovo importo del bollo con decorrenza 1° marzo, una fattura emessa il 15 febbraio resta con il bollo vecchio, una bozza datata 2 marzo usa il nuovo; approvando uno scaglione 2027, il calcolo IRPEF 2027 cambia e quello 2026 no.

**Acceptance Scenarios**:

1. **Given** un'anteprima con tre voci, **When** l'utente ne approva due, **Then** solo quelle due entrano nel registro e la terza resta «rifiutata» con data.
2. **Given** un parametro per data con decorrenza a metà anno, **When** il motore calcola una fattura, **Then** usa il valore in vigore alla data della fattura.
3. **Given** un parametro per anno d'imposta, **When** il motore calcola l'IRPEF di quell'anno, **Then** usa l'ultimo valore approvato per quell'anno, indipendentemente dal giorno di approvazione.
4. **Given** più aggiornamenti approvati sullo stesso parametro, **When** il motore calcola, **Then** usa quello con la decorrenza più recente non successiva alla data (o all'anno) del calcolo; a parità di decorrenza, l'ultimo approvato.
5. **Given** nessun aggiornamento per un parametro, **When** il motore calcola, **Then** usa il valore base del programma, come oggi.

---

### User Story 4 - Vedere il registro e annullare (Priority: P2)

Nella pagina «Parametri fiscali» l'utente vede, per ogni parametro, il valore in uso, da dove viene (programma o aggiornamento importato), fonte, stato e la cronologia delle modifiche. Può **annullare** un aggiornamento: l'annullamento è a sua volta una riga del registro (non cancella nulla) e il parametro torna al valore precedente.

**Why this priority**: un errore di Claude o dell'utente deve essere reversibile in un clic, e deve restare traccia di cosa è stato usato e quando.

**Independent Test**: dopo aver approvato e poi annullato un aggiornamento, il calcolo torna identico a prima e il registro mostra entrambe le righe.

**Acceptance Scenarios**:

1. **Given** un aggiornamento approvato, **When** l'utente lo annulla, **Then** i calcoli tornano al valore precedente e il registro mostra approvazione e annullamento con data.
2. **Given** un aggiornamento usato in un anno poi chiuso, **When** l'utente prova ad annullarlo, **Then** l'annullamento è bloccato per quell'anno con la spiegazione.
3. **Given** qualsiasi parametro, **When** l'utente apre il suo dettaglio, **Then** vede da quale fonte viene il valore in uso.

---

### User Story 5 - Novità che il file non può gestire (Priority: P2)

Se la ricerca trova novità che richiedono una logica nuova (un nuovo tipo di detrazione, un nuovo calcolo, un'imposta nuova, una regola che oggi non esiste nel catalogo), il file le riporta in una sezione a parte. Fiscal le mostra nell'anteprima come «richiedono un aggiornamento del programma», con descrizione, fonte e decorrenza, e le aggiunge alla pagina «Novità» della 012 come da fare.

**Why this priority**: evita che una novità importante si perda solo perché non è un semplice cambio di valore.

**Independent Test**: un file con una voce nella sezione «modifiche al programma» la mostra nell'anteprima senza applicare nulla e la ritrova in «Novità».

**Acceptance Scenarios**:

1. **Given** un file con una novità che richiede logica nuova, **When** viene importato, **Then** compare come «da fare nel programma» e non cambia alcun calcolo.
2. **Given** la stessa novità importata due volte, **When** compare in «Novità», **Then** non è duplicata.

---

### User Story 6 - Promemoria per aggiornare (Priority: P3)

Fiscal ricorda di preparare un aggiornamento nei periodi in cui le norme cambiano: dopo la pubblicazione della Legge di Bilancio (gennaio), quando escono le istruzioni di CU e Modello Redditi (gennaio-marzo), alle date delle addizionali (regionale da febbraio, comunale dal 20 dicembre e a maggio, come nella 012) e quando ci sono parametri «da verificare» sull'anno in corso da più di 30 giorni.

**Why this priority**: utile, ma il flusso funziona anche senza.

**Independent Test**: con data di prova 10 gennaio e parametri 2027 «da verificare», la home mostra il promemoria «prepara l'aggiornamento dei parametri».

**Acceptance Scenarios**:

1. **Given** l'ultimo aggiornamento importato più vecchio di 90 giorni o parametri «da verificare» sull'anno in corso, **When** l'utente apre la home, **Then** vede il promemoria con il pulsante per preparare la richiesta.

---

### Edge Cases

- File che contiene un anno d'imposta per cui il programma non ha ancora regole (per esempio 2028): Fiscal crea l'anno solo con le voci presenti; i parametri mancanti sono riportati dall'anno precedente come «da verificare (riportato dal 2027)» e l'anno resta «provvisorio» finché non sono tutti verificati.
- Decorrenza nel futuro: la voce è approvabile e diventa attiva da sola alla data; fino ad allora compare come «programmata».
- Decorrenza nel passato dentro l'anno in corso, per un parametro per data: le fatture già emesse non cambiano; Fiscal elenca le **bozze** e gli **incassi non ancora fatturati** con data successiva alla decorrenza, che verranno ricalcolati.
- Stesso parametro presente due volte nel file: si tiene solo la voce con la decorrenza più recente e si segnala il doppione.
- Valore che cambia di molto (oltre la soglia di plausibilità del parametro, per esempio un'aliquota IRPEF che varia di più di 10 punti): la voce non è scartata ma è evidenziata «controlla bene» e richiede una conferma in più.
- Fonte ufficiale ma solo come proposta (disegno di legge, bozza di delibera): la voce entra solo come «da verificare» e l'anteprima riporta «norma non ancora in vigore».
- File di una ricerca vecchia (data della ricerca molto anteriore all'ultimo aggiornamento approvato sullo stesso parametro): Fiscal avvisa che il file potrebbe essere superato.
- File che riporta per un parametro un valore uguale a quello in uso ma con fonte nuova e ufficiale: si registra come conferma (cambio di stato), senza modificare i calcoli.
- Addizionali di un comune diverso da quello del profilo: voce scartata.
- Importazione in modalità prova: funziona come in produzione, ma il registro dei parametri si cancella con il resto della prova.
- File molto grande o con testo non previsto (istruzioni, codice): Fiscal legge solo i campi dello schema e ignora il resto; nessun testo del file viene eseguito o interpretato come comando.

## Requirements *(mandatory)*

### Functional Requirements

**Catalogo dei parametri**

- **FR-001**: Il sistema MUST avere un **catalogo** dei parametri aggiornabili da file. Per ogni parametro indica: chiave stabile, nome e spiegazione in parole semplici, area, unità (aliquota, importo in euro, data, elenco di scaglioni, sì/no, testo), **tipo di decorrenza** («anno d'imposta» oppure «data dell'operazione»), limiti di plausibilità e fonti ufficiali da consultare.
- **FR-002**: Il catalogo MUST coprire almeno: scaglioni e aliquote IRPEF; detrazione per lavoro dipendente e ulteriore detrazione (soglie e importi); acconti (percentuale, soglie, quota della prima rata, mesi); rateizzazione (numero di rate, interessi); differimento (maggiorazione, giorni); addizionale regionale (scaglioni e aliquote) e comunale (aliquota, soglia di esenzione, quota di acconto) per regione e comune dell'utente; ENPAP (aliquota soggettivo, aliquota integrativo, minimi, maternità, scadenze); fatturazione (aliquota IVA ordinaria, soglia e importo del bollo, aliquota della ritenuta, diciture obbligatorie); limiti di deducibilità e detraibilità delle spese già gestiti dalla 008; date delle scadenze e codici tributo F24 usati dallo scadenzario.
- **FR-003**: I parametri che non sono nel catalogo MUST NOT essere modificabili da file.

**Richiesta per Claude**

- **FR-004**: Il sistema MUST generare su richiesta un documento di richiesta contenente: prompt pronto da incollare, istruzioni di ricerca, anni d'imposta richiesti, catalogo con valore in uso, decorrenza, fonte e stato, fonti ufficiali per area, schema della risposta con un esempio completo e la data di generazione.
- **FR-005**: Il prompt MUST chiedere a Claude di: consultare prima le fonti ufficiali (Gazzetta Ufficiale, Normattiva, Agenzia delle Entrate, Dipartimento delle Finanze/MEF, ENPAP, INPS, siti della regione e del comune); indicare per ogni valore la fonte esatta (atto, articolo, collegamento, data); non inventare valori e lasciare il parametro fuori dal file se non trova una fonte; distinguere le norme in vigore da quelle solo proposte; riportare a parte le novità che richiedono logica nuova; restituire **solo** il file nel formato indicato.
- **FR-006**: Il documento di richiesta MUST NOT contenere dati personali o importi dell'utente; l'unica eccezione sono regione e comune, inseriti al momento della generazione e solo se impostati. Il documento MUST NOT essere salvato nel repository.
- **FR-007**: Il documento di richiesta MUST mettere in cima i parametri «da verificare» degli anni richiesti.
- **FR-008**: L'utente MUST poter copiare il documento con un pulsante e scaricarlo come file di testo.

**File di aggiornamento e controlli**

- **FR-009**: Il file di aggiornamento MUST avere un formato fisso e versionato con: versione dello schema, data della ricerca, anni d'imposta coperti, elenco delle voci (chiave, anno d'imposta o data di decorrenza secondo il tipo, valore, fonte con titolo dell'atto, riferimento e collegamento, data dell'atto, stato proposto, stato della norma «in vigore»/«approvata non pubblicata»/«proposta», nota in parole semplici) ed elenco delle novità che richiedono modifiche al programma.
- **FR-010**: Il sistema MUST accettare il file sia caricato sia incollato come testo, e MUST riconoscerlo anche se circondato da testo o da un blocco di codice (come capita nelle risposte di Claude).
- **FR-011**: Il sistema MUST scartare ogni voce con chiave sconosciuta, tipo di valore errato, decorrenza incoerente col tipo del parametro, valore fuori dai limiti di plausibilità o struttura non valida (per esempio scaglioni non crescenti), spiegando il motivo per ciascuna.
- **FR-012**: Il sistema MUST accettare lo stato «verificata» solo se la fonte è su un dominio ufficiale dell'elenco del catalogo e la norma è «in vigore»; altrimenti MUST proporre la voce come «da verificare».
- **FR-013**: Il sistema MUST trattare il contenuto del file solo come dati: nessuna parte del file MUST essere eseguita o seguita come istruzione.

**Anteprima e approvazione**

- **FR-014**: Prima di applicare qualsiasi cosa il sistema MUST mostrare un'anteprima con, per ogni voce: nome del parametro, prima → dopo, decorrenza, fonte, stato proposto, esito dei controlli e impatto in euro sui conti dell'utente per l'anno interessato, calcolato dentro l'app con i suoi dati.
- **FR-015**: L'anteprima MUST separare: «cambia», «conferma» (stesso valore, eventuale passaggio a verificata), «scartata», «bloccata (anno chiuso)», «da fare nel programma».
- **FR-016**: L'utente MUST poter approvare tutte le voci o voce per voce; nessun valore MUST cambiare senza approvazione esplicita. Le voci con variazione anomala MUST richiedere una conferma in più.
- **FR-017**: Le voci che toccano un anno chiuso MUST essere bloccate.

**Applicazione e storico**

- **FR-018**: Ogni voce approvata MUST essere registrata in un registro a cui si aggiunge soltanto, con: parametro, valore, decorrenza, fonte, stato, data di approvazione, file di provenienza (data della ricerca), valore precedente.
- **FR-019**: Il motore MUST usare come valore in vigore, per ogni parametro, l'aggiornamento approvato e non annullato con la decorrenza più recente non successiva alla data dell'operazione (parametri per data) o relativo all'anno del calcolo (parametri per anno d'imposta); in assenza, il valore base del programma.
- **FR-020**: Le fatture già emesse MUST mantenere gli importi calcolati all'emissione; gli anni chiusi MUST NOT cambiare risultato; i calcoli di anni non toccati dalle voci approvate MUST restare identici.
- **FR-021**: Ogni risultato che usa un valore importato MUST poterlo dire nella spiegazione del calcolo («aliquota 33% da aggiornamento del 12/01/2027, fonte …»), e i risultati che usano valori «da verificare» MUST restare segnati come stime, come oggi.
- **FR-022**: Quando la base del programma viene aggiornata (nuova pubblicazione con lo stesso valore e fonte ufficiale), l'aggiornamento importato corrispondente MUST risultare «allineato al programma» e non creare conflitti.

**Registro e annullamento**

- **FR-023**: Il sistema MUST mostrare per ogni parametro il valore in uso, la sua origine (programma o aggiornamento), fonte, stato e cronologia.
- **FR-024**: L'utente MUST poter annullare un aggiornamento approvato; l'annullamento MUST essere una nuova riga del registro e MUST essere bloccato per gli anni chiusi.
- **FR-025**: Il registro MUST essere visibile solo all'utente proprietario, come tutti i suoi dati.

**Collegamento con la 012 e promemoria**

- **FR-026**: Le novità che richiedono logica nuova MUST comparire nella pagina «Novità» come «da fare nel programma», senza duplicati.
- **FR-027**: Il sistema MUST mostrare un promemoria per preparare l'aggiornamento: a gennaio (Legge di Bilancio), tra gennaio e marzo (istruzioni CU e Modello Redditi), alle date delle addizionali della 012, quando ci sono parametri «da verificare» sull'anno in corso da più di 30 giorni o quando l'ultimo aggiornamento importato ha più di 90 giorni.
- **FR-028**: Tutti i testi MUST essere comprensibili senza competenze fiscali, con l'aiuto «?» accanto a ogni sezione e parametro (011).

### Key Entities

- **Parametro del catalogo**: chiave, nome, spiegazione, area, unità, tipo di decorrenza, limiti di plausibilità, soglia di variazione anomala, fonti ufficiali; valore base per anno (dal programma).
- **Richiesta di aggiornamento**: data di generazione, anni richiesti, presenza di regione e comune; non conservata con dati personali.
- **File di aggiornamento**: versione dello schema, data della ricerca, anni coperti, voci, novità da fare nel programma.
- **Voce di aggiornamento**: chiave, anno o data di decorrenza, valore, fonte (atto, riferimento, collegamento, data), stato proposto, stato della norma, nota, esito dei controlli.
- **Riga del registro parametri**: voce approvata o annullamento, valore precedente, data e autore della decisione, origine (file e data della ricerca); solo in aggiunta.
- **Importazione**: data, file di provenienza, numero di voci per esito (cambiate, confermate, scartate, bloccate, rifiutate, da fare nel programma).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dall'apertura di «Prepara aggiornamento» all'importazione approvata, l'utente completa un aggiornamento in meno di 10 minuti (escluso il tempo di ricerca di Claude).
- **SC-002**: Nessun valore cambia senza approvazione registrata (0 casi nelle verifiche).
- **SC-003**: Dopo l'importazione, i risultati degli anni chiusi e delle fatture già emesse restano identici al centesimo (0 differenze nelle prove).
- **SC-004**: Il 100% delle voci non valide dei file di prova (chiave sconosciuta, valore fuori limite, struttura errata, fonte non ufficiale dichiarata «verificata») è scartata o declassata con il motivo.
- **SC-005**: L'utente capisce dall'anteprima che cosa cambia e quanto pesa in meno di 2 minuti.
- **SC-006**: Ogni aggiornamento è annullabile e, dopo l'annullamento, i calcoli tornano identici a prima (0 differenze).
- **SC-007**: Il documento di richiesta non contiene dati personali diversi da regione e comune (0 casi nelle verifiche).
- **SC-008**: Ogni parametro del catalogo usato dal motore ha valore, fonte e stato visibili dall'utente (copertura 100%).

## Assumptions

- La ricerca la fa **Claude** (scelta dell'utente): il prompt è scritto per Claude, ma il formato resta indipendente e potrebbe funzionare con altri assistenti, senza garanzie.
- Il file contiene **solo valori** dei parametri del catalogo: nuove formule, nuove imposte e nuovi parametri richiedono un aggiornamento del programma (flusso 012, con test e pubblicazione).
- I valori base restano nel set di regole per anno del programma (principio I della costituzione); gli aggiornamenti importati si sovrappongono senza modificarli. Il motore non cambia: riceve i valori in vigore già risolti.
- Principio III (test-first): i test del motore restano sulle regole base; per i valori importati la garanzia viene dai controlli di plausibilità per parametro, dal ricalcolo di casi di riferimento con i nuovi valori nell'anteprima e dall'approvazione dell'utente. Serve un emendamento della costituzione (minor, 2.9.0) che riconosca questo canale per i soli valori.
- Il tipo di decorrenza di ogni parametro è deciso nel catalogo, non dal file: per esempio scaglioni, detrazioni, addizionali e aliquota del soggettivo sono «per anno d'imposta»; aliquota integrativo in fattura, IVA, bollo, ritenuta, scadenze e codici tributo sono «per data dell'operazione».
- Domini ufficiali predefiniti: gazzettaufficiale.it, normattiva.it, agenziaentrate.gov.it, finanze.gov.it, mef.gov.it, enpap.it, inps.it, sistemats.it, più il dominio istituzionale della regione e del comune dell'utente (aggiunti dall'utente nel profilo).
- Le addizionali restano nei dati dell'utente come oggi (tabella delle aliquote per anno); l'importazione le aggiorna lì, mantenendo il flag «verificate».
- Il registro vive nel database dell'utente con accesso per riga e accesso a due fattori, come gli altri dati; il documento di richiesta non viene conservato.
- Fuori ambito: ricerca automatica pianificata senza l'utente, invio diretto della richiesta a Claude dall'app, aggiornamento di dati personali (CU, profilo), modifica di parametri non nel catalogo.
