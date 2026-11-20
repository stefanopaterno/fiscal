# Feature Specification: Prospetto da condividere con il commercialista

**Feature Branch**: `009-prospetto-commercialista` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Un prospetto da condividere con il commercialista."

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

L'utente condivide il pacchetto come **file protetto da password** (o cifrato), da inviare con i propri mezzi. Per impostazione predefinita i **pazienti compaiono con un codice** e non con nome e cognome; l'utente può includere i nomi solo se necessario. Non sono creati indirizzi pubblici né link aperti. L'utente sceglie anche se includere i documenti allegati.

**Why this priority**: i dati dei pazienti sono dati sulla salute; il prospetto non deve diventare una falla di riservatezza.

**Independent Test**: il pacchetto predefinito non contiene nomi di pazienti; senza password non si apre; nessun indirizzo pubblico esiste dopo la generazione.

**Acceptance Scenarios**:

1. **Given** un pacchetto con fatture a pazienti, **When** l'utente lo genera con le impostazioni predefinite, **Then** i pazienti sono indicati con codici e il file è protetto.
2. **Given** la necessità di includere i nomi, **When** l'utente lo sceglie, **Then** il sistema avvisa dei rischi e richiede conferma.
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

- **FR-001**: Il sistema MUST generare, per un periodo scelto, un prospetto in PDF e un file di dati in formato foglio di calcolo con fatture, incassi, spese, ritenute, contributi, CU, oneri, acconti, crediti e scadenze.
- **FR-002**: I totali del pacchetto MUST coincidere con quelli dei moduli di origine (specifiche 001, 003, 004, 008).
- **FR-003**: Il sistema MUST indicare nel pacchetto data di generazione, periodo, versione delle regole fiscali usate e stato di verifica delle regole.
- **FR-004**: Il sistema MUST eseguire controlli di completezza e riportare gli avvisi nel pacchetto.
- **FR-005**: Il sistema MUST proteggere il pacchetto con password o cifratura e MUST NOT creare indirizzi pubblici né link condivisibili senza autenticazione.
- **FR-006**: Per impostazione predefinita il sistema MUST indicare i pazienti con un codice stabile e MUST richiedere conferma per includere nomi e cognomi.
- **FR-007**: Il sistema MUST permettere di includere o escludere i documenti allegati (specifica 010).
- **FR-008**: Il sistema MUST NOT includere nel pacchetto dati clinici né i consensi informati (specifica 005).
- **FR-009**: Il sistema MUST registrare lo storico dei pacchetti generati e permettere di annotare e chiudere richieste del commercialista.
- **FR-010**: Il sistema MUST permettere di scegliere le sezioni incluse e di salvare modelli di pacchetto.
- **FR-011**: Il sistema MUST segnalare testo libero che potrebbe contenere nomi di pazienti prima della generazione.
- **FR-012**: Il sistema MUST mostrare che il prospetto è uno strumento di supporto e non sostituisce la consulenza del commercialista.
- **FR-013**: Il sistema MUST oscurare importi e nomi con la modalità "occhio" nell'anteprima.

### Key Entities *(include if feature involves data)*

- **Pacchetto per il commercialista**: periodo, sezioni, data, stato dei controlli, protezione, destinatario.
- **Avviso di completezza**: tipo, voce collegata, stato.
- **Codice paziente**: identificativo stabile che sostituisce il nome nei pacchetti.
- **Richiesta del commercialista**: testo, data, stato.
- **Modello di pacchetto**: sezioni e impostazioni salvate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un pacchetto annuale completo si genera in meno di 2 minuti da telefono o PC.
- **SC-002**: I totali del pacchetto coincidono al centesimo con quelli dei moduli di origine in tutti i casi di prova.
- **SC-003**: Il pacchetto predefinito non contiene nomi di pazienti, né dati clinici, né consensi (0 ritrovamenti).
- **SC-004**: Senza password il pacchetto non è leggibile e non esiste alcun indirizzo pubblico (0 accessi riusciti nelle prove).
- **SC-005**: Il 100% dei difetti noti nei casi di prova compare tra gli avvisi.

## Assumptions

- La consegna del pacchetto avviene fuori dall'app (e-mail, messaggi, supporto): l'app produce il file protetto.
- L'accesso diretto del commercialista all'app (account in sola lettura) è escluso dalla prima versione perché la specifica 002 prevede un solo utente; da rivalutare.
- La password è scelta dall'utente e comunicata a parte; l'app non la conserva dopo la generazione (da confermare nel piano).
- Il formato del file di dati dev'essere utilizzabile nei programmi di uso comune; il formato esatto è da definire nel piano.
- I codici paziente restano stabili tra pacchetti ma non sono ricostruibili senza l'app.
- **Fuori ambito**: compilazione di dichiarazioni, F24 e invio telematico, firma digitale, accesso diretto del commercialista, specifica di archivio dei documenti (010), autenticazione (002).
