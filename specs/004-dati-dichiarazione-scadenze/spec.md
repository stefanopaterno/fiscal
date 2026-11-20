# Feature Specification: Dati per la dichiarazione dei redditi e scadenze fiscali

**Feature Branch**: `004-dati-dichiarazione-scadenze` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Una specifica che chieda la CU e i dati necessari per fare la dichiarazione dei redditi ogni volta che serve, e che tenga conto delle scadenze."

**Nota**: con partita IVA in regime ordinario la dichiarazione è il **Modello Redditi Persone Fisiche** (ex Unico), non il 730 né il vecchio 740. Il termine "dichiarazione" in questa specifica indica quel modello.

## Clarifications

### Session 2026-11-20

- Q: La dichiarazione la compila l'utente o il commercialista? → A: Nella prima versione l'app prepara un prospetto completo per il commercialista (collegato alla specifica 009); la guida quadro per quadro ai righi del Modello Redditi è rinviata a una versione successiva, se l'utente deciderà di compilare da solo.
- Q: Per gli acconti 2027 serve l'imposta del 730 dell'anno 2026: come si parte? → A: L'utente inserisce a mano solo i pochi dati del 730 2026 necessari (imposta netta, acconti versati, credito o debito) come "anno di partenza", con una guida che dice dove trovarli nel 730.
- Q: La CU si inserisce a mano o con lettura automatica del PDF? → A: Inserimento guidato a mano, con indicazione per ogni dato della casella della CU da cui prenderlo; il PDF si allega nell'archivio (specifica 010) come prova. La lettura automatica del PDF è fuori dalla prima versione.
- Q: Come si ricevono i promemoria? → A: Prima versione: dentro l'app, più un file di calendario da importare nel calendario del telefono o del PC. Prossima release (decisione dell'utente): job schedulati lato server che inviano notifiche; nella prima versione non ci sono servizi in background.
- Q: Il calendario mostra solo le scadenze pertinenti o tutte? → A: Il calendario dell'app contiene tutte le scadenze delle regole dell'anno; il sistema suggerisce quali conviene portare nel calendario del telefono (quelle pertinenti ai dati dell'utente) e l'utente le segna come fatte con un flag man mano che le completa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sapere ogni anno cosa mi serve per la dichiarazione (Priority: P1)

Per ogni anno d'imposta il sistema crea una **checklist guidata** dei dati e dei documenti necessari per compilare la dichiarazione. L'utente vede cosa è già disponibile (per esempio i compensi incassati, le fatture, i contributi ENPAP versati) e cosa deve ancora fornire (per esempio la CU del datore di lavoro, le spese detraibili, i documenti degli oneri), con lo stato di ciascun elemento.

**Why this priority**: è la parte che fa risparmiare più tempo e fa evitare dimenticanze, e alimenta i calcoli della specifica 001 con dati completi.

**Independent Test**: all'inizio di un anno d'imposta il sistema mostra la checklist; inserendo un dato o un documento, l'elemento passa a "completato" e la percentuale di completamento si aggiorna.

**Acceptance Scenarios**:

1. **Given** un nuovo anno d'imposta, **When** l'utente apre la sezione dichiarazione, **Then** vede la checklist dell'anno con gli elementi già presenti nell'app segnati come disponibili e gli altri come da fornire.
2. **Given** un elemento da fornire, **When** l'utente inserisce il dato o allega il documento, **Then** l'elemento passa a "completato" e il progresso si aggiorna.
3. **Given** dati mancanti o incoerenti (per esempio una CU senza ritenute), **When** l'utente guarda la checklist, **Then** il sistema li segnala con una spiegazione di cosa serve.
4. **Given** un elemento non pertinente, **When** l'utente lo segna come "non applicabile", **Then** non conta nel progresso.

---

### User Story 2 - Inserire la Certificazione Unica (Priority: P1)

Quando il datore di lavoro rilascia la CU, l'utente inserisce i suoi dati con una procedura guidata: reddito imponibile, ritenute IRPEF, addizionali trattenute, detrazioni fruite, contributi previdenziali, eventuali bonus o conguagli, dati del datore. Il sistema controlla la coerenza e rende i dati disponibili al motore di calcolo della specifica 001.

**Why this priority**: la CU è il dato di partenza per tutta la fiscalità del reddito da lavoro dipendente e per il calcolo del conguaglio.

**Independent Test**: inserendo i dati di una CU di prova, il motore della specifica 001 li usa e il sistema segnala eventuali incoerenze (per esempio importi negativi o ritenute superiori al reddito).

**Acceptance Scenarios**:

1. **Given** una CU ricevuta, **When** l'utente completa la procedura guidata, **Then** i dati sono salvati per l'anno e usati nei calcoli.
2. **Given** più CU nello stesso anno (due datori di lavoro), **When** l'utente le inserisce, **Then** il sistema le somma correttamente e le mostra separate.
3. **Given** un importo implausibile, **When** l'utente lo inserisce, **Then** il sistema lo segnala e chiede conferma.
4. **Given** una CU non ancora disponibile, **When** l'utente apre la checklist, **Then** vede la data prevista di rilascio e può usare una stima provvisoria, segnalata come tale.

---

### User Story 3 - Raccogliere gli altri dati della dichiarazione (Priority: P2)

L'utente inserisce, guidato dal sistema, gli altri dati che servono: oneri deducibili (per esempio contributi previdenziali ENPAP e altri versamenti previdenziali), spese e oneri detraibili (sanitarie, interessi sul mutuo, istruzione, altre), familiari a carico, dati degli immobili e dell'abitazione, acconti e ritenute già versati, crediti e debiti dell'anno precedente, comune e regione di residenza per le addizionali. Il sistema segnala quali di questi dati sono già derivabili dalle fatture e dalle spese registrate.

**Why this priority**: completa il quadro per la dichiarazione ma richiede più tempo; la checklist e la CU danno già il valore principale.

**Independent Test**: inserendo i dati di prova di un anno, il sistema segna come completo il relativo gruppo di dati e li rende disponibili al riepilogo.

**Acceptance Scenarios**:

1. **Given** i contributi ENPAP versati nell'anno, **When** l'utente li registra, **Then** il sistema li collega come oneri deducibili e li rende disponibili al motore della specifica 001.
2. **Given** spese sanitarie dell'anno, **When** l'utente le inserisce, **Then** il sistema le raccoglie nel gruppo "oneri detraibili".
3. **Given** dati già inseriti in anni precedenti (residenza, familiari), **When** l'utente apre un nuovo anno, **Then** il sistema li propone precompilati da confermare.

---

### User Story 4 - Non perdere nessuna scadenza (Priority: P1)

Il sistema mantiene un **calendario delle scadenze fiscali e previdenziali** dell'anno: rilascio della CU, invio della dichiarazione, versamenti di saldo e acconti, adempimenti ENPAP, trasmissione dei dati al Sistema Tessera Sanitaria, dichiarazione IVA e altri. Ogni scadenza ha data, descrizione, stato (da fare, fatta, scaduta) e un promemoria mostrato nell'app con anticipo configurabile. Quando disponibile, mostra anche l'importo stimato.

**Why this priority**: perdere una scadenza comporta sanzioni; è uno dei motivi principali per avere l'app.

**Independent Test**: con un anno d'imposta di prova, il calendario elenca le scadenze con le date dell'anno; segnando una scadenza come fatta, cambia stato e sparisce dai promemoria.

**Acceptance Scenarios**:

1. **Given** un anno d'imposta con regole disponibili, **When** l'utente apre il calendario, **Then** vede le scadenze ordinate per data con stato e giorni mancanti.
2. **Given** una scadenza entro l'anticipo impostato, **When** l'utente apre l'app, **Then** vede un promemoria evidente.
3. **Given** una scadenza passata non segnata come fatta, **When** l'utente apre il calendario, **Then** compare come "scaduta" con un avviso.
4. **Given** una scadenza di versamento con importo stimato dai calcoli, **When** l'utente la apre, **Then** vede l'importo stimato e da quali voci deriva.
5. **Given** un nuovo anno, **When** le sue regole sono disponibili, **Then** il calendario dell'anno viene creato senza che l'utente debba reinserire le scadenze.
6. **Given** il calendario con tutte le scadenze dell'anno, **When** l'utente apre la funzione di esportazione, **Then** il sistema suggerisce quali portare nel calendario del telefono (per esempio quelle che riguardano i dati e le attività dell'utente) e l'utente può modificare la selezione prima di esportare.
7. **Given** una scadenza completata, **When** l'utente la segna con il flag "fatta", **Then** lo stato cambia, compaiono data e nota facoltativa, sparisce dai promemoria e il flag si può togliere.

---

### User Story 5 - Riepilogo pronto per la dichiarazione (Priority: P2)

Quando i dati sono pronti, il sistema produce un **riepilogo dell'anno** organizzato come serve per compilare il Modello Redditi: redditi da lavoro dipendente, compensi e spese del lavoro autonomo per categoria, contributi e oneri, ritenute e acconti, imposta stimata. Il riepilogo si può stampare o salvare in PDF per usarlo in autonomia o consegnarlo al commercialista o al CAF.

**Why this priority**: è il risultato finale di tutta la raccolta dati e riduce il lavoro di compilazione.

**Independent Test**: da un anno di prova con dati completi, il riepilogo contiene tutte le sezioni e i totali coincidono con quelli del motore di calcolo.

**Acceptance Scenarios**:

1. **Given** una checklist completata, **When** l'utente richiede il riepilogo, **Then** ottiene un documento con tutte le sezioni compilate e i totali coerenti.
2. **Given** una checklist incompleta, **When** l'utente richiede il riepilogo, **Then** il sistema avvisa quali sezioni sono parziali e le segnala nel documento.
3. **Given** un riepilogo generato, **When** l'utente lo apre in seguito, **Then** riflette i dati al momento della generazione e riporta la data.

---

### User Story 6 - Chiudere l'anno e consultare gli anni passati (Priority: P3)

Dopo l'invio della dichiarazione l'utente può "chiudere" l'anno: i dati restano consultabili ma protetti da modifiche involontarie. Può riaprire un anno chiuso con una conferma esplicita. Gli anni chiusi forniscono lo storico per il calcolo degli acconti dell'anno successivo.

**Why this priority**: ordine e storico; non necessario alla prima dichiarazione.

**Independent Test**: dopo la chiusura di un anno, una modifica ai suoi dati richiede una conferma esplicita e viene registrata.

**Acceptance Scenarios**:

1. **Given** un anno chiuso, **When** l'utente prova a modificarne un dato, **Then** il sistema chiede conferma e registra la modifica.
2. **Given** un anno chiuso, **When** si apre il calcolo degli acconti dell'anno dopo, **Then** il sistema usa i dati di quell'anno come storico.

---

### User Story 7 - Capire che fine fanno i miei rimborsi (ex 730) (Priority: P2)

Con il 730 i rimborsi (per esempio quelli delle spese sanitarie detraibili o delle ritenute eccedenti) arrivavano in busta paga. Con il Modello Redditi non è più così: il sistema mostra l'**esito della dichiarazione** dell'anno (imposte dovute meno ritenute, acconti, crediti dell'anno prima e detrazioni) e spiega che i crediti vengono **prima assorbiti da ciò che devi pagare**: la maggior parte dei "rimborsi" diventa un saldo di giugno più basso. Solo l'eventuale eccedenza è un vero credito, e l'utente registra se la **riporta in compensazione** (per pagare tasse future) o la **chiede a rimborso** (accredito sul proprio conto da parte dell'Agenzia delle Entrate). Il sistema segue lo stato del credito fino all'incasso o all'utilizzo.

**Why this priority**: cambia il modo in cui l'utente è abituato a ricevere i rimborsi e, se non è chiaro, falsa la liquidità e gli accantonamenti; ma si presenta solo dalla prima dichiarazione con Modello Redditi (2028).

**Independent Test**: con un anno di prova in cui le detrazioni superano le imposte residue, il sistema mostra prima il saldo ridotto dalle detrazioni, poi il credito eccedente, e permette di registrare la scelta e lo stato; un credito non ancora incassato non entra nella liquidità disponibile.

**Acceptance Scenarios**:

1. **Given** un anno con spese detraibili e un saldo a debito, **When** l'utente apre l'esito della dichiarazione, **Then** vede di quanto ogni voce riduce il saldo e un messaggio che spiega che il vantaggio è sul versamento di giugno, non un rimborso.
2. **Given** un anno con un credito residuo dopo tutti gli assorbimenti, **When** l'utente apre l'esito, **Then** vede l'importo del credito e le due scelte (riporto in compensazione o richiesta di rimborso) con conseguenze, tempi stimati e vincoli, in linguaggio chiaro.
3. **Given** una scelta di rimborso, **When** l'utente registra lo stato (richiesto, in attesa, incassato con data e importo), **Then** il credito è escluso dalla liquidità disponibile finché non risulta incassato.
4. **Given** una scelta di compensazione, **When** l'utente registra gli utilizzi, **Then** il sistema mostra il credito residuo e propone come usarlo sul prossimo versamento.
5. **Given** un credito che per importo o per situazione richiede formalità aggiuntive, **When** l'utente lo apre, **Then** il sistema lo segnala con la fonte della regola e il suo stato di verifica.

---

### User Story 8 - Partire dai dati dell'ultimo 730 (Priority: P1)

Al primo avvio l'utente inserisce l'**anno di partenza** (2026, ultimo anno solo da dipendente): pochi dati presi dal suo 730, cioè l'imposta netta dell'anno, gli acconti versati, il credito o debito emerso e se è stato applicato un rimborso o un conguaglio in busta paga. Per ciascun dato una **guida passo passo** spiega in quale parte del 730 trovarlo (e in quale punto della CU), con un esempio. Questi dati servono al motore per calcolare gli acconti 2027 con il metodo storico.

**Why this priority**: senza questo storico minimo gli acconti del 2027 e le strategie di versamento della specifica 001 partono da una base sbagliata; l'utente non ha mai usato il Modello Redditi e ha bisogno di sapere dove cercare.

**Independent Test**: con i dati di un 730 di prova inseriti seguendo la guida, il motore calcola gli acconti 2027 coerenti con il calcolo manuale e segnala i dati mancanti.

**Acceptance Scenarios**:

1. **Given** un nuovo utente senza storico, **When** apre la sezione "anno di partenza", **Then** vede l'elenco dei dati richiesti dal 730 con la guida su dove trovarli.
2. **Given** i dati inseriti, **When** il motore calcola gli acconti 2027, **Then** usa l'imposta dell'anno di partenza e mostra da dove deriva l'importo.
3. **Given** un dato non trovato, **When** l'utente lo salta, **Then** il sistema avvisa che gli acconti sono provvisori e indica quale dato manca.
4. **Given** il 730 allegato come documento (specifica 010), **When** l'utente apre la guida, **Then** può consultarlo mentre compila.

---

### Edge Cases

- 730 dell'anno di partenza presentato con modifiche o integrativo: quale versione usare.
- 730 congiunto o presentato da altro soggetto.
- CU e 730 con importi diversi (conguagli, rimborsi applicati dal datore di lavoro).
- Utente che non ha più il 730 e deve recuperarlo dal cassetto fiscale.
- CU in ritardo o non ancora disponibile alla scadenza prevista.
- Più CU nello stesso anno, oppure una CU rettificata dopo l'inserimento.
- Anno senza reddito da lavoro dipendente o senza compensi professionali.
- Il primo anno di partita IVA (2027): nessun dato dell'anno precedente per l'attività professionale.
- Scadenza che cade in un giorno festivo e slitta al primo giorno lavorativo utile.
- Scadenze con proroghe annunciate dall'Agenzia delle Entrate dopo la creazione del calendario.
- Possibilità di versare con maggiorazione dopo la scadenza (ravvedimento) e relativa segnalazione.
- Spese detraibili in più anni o rateizzate (per esempio ristrutturazioni).
- Documenti allegati voluminosi o in formati diversi.
- Dati personali di familiari a carico (dati sensibili) da minimizzare e oscurare con la modalità "occhio".
- Modifica di dati in un anno già chiuso.
- Credito di importo molto piccolo o rimborso rifiutato o ritardato dall'Agenzia delle Entrate.
- Conto indicato per il rimborso errato o non più valido.
- Credito riportato in compensazione ma non utilizzato per anni.
- Comunicazione dell'Agenzia delle Entrate che riduce o annulla il credito.
- Spese detraibili che superano l'imposta dovuta (la detrazione non genera rimborso oltre l'imposta, incapienza).
- Primo Modello Redditi (anno 2027): l'utente è abituato al 730 e non ha storico dei tempi di rimborso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST creare per ogni anno d'imposta una checklist degli elementi necessari alla dichiarazione, con stato (disponibile, da fornire, completato, non applicabile) e percentuale di completamento.
- **FR-002**: Il sistema MUST segnare automaticamente come disponibili gli elementi derivabili dai dati già presenti (compensi incassati, fatture, spese registrate, contributi ENPAP versati).
- **FR-003**: Il sistema MUST offrire una procedura guidata per inserire una o più Certificazioni Uniche per anno, con tutti i dati richiesti dalla specifica 001, e controllarne la coerenza. Per ogni dato la procedura MUST indicare la casella della CU da cui prenderlo, con esempio; il PDF della CU MUST poter essere allegato all'archivio (specifica 010) come prova. La lettura automatica del PDF è fuori dalla prima versione.
- **FR-004**: Il sistema MUST rendere i dati della CU e degli altri dati dichiarativi disponibili al motore di calcolo della specifica 001, distinguendo dati definitivi e stime provvisorie.
- **FR-005**: Il sistema MUST permettere di inserire oneri deducibili, spese e oneri detraibili, familiari a carico, dati essenziali di abitazione e immobili, acconti e ritenute versati, crediti e debiti dell'anno precedente, comune e regione di residenza.
- **FR-006**: Il sistema MUST proporre precompilati, da confermare, i dati stabili degli anni precedenti.
- **FR-007**: Il sistema MUST permettere di allegare documenti agli elementi della checklist e di segnare un elemento come non applicabile.
- **FR-008**: Il sistema MUST mantenere un calendario delle scadenze dell'anno: rilascio CU, invio dichiarazione, versamenti di saldo e acconti, adempimenti ENPAP, trasmissione al Sistema Tessera Sanitaria, dichiarazione IVA e altre scadenze previste dalle regole dell'anno.
- **FR-009**: Date, descrizioni e fonte di ogni scadenza MUST essere contenute nel set di regole per anno (principio I della costituzione), con stato di verifica; nessuna data MUST essere scritta nella logica dell'app.
- **FR-010**: Ogni scadenza MUST avere stato (da fare, fatta, scaduta), giorni mancanti e un promemoria nell'app con anticipo configurabile.
- **FR-011**: Il sistema MUST gestire lo slittamento di scadenze festive al primo giorno lavorativo utile e MUST permettere di registrare proroghe.
- **FR-012**: Il sistema MUST mostrare, per le scadenze di versamento, l'importo stimato dai calcoli della specifica 001 e le voci da cui deriva, segnalando quando è una stima.
- **FR-013**: Il sistema MUST creare automaticamente il calendario e la checklist di un nuovo anno quando sono disponibili le sue regole.
- **FR-014**: Il sistema MUST generare un riepilogo dell'anno, stampabile o in PDF, organizzato per le sezioni del Modello Redditi Persone Fisiche, con la data di generazione e l'indicazione delle sezioni incomplete. Nella prima versione il riepilogo è pensato per essere consegnato al commercialista e MUST poter essere incluso nel pacchetto della specifica 009; la guida alla compilazione dei singoli quadri e righi è fuori dalla prima versione.
- **FR-015**: Il sistema MUST permettere di chiudere e riaprire un anno, richiedendo conferma per modificare dati di un anno chiuso e registrando la modifica.
- **FR-016**: Il sistema MUST usare i dati degli anni chiusi come storico per il calcolo degli acconti dell'anno successivo.
- **FR-017**: Il sistema MUST ridurre al minimo i dati personali di terzi (familiari a carico) e oscurarli con la modalità che nasconde gli importi e i dati sensibili.
- **FR-018**: Il sistema MUST mostrare che il riepilogo e le stime sono strumenti di supporto e non sostituiscono la dichiarazione ufficiale.
- **FR-019**: Il sistema MUST segnalare le regole delle scadenze non ancora verificate su fonte ufficiale.
- **FR-020**: Il sistema MUST mostrare per ogni anno l'esito della dichiarazione scomposto in: imposte dovute (dalla specifica 001), ritenute subite, acconti versati, crediti dell'anno precedente, detrazioni e saldo finale a debito o a credito.
- **FR-021**: Il sistema MUST indicare per ogni voce di credito e di detrazione di quanto riduce il saldo da versare e MUST spiegare che con il Modello Redditi il vantaggio è anzitutto una riduzione del versamento e non un rimborso in busta paga.
- **FR-022**: Quando resta un credito dopo gli assorbimenti, il sistema MUST permettere di registrare la scelta tra riporto in compensazione e richiesta di rimborso, mostrando per ciascuna le conseguenze e i tempi stimati.
- **FR-023**: Il sistema MUST tracciare lo stato di ogni credito (disponibile, richiesto a rimborso, in attesa, incassato, utilizzato in compensazione, residuo) con date e importi, e MUST usare il conto indicato nella configurazione (specifica 003) per i rimborsi.
- **FR-024**: Il sistema MUST escludere dalla liquidità disponibile e dagli accantonamenti i crediti non ancora incassati né compensati.
- **FR-025**: Soglie, vincoli e tempi tipici della compensazione e del rimborso MUST stare nel set di regole per anno con fonte e stato di verifica (principio I), e MUST essere segnalati quando non verificati.
- **FR-026**: Il sistema MUST mostrare che i tempi di rimborso dell'Agenzia delle Entrate non sono garantiti e non dipendono dall'app.
- **FR-027**: Il sistema MUST permettere di inserire un anno di partenza con i soli dati dell'ultimo 730 necessari al calcolo degli acconti (imposta netta, acconti versati, credito o debito, rimborsi o conguagli applicati in busta paga) e di segnarlo come dato di partenza, distinto dagli anni completi.
- **FR-028**: Per ogni dato dell'anno di partenza il sistema MUST fornire una guida che indichi in quale parte del 730 (e della CU) trovarlo, con esempio; i riferimenti a quadri e righi MUST stare nelle regole dell'anno con stato di verifica e MUST NOT essere scritti nel codice.
- **FR-029**: Il sistema MUST usare l'anno di partenza come storico per gli acconti del primo anno (specifica 001) e MUST avvisare che il risultato è provvisorio se mancano dei dati.
- **FR-030**: Il sistema MUST permettere di esportare le scadenze scelte in un file di calendario da importare nel calendario del telefono o del PC (descrizione, data e promemoria), senza dati sensibili nel testo degli eventi (nessun nome di paziente né importi). Le notifiche inviate da job schedulati sono previste per la release successiva (non in questa versione).
- **FR-031**: Il calendario dell'app MUST contenere tutte le scadenze delle regole dell'anno; il sistema MUST suggerire quali esportare in base ai dati e alle attività dell'utente (per esempio scadenze IVA solo se esistono operazioni imponibili) e MUST lasciare all'utente la modifica della selezione.
- **FR-032**: L'utente MUST poter segnare ogni scadenza come "fatta" con un flag, con data di completamento e nota facoltativa, e togliere il flag; le scadenze fatte MUST uscire dai promemoria e restare consultabili.
- **FR-033**: Il sistema MUST permettere all'utente di creare, modificare e cancellare scadenze personalizzate nel calendario (per esempio la data di consegna dei documenti al commercialista), con descrizione, data, nota e promemoria, distinte dalle scadenze delle regole dell'anno e senza dati sensibili nell'eventuale esportazione nel calendario del telefono.

### Key Entities *(include if feature involves data)*

- **Anno d'imposta**: contenitore dei dati dichiarativi, con stato (aperto, chiuso) e regole associate.
- **Elemento della checklist**: dato o documento richiesto, con tipo, stato, fonte (inserito o derivato) e allegati.
- **Certificazione Unica**: dati del reddito da lavoro dipendente dell'anno per datore di lavoro, definitivi o provvisori.
- **Onere o spesa dichiarativa**: onere deducibile o spesa detraibile con importo, categoria e anno.
- **Dati stabili del contribuente**: residenza, familiari a carico, dati essenziali di abitazione e immobili.
- **Scadenza**: data, descrizione, fonte normativa, stato, importo stimato, promemoria.
- **Riepilogo dichiarativo**: documento generato in una data con le sezioni e i totali dell'anno.
- **Esito della dichiarazione**: saldo finale dell'anno con le voci che lo compongono.
- **Credito d'imposta**: importo residuo dopo gli assorbimenti, con scelta (compensazione o rimborso), stato e movimenti.
- **Anno di partenza**: dati minimi dell'ultimo 730 (imposta netta, acconti, credito o debito, conguagli) usati come storico, con stato di completezza.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La checklist di un anno elenca tutti gli elementi necessari alla dichiarazione di un lavoratore dipendente con P.IVA in regime ordinario, verificata con il commercialista o con le istruzioni ufficiali (0 elementi mancanti nei casi di prova).
- **SC-002**: L'inserimento di una CU richiede meno di 5 minuti.
- **SC-003**: Il 100% delle scadenze dell'anno compare nel calendario con data e fonte, e nessuna è calcolata fuori dal set di regole dell'anno.
- **SC-004**: Un promemoria compare nel giorno impostato nel 100% dei casi di prova.
- **SC-005**: Un nuovo anno è pronto (checklist e calendario) senza reinserire scadenze o dati stabili.
- **SC-006**: I totali del riepilogo coincidono con quelli del motore di calcolo della specifica 001 al centesimo.
- **SC-007**: L'utente individua in meno di 30 secondi cosa gli manca per completare la dichiarazione dell'anno.
- **SC-008**: In tutti i casi di prova l'esito della dichiarazione coincide al centesimo con il saldo calcolato a mano e la somma delle voci è uguale al saldo.
- **SC-009**: Un credito non ancora incassato non compare mai nella liquidità disponibile (0 casi nelle prove).
- **SC-010**: Un utente senza esperienza trova ogni dato dell'anno di partenza nel proprio 730 seguendo la guida, e completa l'inserimento in meno di 10 minuti.

## Assumptions

- La dichiarazione da preparare è il Modello Redditi Persone Fisiche, perché con partita IVA in regime ordinario il 730 non è utilizzabile. Dichiarazione e invio sono fatti dall'utente o dal commercialista fuori dall'app: l'app non compila né trasmette il modello.
- Le **date delle scadenze** (invio dichiarazione, saldo e acconti, ENPAP, Sistema Tessera Sanitaria, dichiarazione IVA, rilascio CU) cambiano di anno in anno e vanno verificate su fonti ufficiali; sono tutte da verificare finché non confermate. In particolare restano aperte le scadenze ENPAP del primo anno e la scadenza di trasmissione al Sistema Tessera Sanitaria.
- Il calcolo degli importi dei versamenti è fornito dal motore della specifica 001; la compilazione del modello F24 e i codici tributo non sono in questa specifica e sono rinviati a una specifica dedicata allo Scadenzario F24.
- I **promemoria** della prima versione compaiono nell'app all'apertura e, a richiesta, come file di calendario importabile (senza dati sensibili negli eventi). Le **notifiche** (push o e-mail) inviate da **job schedulati lato server** sono previste per la **release successiva**; il piano della prima versione deve lasciare il posto a questo sviluppo (per esempio con le preferenze di notifica e le scadenze già in forma consultabile da un job).
- Gli **indici sintetici di affidabilità fiscale (ISA)** previsti per i professionisti in regime ordinario richiedono dati aggiuntivi sull'attività: sono da verificare con il commercialista e non fanno parte della prima versione. TODO nella raccolta dati.
- La CU del datore di lavoro è rilasciata ogni anno nei primi mesi dell'anno successivo; la data esatta è nelle regole dell'anno.
- Dati di familiari a carico e documenti allegati sono dati personali: valgono le regole di riservatezza della specifica 002 e il rischio residuo dei dati in chiaro accettato dall'utente.
- Il primo anno di partita IVA è il 2027: la dichiarazione relativa si presenta nel 2028. Per l'anno 2026 l'utente è ancora solo dipendente e usa il 730 con rimborsi in busta paga, fuori dall'app; dal Modello Redditi 2028 i crediti non passano più dal datore di lavoro.
- **Rimborsi**: con il Modello Redditi i crediti sono prima assorbiti dalle imposte dovute; l'eventuale eccedenza va riportata in compensazione (per esempio sul versamento successivo) o chiesta a rimborso dall'Agenzia delle Entrate. Soglie e formalità (per esempio visto di conformità sopra certi importi), tempi tipici e limiti sono da verificare su fonte ufficiale e col commercialista. L'app non compila F24 né richieste di rimborso.
- Le singole spese e gli oneri detraibili e deducibili sono registrati nella specifica 008, che alimenta la checklist e l'esito di questa specifica.
- **Familiari a carico**: per ogni familiare l'app registra solo il minimo (anno di nascita, percentuale di carico, per esempio 50% tra i genitori, e se supera il limite di reddito per essere a carico). Le regole su età, limiti di reddito e assegno unico stanno nel set di regole dell'anno, con fonti da verificare: per i figli sotto i 21 anni la detrazione IRPEF di norma non spetta perché c'è l'assegno unico, mentre il carico resta rilevante per le spese detraibili. Se il datore di lavoro ha applicato detrazioni per familiari, risultano dalla CU e la checklist chiede di inserirle e di confrontarle con quelle spettanti.
- I documenti allegati alla checklist (CU, ricevute, comunicazioni) si archiviano nell'archivio della specifica 010; il riepilogo per il commercialista è nella specifica 009.
- **Fuori ambito**: compilazione e trasmissione del Modello Redditi, compilazione degli F24 e codici tributo, invio di notifiche esterne, IVA periodica, fatturazione (specifica 003), calcoli IRPEF (specifica 001), autenticazione (specifica 002), grafica.
