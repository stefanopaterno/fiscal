# Feature Specification: Spese deducibili e consigli di risparmio fiscale

**Feature Branch**: `008-spese-deducibili-consigli` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "La gestione delle spese che posso scaricare e quali consigli di fare che hanno più impatto, con la lista fino a esaurimento."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrare le spese professionali con la loro deducibilità (Priority: P1)

L'utente registra una spesa dell'attività: data di pagamento, importo, fornitore, categoria (per esempio formazione, supervisione, assicurazione, affitto dello studio, software, telefono, libri e test), modalità di pagamento e allegato (scontrino o fattura). Il sistema propone la **percentuale di deducibilità** della categoria (per esempio 100%, 50% o 75%), l'eventuale IVA indetraibile e l'importo che riduce davvero il reddito. Le spese sono contate **per cassa**, cioè nell'anno in cui sono pagate. I beni durevoli sopra una certa soglia si deducono con l'ammortamento.

**Why this priority**: senza spese registrate bene il reddito professionale è sovrastimato e si pagano più tasse del dovuto.

**Independent Test**: registrando una spesa di prova per ogni categoria, l'importo deducibile coincide con il calcolo atteso e il reddito della specifica 001 cambia di conseguenza.

**Acceptance Scenarios**:

1. **Given** una spesa di formazione pagata, **When** l'utente la registra, **Then** il sistema propone la deducibilità prevista e mostra l'importo che riduce il reddito.
2. **Given** una spesa ad uso promiscuo (per esempio il telefono), **When** l'utente la registra, **Then** il sistema applica la percentuale di deducibilità della categoria e la mostra.
3. **Given** un bene durevole sopra la soglia di deducibilità immediata, **When** l'utente lo registra, **Then** il sistema distribuisce la deduzione sugli anni con l'ammortamento.
4. **Given** una spesa senza documento, **When** l'utente apre l'elenco, **Then** il sistema la segnala come "senza giustificativo".

---

### User Story 2 - Oneri personali deducibili e detraibili con i loro limiti (Priority: P1)

L'utente registra le spese **personali** che danno un vantaggio fiscale: previdenza complementare, contributi previdenziali volontari ENPAP, erogazioni liberali, spese sanitarie e altre spese detraibili (interessi sul mutuo, istruzione, altre). Per ciascuna voce il sistema conosce il **limite annuo**, la percentuale di detrazione e le condizioni (per esempio pagamento tracciabile, franchigia) e mostra quanto è già stato usato e quanto **resta** ("fino a esaurimento").

**Why this priority**: sono le leve personali con cui si riducono le tasse, e prima gestite con il 730; ora vanno tenute dall'utente.

**Independent Test**: registrando versamenti di prova a una voce con limite, il residuo si aggiorna e, raggiunto il limite, la voce risulta esaurita.

**Acceptance Scenarios**:

1. **Given** una voce con limite annuo, **When** l'utente registra un versamento, **Then** il sistema aggiorna il residuo e il risparmio d'imposta ottenuto.
2. **Given** un versamento oltre il limite, **When** l'utente lo registra, **Then** il sistema segnala la parte che non dà vantaggio.
3. **Given** una spesa non tracciabile dove il pagamento tracciabile è richiesto, **When** l'utente la registra, **Then** il sistema avvisa che la detrazione potrebbe non spettare.

---

### User Story 3 - I consigli ordinati per impatto, fino a esaurimento (Priority: P1)

Il sistema mostra una **lista di azioni consigliate per ridurre le tasse dell'anno**, ordinata per risparmio d'imposta (per euro speso e totale). Ogni voce indica: cosa fare, quanto si può ancora usare (limite meno già usato), il risparmio d'imposta stimato per ogni euro e al massimo, il **costo netto** dopo il risparmio, la scadenza (di norma il 31 dicembre) e se è una spesa che si farebbe comunque o solo per risparmio fiscale. Quando una voce raggiunge il suo limite passa tra quelle **esaurite** e la lista scorre alla successiva, mostrando il risparmio totale ancora ottenibile.

**Why this priority**: è la parte che dà un vantaggio concreto e permette di decidere dove indirizzare i soldi.

**Independent Test**: con redditi e voci di prova, la lista è ordinata per risparmio, le voci esaurite spariscono dalla parte attiva e il risparmio totale coincide con la somma delle voci.

