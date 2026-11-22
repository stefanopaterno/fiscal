# Feature Specification: Aggiornamenti normativi settimanali

**Feature Branch**: `012-aggiornamenti-normativi`

**Created**: 2026-11-22

**Status**: Draft

**Input**: User description: "Ogni settimana una news che dice se ci sono novità di legge o di prassi che toccano le regole usate da Fiscal (IRPEF, acconti, ENPAP, IVA e bollo, ritenute, spese e oneri, scadenze, CU, Modello Redditi, Sistema Tessera Sanitaria, SDI, addizionali): cosa cambia, da quando, fonte ufficiale, quali regole tocca, impatto sui conti e proposta di aggiornamento da approvare; segnalare quando una regola 'da verificare' può diventare 'verificata'. Nessuna modifica automatica senza approvazione; nessun dato personale inviato fuori per cercare le novità."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ricevere la news settimanale delle novità (Priority: P1)

Una volta alla settimana l'utente riceve una news breve che risponde a una domanda: "è cambiato qualcosa che riguarda i miei conti in Fiscal?". Per ogni novità trovata vede: che cosa cambia in parole semplici, da quando vale, la fonte ufficiale (con il link), quali regole dell'app tocca e se sono oggi "verificate" o "da verificare". Se non c'è nulla di rilevante, la news lo dice in una riga, così l'utente sa che il controllo è stato fatto.

**Why this priority**: le regole fiscali cambiano più volte l'anno (Legge di Bilancio, decreti, circolari, delibere ENPAP); se l'app resta indietro i calcoli diventano sbagliati senza che l'utente se ne accorga.

**Independent Test**: preparando un elenco di fonti con una novità nota (per esempio la pubblicazione della Legge di Bilancio 2027), la news della settimana riporta la novità con fonte, decorrenza e regole toccate; con fonti senza novità, la news dice "nessuna novità rilevante".

**Acceptance Scenarios**:

1. **Given** una nuova norma pubblicata nella settimana che cambia uno scaglione IRPEF, **When** arriva la news, **Then** contiene la novità con fonte ufficiale, decorrenza, regole dell'app toccate e il loro stato attuale.
2. **Given** una settimana senza novità rilevanti, **When** arriva la news, **Then** dice in una riga che non ci sono novità e quali fonti sono state controllate.
3. **Given** una notizia vista solo su fonti divulgative, **When** compare nella news, **Then** è segnata come "da confermare sulla fonte ufficiale" e non come certa.

---

### User Story 2 - Capire l'impatto sui miei conti (Priority: P1)

Per ogni novità che tocca un calcolo, la news indica l'impatto stimato sui conti dell'utente: per esempio "con il 33% esteso fino a 55.000 € paghi fino a 500 € in meno sul 2027", oppure "il soggettivo ENPAP passa al 12%: circa 120 € in più ogni 1.000 € di reddito". La stima si calcola dentro l'app con i dati dell'utente, non fuori.

**Why this priority**: una norma conta per quello che cambia nel portafoglio; senza impatto l'utente non sa se deve fare qualcosa.

**Independent Test**: con dati di prova e una novità che cambia uno scaglione, l'impatto mostrato coincide con la differenza calcolata dal motore tra regole vecchie e nuove.

**Acceptance Scenarios**:

1. **Given** una novità che cambia un'aliquota o una soglia, **When** l'utente apre il dettaglio nell'app, **Then** vede l'impatto in euro sull'anno interessato, calcolato con i suoi dati.
2. **Given** una novità senza effetto sui suoi conti (per esempio una regola per i forfettari), **When** compare, **Then** è segnata come "non ti riguarda" con il motivo.

---

### User Story 3 - Approvare l'aggiornamento delle regole (Priority: P1)

Per ogni novità che richiede di cambiare le regole dell'app, la news porta una **proposta di aggiornamento**: quali valori cambiano (prima → dopo), la nuova fonte e il nuovo stato di verifica, e i casi di prova da aggiornare. L'utente la approva o la rifiuta; finché non la approva, le regole dell'app non cambiano. Dopo l'approvazione, l'aggiornamento passa dagli stessi controlli automatici delle altre modifiche e viene pubblicato.

**Why this priority**: le regole sono il cuore dei calcoli; una modifica sbagliata farebbe danni silenziosi, quindi serve sempre il "sì" dell'utente.

**Independent Test**: una proposta di cambio di scaglione rifiutata lascia le regole invariate; approvata, le regole cambiano, i casi di prova aggiornati passano e i risultati degli anni precedenti restano uguali.

**Acceptance Scenarios**:

1. **Given** una proposta di aggiornamento, **When** l'utente la rifiuta o non risponde, **Then** le regole dell'app restano quelle di prima.
2. **Given** una proposta approvata, **When** l'aggiornamento viene applicato, **Then** cambiano solo i valori indicati, con fonte e stato aggiornati, e i controlli automatici passano prima della pubblicazione.
3. **Given** una proposta che toccherebbe anni già chiusi, **When** viene preparata, **Then** è segnalata, perché le regole di un anno passato cambiano solo se la norma è retroattiva.

---

### User Story 4 - Chiudere le regole "da verificare" (Priority: P2)

La news controlla in modo mirato le regole oggi "da verificare" e segnala quando la fonte ufficiale che le conferma è disponibile. Esempi: la Legge di Bilancio 2027 pubblicata in Gazzetta (scaglione al 33% fino a 55.000 €), i minimi e la maternità ENPAP 2027, l'aliquota del soggettivo sui redditi 2027, i coefficienti dell'art. 16-ter. In quel caso propone di passare la regola a "verificata" con la nuova fonte.

**Why this priority**: il risultato "provvisorio" dell'app dipende da queste regole; chiuderle rende i calcoli definitivi.

**Independent Test**: con una regola "da verificare" e una fonte ufficiale che la conferma, la news propone il passaggio a "verificata"; se la fonte la smentisce, propone il nuovo valore.

**Acceptance Scenarios**:

1. **Given** una regola "da verificare" con fonte ufficiale ora disponibile e concorde, **When** arriva la news, **Then** propone di segnarla "verificata" con il riferimento alla fonte.
2. **Given** una fonte ufficiale con un valore diverso da quello dell'app, **When** arriva la news, **Then** propone il nuovo valore con l'impatto sui conti.

---

### User Story 5 - Scadenze e cambi in arrivo (Priority: P3)

La news ricorda anche le novità **annunciate ma non ancora in vigore** (disegni di legge, bozze di delibere) e le scadenze nuove o spostate (per esempio una proroga di un versamento), distinguendo chiaramente "in vigore", "approvato ma non ancora pubblicato" e "proposto".

**Why this priority**: aiuta a prepararsi, ma non cambia i calcoli finché la norma non c'è.

**Independent Test**: un disegno di legge in discussione compare come "proposto", senza proposta di modifica delle regole.

**Acceptance Scenarios**:

1. **Given** una norma solo proposta, **When** compare nella news, **Then** è etichettata come "proposta" e non genera modifiche alle regole.
2. **Given** una proroga ufficiale di una scadenza, **When** compare, **Then** indica la data vecchia e quella nuova.

---

### Edge Cases

