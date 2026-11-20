# Feature Specification: Configurazione della partita IVA e fatturazione

**Feature Branch**: `003-configurazione-piva-fatture` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Dobbiamo fare le fatture: serve tutta la configurazione della partita IVA e i dati essenziali del professionista, poi la creazione delle fatture per lo psicologo (prestazioni sanitarie esenti IVA e attività non sanitarie con IVA), con contributo integrativo ENPAP, bollo e ritenuta d'acconto, pronte per Sistema Tessera Sanitaria e SDI."

## Clarifications

### Session 2026-11-20

- Q: Per le fatture verso enti e aziende l'app produce il file XML conforme o solo un riepilogo dei dati? → A: Nella prima versione solo un riepilogo dei dati da ricopiare in un programma o portale esterno; il file XML conforme è rinviato a una versione successiva.
- Q: Per una seduta a un minore pagata da un genitore, a chi si intesta la fattura? → A: Sempre al paziente, anche se minorenne, con il suo codice fiscale; nessun ruolo separato di intestatario e beneficiario. Facoltativa un'annotazione "pagato da" per documentare chi ha sostenuto la spesa.
- Q: Fattura e incasso in un solo passaggio? → A: Sì, in fattura c'è l'opzione "già incassata" (data, importo, modalità). Se sia attiva per impostazione predefinita si decide più avanti: per ora è un'impostazione modificabile. L'utente prevede di far pagare subito dopo la seduta con un lettore di carte (SumUp); l'integrazione con il lettore è fuori dalla prima versione e l'incasso si registra a mano.
- Q: Il bollo da 2 € è addebitato al paziente o a carico del professionista? → A: Parametro configurabile, con valore predefinito "a carico del paziente" (voce separata in fattura).
- Q: Numerazione unica per anno o separata per tipo o attività? → A: Una sola numerazione progressiva per anno, uguale per tutte le fatture (esenti, con IVA, di ogni attività).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurare la mia partita IVA una volta sola (Priority: P1)

L'utente inserisce i dati essenziali dell'attività: anagrafica e codice fiscale, partita IVA, data di inizio attività, codice ATECO, regime fiscale (ordinario), sede o domicilio fiscale, PEC e codice destinatario per la fatturazione elettronica, IBAN per i pagamenti, iscrizione all'Albo (ordine e numero) e all'ENPAP (cassa previdenziale), regime IVA predefinito delle prestazioni, aliquota del contributo integrativo, trattamento di bollo e ritenuta. Il sistema indica quali dati mancano per poter emettere fatture valide.

**Why this priority**: senza questi dati nessuna fattura è valida; è il prerequisito di tutta la contabilità e della specifica 004.

**Independent Test**: completando la configurazione, il sistema risulta "pronto a fatturare"; togliendo un dato obbligatorio indica quale manca e blocca l'emissione.

**Acceptance Scenarios**:

1. **Given** l'app priva di configurazione, **When** l'utente inserisce tutti i dati essenziali, **Then** il sistema segna la configurazione come completa e abilita l'emissione delle fatture.
2. **Given** una configurazione incompleta, **When** l'utente tenta di emettere una fattura, **Then** il sistema elenca i dati mancanti e non emette il documento.
3. **Given** un codice fiscale o una partita IVA formalmente errati, **When** l'utente li inserisce, **Then** il sistema segnala l'errore prima del salvataggio.
4. **Given** una data di inizio attività nel 2027, **When** l'utente prova a emettere una fattura con data precedente, **Then** il sistema lo impedisce e spiega il motivo.

---

### User Story 2 - Emettere una fattura per una prestazione sanitaria (Priority: P1)

L'utente crea una fattura per una seduta o un ciclo di sedute: sceglie il paziente o il cliente, inserisce data, descrizione e compenso. Il sistema aggiunge automaticamente il **contributo integrativo ENPAP**, la dicitura di **esenzione IVA** (art. 10 n. 18 DPR 633/72), l'**imposta di bollo da 2,00 €** se l'importo supera 77,47 €, ed eventualmente la **ritenuta d'acconto** quando il cliente è un sostituto d'imposta. Mostra il totale e il netto a pagare, e produce il documento.

**Why this priority**: è la fattura che l'utente emetterà più spesso e quella con più regole da non sbagliare.

