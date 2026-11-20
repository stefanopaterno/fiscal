# Feature Specification: Aiuto contestuale "a prova di scimmia"

**Feature Branch**: `011-aiuto-contestuale` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Per ogni cosa voglio degli help che danno una spiegazione a prova di scimmia."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un aiuto accanto a ogni campo e a ogni numero (Priority: P1)

Accanto a ogni campo da compilare, a ogni importo calcolato e a ogni termine tecnico c'è un'icona di aiuto. Toccandola compare una spiegazione **semplicissima**, in frasi brevi e senza gergo: cosa significa, perché l'app lo chiede, dove trovarlo (per esempio "sulla CU, casella 1") e un **esempio con numeri**. Sui numeri calcolati c'è anche "da dove viene questo numero?", con i passaggi del calcolo.

**Why this priority**: è la richiesta principale: l'utente non deve mai restare senza capire cosa sta facendo.

**Independent Test**: ogni campo e ogni importo di una schermata di prova ha un aiuto con spiegazione, esempio e, per gli importi, il percorso di calcolo.

**Acceptance Scenarios**:

1. **Given** un campo da compilare, **When** l'utente tocca l'icona di aiuto, **Then** vede spiegazione, motivo della richiesta, dove trovare il dato ed esempio.
2. **Given** un importo calcolato, **When** l'utente tocca "da dove viene?", **Then** vede i passaggi del calcolo con i numeri reali e la regola usata.
3. **Given** un termine tecnico (per esempio "scaglione", "cassa", "pro-rata"), **When** l'utente lo tocca, **Then** compare la sua definizione semplice con un esempio.

---

### User Story 2 - Aiuto per schermata e guida passo passo (Priority: P1)

Ogni schermata ha un aiuto generale: a cosa serve, quando usarla, cosa succede dopo, errori comuni. Per le operazioni più importanti (configurare la partita IVA, emettere una fattura, inserire la CU, registrare una spesa, capire il saldo) c'è una **guida passo passo** che accompagna l'utente nella prima volta.

**Why this priority**: le operazioni fiscali sono delicate e le prime volte vanno guidate.

**Independent Test**: per ogni schermata di prova l'aiuto generale si apre; la guida di una procedura porta l'utente fino alla fine con un controllo di ogni passo.

**Acceptance Scenarios**:

1. **Given** una schermata, **When** l'utente apre l'aiuto generale, **Then** legge a cosa serve e cosa fare.
2. **Given** una procedura guidata, **When** l'utente la segue, **Then** ogni passo spiega cosa fare e cosa controllare.
3. **Given** una guida già vista, **When** l'utente la riapre, **Then** può riprenderla da dove l'aveva lasciata.

---

### User Story 3 - Spiegare errori e avvisi (Priority: P1)

Ogni errore, avviso o segnalazione dell'app dice **cosa è successo, perché e cosa fare adesso**, con un pulsante per correggere quando possibile. Non compaiono codici o messaggi tecnici.

**Why this priority**: gli errori sono il momento in cui l'utente ha più bisogno di aiuto.

**Independent Test**: per ogni messaggio di prova compaiono causa e azione consigliata.

**Acceptance Scenarios**:

1. **Given** un errore di compilazione, **When** compare il messaggio, **Then** spiega cosa non va e come correggere.
2. **Given** un avviso fiscale (per esempio quota imponibile in crescita), **When** compare, **Then** spiega cosa significa e cosa fare.

---

### User Story 4 - Glossario e ricerca dell'aiuto (Priority: P2)

L'utente apre un **glossario** dei termini fiscali e previdenziali (IRPEF, scaglione, ritenuta, acconto, saldo, deducibile, detraibile, pro-rata, ENPAP, bollo, cassa, eccetera) e può cercare qualsiasi argomento. Ogni voce ha definizione semplice, esempio e rimando alle schermate dove compare.

**Why this priority**: raccoglie in un posto le spiegazioni e aiuta a imparare.

**Independent Test**: cercando un termine il glossario lo mostra con definizione ed esempio e collega alle schermate.

**Acceptance Scenarios**:

1. **Given** un termine, **When** l'utente lo cerca, **Then** trova definizione, esempio e rimandi.
2. **Given** un aiuto su un campo, **When** contiene un termine del glossario, **Then** il termine è toccabile.

---

### User Story 5 - Livelli di dettaglio e tono (Priority: P3)

L'aiuto ha due livelli: **breve** (due righe) e **dettagliato** (con calcolo, fonte normativa e stato di verifica), selezionabili con un tocco. L'utente può disattivare i suggerimenti automatici che appaiono la prima volta.

**Why this priority**: chi ha già capito non vuole essere rallentato; chi vuole il dettaglio lo trova.

**Independent Test**: il livello breve mostra al massimo due righe; il dettagliato mostra anche fonte e stato di verifica.

**Acceptance Scenarios**:

1. **Given** un aiuto breve, **When** l'utente tocca "dettagli", **Then** vede calcolo, fonte e stato di verifica.
2. **Given** i suggerimenti automatici attivi, **When** l'utente li disattiva, **Then** l'aiuto resta disponibile a richiesta.

