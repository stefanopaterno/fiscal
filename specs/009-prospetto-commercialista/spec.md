# Feature Specification: Prospetto da condividere con il commercialista

**Feature Branch**: `009-prospetto-commercialista` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Un prospetto da condividere con il commercialista."

## Clarifications

### Session 2026-11-20

- Q: In che formato è il file di dati? → A: PDF leggibile più un file Excel con un foglio per sezione (fatture, incassi, spese, beni durevoli, contributi, scadenze) e un foglio di avvertenze; i totali coincidono con quelli del PDF.
- Q: Come si imposta la password del pacchetto? → A: La genera l'app (lunga e casuale), la mostra una sola volta e non la conserva; ricorda di inviarla per un canale diverso da quello del file.
- Q: Il commercialista accede all'app? → A: No: nessuno oltre l'utente accede all'app, né ora né come requisito; il commercialista riceve solo i pacchetti inviati dall'utente.
- Q: Nei pacchetti i pazienti compaiono con un codice o con il nome? → A: Con il nome e i dati che già compaiono in fattura (nome e codice fiscale del cliente), perché il commercialista vede comunque le fatture. Restano esclusi in ogni caso dati clinici, cartelle cliniche, consensi, note e qualsiasi dato non legato alle fatture e alla contabilità. Resta un interruttore facoltativo "usa i codici" per i casi in cui l'utente voglia nascondere i nomi.
- Q: Servono promemoria periodici per inviare il prospetto? → A: No: nessun promemoria automatico; l'utente crea a mano una scadenza personalizzata nel calendario (specifica 004) quando il commercialista gli comunica una data.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preparare il pacchetto per il commercialista (Priority: P1)

L'utente sceglie un periodo (anno, trimestre, mese o intervallo) e genera un **pacchetto** da consegnare al commercialista: un prospetto in PDF leggibile e un file di dati in formato foglio di calcolo, con fatture emesse, incassi, spese per categoria con deducibilità, ritenute, contributi ENPAP, CU, oneri e spese detraibili, acconti e crediti, scadenze e importi stimati, più le note dell'utente. Il pacchetto riporta data di generazione e periodo.

**Why this priority**: è lo scopo della richiesta e riduce il tempo di lavoro del commercialista e gli errori di passaggio dati.

**Independent Test**: da un anno di prova il prospetto contiene tutte le sezioni e i totali coincidono con quelli delle specifiche 001, 003, 004 e 008.

**Acceptance Scenarios**:

1. **Given** un anno con dati, **When** l'utente genera il pacchetto, **Then** ottiene un PDF e un file di dati con tutte le sezioni e i totali coerenti.
2. **Given** un periodo parziale, **When** l'utente lo genera, **Then** il pacchetto riporta il periodo e solo i dati di quel periodo.
3. **Given** una sezione senza dati, **When** l'utente genera il pacchetto, **Then** la sezione è indicata come vuota, non omessa.

---

### User Story 2 - Controlli prima di inviare (Priority: P1)

Prima di generare il pacchetto il sistema controlla la completezza: spese senza giustificativo, fatture senza incasso o senza invio al Sistema Tessera Sanitaria, CU mancanti, regole non verificate, dati provvisori. L'utente vede un elenco di avvisi e può generare comunque, con gli avvisi riportati nel documento.

**Why this priority**: evita di consegnare un prospetto incompleto o errato e di perdere tempo in richieste di integrazione.

**Independent Test**: con un anno di prova con difetti noti, il controllo li elenca tutti; correggendoli l'elenco si svuota.

**Acceptance Scenarios**:

1. **Given** spese senza documento, **When** l'utente apre i controlli, **Then** le vede elencate con un accesso diretto per sistemarle.
2. **Given** avvisi non risolti, **When** l'utente genera il pacchetto, **Then** gli avvisi compaiono nel documento.

---

### User Story 3 - Condividere in modo sicuro e riservato (Priority: P1)