**Independent Test**: una fattura di prova con compenso e cliente noti produce gli importi attesi (integrativo, bollo, ritenuta, totale, netto) al centesimo e la dicitura corretta.

**Acceptance Scenarios**:

1. **Given** un paziente persona fisica e un compenso di 80 €, **When** l'utente emette la fattura, **Then** il sistema applica il contributo integrativo, la dicitura di esenzione e il bollo da 2 € (importo oltre 77,47 €), senza ritenuta.
2. **Given** un cliente azienda o ente che opera come sostituto d'imposta, **When** l'utente emette la fattura, **Then** il sistema applica la ritenuta d'acconto sul compenso (escluso il contributo integrativo) e mostra il netto a pagare.
3. **Given** un compenso inferiore alla soglia del bollo, **When** la fattura viene emessa, **Then** non compare il bollo.
4. **Given** una fattura emessa, **When** l'utente la apre, **Then** il numero è progressivo nell'anno e non ci sono salti o duplicati.

---

### User Story 3 - Emettere una fattura per un'attività non sanitaria (Priority: P2)

Per attività non sanitarie (consulenza, formazione, docenza) l'utente emette fatture con IVA al 22% e, quando il cliente è un sostituto d'imposta, con ritenuta d'acconto. Il sistema separa queste voci dalle prestazioni sanitarie e ne tiene conto nei riepiloghi.

**Why this priority**: riguarda un'attività meno frequente, ma ha regole diverse (IVA, nessun invio al Sistema Tessera Sanitaria) e va distinta dalle prestazioni esenti.

**Independent Test**: una fattura con una riga sanitaria e una riga imponibile mostra IVA solo sulla seconda e i totali coerenti.

**Acceptance Scenarios**:

1. **Given** una prestazione di consulenza, **When** l'utente emette la fattura, **Then** applica l'IVA al 22% sul compenso e sul contributo integrativo e non la dicitura di esenzione.
2. **Given** una fattura con righe miste, **When** il sistema calcola i totali, **Then** separa imponibile, esente, IVA, contributo integrativo, bollo e ritenuta.

---

### User Story 4 - Registrare l'incasso e conoscere il netto reale (Priority: P2)

L'utente segna quando una fattura è stata incassata (data e modalità). Il sistema usa la data di incasso, non quella di emissione, per il reddito dell'anno, come richiede il principio di cassa, e distingue fatturato, incassato e da incassare.

**Why this priority**: collega la fatturazione ai calcoli fiscali della specifica 001 e alla dashboard del Netto Reale.

**Independent Test**: una fattura emessa a dicembre e incassata a gennaio compare come reddito dell'anno di incasso.

**Acceptance Scenarios**:

1. **Given** una fattura emessa ma non incassata, **When** l'utente guarda i riepiloghi, **Then** compare tra le fatture da incassare e non nel reddito dell'anno.
2. **Given** un incasso registrato in una data, **When** il sistema calcola il reddito per cassa, **Then** include l'importo nell'anno di quella data.
3. **Given** un incasso parziale, **When** l'utente lo registra, **Then** il sistema mostra l'importo residuo da incassare.

---

### User Story 5 - Preparare i dati per Sistema Tessera Sanitaria e fatturazione elettronica (Priority: P2)

Per le prestazioni sanitarie verso persone fisiche, il sistema prepara l'elenco dei dati da inviare al Sistema Tessera Sanitaria, tenendo conto dell'eventuale opposizione del paziente. Per le fatture verso enti e aziende prepara un riepilogo completo dei dati da riportare nel programma o nel portale usato per la fattura elettronica da inviare tramite SDI (il file XML conforme è rinviato a una versione successiva). L'invio vero e proprio è fatto dall'utente fuori dall'app.

**Why this priority**: sono adempimenti obbligatori, ma si possono sviluppare dopo la fattura base.

**Independent Test**: da un insieme di fatture di prova, il sistema genera un elenco di spese sanitarie e un riepilogo per la fattura elettronica con i dati corretti, e segnala quelle già inviate.

**Acceptance Scenarios**:

1. **Given** fatture sanitarie a persone fisiche, **When** l'utente apre la preparazione per il Sistema Tessera Sanitaria, **Then** vede l'elenco delle spese da trasmettere con stato "da inviare" o "inviata".
2. **Given** un paziente che si è opposto alla trasmissione, **When** viene emessa la fattura, **Then** compare la dicitura prevista e la spesa è esclusa dall'invio.
3. **Given** una fattura verso un'azienda, **When** l'utente richiede i dati per la fattura elettronica, **Then** ottiene un riepilogo con i dati del cedente, del cliente, delle righe, del bollo e della ritenuta, pronto da copiare.

---

### User Story 6 - Gestire anagrafica clienti e storico fatture (Priority: P3)

L'utente tiene un'anagrafica di clienti e pazienti con i soli dati necessari alla fattura, cerca le fatture emesse, le stampa o le salva in PDF, le annulla con nota di credito e può filtrarle per anno, cliente e stato.

**Why this priority**: comodità e ordine; la fattura base funziona anche inserendo i dati volta per volta.

**Independent Test**: dopo aver emesso più fatture, l'utente le ritrova filtrando per cliente e anno e ne scarica il PDF.

**Acceptance Scenarios**:

1. **Given** un cliente già salvato, **When** l'utente emette una nuova fattura, **Then** i suoi dati sono precompilati.
2. **Given** una fattura emessa per errore, **When** l'utente la annulla, **Then** il sistema crea una nota di credito collegata e la fattura originale resta consultabile.
3. **Given** più anni di fatture, **When** l'utente filtra per anno, **Then** vede solo quelle dell'anno scelto con i totali.

---

### User Story 7 - Fatturare anche attività diverse dallo psicologo (Priority: P2)

L'utente può emettere fatture per attività che non sono quella di psicologo (per esempio consulenza o altre prestazioni, anche con un codice ATECO diverso). La **regola generale** è che l'attività di psicologo è esente IVA; l'**eccezione** è che ogni attività non sanitaria o diversa da quella di psicologo è fatturata con **IVA al 22%**, salvo specifica esenzione. Per ogni attività l'utente indica codice ATECO, natura ai fini IVA e trattamento previdenziale. Il sistema mostra la quota di operazioni imponibili sul totale, calcola il **pro-rata di detraibilità** dell'IVA sugli acquisti e avvisa quando la quota imponibile cresce.

**Why this priority**: l'utente prevede di fatturare anche altro; senza questa gestione l'IVA o la previdenza verrebbero sbagliate.

**Independent Test**: con fatture di prova esenti e imponibili il sistema applica l'IVA solo alle voci imponibili, mostra la quota imponibile e il pro-rata, e non propone il Sistema Tessera Sanitaria per le voci non sanitarie.

**Acceptance Scenarios**:

1. **Given** una fattura per un'attività diversa da quella di psicologo, **When** l'utente la emette, **Then** il sistema applica l'IVA al 22% e la classifica come imponibile.
2. **Given** fatture esenti e imponibili nell'anno, **When** l'utente apre il riepilogo IVA, **Then** vede la quota di operazioni imponibili e il pro-rata di detraibilità con la spiegazione.
3. **Given** una quota imponibile in crescita, **When** supera una soglia di attenzione impostata, **Then** il sistema avvisa e rimanda alla verifica con il commercialista.
4. **Given** un'attività non riconducibile alla professione di psicologo, **When** l'utente la configura, **Then** il sistema chiede il trattamento previdenziale (ENPAP o altro) e lo segnala come da verificare.

---

### Edge Cases