**Acceptance Scenarios**:

1. **Given** una previsione dell'anno, **When** l'utente apre i consigli, **Then** vede la lista ordinata per impatto con risparmio per euro, residuo, costo netto e scadenza.
2. **Given** una voce che raggiunge il limite, **When** l'utente la apre, **Then** risulta esaurita e il risparmio totale ancora ottenibile scende.
3. **Given** una voce che serve solo a ridurre le tasse, **When** l'utente la vede, **Then** il sistema ricorda che "deducibile non significa gratis" e mostra il costo netto reale.

---

### User Story 4 - Simulare l'effetto prima di spendere (Priority: P2)

Prima di fare una spesa o un versamento, l'utente inserisce l'importo e vede l'effetto con il motore della specifica 001: variazione di reddito, scaglione, imposte, contributi e costo netto. Può confrontare più opzioni.

**Why this priority**: trasforma i consigli in decisioni; richiede però le prime tre storie.

**Independent Test**: simulando una spesa di prova, imposte e reddito cambiano come con la stessa spesa registrata davvero, senza alterare i dati.

**Acceptance Scenarios**:

1. **Given** una spesa ipotetica, **When** l'utente la simula, **Then** vede reddito, imposte e costo netto prima e dopo.
2. **Given** due opzioni, **When** l'utente le confronta, **Then** vede il risparmio e il costo netto di ciascuna.
3. **Given** una simulazione, **When** l'utente la scarta, **Then** i dati reali non cambiano.

---

### User Story 5 - Promemoria di fine anno (Priority: P2)

Da ottobre il sistema ricorda cosa si può ancora fare **entro il 31 dicembre** con importo residuo e risparmio, mettendo in evidenza le voci a più alto impatto, e ricorda che le spese contano nell'anno in cui sono **pagate**.

**Why this priority**: la maggior parte dei vantaggi si perde per distrazione a fine anno.

**Independent Test**: simulando la data di novembre, la lista mostra le voci utilizzabili entro il 31 dicembre con importi residui.

**Acceptance Scenarios**:

1. **Given** una data tra ottobre e dicembre, **When** l'utente apre la schermata iniziale, **Then** compare il promemoria con le prime voci per impatto.
2. **Given** il 1° gennaio, **When** l'utente apre l'app, **Then** le voci dell'anno scorso non sono più proposte e le nuove sono azzerate.

---

### User Story 6 - Giustificativi e riepilogo per il commercialista (Priority: P3)

L'utente allega scontrini e fatture alle spese e produce un riepilogo per categoria e per anno, utile per la dichiarazione e per il commercialista.

**Why this priority**: ordine e prova; aiuta ma non cambia il calcolo.

**Independent Test**: dopo aver registrato spese con allegati, il riepilogo per categoria coincide con i totali dell'anno e ogni spesa porta il suo documento.

**Acceptance Scenarios**:

1. **Given** spese con allegati, **When** l'utente genera il riepilogo, **Then** ottiene totali per categoria e deducibile.
2. **Given** spese senza giustificativo, **When** l'utente apre il riepilogo, **Then** le vede elencate a parte.

---

### User Story 7 - Un box nella home che mi dice quali spese fare (Priority: P1)

Dopo l'accesso, la schermata iniziale mostra un **box "Come abbassare le tasse"** con le due o tre azioni a più alto impatto ancora disponibili in questo momento: per ciascuna, importo ancora utilizzabile, risparmio d'imposta stimato, costo netto e scadenza. Un tocco apre la lista completa e la simulazione. Se non ci sono azioni utili, il box lo dice e spiega perché.

**Why this priority**: è ciò che l'utente vede ogni volta che apre l'app e trasforma l'analisi in decisioni concrete.

**Independent Test**: con dati di prova la home mostra le prime azioni per risparmio; esaurendo una voce, il box passa alla successiva.

**Acceptance Scenarios**:

1. **Given** voci con residuo disponibile, **When** l'utente apre la home dopo l'accesso, **Then** il box mostra le prime azioni per impatto con risparmio, costo netto e scadenza.
2. **Given** una voce esaurita, **When** l'utente riapre la home, **Then** il box mostra la voce successiva.
3. **Given** nessuna azione utile, **When** l'utente apre la home, **Then** il box lo spiega in una frase.
4. **Given** la modalità "occhio" attiva, **When** la home è mostrata, **Then** gli importi del box sono oscurati.

