# Feature Specification: Previsione mensile delle tasse

**Feature Branch**: `006-previsione-mensile-tasse` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Un prospetto che man mano che passano i mesi mi mostri il forecast sulle tasse."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prospetto mese per mese delle tasse previste (Priority: P1)

L'utente apre il prospetto dell'anno e vede, per ciascun mese da gennaio a dicembre, una riga con: incassi del mese e da inizio anno, spese pagate, reddito professionale da inizio anno, e la **previsione delle tasse a fine anno** (IRPEF e addizionali, contributi ENPAP, conguaglio finale). I mesi trascorsi mostrano dati reali, quelli futuri mostrano previsioni, ben distinti. Un grafico affianca la tabella.

**Why this priority**: è la richiesta principale: sapere in ogni momento quante tasse dovrò pagare per l'anno, aggiornato man mano.

**Independent Test**: con incassi e spese di prova in alcuni mesi, il prospetto mostra i mesi reali e quelli previsti, e le tasse di fine anno coincidono con il calcolo della specifica 001 applicato ai dati previsti.

**Acceptance Scenarios**:

1. **Given** incassi registrati fino a un certo mese, **When** l'utente apre il prospetto, **Then** i mesi passati mostrano dati reali, quelli futuri previsioni evidenziate come tali, e a fine anno compare la stima di imposte e contributi.
2. **Given** una nuova fattura incassata, **When** l'utente riapre il prospetto, **Then** la previsione di fine anno si aggiorna e spiega di quanto è cambiata.
3. **Given** un anno senza regole disponibili, **When** l'utente apre il prospetto, **Then** il sistema lo segnala e non mostra importi inventati.

---

### User Story 2 - Scegliere come prevedere i mesi futuri (Priority: P1)

L'utente sceglie il metodo con cui il sistema stima gli incassi e le spese dei mesi mancanti: **andamento** (la media mensile finora proseguita), **stagionalità** (gli stessi mesi degli anni precedenti, disponibile dal secondo anno), **impegni noti** (fatture da incassare e compensi ricorrenti già concordati) oppure **obiettivo annuo** inserito a mano. Il sistema mostra tre scenari (prudente, atteso, ottimistico) e il campo di variazione delle tasse.

**Why this priority**: senza ipotesi sui mesi futuri il prospetto è solo un consuntivo; nel primo anno non esiste storico e servono metodi che non lo richiedano.

**Independent Test**: cambiando metodo sugli stessi dati cambia la previsione dei mesi futuri e di fine anno; ogni scenario ha ipotesi visibili.

**Acceptance Scenarios**:

1. **Given** il primo anno senza storico, **When** l'utente apre il prospetto, **Then** sono disponibili andamento, impegni noti e obiettivo annuo, mentre la stagionalità è segnalata come non disponibile.
2. **Given** un obiettivo annuo di fatturato inserito, **When** il sistema prevede i mesi futuri, **Then** distribuisce la parte mancante sui mesi rimasti e mostra le tasse risultanti.
3. **Given** i tre scenari, **When** l'utente li confronta, **Then** vede per ciascuno incassi, reddito, tasse e conguaglio finale.

---

### User Story 3 - Come è cambiata la previsione nel tempo (Priority: P2)

A ogni fine mese il sistema salva la previsione di fine anno. L'utente vede un grafico di come la stima delle tasse si è evoluta mese dopo mese e una frase che spiega ogni variazione (per esempio "+1.200 € perché a marzo hai incassato più del previsto").

**Why this priority**: mostra se si è prudenti o ottimisti e rende comprensibile perché la stima cambia.

**Independent Test**: dopo due chiusure mensili simulate il grafico mostra due punti e per l'ultimo la spiegazione della variazione rispetto al primo.

**Acceptance Scenarios**:

1. **Given** una previsione già salvata a fine mese, **When** l'utente apre il grafico, **Then** vede la serie delle previsioni salvate e la variazione dell'ultimo mese.
2. **Given** una variazione di previsione, **When** l'utente la tocca, **Then** il sistema ne spiega le cause (incassi, spese, cambio di metodo, cambio di scaglione).

---

### User Story 4 - Quando uscirà il denaro: il calendario dei pagamenti per mese (Priority: P2)

Il sistema mostra, mese per mese per i prossimi 12-18 mesi, quanto uscirà per tasse e contributi: ritenute eventuali, saldo e acconti di giugno e novembre, contributi ENPAP e le altre scadenze. Evidenzia i mesi più pesanti, in particolare **giugno 2028**, quando per il primo anno di partita IVA si sommano saldo 2027 e primo acconto 2028.

**Why this priority**: collega la previsione delle tasse alla liquidità e al calendario della specifica 004.

**Independent Test**: con dati di prova il prospetto elenca per mese gli importi attesi e il totale dei 12 mesi coincide con la somma dei versamenti previsti dalla specifica 001.

**Acceptance Scenarios**:

1. **Given** una previsione, **When** l'utente apre il calendario dei pagamenti, **Then** vede gli importi stimati per mese, con indicazione del tipo di versamento.
2. **Given** il primo anno di partita IVA, **When** l'utente apre il mese di giugno dell'anno dopo, **Then** il sistema segnala l'importo più alto e ne spiega i motivi.

---

### User Story 5 - Confronto con obiettivi e anni precedenti (Priority: P3)

L'utente confronta il mese e l'anno con l'anno precedente e con un obiettivo di fatturato o di netto che si è dato, vedendo scostamenti e impatto fiscale.

**Why this priority**: utile per decisioni, ma non necessaria alla prima versione.

**Independent Test**: con due anni di dati di prova il confronto mostra scostamenti mese per mese.

**Acceptance Scenarios**:

1. **Given** un anno precedente con dati, **When** l'utente apre il confronto, **Then** vede mese per mese incassi, reddito e tasse a confronto.
2. **Given** un obiettivo di fatturato, **When** l'utente lo imposta, **Then** vede lo scostamento rispetto al previsto e l'effetto sulle tasse.

---

### Edge Cases

- Mesi senza incassi (per esempio agosto) o con incassi molto irregolari (un solo grande pagamento).
- Mese in corso ancora incompleto: i dati parziali non devono sembrare un calo.
- Primo anno senza storico: andamento e stagionalità non affidabili con pochi mesi di dati.
- Incassi registrati in ritardo con data precedente (la previsione passata resta quella salvata).
- Cambio di scaglione IRPEF a metà anno: la previsione deve evidenziarlo.
- CU provvisoria o stimata (specifica 004) e dati in modifica.
- Reddito professionale negativo (spese superiori agli incassi).
- Anno senza regole fiscali o regole non verificate.
- Chiusura mensile mancata perché l'app non è stata aperta.
- Ritenute subite sugli incassi che riducono il versamento finale.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST mostrare, per ogni mese dell'anno, incassi e spese del mese e da inizio anno, reddito professionale cumulato e previsione di fine anno di imposte, contributi e conguaglio, distinguendo dati reali e previsti.
- **FR-002**: Le imposte e i contributi previsti MUST essere calcolati con il motore della specifica 001, senza duplicare regole fiscali.
- **FR-003**: Il sistema MUST offrire i metodi di previsione andamento, stagionalità, impegni noti e obiettivo annuo, indicando quelli non disponibili e perché.
- **FR-004**: Il sistema MUST produrre tre scenari (prudente, atteso, ottimistico) con ipotesi visibili e MUST mostrare il campo di variazione delle tasse.
- **FR-005**: Il sistema MUST salvare la previsione di fine anno a ogni chiusura mensile e MUST permettere di salvarla a mano.
- **FR-006**: Il sistema MUST spiegare ogni variazione di previsione tra due salvataggi indicando le cause (incassi, spese, metodo, scaglione).
- **FR-007**: Il sistema MUST mostrare il calendario dei pagamenti per mese con importi stimati e tipo di versamento, evidenziando il mese più oneroso e, nel primo anno, il versamento di giugno con saldo e primo acconto.
- **FR-008**: Il sistema MUST usare le date e i metodi di calcolo di saldo e acconti dal set di regole per anno e dalla specifica 001 (storico o previsionale).
- **FR-009**: Il sistema MUST considerare le ritenute d'acconto subite, i crediti dell'anno precedente non ancora incassati o compensati (specifica 004) e gli acconti già versati nel calcolo del conguaglio e dei pagamenti previsti.
- **FR-010**: Il sistema MUST segnalare ipotesi basate su pochi dati (per esempio meno di tre mesi) come poco affidabili.
- **FR-011**: Il sistema MUST permettere confronti con l'anno precedente e con un obiettivo di fatturato o di netto.
- **FR-012**: Il sistema MUST segnalare l'attraversamento di uno scaglione IRPEF nel corso dell'anno e il mese previsto in cui avviene.
- **FR-013**: Il sistema MUST NOT alterare i dati reali; le ipotesi e gli scenari MUST essere modificabili e scartabili.
- **FR-014**: Il sistema MUST presentare tutte le previsioni come stime e MUST segnalare i dati provvisori e le regole non verificate.
- **FR-015**: Il prospetto MUST essere leggibile da telefono e da PC e MUST oscurare gli importi con la modalità "occhio".

### Key Entities *(include if feature involves data)*

- **Ipotesi di previsione**: metodo, parametri (obiettivo annuo, impegni noti), scenario.
- **Previsione mensile**: istantanea a fine mese con incassi, spese, reddito, imposte, contributi, conguaglio finale previsti.
- **Pagamento previsto**: mese, tipo (saldo, acconto, ENPAP, altro), importo stimato.
- **Impegno noto**: compenso o fattura da incassare con data attesa.
- **Obiettivo**: fatturato o netto desiderato per anno o mese.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Le imposte di fine anno del prospetto coincidono al centesimo con quelle del motore della specifica 001 applicato ai dati reali più previsti, in tutti i casi di prova.
- **SC-002**: L'utente legge nel prospetto "quante tasse devo pagare quest'anno" in meno di 10 secondi dall'apertura.
- **SC-003**: Ogni variazione tra due previsioni è accompagnata da una spiegazione delle cause.
- **SC-004**: Il totale dei pagamenti previsti nei 12 mesi coincide con la somma dei versamenti della specifica 001 nei casi di prova.
- **SC-005**: Nessuna previsione è presentata come definitiva e nessun importo è mostrato per anni senza regole (0 casi nelle prove).
- **SC-006**: Il prospetto si usa senza scorrimento orizzontale a 360 px.

## Assumptions

- Il prospetto non fa calcoli fiscali: usa il motore della specifica 001, i dati di incasso e spesa delle specifiche 003 e 008 e la CU della specifica 004.
- Il salvataggio mensile avviene alla prima apertura dell'app dopo la fine del mese o a richiesta dell'utente; non ci sono operazioni automatiche lato server in questa versione (da rivedere nel piano).
- Il primo anno (2027) non ha storico professionale: stagionalità non disponibile e acconti calcolati sul solo reddito da lavoro dipendente (specifica 001); il versamento di giugno 2028 sarà il più pesante.
- Le previsioni sono stime e non consulenza fiscale; i metodi sono ipotesi dichiarate.
- **Fuori ambito**: raccomandazioni su quanto accantonare (specifica 007), consigli di risparmio fiscale (specifica 008), compilazione degli F24, notifiche esterne, autenticazione (specifica 002).
