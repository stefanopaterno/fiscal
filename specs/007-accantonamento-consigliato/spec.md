# Feature Specification: Accantonamento consigliato per le tasse

**Feature Branch**: `007-accantonamento-consigliato` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Quanto consigli di accantonare man mano che fatturo per non avere problemi con le tasse."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quanto mettere da parte su ogni incasso (Priority: P1)

Quando l'utente registra un incasso (specifica 003), il sistema indica **quanto accantonare** per tasse e contributi e quanto resta da spendere. L'importo non è una percentuale fissa ma deriva dall'effetto reale di quell'incasso sulle imposte dell'anno: IRPEF e addizionali al suo scaglione marginale sul cumulo con la CU, contributi ENPAP e IVA se dovuta. Se la fattura aveva una **ritenuta d'acconto**, il sistema la sottrae, perché è già stata versata dal cliente.

**Why this priority**: è la domanda centrale dell'utente e il motivo per cui un'app fiscale è utile ogni giorno.

**Independent Test**: registrando un incasso di prova con dati noti, l'accantonamento indicato coincide con la differenza di imposte e contributi calcolata dal motore con e senza quell'incasso, meno l'eventuale ritenuta.

**Acceptance Scenarios**:

1. **Given** un incasso di 100 € senza ritenuta in uno scaglione al 35%, **When** l'utente lo registra, **Then** il sistema mostra l'accantonamento consigliato scomposto in imposte, contributi e IVA e il netto da spendere.
2. **Given** un incasso con ritenuta d'acconto del 20%, **When** l'utente lo registra, **Then** l'accantonamento tiene conto della ritenuta già trattenuta e può risultare più basso o nullo.
3. **Given** un incasso che fa superare uno scaglione, **When** l'utente lo registra, **Then** il sistema spiega che una parte è tassata a un'aliquota superiore e mostra l'effetto.

---

### User Story 2 - La percentuale da accantonare, sempre aggiornata (Priority: P1)

Nella schermata iniziale l'utente vede una frase del tipo "su ogni 100 € incassati ora accantona 41 €", con la scomposizione. Il valore si aggiorna quando cambiano reddito previsto, scaglione, detrazioni, acconti o spese, e il sistema spiega perché è cambiato (per esempio per un cambio di scaglione o per la riduzione delle detrazioni da lavoro dipendente al crescere del reddito).

**Why this priority**: dà una regola semplice da usare ogni giorno senza fare calcoli.

**Independent Test**: con redditi di prova a cavallo di uno scaglione, la percentuale cambia e il sistema indica la causa.

**Acceptance Scenarios**:

1. **Given** una previsione dell'anno, **When** l'utente apre la schermata iniziale, **Then** vede la percentuale consigliata e la scomposizione.
2. **Given** un cambio di scaglione previsto, **When** la percentuale cambia, **Then** il sistema spiega la causa e il livello di reddito oltre il quale cambia.

---

### User Story 3 - Quanto ho messo da parte e quanto mi serve (Priority: P1)

L'utente registra quanto ha effettivamente spostato nel suo "salvadanaio" (conto o fondo separato) e il sistema confronta questa cifra con quanto servirà per le prossime scadenze (saldo, acconti, ENPAP, IVA). Mostra "sei in regola", "ti mancano X €" oppure "hai X € in più" e una barra di copertura per ciascuna scadenza.

**Why this priority**: l'accantonamento ha senso solo se si verifica che sia stato fatto e che basti.

**Independent Test**: registrando versamenti nel salvadanaio e scadenze di prova, la copertura per scadenza coincide con quanto atteso e l'eventuale mancanza è evidente.

**Acceptance Scenarios**:

1. **Given** versamenti nel salvadanaio inferiori al necessario, **When** l'utente apre la copertura, **Then** vede quanto manca e per quale scadenza.
2. **Given** un surplus, **When** l'utente lo apre, **Then** vede quanto è disponibile oltre al necessario e con quali ipotesi.
3. **Given** una scadenza pagata, **When** l'utente la segna come fatta, **Then** l'importo versato esce dal salvadanaio dovuto.