---

### Edge Cases

- Spesa mista personale e professionale (uso promiscuo) con percentuale diversa dal predefinito.
- Spesa pagata prima dell'inizio dell'attività (prima del 1° gennaio 2027) e spesa pagata a rate (conta quando è pagata).
- Pagamento con carta di un'altra persona.
- Nota di credito o rimborso del fornitore.
- Spesa in valuta estera.
- Spesa pagata a dicembre con documento a gennaio e viceversa.
- Bene venduto o dismesso prima della fine dell'ammortamento.
- Limiti che dipendono dal reddito (per esempio detrazioni che si riducono al crescere del reddito).
- Detrazioni oltre l'imposta dovuta (incapienza, specifica 001): la parte non usabile non dà risparmio.
- Spesa che non può essere sia dedotta come professionale sia detratta come personale (nessuna doppia agevolazione).
- Spese sanitarie dello stesso psicologo (personali) distinte da quelle dell'attività.
- Spese detraibili in più anni (per esempio ristrutturazioni): rinviate a una versione successiva.
- Spesa pagata a dicembre per risparmiare imposte ma non necessaria: il sistema non deve incoraggiarla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST registrare le spese professionali con data di pagamento, importo, fornitore, categoria, modalità di pagamento e allegato, e MUST applicare il principio di cassa.
- **FR-002**: Il sistema MUST proporre per ogni categoria la percentuale di deducibilità e la detraibilità dell'IVA dal set di regole per anno, permettere di modificarle con motivazione e mostrare l'importo deducibile.
- **FR-003**: Il sistema MUST gestire i beni durevoli con soglia di deduzione immediata e piano di ammortamento, secondo le regole dell'anno.
- **FR-004**: Il sistema MUST registrare gli oneri personali deducibili e detraibili con categoria, importo, data, modalità di pagamento tracciabile e giustificativo.
- **FR-005**: Il sistema MUST conoscere per ogni voce il limite annuo, la percentuale, le franchigie e le condizioni (dal set di regole per anno con fonte e stato di verifica) e MUST mostrare il residuo disponibile e le voci esaurite.
- **FR-006**: Il sistema MUST calcolare il risparmio d'imposta di ogni voce con il motore della specifica 001 (deduzioni e detrazioni, incapienza compresa).
- **FR-007**: Il sistema MUST produrre una lista di azioni consigliate ordinata per risparmio d'imposta, con per ogni voce: residuo, risparmio per euro, risparmio massimo, costo netto, scadenza e natura (spesa che si farebbe comunque o spesa solo per risparmio).
- **FR-008**: La lista MUST escludere o segnare come esaurite le voci arrivate al limite e MUST mostrare il risparmio totale ancora ottenibile.
- **FR-009**: Il sistema MUST ricordare che una spesa deducibile non è gratuita, mostrando sempre il costo netto, e MUST NOT consigliare spese al solo scopo di ridurre le tasse senza questa avvertenza.
- **FR-010**: Il sistema MUST permettere di simulare una spesa o un versamento prima di farlo e di confrontare più opzioni, senza alterare i dati reali.
- **FR-011**: Il sistema MUST mostrare dal 1° ottobre i promemoria di fine anno con le voci a più alto impatto e la scadenza del 31 dicembre.
- **FR-012**: Il sistema MUST NOT consigliare di spostare o ritardare date di incasso o di fatturazione per ridurre le imposte; i consigli sul tempo riguardano solo il pagamento delle spese.
- **FR-013**: Il sistema MUST fornire alle specifiche 001 e 004 le spese professionali (reddito per cassa) e gli oneri personali (deduzioni e detrazioni) registrati.
- **FR-014**: Il sistema MUST segnalare le spese senza giustificativo, le spese pagate con metodi non tracciabili quando serve il tracciamento e quelle che superano i limiti.
- **FR-015**: Il sistema MUST permettere di allegare giustificativi con accesso riservato al solo proprietario (specifica 002) e di produrre un riepilogo per categoria e anno.
- **FR-016**: Aliquote, percentuali, limiti, soglie e scadenze dei consigli MUST essere nel set di regole per anno con fonte e stato di verifica; le regole non verificate MUST essere segnalate.
- **FR-017**: Il sistema MUST presentare i consigli come supporto e non come consulenza personalizzata, mostrare le ipotesi e raccomandare la verifica con il commercialista per le spese di importo rilevante.
- **FR-018**: Il sistema MUST oscurare importi e giustificativi con la modalità "occhio".
- **FR-019**: Il sistema MUST mostrare nella schermata iniziale, dopo l'accesso, un box con le prime azioni consigliate per impatto, ciascuna con importo residuo, risparmio stimato, costo netto e scadenza, e un accesso alla lista completa.
- **FR-020**: Il box MUST aggiornarsi quando cambiano spese, previsioni o limiti, MUST spiegare quando non ci sono azioni utili e MUST NOT mostrare voci esaurite o scadute.
- **FR-021**: Il box MUST rispettare le stesse avvertenze della lista (costo netto, stima) e MUST essere comprensibile senza aprire altre schermate.

