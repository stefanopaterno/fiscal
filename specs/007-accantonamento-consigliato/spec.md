# Feature Specification: Accantonamento consigliato per le tasse

**Feature Branch**: `007-accantonamento-consigliato` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Quanto consigli di accantonare man mano che fatturo per non avere problemi con le tasse."

## Clarifications

### Session 2026-11-20

- Q: La percentuale da accantonare cambia a ogni incasso o è stabile per il mese? → A: Stabile per il mese, ricalcolata a ogni chiusura mensile (o a richiesta); il calcolo esatto dell'effetto del singolo incasso resta consultabile come dettaglio. L'utente metterà gli accantonamenti in un conto con interessi, quindi il rendimento è un dato facoltativo (storia 7).
- Q: Quale margine di sicurezza iniziale? → A: 10% in più dell'importo calcolato nel primo anno, quando regole e dati sono provvisori; modificabile in ogni momento nelle impostazioni di prudenza.
- Q: Come si registra l'accantonamento nel conto? → A: Subito dopo ogni incasso l'app mostra un promemoria con l'importo consigliato e un tocco per confermare ("fatto", "importo diverso" o "dopo"); il promemoria resta visibile finché non è chiuso. Il saldo reale del conto è un controllo facoltativo proposto una volta al mese alla chiusura mensile.
- Q: Il netto reale comprende lo stipendio? → A: No: riguarda solo la partita IVA (incassi professionali meno costi, tasse, contributi e accantonamenti); lo stipendio da dipendente resta fuori.
- Q: Quale errore massimo è accettabile sul totale delle tasse dell'anno? → A: Entro il 10% in meno del dovuto, con dati completi e regole verificate (il margine del 10% del primo anno copre ulteriormente la differenza).

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

Nella schermata iniziale l'utente vede una frase del tipo "su ogni 100 € incassati ora accantona 41 €", con la scomposizione. Il valore resta stabile per tutto il mese e viene ricalcolato a ogni chiusura mensile (o a richiesta) quando cambiano reddito previsto, scaglione, detrazioni, acconti o spese, e il sistema spiega perché è cambiato (per esempio per un cambio di scaglione o per la riduzione delle detrazioni da lavoro dipendente al crescere del reddito).

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

### User Story 7 - Il conto con interessi per le tasse future (Priority: P3)

L'utente tiene gli accantonamenti in un conto che paga interessi. Può indicare il **tasso annuo lordo** e il tipo di conto; il sistema mostra di quanto la somma accantonata cresce entro le prossime scadenze, al netto della ritenuta sugli interessi, e ne tiene conto nel piano mensile (si può accantonare un po' meno per arrivare allo stesso importo). Avvisa se il conto è vincolato oltre la data di una scadenza.

**Why this priority**: piccolo vantaggio utile; ma il piano funziona anche senza.

**Independent Test**: con tasso e importi di prova, la somma attesa a una scadenza coincide con il calcolo manuale e il piano mensile cala di conseguenza.

**Acceptance Scenarios**:

1. **Given** un tasso annuo lordo e una scadenza futura, **When** l'utente apre la copertura, **Then** vede l'importo atteso a quella data al netto della ritenuta sugli interessi.
2. **Given** un conto vincolato oltre la scadenza, **When** l'utente apre la copertura, **Then** il sistema avvisa che la somma non sarà disponibile.
3. **Given** nessun tasso indicato, **When** l'utente apre il piano, **Then** il calcolo non considera interessi.

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
- **FR-003**: Il sistema MUST mostrare una percentuale consigliata stabile per il mese, ricalcolata a ogni chiusura mensile o a richiesta, MUST spiegare ogni sua variazione (scaglione, detrazioni, spese, acconti) e MUST mantenere consultabile come dettaglio l'effetto esatto di ogni singolo incasso.
- **FR-004**: Il sistema MUST mostrare subito dopo la registrazione di un incasso un promemoria con l'importo consigliato da accantonare e un tocco per confermare ("fatto", "importo diverso", "dopo"), conservare il promemoria finché non è chiuso, registrare i versamenti nel salvadanaio (data, importo, conto) e confrontarli con il fabbisogno delle prossime scadenze. Il sistema MUST proporre alla chiusura mensile un controllo facoltativo del saldo reale del conto per riconciliare le differenze.
- **FR-005**: Il sistema MUST indicare per ogni scadenza futura la copertura e l'eventuale mancanza o eccedenza, con gli importi della specifica 006.
- **FR-006**: Il sistema MUST segnalare quando l'accantonamento effettivo scende sotto il necessario, con un avviso nell'app.
- **FR-007**: Per il primo anno di partita IVA il sistema MUST mostrare l'impatto stimato di giugno e novembre 2028 e proporre un piano mensile di accantonamento.
- **FR-008**: Il sistema MUST calcolare il netto reale disponibile come incassi meno costi pagati, accantonamenti necessari e quote future e MUST escludere crediti non incassati. Il netto reale MUST riguardare solo l'attività di partita IVA e MUST NOT includere lo stipendio da dipendente.
- **FR-009**: Il sistema MUST permettere di impostare un margine di sicurezza e il metodo (marginale reale o media) e MUST mostrare la quota di margine a parte. Il valore iniziale del margine è 10% nel primo anno; MUST essere modificabile in ogni momento e la quota di margine MUST essere mostrata a parte.
- **FR-010**: Il sistema MUST trattare separatamente il reddito da lavoro dipendente (tasse già trattenute in busta paga) dall'accantonamento sul reddito professionale, calcolando l'effetto aggiuntivo sul cumulo.
- **FR-011**: Il sistema MUST tenere conto dei contributi ENPAP minimi e della loro deducibilità (soggettivo e maternità) nel calcolo dell'effetto sulle imposte.
- **FR-012**: Il sistema MUST presentare i consigli come stime, indicare le ipotesi usate e NOT garantire l'assenza di conguagli.
- **FR-013**: Il sistema MUST oscurare importi e saldi con la modalità "occhio".
- **FR-014**: Il sistema MUST mantenere i valori di soglia, i margini predefiniti e le regole in set per anno senza scriverli nella logica.
- **FR-015**: Il sistema MUST permettere di indicare facoltativamente per il conto di accantonamento il tasso annuo lordo, la ritenuta sugli interessi (dalle regole dell'anno, con stato di verifica) e i vincoli di svincolo, e MUST usarli per mostrare l'importo atteso alle scadenze e per ridurre il piano mensile, indicando che si tratta di una stima.
- **FR-016**: Il sistema MUST avvisare quando le somme accantonate non sono disponibili alla data di una scadenza (conto vincolato) e MUST NOT contare gli interessi come reddito professionale.

### Key Entities *(include if feature involves data)*

- **Accantonamento consigliato**: collegato a un incasso, con quote di imposte, contributi, IVA, margine e netto da spendere.
- **Versamento nel salvadanaio**: data, importo, conto di destinazione.
- **Obiettivo di copertura**: fabbisogno per scadenza e stato di copertura.
- **Piano mensile**: importi mensili da accantonare fino a una scadenza.
- **Conto di accantonamento**: tasso annuo lordo facoltativo, ritenuta sugli interessi, vincoli di svincolo.
- **Impostazioni di prudenza**: margine di sicurezza, metodo, avvisi.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In tutti i casi di prova l'accantonamento consigliato coincide al centesimo con la differenza di imposte e contributi calcolata dal motore.
- **SC-002**: L'utente vede il consigliato per un incasso nella stessa schermata in cui lo registra, senza passaggi aggiuntivi.
- **SC-003**: La variazione della percentuale consigliata è sempre accompagnata dalla causa.
- **SC-004**: L'utente conosce la copertura delle scadenze future in meno di 10 secondi dall'apertura.
- **SC-005**: Nei casi di prova con un anno completo, dati completi e regole verificate, un utente che segue l'accantonamento consigliato (senza margine) ha un totale accantonato che non è inferiore di oltre il 10% alle tasse e ai contributi realmente dovuti nell'anno.
- **SC-006**: Il netto reale disponibile non include mai crediti non incassati (0 casi nelle prove).

## Assumptions

- Il motore della specifica 001 fornisce l'effetto marginale; la specifica 006 fornisce le previsioni di fine anno e i versamenti previsti; la specifica 003 fornisce gli incassi.
- L'accantonamento non muove denaro: indica quanto spostare, l'utente lo fa sul proprio conto e lo registra a mano.
- Il margine di sicurezza iniziale è del 10% nel primo anno (regole provvisorie, nessuno storico); l'utente può cambiarlo; senza margine l'importo è quello stimato.
- Il reddito da lavoro dipendente è già tassato in busta paga e non genera accantonamento, tranne l'effetto aggiuntivo sul cumulo.
- Le ritenute d'acconto sono considerate acconti già versati: il cliente le trattiene dall'incasso.
- Le stime sono ipotesi e non garantiscono l'assenza di conguagli; la qualità dipende dai dati inseriti.
- Il conto con interessi è del solo utente: l'app non si collega alla banca. Gli interessi sono tassati alla fonte dalla banca con ritenuta (valore e regole da verificare nel set di regole dell'anno) e non fanno parte del reddito professionale né del cumulo calcolato dal motore.
- **Fuori ambito**: movimenti bancari automatici, collegamento ai conti, compilazione degli F24, previsione mensile (specifica 006), consigli di risparmio fiscale (specifica 008), autenticazione (specifica 002).
