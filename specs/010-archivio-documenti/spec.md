# Feature Specification: Archivio dei documenti digitali ricevuti

**Feature Branch**: `010-archivio-documenti` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "La documentazione digitale ricevuta da archiviare."

## Clarifications

### Session 2026-11-20

- Q: Quali formati accetta l'archivio? → A: PDF, immagini (comprese le foto del telefono) e file XML delle fatture elettroniche ricevute, conservati come originali.
- Q: L'app legge i dati dei file XML ricevuti? → A: Sì: da un file XML di fattura elettronica l'app precompila fornitore, data, importo e IVA della spesa (specifica 008), mentre categoria e deducibilità le conferma sempre l'utente. Nessuna lettura automatica di PDF e foto.
- Q: Le foto dei documenti si riducono automaticamente? → A: Sì, a una qualità sempre leggibile (testo nitido), con un interruttore per conservare l'originale quando serve.
- Q: Si avvisa quali documenti vanno conservati a norma altrove? → A: Sì: per i tipi con obbligo di conservazione digitale (per esempio le fatture elettroniche) compare un avviso con la spiegazione di cosa va conservato a norma e come (servizio gratuito dell'Agenzia delle Entrate o altro conservatore), e la checklist annuale della specifica 004 ha una voce di verifica. L'app non fa la conservazione.
- Q: Cosa succede quando si elimina un documento? → A: Finisce in un cestino per 30 giorni, da cui si può ripristinare; dopo 30 giorni è eliminato per sempre; si può svuotare il cestino subito con conferma esplicita; per i documenti da conservare per legge compare comunque un avviso prima dell'eliminazione.

### Session 2026-11-23

- Richiesta dell'utente: "essendo una partita IVA ordinaria manca la parte di raccolta delle fatture in ingresso". → Decisione: importazione in blocco delle fatture ricevute scaricate dall'utente dal portale "Fatture e Corrispettivi" dell'Agenzia delle Entrate (file ZIP, XML e XML firmati .p7m): ogni fattura diventa un documento dell'archivio e una spesa proposta da confermare (FR-016, FR-017). Lo scarico automatico dal Sistema di Interscambio resta fuori ambito: richiede un canale accreditato e un server, che l'app per scelta non ha.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Archiviare un documento ricevuto (Priority: P1)

Quando riceve un documento (CU, fattura di un fornitore, ricevuta di pagamento, comunicazione dell'Agenzia delle Entrate o dell'ENPAP, certificato, polizza), l'utente lo carica da telefono (foto o file) o da PC e lo classifica: tipo, anno, data, emittente, importo se c'è, note. Il sistema lo conserva in un archivio riservato.

**Why this priority**: è lo scopo della richiesta; tutti gli altri moduli hanno bisogno di documenti.

**Independent Test**: caricando un documento di prova con i suoi dati, questo compare nell'archivio con tutte le informazioni e si riapre.

**Acceptance Scenarios**:

1. **Given** un documento sul telefono, **When** l'utente lo carica e indica tipo e data, **Then** compare nell'archivio con i dati inseriti.
2. **Given** lo stesso file già caricato, **When** l'utente lo ricarica, **Then** il sistema segnala il possibile duplicato.
3. **Given** un documento in formato non supportato, **When** l'utente lo carica, **Then** il sistema lo segnala con il motivo.

---

### User Story 2 - Trovare i documenti (Priority: P1)

L'utente cerca e filtra i documenti per anno, tipo, emittente, parole chiave, stato (da collegare, collegato, scaduto) e li apre o li scarica.

**Why this priority**: un archivio utile è quello in cui si trova tutto in pochi secondi.

**Independent Test**: dopo aver caricato più documenti, i filtri restituiscono solo quelli attesi.

**Acceptance Scenarios**:

1. **Given** più documenti, **When** l'utente filtra per anno e tipo, **Then** vede solo quelli corrispondenti.
2. **Given** una parola chiave, **When** l'utente cerca, **Then** compaiono i documenti in cui compare nei dati o nelle note.

---

### User Story 3 - Collegare i documenti alle voci (Priority: P1)

Ogni documento si collega alle voci a cui si riferisce: una spesa (specifica 008), un elemento della checklist o una scadenza (004), un credito (004), un versamento, una fattura (003). Dal documento si arriva alla voce e viceversa. Il sistema segnala i documenti non collegati e le voci che richiedono un documento ma non lo hanno.

**Why this priority**: il documento ha valore quando prova qualcosa.

**Independent Test**: collegando un documento a una spesa, la spesa mostra il giustificativo e non è più segnalata come senza documento.

**Acceptance Scenarios**:

1. **Given** una spesa senza giustificativo, **When** l'utente collega un documento, **Then** la spesa non è più segnalata.
2. **Given** un documento non collegato, **When** l'utente apre l'archivio, **Then** compare tra quelli "da collegare".
3. **Given** una voce con più documenti, **When** l'utente la apre, **Then** li vede tutti.

---

### User Story 4 - Sicurezza, conservazione e scadenze dei documenti (Priority: P2)

I documenti sono riservati al solo proprietario, mai accessibili da indirizzi pubblici, oscurabili con la modalità "occhio", inclusi nelle esportazioni cifrate. Il sistema ricorda per quanto tempo conservarli secondo le regole dell'anno, avvisa dei documenti in scadenza (per esempio polizze o certificati) e non cancella nulla senza conferma esplicita.

**Why this priority**: sono dati personali (e talvolta sanitari) e hanno obblighi di conservazione; viene dopo la funzione base.

**Independent Test**: un documento non è accessibile senza accesso; l'eliminazione richiede conferma e, per i documenti da conservare per legge, un avviso.

**Acceptance Scenarios**:

1. **Given** un utente non autorizzato, **When** prova ad aprire un documento, **Then** l'accesso è negato anche con l'indirizzo del file.
2. **Given** un documento da conservare per legge, **When** l'utente lo elimina, **Then** il sistema avvisa e richiede conferma.
3. **Given** un documento in scadenza, **When** si avvicina la data, **Then** compare un promemoria.

---

### User Story 5 - Esportare e condividere documenti (Priority: P3)

L'utente seleziona documenti o un'intera annualità e li esporta in un archivio protetto, anche per includerli nel pacchetto per il commercialista (specifica 009).

**Why this priority**: utile ma non essenziale alla prima versione.

**Independent Test**: l'esportazione di un anno contiene i documenti attesi in un file protetto.

**Acceptance Scenarios**:

1. **Given** un anno con documenti, **When** l'utente li esporta, **Then** ottiene un archivio protetto con indice.

---

### Edge Cases

- Documento duplicato o ricaricato con nome diverso.
- File molto grande, foto sfocata o illeggibile, file danneggiato.
- Documento che contiene dati clinici o di terzi per errore.
- Fattura elettronica ricevuta in formato XML con anche il PDF leggibile.
- Documento scaduto, sostituito o rettificato: la nuova versione non cancella la vecchia.
- Documento collegato a una voce poi eliminata.
- Documenti relativi a pazienti: nome non nel nome del file e oscurato nell'anteprima.
- Archivio che cresce oltre il limite di spazio del servizio.
- Uso senza connessione per consultare o caricare (TODO nella costituzione).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST permettere di caricare documenti in formato PDF, immagine (comprese le foto del telefono) e file XML di fatture elettroniche ricevute, da telefono e da PC, con tipo, anno, data, emittente, importo e note; il file XML MUST essere conservato come originale.
- **FR-002**: Il sistema MUST segnalare possibili duplicati e formati o dimensioni non supportati. Le foto MUST essere ridotte automaticamente a una qualità sempre leggibile, con un interruttore per conservare l'originale; PDF e XML MUST NOT essere modificati.
- **FR-003**: Il sistema MUST permettere di cercare e filtrare per anno, tipo, emittente, parola chiave e stato.
- **FR-004**: Il sistema MUST permettere di collegare ogni documento a una o più voci (fatture, spese, checklist, scadenze, crediti, versamenti) e MUST mostrare dalle voci i documenti collegati.
- **FR-005**: Il sistema MUST evidenziare i documenti non collegati e le voci che richiedono un documento senza averlo.
- **FR-006**: I documenti MUST essere riservati al solo proprietario (specifica 002), con accesso per riga e a livello di file, senza indirizzi pubblici.
- **FR-007**: Il sistema MUST non cancellare né sovrascrivere documenti senza conferma esplicita e MUST conservare le versioni precedenti di un documento sostituito. L'eliminazione MUST mandare il documento in un cestino per 30 giorni, da cui è ripristinabile; trascorsi 30 giorni MUST essere eliminato per sempre, e l'utente MUST poter svuotare il cestino subito con una conferma esplicita; per i documenti da conservare per legge MUST comparire un avviso prima dell'eliminazione.
- **FR-008**: Il sistema MUST indicare per ogni tipo di documento il periodo di conservazione previsto dalle regole dell'anno con fonte e stato di verifica.
- **FR-009**: Il sistema MUST avvisare dei documenti con scadenza propria (polizze, certificati) con anticipo configurabile.
- **FR-010**: Il sistema MUST permettere di esportare documenti selezionati o un anno intero in un file protetto con indice.
- **FR-011**: Il sistema MUST oscurare i documenti con la modalità "occhio" e non includere nomi di pazienti nei nomi dei file.
- **FR-012**: Il sistema MUST NOT archiviare dati clinici e MUST avvisare se un documento sembra contenerli.
- **FR-013**: Il sistema MUST registrare in un registro delle modifiche caricamento, collegamento, sostituzione ed eliminazione, senza contenuti.
- **FR-014**: Il sistema MUST mostrare che l'archivio dell'app non è una conservazione a norma dei documenti fiscali e, per i tipi di documento con obbligo di conservazione digitale (per esempio le fatture elettroniche emesse e ricevute), MUST mostrare un avviso che spiega cosa va conservato a norma e come (servizio gratuito dell'Agenzia delle Entrate o altro conservatore); le regole di conservazione MUST stare nel set di regole dell'anno con fonte e stato di verifica.
- **FR-015**: Quando l'utente carica un file XML di fattura elettronica ricevuta, il sistema MUST leggerne i dati strutturati (fornitore, data, numero, importo, IVA) e proporre la precompilazione della spesa nella specifica 008, MUST richiedere all'utente la conferma di categoria e deducibilità, MUST segnalare un file XML non valido o dati incoerenti e MUST NOT leggere automaticamente il contenuto di PDF e foto.

- **FR-016**: Il sistema MUST permettere di importare in una volta sola più fatture elettroniche ricevute: file XML, file XML firmati (.p7m) e archivi ZIP che li contengono, come quelli scaricati dal portale "Fatture e Corrispettivi". Ogni fattura importata MUST diventare un documento dell'archivio con il file originale e MUST comparire in una lista "da classificare" con fornitore, data, numero, importo e IVA letti dal file.
- **FR-017**: Durante l'importazione il sistema MUST riconoscere le fatture già presenti (stesso fornitore, numero e data, o stesso file) e MUST NOT crearle due volte; MUST indicare quante fatture ha importato, saltato perché già presenti e scartato perché non leggibili, con il motivo. Dalla lista "da classificare" l'utente MUST poter creare la spesa (specifica 008) confermando categoria e deducibilità, oppure segnare la fattura come "non è una spesa dell'attività".

### Key Entities *(include if feature involves data)*

- **Documento**: file, tipo, anno, data, emittente, importo, note, stato, versione, impronta del file (per i duplicati).
- **Collegamento**: relazione tra documento e voce (fattura, spesa, checklist, scadenza, credito, versamento).
- **Regola di conservazione**: tipo di documento, periodo, fonte, stato di verifica.
- **Scadenza del documento**: data propria e promemoria.
- **Esportazione**: selezione di documenti, data, protezione.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: L'utente carica e classifica un documento da telefono in meno di 1 minuto.
- **SC-002**: L'utente ritrova un documento qualsiasi in meno di 15 secondi.
- **SC-003**: Un utente non autorizzato non accede mai ai documenti, nemmeno con l'indirizzo del file (0 accessi riusciti nelle prove).
- **SC-004**: Una spesa con documento collegato non è mai segnalata come senza giustificativo (0 errori nelle prove).
- **SC-005**: Nessun documento viene cancellato senza conferma (0 casi nelle prove).

## Assumptions

- Il servizio dati scelto (specifica 002) offre un'area di conservazione file riservata; limiti di spazio, formati e dimensioni sono da definire nel piano.
- L'archivio dell'app **non** è conservazione sostitutiva a norma: le fatture elettroniche e i documenti con obbligo di conservazione digitale vanno conservati con i canali previsti (per esempio quelli dell'Agenzia delle Entrate o di un conservatore). Obblighi e durate sono da verificare col commercialista.
- I consensi informati dei pazienti (specifica 005) restano gestiti nella loro specifica e non vanno in questo archivio generale.
- Il riconoscimento automatico del testo (lettura del contenuto di PDF e foto) è rinviato; fa eccezione la lettura dei dati strutturati dei file XML delle fatture elettroniche ricevute.
- Per i documenti con dati personali valgono le regole di riservatezza della costituzione e il rischio residuo dei dati in chiaro accettato dall'utente; cifratura dei file da valutare nel piano.
- **Fuori ambito**: conservazione sostitutiva a norma, riconoscimento automatico del testo, importazione automatica da posta o dal Sistema di Interscambio (lo scarico dal portale resta manuale, l'importazione dei file scaricati è in FR-016), firma digitale, consensi dei pazienti (005), pacchetto per il commercialista (009).