L'utente condivide il pacchetto come **file protetto da password** (o cifrato), da inviare con i propri mezzi. Il pacchetto contiene solo dati legati alle fatture e alla contabilità: i clienti compaiono **con il nome e i dati che già sono in fattura**, e restano esclusi dati clinici, consensi e note. Un interruttore facoltativo "usa i codici" permette di nascondere i nomi. Non sono creati indirizzi pubblici né link aperti. L'utente sceglie anche se includere i documenti allegati.

**Why this priority**: i dati dei pazienti sono dati sulla salute; il prospetto non deve diventare una falla di riservatezza.

**Independent Test**: il pacchetto predefinito contiene solo i dati presenti in fattura e nella contabilità (nessun dato clinico né consenso); con l'interruttore "usa i codici" non contiene nomi; senza password non si apre; nessun indirizzo pubblico esiste dopo la generazione.

**Acceptance Scenarios**:

1. **Given** un pacchetto con fatture a pazienti, **When** l'utente lo genera con le impostazioni predefinite, **Then** i clienti compaiono con i dati che sono in fattura, nessun dato clinico o consenso è incluso e il file è protetto.
2. **Given** la necessità di nascondere i nomi, **When** l'utente attiva l'interruttore "usa i codici", **Then** i pazienti compaiono con un codice stabile e i nomi non sono nel pacchetto.
3. **Given** un pacchetto generato, **When** l'utente lo apre senza password, **Then** non è leggibile.

---

### User Story 4 - Storico degli invii e domande del commercialista (Priority: P2)

Il sistema registra ogni pacchetto generato (data, periodo, contenuto, destinatario indicato) e permette di annotare le domande o le richieste del commercialista con il loro stato. L'utente può rigenerare un pacchetto e confrontarlo con il precedente.

**Why this priority**: ordine e tracciabilità; non necessario al primo pacchetto.

**Independent Test**: dopo due pacchetti dello stesso anno, lo storico li elenca con le differenze principali e le note aperte.

**Acceptance Scenarios**:

1. **Given** pacchetti generati, **When** l'utente apre lo storico, **Then** li vede con data, periodo e destinatario.
2. **Given** una richiesta del commercialista, **When** l'utente la annota, **Then** compare tra le note aperte finché non è chiusa.

---

### User Story 5 - Contenuto su misura (Priority: P3)

L'utente sceglie quali sezioni includere (per esempio solo spese e documenti, oppure solo la dichiarazione) e salva i modelli di pacchetto usati più spesso.

**Why this priority**: comodità; il pacchetto completo basta all'inizio.

**Independent Test**: escludendo una sezione, questa non appare nel pacchetto.

**Acceptance Scenarios**:

1. **Given** sezioni selezionate, **When** l'utente genera il pacchetto, **Then** contiene solo quelle.

---

### Edge Cases