- Fonti ufficiali non raggiungibili nella settimana: la news lo dice e indica quali fonti non è stato possibile controllare.
- Novità che contraddice una fonte precedente (per esempio la bozza ENPAP con aliquota volontaria al 30% e il testo finale diverso).
- Norma retroattiva che cambia un anno già chiuso: proposta separata e ben segnalata.
- Più novità sulla stessa regola nella stessa settimana: una sola proposta con il valore finale.
- Notizie solo su siti divulgativi, senza riscontro ufficiale: mai proposte come certe.
- Settimana con molte novità (per esempio la Legge di Bilancio): news ordinata per impatto sui conti dell'utente.
- Proposta non approvata per settimane: la news la ripropone come "in attesa", senza duplicarla.
- Novità che riguarda una specifica non ancora realizzata (per esempio l'archivio documenti): segnalata come "da tenere presente", senza proposta di modifica.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST produrre una news ogni settimana, anche quando non ci sono novità (in quel caso con l'elenco delle fonti controllate).
- **FR-002**: Il sistema MUST controllare almeno queste fonti: Gazzetta Ufficiale, Agenzia delle Entrate (provvedimenti, circolari, risoluzioni, istruzioni di CU e Modello Redditi), Ministero dell'Economia, ENPAP (delibere e comunicazioni), INPS, Sistema Tessera Sanitaria, documentazione del Sistema di Interscambio, regione e comune dell'utente per le addizionali.
- **FR-003**: Per ogni novità il sistema MUST indicare: descrizione in parole semplici, decorrenza, stato ("in vigore", "approvata non pubblicata", "proposta"), fonte con collegamento, regole dell'app toccate con il loro stato attuale.
- **FR-004**: Il sistema MUST distinguere le fonti ufficiali da quelle divulgative e MUST NOT presentare come certa una novità senza riscontro ufficiale.
- **FR-005**: Il sistema MUST calcolare l'impatto stimato di ogni novità sui conti dell'utente con il motore dell'app e i suoi dati, senza inviare dati personali all'esterno.
- **FR-006**: Il sistema MUST preparare per ogni novità che cambia un calcolo una proposta di aggiornamento delle regole con valori prima e dopo, fonte, stato di verifica e casi di prova da aggiornare.
- **FR-007**: Il sistema MUST NOT modificare le regole dell'app senza l'approvazione esplicita dell'utente; una proposta non approvata MUST lasciare tutto invariato.
- **FR-008**: Un aggiornamento approvato MUST superare gli stessi controlli automatici di ogni altra modifica prima di essere pubblicato e MUST NOT cambiare i risultati degli anni non interessati.
- **FR-009**: Il sistema MUST controllare a ogni news le regole "da verificare" e proporne il passaggio a "verificata" (o un nuovo valore) quando la fonte ufficiale è disponibile.
- **FR-010**: Il sistema MUST segnalare le novità solo proposte e le scadenze nuove o spostate, senza generare modifiche alle regole per le norme non in vigore.
- **FR-011**: La ricerca delle novità MUST usare solo informazioni pubbliche (le regole dell'app e le fonti); dati personali e importi dell'utente MUST restare nell'app. Regione e comune di residenza per le addizionali MUST essere usati solo dentro l'app [NEEDS CLARIFICATION: le aliquote delle addizionali del tuo comune e della tua regione vanno controllate fuori dall'app (servirebbe indicare comune e regione a un servizio esterno) o solo come promemoria annuale da verificare a mano?].
- **FR-012**: La news MUST essere consegnata attraverso [NEEDS CLARIFICATION: quale canale preferisci per la news: dentro l'app (sezione Novità con badge), email, oppure una segnalazione nel repository del codice, che è anche dove si approva la modifica?].
- **FR-013**: Il sistema MUST tenere uno storico delle news e delle proposte (approvate, rifiutate, in attesa) con data e motivo.
- **FR-014**: Il sistema MUST ordinare le novità per impatto sui conti dell'utente e mettere in cima quelle con scadenza vicina.
- **FR-015**: Le news MUST usare un linguaggio comprensibile senza competenze fiscali, come il resto dell'app, e MUST ricordare che le proposte vanno confermate col commercialista quando l'impatto è rilevante.

### Key Entities

- **Fonte**: nome, tipo (ufficiale o divulgativa), collegamento, data dell'ultimo controllo, esito (raggiunta o no).
- **Novità**: descrizione, decorrenza, stato (in vigore, approvata, proposta), fonti, regole toccate, impatto stimato, rilevanza per l'utente.
- **Proposta di aggiornamento**: regole e valori prima e dopo, nuova fonte e stato, casi di prova, stato (in attesa, approvata, rifiutata), data e motivo della decisione.
- **News settimanale**: data, fonti controllate, novità, proposte, regole "da verificare" ancora aperte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: L'utente riceve una news ogni settimana, senza settimane saltate in un trimestre (13 su 13).
- **SC-002**: Ogni novità riportata ha fonte, decorrenza e regole toccate (0 novità senza questi dati).
- **SC-003**: Nessuna regola dell'app cambia senza un'approvazione registrata (0 casi).
- **SC-004**: Una novità ufficiale pubblicata entra nella news al massimo entro 7 giorni dalla pubblicazione.
- **SC-005**: L'utente capisce dalla news se deve fare qualcosa in meno di 2 minuti di lettura.
- **SC-006**: Nessun dato personale o importo dell'utente esce dall'app per cercare le novità (0 casi nelle verifiche).
- **SC-007**: Ogni regola "da verificare" è controllata almeno una volta al mese contro le fonti ufficiali.

## Assumptions

- La ricerca delle novità la fa un assistente automatico pianificato che legge le fonti pubbliche e le regole dell'app (che sono nel repository pubblico, con fonte e stato): non ha bisogno dei dati dell'utente. L'impatto sui conti si calcola poi dentro l'app.
- Frequenza predefinita: ogni lunedì mattina; in periodi caldi (Legge di Bilancio tra ottobre e gennaio, istruzioni di CU e Modello Redditi tra gennaio e marzo) il controllo resta settimanale ma più approfondito.
- La proposta di aggiornamento delle regole la prepara l'assistente come modifica del codice da rivedere; la pubblicazione avviene solo dopo l'approvazione dell'utente, come per ogni altro rilascio.
- Il sistema non sostituisce il commercialista: per novità con impatto rilevante suggerisce di confermare.
- Fuori ambito: consulenza personalizzata, novità che non toccano psicologi in regime ordinario con lavoro dipendente (per esempio solo forfettari o solo società), traduzione automatica delle norme in codice senza revisione.