### Key Entities *(include if feature involves data)*

- **Spesa professionale**: data di pagamento, importo, fornitore, categoria, percentuale deducibile, IVA indetraibile, allegato, bene durevole o no.
- **Bene ammortizzabile**: costo, data, piano di deduzione per anno.
- **Onere personale**: tipo (deducibile o detraibile), importo, data, modalità, giustificativo.
- **Voce con limite**: regola dell'anno con limite, percentuale, franchigia, condizioni, fonte e verifica.
- **Consiglio**: voce, residuo, risparmio per euro e massimo, costo netto, scadenza, natura, stato (attivo, esaurito).
- **Simulazione di spesa**: ipotesi di importo e relativo effetto, non salvata nei dati reali.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In tutti i casi di prova l'importo deducibile o detraibile e il risparmio d'imposta coincidono al centesimo con il calcolo del motore.
- **SC-002**: La lista dei consigli è ordinata correttamente per risparmio in tutti i casi di prova e le voci esaurite non compaiono tra quelle attive.
- **SC-003**: L'utente registra una spesa con foto del giustificativo da telefono in meno di 1 minuto.
- **SC-004**: L'utente individua l'azione a più alto impatto dell'anno in meno di 10 secondi dall'apertura.
- **SC-005**: Ogni consiglio mostra costo netto, risparmio e scadenza (0 consigli senza questi dati).
- **SC-006**: Nessuna regola di deducibilità, limite o scadenza è scritta nella logica dell'app (0 ritrovamenti nelle verifiche).
- **SC-007**: Nessun consiglio suggerisce di spostare date di incasso o fatturazione (0 casi nelle prove).
- **SC-008**: Dopo l'accesso il box della home è visibile senza scorrere e mostra la prima azione per impatto entro 3 secondi dal caricamento dei dati.
- **SC-009**: Il box non mostra mai voci esaurite o scadute (0 casi nelle prove).

## Assumptions

- Le **percentuali di deducibilità e i limiti** (per esempio 100%, 75% per vitto e alloggio, 50% per uso promiscuo, il limite della previdenza complementare, la franchigia delle spese sanitarie, la soglia dei beni durevoli) sono esempi da verificare su fonte ufficiale e col commercialista e stanno nel set di regole per anno con stato di verifica, non nella logica (principio I).
- Con prestazioni sanitarie esenti da IVA, l'IVA sugli acquisti dell'attività è di norma indetraibile e fa parte del costo; con attività imponibili in parte vale il pro-rata (da verificare).
- Le regole dei consigli sono fornite come dati: le voci iniziali (formazione, supervisione, assicurazione, previdenza complementare, contributi volontari ENPAP, spese sanitarie, liberalità) sono da confermare con il commercialista.
- I **bonus edilizi** e le detrazioni pluriennali sono fuori dalla prima versione.
- Le spese sono registrate a mano: l'importazione dai movimenti bancari o da fatture elettroniche passive è rinviata.
- I giustificativi sono dati personali (e talvolta sanitari): valgono la riservatezza della specifica 002 e l'attenzione GDPR della costituzione.
- Le spese personali e quelle dell'attività restano distinte; nessuna spesa viene considerata in entrambe le categorie.
- Le stime del risparmio dipendono dalla previsione dell'anno (specifica 006) e dal motore (specifica 001).
- **Fuori ambito**: importazione bancaria, fatture passive elettroniche, bonus edilizi, compilazione di modelli e F24, accantonamento (specifica 007), previsione mensile (specifica 006), autenticazione (specifica 002).