---

### User Story 4 - Il primo anno: non farsi sorprendere nel giugno 2028 (Priority: P2)

Per il primo anno di partita IVA (2027), il sistema mostra fin dall'inizio che a giugno 2028 si sommano saldo 2027 e primo acconto 2028, che il secondo acconto di novembre 2028 pesa ancora, e propone un **piano di accantonamento mensile** per arrivarci pronti.

**Why this priority**: è il rischio più concreto per chi inizia: pochi acconti nel primo anno e poi un grosso versamento.

**Independent Test**: con dati del primo anno di prova il piano indica l'importo mensile da accantonare e la scadenza di arrivo.

**Acceptance Scenarios**:

1. **Given** il primo anno di partita IVA, **When** l'utente apre l'accantonamento, **Then** vede un avviso con l'importo stimato di giugno 2028 e un piano mensile.
2. **Given** incassi più alti del previsto, **When** il piano si aggiorna, **Then** l'importo mensile consigliato cambia e viene spiegato.

---

### User Story 5 - Netto reale disponibile (Priority: P2)

La schermata iniziale mostra il **Netto reale disponibile**: quanto l'utente può spendere oggi dopo aver tenuto da parte imposte, contributi e IVA per le scadenze future, senza contare i crediti non ancora incassati. Il valore è scomposto: incassato, costi pagati, accantonamenti, disponibile.

**Why this priority**: è il KPI principale previsto dal progetto e risponde a "quanto posso spendere".

**Independent Test**: con incassi, spese e accantonamenti di prova il netto reale coincide con la somma attesa e cala quando si registra una spesa o un nuovo accantonamento necessario.

**Acceptance Scenarios**:

1. **Given** incassi, spese e accantonamenti registrati, **When** l'utente apre la schermata iniziale, **Then** vede il netto reale e la sua scomposizione.
2. **Given** un credito dalla dichiarazione non ancora incassato (specifica 004), **When** l'utente apre il netto reale, **Then** il credito non è incluso.

---

### User Story 6 - Impostare prudenza e modalità (Priority: P3)

L'utente sceglie un margine di sicurezza (per esempio 0%, 5%, 10%), il metodo (accantonare l'effetto marginale reale o una percentuale media) e se vuole gli avvisi quando il salvadanaio scende sotto il necessario.

**Why this priority**: personalizzazione; i valori predefiniti sono già sufficienti per la prima versione.

**Independent Test**: cambiando il margine di sicurezza la percentuale consigliata aumenta della quota scelta.

**Acceptance Scenarios**:

1. **Given** un margine del 10%, **When** l'utente apre l'accantonamento, **Then** il consigliato è maggiorato e la quota di margine è mostrata a parte.

---

### Edge Cases