- Fattura per attività diversa dallo psicologo con ritenuta d'acconto o senza.
- Prestazione che sembra sanitaria ma non lo è (o viceversa): la classificazione resta una scelta esplicita dell'utente.
- Fattura emessa in un anno e incassata in un altro (reddito nell'anno di incasso).
- Prima fattura del 2027: la numerazione parte da 1 e la data non può precedere l'inizio attività.
- Fattura con righe sia esenti sia imponibili e applicazione del bollo solo alla parte esente oltre soglia.
- Importo esente di poco sotto o sopra la soglia di 77,47 €.
- Paziente minorenne o altra persona che paga al posto del paziente: la fattura resta intestata al paziente con il suo codice fiscale; chi ha pagato può essere annotato nel campo facoltativo "pagato da" (nome, senza altri dati).
- Paziente privo di codice fiscale italiano o con codice fiscale non disponibile.
- Cliente estero o privo di codice fiscale italiano.
- Cliente persona fisica che non è sostituto d'imposta (nessuna ritenuta).
- Cambio dell'aliquota del contributo integrativo da un anno all'altro (2% fino al 2026, 4% dal 2027).
- Numerazione con buchi dovuti a bozze eliminate: le bozze non devono consumare numeri.
- Nota di credito che copre solo parte della fattura.
- Dati sanitari: nessuna informazione clinica (diagnosi, note di seduta) deve finire nella fattura o nell'anagrafica.
- Modifica della configurazione dopo che sono state emesse fatture: i documenti già emessi restano immutati.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST permettere di inserire e modificare la configurazione dell'attività: anagrafica e codice fiscale, partita IVA, data inizio attività, codice ATECO, regime fiscale, sede o domicilio fiscale, PEC, codice destinatario, IBAN, iscrizione all'Albo e all'ENPAP, regime IVA predefinito, trattamento di contributo integrativo, bollo e ritenuta.
- **FR-002**: Il sistema MUST validare la forma del codice fiscale e della partita IVA e segnalare i dati obbligatori mancanti, impedendo l'emissione finché la configurazione non è completa.
- **FR-003**: Il sistema MUST numerare le fatture con un'unica sequenza progressiva per anno, uguale per tutte le fatture (esenti, con IVA e di ogni attività), senza salti né duplicati, e MUST NOT consumare numeri per le bozze. Le note di credito seguono la stessa sequenza.
- **FR-004**: Il sistema MUST impedire di emettere fatture con data anteriore alla data di inizio attività.
- **FR-005**: Il sistema MUST calcolare automaticamente per ogni fattura: compenso, contributo integrativo, imponibile, IVA o esenzione, bollo, ritenuta d'acconto, totale documento e netto a pagare, in centesimi e con arrotondamenti documentati.
- **FR-006**: Il contributo integrativo MUST seguire l'aliquota dell'anno prevista dalle regole (2% fino al 2026, 4% dal 2027) e MUST NOT essere scritto nella logica di calcolo (principio I della costituzione).
- **FR-007**: Il sistema MUST classificare ogni riga come prestazione sanitaria esente (art. 10 n. 18 DPR 633/72) o attività imponibile con IVA al 22%, riportando la dicitura corretta.
- **FR-008**: Il sistema MUST applicare l'imposta di bollo da 2,00 € alle fatture con importi esenti superiori a 77,47 € e MUST indicarlo nel documento. Chi sostiene il bollo MUST essere un parametro configurabile nella configurazione dell'attività (FR-001), con valore predefinito "a carico del paziente": in tal caso il bollo è una voce separata che aumenta il totale della fattura; se impostato "a carico del professionista", il totale non aumenta e il bollo è registrato come spesa dell'attività (specifica 008). Il valore usato MUST essere memorizzato su ogni fattura emessa, così che un cambio successivo del parametro non modifichi le fatture già emesse.
- **FR-009**: Il sistema MUST applicare la ritenuta d'acconto del 20% solo quando il cliente è un sostituto d'imposta, calcolandola sul compenso e non sul contributo integrativo.
- **FR-010**: Il sistema MUST registrare l'incasso (data, importo, modalità, anche parziale) e usare la data di incasso per il reddito per cassa. Il sistema MUST permettere di registrare l'incasso nello stesso passaggio dell'emissione ("già incassata"), con un'impostazione modificabile che stabilisce se l'opzione è attiva per impostazione predefinita (valore da decidere; per ora disattivata). La modalità di incasso MUST distinguere almeno contanti, carta o POS, bonifico e altro, e MUST indicare se il pagamento è tracciabile, perché serve al paziente per detrarre la spesa.
- **FR-011**: Il sistema MUST distinguere fatture emesse, incassate e da incassare nei riepiloghi dell'anno.
- **FR-012**: Il sistema MUST permettere di annullare una fattura con una nota di credito collegata, mantenendo consultabile l'originale.
- **FR-013**: Le fatture emesse MUST essere immutabili; le correzioni passano da nota di credito e nuova fattura.
- **FR-014**: Il sistema MUST preparare i dati delle prestazioni sanitarie verso persone fisiche per il Sistema Tessera Sanitaria, con stato di invio e gestione dell'opposizione del paziente, senza inviarli direttamente.
- **FR-015**: Il sistema MUST preparare un riepilogo dei dati della fattura elettronica (cedente, cliente, righe, natura IVA, bollo, ritenuta, dicitura) per le fatture verso enti e aziende e MUST NOT predisporlo per le fatture verso pazienti persone fisiche. La generazione del file XML conforme al tracciato ufficiale è fuori dalla prima versione.
- **FR-016**: Il sistema MUST generare un documento stampabile o in PDF per ogni fattura, con tutti i dati obbligatori e le diciture richieste.
- **FR-017**: Il sistema MUST tenere un'anagrafica di clienti e pazienti con i soli dati necessari alla fattura e MUST NOT conservare alcun dato clinico. Le fatture per prestazioni sanitarie a persone fisiche MUST essere intestate al paziente (anche minorenne) con il suo codice fiscale, che è quello usato per il Sistema Tessera Sanitaria; il sistema MUST permettere un'annotazione facoltativa "pagato da" (solo nome) e MUST NOT richiedere i dati di chi paga.
- **FR-018**: Il sistema MUST permettere di filtrare e cercare le fatture per anno, cliente, stato e tipo, mostrando i totali.
- **FR-019**: Il sistema MUST fornire alla specifica 001 il reddito professionale per cassa dell'anno derivato dagli incassi e dalle spese registrate.
- **FR-020**: Il sistema MUST mantenere separate le prestazioni esenti e quelle imponibili nei totali, per i calcoli IVA e del pro-rata.
- **FR-021**: Le regole di fatturazione (aliquote, soglia del bollo, diciture, aliquota ritenuta, aliquota contributo integrativo) MUST essere raccolte nel set di regole per anno con fonte e stato di verifica.
- **FR-022**: Il sistema MUST permettere di configurare più attività, ciascuna con codice ATECO, natura IVA (esente o imponibile) e trattamento previdenziale, e di collegare ogni fattura a un'attività.
- **FR-023**: Il sistema MUST applicare l'IVA al 22% a ogni voce non sanitaria o riferita ad attività diversa da quella di psicologo, salvo esenzione indicata, e MUST NOT includerla nelle preparazioni per il Sistema Tessera Sanitaria.
- **FR-024**: Il sistema MUST calcolare e mostrare nell'anno la quota di operazioni imponibili sul totale (imponibili / imponibili più esenti) e il pro-rata di detraibilità dell'IVA sugli acquisti, arrotondato all'unità, con spiegazione.
- **FR-025**: Il sistema MUST avvisare quando la quota imponibile supera una soglia di attenzione configurabile e MUST NOT bloccare l'emissione.
- **FR-026**: Il sistema MUST segnalare che la presenza di operazioni imponibili comporta liquidazioni, registri e dichiarazione IVA, fuori ambito di questa specifica (TODO nella costituzione).

### Key Entities *(include if feature involves data)*

- **Profilo professionale (partita IVA)**: anagrafica, codice fiscale, partita IVA, inizio attività, ATECO, regime, sede, PEC, codice destinatario, IBAN, Albo, ENPAP, impostazioni predefinite.
- **Cliente o paziente**: persona fisica o ente, con i soli dati necessari alla fattura, tipo (sostituto d'imposta o no), opposizione al Sistema Tessera Sanitaria e annotazione facoltativa "pagato da"; nessun dato clinico.
- **Fattura**: numero, anno, data, cliente, righe, importi calcolati, stato (bozza, emessa, annullata), dicitura.
- **Riga di fattura**: descrizione, compenso, natura (esente sanitaria o imponibile), importi.
- **Incasso**: data, importo, modalità, fattura collegata.
- **Nota di credito**: documento che annulla in tutto o in parte una fattura.
- **Preparazione STS / fattura elettronica**: elenco o riepilogo derivato dalle fatture, con stato di invio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In tutti i casi di prova verificati a mano (con e senza bollo, con e senza ritenuta, esente, imponibile, righe miste) gli importi coincidono al centesimo (0 scostamenti).
- **SC-002**: Un utente con configurazione completa emette una fattura sanitaria standard in meno di 2 minuti da telefono.
- **SC-003**: La configurazione iniziale completa si compila in meno di 10 minuti.
- **SC-004**: In una serie di fatture di prova la numerazione non ha salti né duplicati nel 100% dei casi.
- **SC-005**: Il 100% delle fatture emesse riporta tutte le diciture obbligatorie previste per il proprio tipo.
- **SC-006**: Il reddito per cassa di un anno cambia solo in base alle date di incasso, non a quelle di emissione, in tutti i casi di prova.
- **SC-007**: Nessuna fattura, anagrafica o esportazione contiene dati clinici (0 ritrovamenti in verifica).

## Assumptions

- L'utente è psicologo iscritto all'Albo e all'ENPAP, in regime ordinario, con partita IVA dal 2027 (specifica 001 e costituzione).
- Le fatture verso persone fisiche (pazienti) **non passano dallo SDI** ma sono documenti di spesa con i dati predisposti per il Sistema Tessera Sanitaria; quelle verso enti e aziende passano dalla fattura elettronica. Eventuali novità normative del 2027 su questo punto sono da verificare (TODO nella costituzione).
- Il contributo integrativo è del 4% dal 2027, soggetto a IVA solo nelle fatture imponibili; il trattamento ai fini della ritenuta è quello descritto (escluso dalla base); questi aspetti sono da confermare con ENPAP e commercialista.
- La modalità di invio al Sistema Tessera Sanitaria e allo SDI è esterna all'app: l'app prepara i dati; le credenziali del Sistema Tessera Sanitaria non vengono conservate.
- La scadenza di trasmissione al Sistema Tessera Sanitaria è da verificare (specifica 004, scadenzario).
- **Incassi con lettore di carte**: l'utente prevede di far pagare subito dopo la seduta con un lettore di carte (SumUp). L'app non si collega al lettore né importa i movimenti: l'incasso si registra a mano. Eventuali commissioni del lettore sono spese dell'attività (specifica 008); l'importazione dei movimenti è un'evoluzione futura.
- **Intestazione delle fatture ai pazienti** (verifica del 2026-11-20 su fonti di settore e Ordini degli psicologi, non sulle specifiche ufficiali): la fattura può essere intestata al paziente o a chi paga; nel Sistema Tessera Sanitaria la spesa è riferita al codice fiscale del paziente. La detrazione al 19% per un figlio a carico spetta al genitore, e con più genitori la ripartizione è tra loro. Da confermare su sistemats.it e col commercialista.
- **Dati dei pazienti**: sono dati relativi alla salute e quindi di categoria particolare ai sensi del GDPR. Il sistema ne conserva il minimo indispensabile (identificativi della fattura), nessun dato clinico, e li oscura con la modalità "occhio". Valutare nel piano: cifratura dei soli campi identificativi dei pazienti, accordo sul trattamento dei dati con il fornitore del database, informativa ai pazienti. Rischio residuo accettato dall'utente per i dati in chiaro (specifica 002).
- La fattura è un documento di emissione immutabile: le correzioni avvengono con nota di credito.
- **IVA e "attività prevalente"** (verifica del 2026-11-20): nel testo del DPR 633/72 (artt. 19, 19-bis, 36), letto su fonte divulgativa da riscontrare, **non risulta una soglia di prevalenza** che cambi il trattamento IVA. Con operazioni esenti e imponibili vale il **pro-rata** (imponibili diviso totale, arrotondato) sull'IVA degli acquisti, oppure l'opzione di separazione delle attività (art. 36 c. 3, contabilità separata, almeno un triennio). La prevalenza può comunque incidere su altro (codice ATECO, previdenza, indici di affidabilità): da verificare col commercialista (TODO(IVA_PREVALENZA) nella costituzione).
- Le attività non riconducibili alla professione di psicologo potrebbero non essere coperte dall'ENPAP e andare in Gestione Separata INPS: da verificare (TODO(ATTIVITA_DIVERSE) nella costituzione e specifica 001).
- **Fuori ambito**: invio diretto al Sistema Tessera Sanitaria e allo SDI, file XML conforme della fattura elettronica (rinviato), registro costi e deducibilità delle spese (specifica 008), calcolo e scadenze di F24, IVA periodica (liquidazioni, registri) e dichiarazione IVA, da trattare in una specifica dedicata se emergono operazioni imponibili, calcolo IRPEF (specifica 001), dati per la dichiarazione dei redditi e scadenzario (specifica 004), autenticazione (specifica 002), grafica.