- Periodo che attraversa due anni o anno con regole non verificate.
- Pacchetto molto grande per i documenti allegati.
- Dati modificati dopo la generazione: il pacchetto precedente resta quello generato.
- Password dimenticata o condivisa in modo insicuro.
- Commercialista che chiede dati non presenti nell'app.
- Paziente con più fatture: lo stesso codice deve restare coerente in tutti i pacchetti.
- Nome del paziente scritto per errore in una descrizione o nota: il sistema deve segnalarlo.
- Consensi informati e dati clinici: MUST NOT essere inclusi.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST generare, per un periodo scelto, un prospetto in PDF e un file Excel con un foglio per sezione (fatture, incassi, spese, beni durevoli, contributi ENPAP, CU, oneri e detrazioni, acconti e crediti, scadenze) e un foglio di avvertenze, con totali uguali a quelli del PDF.
- **FR-002**: I totali del pacchetto MUST coincidere con quelli dei moduli di origine (specifiche 001, 003, 004, 008).
- **FR-003**: Il sistema MUST indicare nel pacchetto data di generazione, periodo, versione delle regole fiscali usate e stato di verifica delle regole.
- **FR-004**: Il sistema MUST eseguire controlli di completezza e riportare gli avvisi nel pacchetto.
- **FR-005**: Il sistema MUST proteggere il pacchetto con una password generata dall'app (lunga e casuale), mostrarla una sola volta, non conservarla e ricordare all'utente di inviarla per un canale diverso da quello del file; MUST NOT creare indirizzi pubblici né link condivisibili senza autenticazione.
- **FR-006**: Per impostazione predefinita il sistema MUST indicare i clienti con il nome e i dati che compaiono in fattura (nome e codice fiscale) e MUST NOT includere altri dati dei pazienti; MUST offrire un interruttore facoltativo "usa i codici" che sostituisce i nomi con un codice stabile.
- **FR-007**: Il sistema MUST permettere di includere o escludere i documenti allegati (specifica 010).
- **FR-008**: Il sistema MUST NOT includere nel pacchetto dati clinici né i consensi informati (specifica 005).
- **FR-009**: Il sistema MUST registrare lo storico dei pacchetti generati e permettere di annotare e chiudere richieste del commercialista.
- **FR-010**: Il sistema MUST permettere di scegliere le sezioni incluse e di salvare modelli di pacchetto.
- **FR-011**: Il sistema MUST segnalare testo libero che potrebbe contenere nomi di pazienti prima della generazione.
- **FR-012**: Il sistema MUST mostrare che il prospetto è uno strumento di supporto e non sostituisce la consulenza del commercialista.
- **FR-013**: Il sistema MUST oscurare importi e nomi con la modalità "occhio" nell'anteprima.
- **FR-014**: Il sistema MUST NOT generare promemoria automatici per l'invio del pacchetto; MUST permettere di creare una scadenza personalizzata "invio al commercialista" nel calendario della specifica 004, con data e nota, quando l'utente riceve la richiesta dal commercialista.

### Key Entities *(include if feature involves data)*

- **Pacchetto per il commercialista**: periodo, sezioni, data, stato dei controlli, protezione, destinatario.
- **Avviso di completezza**: tipo, voce collegata, stato.
- **Codice paziente**: identificativo stabile che sostituisce il nome nei pacchetti quando l'utente attiva "usa i codici".
- **Richiesta del commercialista**: testo, data, stato.
- **Modello di pacchetto**: sezioni e impostazioni salvate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un pacchetto annuale completo si genera in meno di 2 minuti da telefono o PC.
- **SC-002**: I totali del pacchetto coincidono al centesimo con quelli dei moduli di origine in tutti i casi di prova.
- **SC-003**: Il pacchetto non contiene dati clinici, consensi né dati dei pazienti diversi da quelli presenti in fattura (0 ritrovamenti), e con l'interruttore "usa i codici" non contiene nomi (0 ritrovamenti).
- **SC-004**: Senza password il pacchetto non è leggibile e non esiste alcun indirizzo pubblico (0 accessi riusciti nelle prove).
- **SC-005**: Il 100% dei difetti noti nei casi di prova compare tra gli avvisi.

## Assumptions

- La consegna del pacchetto avviene fuori dall'app (e-mail, messaggi, supporto): l'app produce il file protetto.
- **Nessun accesso di terzi**: decisione dell'utente, nessuno oltre l'utente accede all'app (coerente con la specifica 002, un solo utente); il commercialista riceve solo i pacchetti.
- La password è generata dall'app e comunicata dall'utente a parte; l'app non la conserva dopo la generazione. Il file protetto MUST usare una cifratura riconosciuta e apribile con i programmi comuni (da definire nel piano).
- Il file di dati è un file Excel utilizzabile nei programmi di uso comune; la versione esatta del formato è da definire nel piano.
- I codici paziente (interruttore facoltativo) restano stabili tra pacchetti ma non sono ricostruibili senza l'app. Il commercialista riceve i dati delle fatture, come di consueto: come per ogni terzo che tratta dati dei pazienti per conto dell'utente, è opportuno che sia nominato responsabile del trattamento (adempimento dell'utente, fuori dall'app).
- **Fuori ambito**: compilazione di dichiarazioni, F24 e invio telematico, firma digitale, accesso diretto del commercialista, specifica di archivio dei documenti (010), autenticazione (002).