- Incassi con ritenuta d'acconto, con IVA esente, imponibili o misti.
- Incasso parziale di una fattura e incasso di fatture di anni diversi.
- Perdita professionale prevista: accantonamento nullo o limitato ai contributi minimi ENPAP.
- Contributi ENPAP minimi dovuti anche con redditi bassi.
- Previsione di reddito che cambia molto durante l'anno.
- Accantonamento già eccessivo e spesa dichiarata in anticipo.
- Salvadanaio in un conto non gestito dall'app (inserimento manuale).
- Credito dell'anno precedente utilizzato in compensazione che riduce il versamento (specifica 004).
- Acconti del metodo storico diversi da quelli del metodo previsionale.
- Ricavi nel primo anno senza storico e acconti ridotti al lavoro dipendente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST calcolare l'accantonamento consigliato per ogni incasso come differenza di imposte (IRPEF, addizionali), contributi ENPAP e IVA dovuta tra la previsione con e senza l'incasso, usando il motore della specifica 001, meno le ritenute già trattenute.
- **FR-002**: Il sistema MUST mostrare per ogni incasso la scomposizione dell'accantonamento (imposte, contributi, IVA) e il netto da spendere.
- **FR-003**: Il sistema MUST mostrare una percentuale consigliata aggiornata e spiegare ogni sua variazione (scaglione, detrazioni, spese, acconti).
- **FR-004**: Il sistema MUST permettere di registrare i versamenti nel salvadanaio (data, importo, conto) e MUST confrontarli con il fabbisogno delle prossime scadenze.
- **FR-005**: Il sistema MUST indicare per ogni scadenza futura la copertura e l'eventuale mancanza o eccedenza, con gli importi della specifica 006.
- **FR-006**: Il sistema MUST segnalare quando l'accantonamento effettivo scende sotto il necessario, con un avviso nell'app.
- **FR-007**: Per il primo anno di partita IVA il sistema MUST mostrare l'impatto stimato di giugno e novembre 2028 e proporre un piano mensile di accantonamento.
- **FR-008**: Il sistema MUST calcolare il netto reale disponibile come incassi meno costi pagati, accantonamenti necessari e quote future e MUST escludere crediti non incassati.
- **FR-009**: Il sistema MUST permettere di impostare un margine di sicurezza e il metodo (marginale reale o media) e MUST mostrare la quota di margine a parte.
- **FR-010**: Il sistema MUST trattare separatamente il reddito da lavoro dipendente (tasse già trattenute in busta paga) dall'accantonamento sul reddito professionale, calcolando l'effetto aggiuntivo sul cumulo.
- **FR-011**: Il sistema MUST tenere conto dei contributi ENPAP minimi e della loro deducibilità (soggettivo e maternità) nel calcolo dell'effetto sulle imposte.
- **FR-012**: Il sistema MUST presentare i consigli come stime, indicare le ipotesi usate e NOT garantire l'assenza di conguagli.
- **FR-013**: Il sistema MUST oscurare importi e saldi con la modalità "occhio".
- **FR-014**: Il sistema MUST mantenere i valori di soglia, i margini predefiniti e le regole in set per anno senza scriverli nella logica.

### Key Entities *(include if feature involves data)*

- **Accantonamento consigliato**: collegato a un incasso, con quote di imposte, contributi, IVA, margine e netto da spendere.
- **Versamento nel salvadanaio**: data, importo, conto di destinazione.
- **Obiettivo di copertura**: fabbisogno per scadenza e stato di copertura.
- **Piano mensile**: importi mensili da accantonare fino a una scadenza.
- **Impostazioni di prudenza**: margine di sicurezza, metodo, avvisi.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In tutti i casi di prova l'accantonamento consigliato coincide al centesimo con la differenza di imposte e contributi calcolata dal motore.
- **SC-002**: L'utente vede il consigliato per un incasso nella stessa schermata in cui lo registra, senza passaggi aggiuntivi.
- **SC-003**: La variazione della percentuale consigliata è sempre accompagnata dalla causa.
- **SC-004**: L'utente conosce la copertura delle scadenze future in meno di 10 secondi dall'apertura.
- **SC-005**: Nei casi di prova con un anno completo, un utente che segue il consigliato non ha mai un saldo non coperto per più della quota di errore dichiarata (da fissare nel piano).
- **SC-006**: Il netto reale disponibile non include mai crediti non incassati (0 casi nelle prove).

## Assumptions

- Il motore della specifica 001 fornisce l'effetto marginale; la specifica 006 fornisce le previsioni di fine anno e i versamenti previsti; la specifica 003 fornisce gli incassi.
- L'accantonamento non muove denaro: indica quanto spostare, l'utente lo fa sul proprio conto e lo registra a mano.
- Il margine di sicurezza predefinito è da stabilire nel piano; senza margine l'importo è quello stimato.
- Il reddito da lavoro dipendente è già tassato in busta paga e non genera accantonamento, tranne l'effetto aggiuntivo sul cumulo.
- Le ritenute d'acconto sono considerate acconti già versati: il cliente le trattiene dall'incasso.
- Le stime sono ipotesi e non garantiscono l'assenza di conguagli; la qualità dipende dai dati inseriti.
- **Fuori ambito**: movimenti bancari automatici, collegamento ai conti, compilazione degli F24, previsione mensile (specifica 006), consigli di risparmio fiscale (specifica 008), autenticazione (specifica 002).