---

### Edge Cases

- Aiuto che cita una regola cambiata o non verificata: mostra lo stesso avviso delle regole.
- Valori che cambiano con l'anno (aliquote, soglie): il testo usa i valori delle regole dell'anno, non numeri scritti a mano.
- Schermata piccola (360 px): l'aiuto non deve coprire il campo né richiedere scorrimento orizzontale.
- Uso con modalità "occhio": gli esempi con numeri reali dell'utente devono essere oscurati; gli esempi generici restano visibili.
- Termini che hanno significati diversi in contesti diversi.
- Aiuto mancante per un nuovo campo o una nuova schermata.
- Uso senza connessione: l'aiuto deve funzionare anche offline.
- Contenuti di aiuto che sembrano consulenza: devono avere l'avvertenza di supporto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ogni campo, importo calcolato e termine tecnico MUST avere un aiuto contestuale con spiegazione semplice, motivo della richiesta, dove trovare il dato ed esempio.
- **FR-002**: Ogni importo calcolato MUST avere "da dove viene questo numero?" con i passaggi del calcolo, la regola usata e lo stato di verifica.
- **FR-003**: Ogni schermata MUST avere un aiuto generale (a cosa serve, quando usarla, errori comuni).
- **FR-004**: Le operazioni principali (configurazione P.IVA, fattura, CU, spesa, esito della dichiarazione, pacchetto per il commercialista, archivio) MUST avere una guida passo passo riprendibile.
- **FR-005**: Ogni errore o avviso MUST spiegare cosa è successo, perché e cosa fare, senza codici tecnici.
- **FR-006**: Il sistema MUST fornire un glossario ricercabile con definizioni semplici, esempi e rimandi, con termini toccabili negli aiuti.
- **FR-007**: L'aiuto MUST avere un livello breve e uno dettagliato con fonte normativa e stato di verifica.
- **FR-008**: I testi di aiuto MUST essere in italiano semplice, senza gergo non spiegato e con frasi brevi; ogni termine tecnico MUST essere definito alla prima comparsa.
- **FR-009**: I valori numerici citati negli aiuti (aliquote, soglie, limiti) MUST provenire dal set di regole dell'anno e non essere scritti nel testo (principio I).
- **FR-010**: Il sistema MUST permettere di disattivare i suggerimenti automatici lasciando l'aiuto disponibile a richiesta.
- **FR-011**: L'aiuto MUST funzionare da telefono e da PC senza coprire il campo e senza scroll orizzontale dai 360 px.
- **FR-012**: Gli esempi con dati reali dell'utente MUST essere oscurati dalla modalità "occhio".
- **FR-013**: Il sistema MUST segnalare ai fini di sviluppo i campi, gli importi e le schermate privi di aiuto, e MUST impedire che una nuova funzione sia considerata completa senza i suoi aiuti.
- **FR-014**: Gli aiuti fiscali MUST riportare che sono spiegazioni di supporto e non consulenza.

### Key Entities *(include if feature involves data)*

- **Voce di aiuto**: elemento a cui si riferisce (campo, importo, schermata, errore), testo breve, testo dettagliato, esempio, fonte, rimandi.
- **Voce di glossario**: termine, definizione, esempio, schermate collegate.
- **Guida passo passo**: operazione, passi, controlli, stato di avanzamento.
- **Preferenze di aiuto**: suggerimenti automatici attivi o no, livello predefinito.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Il 100% dei campi, importi calcolati e schermate delle funzioni consegnate ha un aiuto (0 elementi senza aiuto nelle verifiche).
- **SC-002**: Una persona senza competenze fiscali, con il solo aiuto dell'app, completa senza assistenza la configurazione della P.IVA e la prima fattura in una prova con persona esterna.
- **SC-003**: Ogni importo calcolato mostra il percorso del calcolo e coincide con il risultato del motore (0 scostamenti).
- **SC-004**: Ogni errore o avviso nelle prove indica causa e azione consigliata (0 messaggi senza azione).
- **SC-005**: Nessun valore normativo scritto a mano nei testi di aiuto (0 ritrovamenti nelle verifiche).
- **SC-006**: Un aiuto si apre con un tocco e non copre il campo a 360 px.

## Assumptions

- I testi di aiuto vanno scritti insieme a ciascuna funzione (nessuna funzione è completa senza aiuto) e rivisti per l'esattezza fiscale; non sono generati a runtime.
- "A prova di scimmia" significa linguaggio semplicissimo, esempi con numeri e passi brevi, non semplificazioni che alterino la regola.
- Il percorso di calcolo è fornito dal motore fiscale (principio II): l'aiuto non lo ricalcola.
- Gli esempi generici usano numeri di fantasia; quelli con dati dell'utente sono facoltativi e oscurabili.
- Una lingua soltanto (italiano).
- **Fuori ambito**: assistente conversazionale o chat, video tutorial, supporto umano, traduzioni, consulenza fiscale personalizzata.
