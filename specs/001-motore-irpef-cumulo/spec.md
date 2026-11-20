# Feature Specification: Motore IRPEF sul cumulo CU + P.IVA

**Feature Branch**: `001-motore-irpef-cumulo` (nessun repository git inizializzato)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Motore fiscale IRPEF sul cumulo CU + P.IVA (primo modulo di My Fiscal): dato il reddito da lavoro dipendente (dati CU) e il reddito professionale netto da psicologo in regime ordinario (principio di cassa), calcolare reddito complessivo, imposta per scaglioni, detrazioni ricalcolate, addizionali, imposte già trattenute e conguaglio reale; dedurre i contributi ENPAP; mostrare aliquota marginale e scaglione; simulatore what-if; spiegazione chiara di ogni risultato."

## Clarifications

### Session 2026-11-20

- Q: Il motore calcola anche gli acconti con il metodo previsionale oltre a quello storico? → A: Sì, entrambi i metodi nella 001 con confronto di giugno e novembre, più una funzione di strategia che confronta piani di versamento per distribuire meglio il carico (storia 5).
- Q: Come si inseriscono le aliquote delle addizionali regionale e comunale? → A: Regionale a scaglioni (anche con un solo scaglione), comunale con percentuale e soglia di esenzione facoltativa. Regione e comune di residenza sono dati del profilo dell'utente nel database, non nel repository pubblico.
- Q: Per le stime d'anno, quali contributi ENPAP conta il motore? → A: Quelli pagati più quelli previsti entro il 31 dicembre secondo il calendario ENPAP, mostrati a parte come "previsti"; a fine anno (anno concluso) contano solo i pagamenti reali.
- Q: Le detrazioni per familiari a carico sono calcolate dal motore nella prima versione? → A: No: nella prima versione l'utente inserisce a mano un importo complessivo di altre detrazioni (anche zero). Presenza di familiari a carico e percentuale di carico (per esempio 50%) sono registrati nella specifica 004 per le spese detraibili; il calcolo automatico viene dopo. I dettagli familiari non sono scritti nel repository pubblico.
- Precisazione dell'utente (2026-11-20): l'utente **resta dipendente in parallelo alla partita IVA** e quindi ogni anno ha una CU; una configurazione "solo partita IVA" senza CU è rinviata a una versione successiva. Le detrazioni per familiari applicate dal datore di lavoro risultano dalla CU e vanno confrontate con quelle spettanti sul reddito complessivo.
- Q: Con regole dell'anno non verificate il motore calcola o si rifiuta? → A: Calcola sempre, con avviso evidente, elenco delle regole non verificate e risultato marcato "provvisorio"; senza alcuna regola per l'anno non calcola.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conoscere il conguaglio reale dell'anno (Priority: P1)

L'utente, psicologo libero professionista con partita IVA e contemporaneamente lavoratore dipendente, inserisce i dati della sua Certificazione Unica e il reddito professionale netto dell'anno. Ottiene il quadro completo delle imposte dell'anno: reddito complessivo, imposta lorda, detrazioni, addizionali, imposte già trattenute dal datore di lavoro e **quanto dovrà versare (o riavere) a conguaglio**, con l'indicazione dello scaglione in cui si trova e della sua aliquota marginale.

**Why this priority**: è il cuore dell'app. Senza questo calcolo nessun altro modulo (Netto Reale, accantonamenti, scadenzario) può dare numeri affidabili. Da solo risponde alla domanda "quante tasse pagherò davvero su quello che guadagno con la P.IVA?".

**Independent Test**: inserendo i dati di un caso di esempio verificato a mano (CU e reddito professionale noti), il risultato coincide al centesimo con il calcolo di riferimento, e ogni voce mostra la sua spiegazione.

**Acceptance Scenarios**:

1. **Given** una CU con reddito imponibile da lavoro dipendente e imposte trattenute, e un reddito professionale netto positivo, **When** l'utente richiede il calcolo dell'anno, **Then** vede il reddito complessivo (somma dei due redditi al netto dei contributi previdenziali deducibili), l'imposta lorda per scaglioni, le detrazioni ricalcolate, le addizionali e il conguaglio a debito.
2. **Given** lo stesso caso, **When** l'utente guarda il risultato, **Then** vede lo scaglione IRPEF raggiunto e l'aliquota marginale, con una frase che spiega perché ogni euro in più viene tassato a quella aliquota.
3. **Given** un anno in cui l'utente non ha reddito professionale, **When** richiede il calcolo, **Then** il conguaglio risulta coerente con la sola CU (nessun importo inatteso) e il sistema non segnala errori.
4. **Given** dati incompleti o incoerenti (es. importi negativi non ammessi, anno senza regole disponibili), **When** l'utente richiede il calcolo, **Then** riceve un messaggio chiaro su cosa manca e nessun risultato parziale presentato come definitivo.

---

### User Story 2 - Simulare "e se fatturo ancora X?" (Priority: P2)

L'utente parte dal quadro attuale dell'anno e aggiunge uno scenario ipotetico (es. "altri 5.000 € di compensi entro dicembre", oppure una spesa in più). Il sistema mostra il confronto prima/dopo: variazione del reddito complessivo, scaglione, imposta aggiuntiva, contributi ENPAP aggiuntivi, **quanto in più si pagherà** e la stima dell'importo complessivo dovuto a giugno dell'anno successivo (saldo più primo acconto), sia come totale sia come quota attribuibile allo scenario.

**Why this priority**: trasforma il calcolo in uno strumento di decisione ("mi conviene accettare questo incarico a dicembre?"). Dipende dal calcolo della storia 1, ma si può usare e testare da solo con dati di esempio.

**Independent Test**: dato un caso base e uno scenario "+5.000 € di compensi", il confronto riporta la differenza di imposta e di contributi, coerente con il calcolo di riferimento ottenuto inserendo direttamente il reddito aumentato.

**Acceptance Scenarios**:

1. **Given** un quadro annuale calcolato, **When** l'utente aggiunge 5.000 € di compensi ipotetici, **Then** vede lo scaglione prima e dopo, l'aliquota marginale applicata alla parte aggiuntiva e il costo fiscale e contributivo di quei 5.000 €.
2. **Given** lo stesso scenario, **When** l'utente guarda la stima di giugno, **Then** vede l'importo del saldo e del primo acconto con e senza scenario, e la differenza.
3. **Given** uno scenario che fa superare una soglia di scaglione, **When** il sistema mostra il risultato, **Then** segnala che solo la parte eccedente è tassata all'aliquota superiore.
4. **Given** uno scenario annullato dall'utente, **When** torna al quadro reale, **Then** i dati reali dell'anno non sono stati modificati.

---

### User Story 3 - Gestire il primo anno di partita IVA (2027) (Priority: P2)

L'utente apre la P.IVA nel 2027 e non ha storico professionale. Il sistema gestisce questo primo anno come caso speciale: i contributi ENPAP sono calcolati con le regole 2027 (contributo soggettivo all'aliquota prevista, integrativo al 4%, maternità), gli acconti dell'anno si basano su uno storico che riguarda solo il lavoro dipendente, e il sistema avvisa che il grosso delle imposte sul reddito professionale 2027 emergerà come saldo l'anno successivo.

**Why this priority**: è il caso reale dell'utente e quello in cui è più facile sbagliarsi sulle cifre da accantonare. Riguarda soprattutto l'esattezza del primo anno.

**Independent Test**: con un caso 2027 (CU del 2026 senza reddito professionale, reddito professionale 2027 positivo), il sistema indica correttamente che l'acconto 2027 è calcolato sullo storico del solo dipendente e mostra la stima del saldo che ne deriva.

**Acceptance Scenarios**:

1. **Given** anno d'imposta 2027 e nessuno storico professionale, **When** l'utente richiede il calcolo, **Then** il sistema non chiede dati professionali del 2026 e spiega che lo storico considera solo il lavoro dipendente.
2. **Given** reddito professionale 2027 positivo, **When** il sistema mostra il quadro, **Then** evidenzia l'importo che l'utente dovrebbe accantonare per il saldo dell'anno successivo.
3. **Given** i contributi ENPAP versati nell'anno, **When** il sistema calcola la deduzione, **Then** deduce i contributi deducibili (soggettivo e maternità) nell'anno in cui sono effettivamente versati e non deduce l'integrativo.

---

### User Story 4 - Aggiornare le regole fiscali a un nuovo anno (Priority: P3)

Ogni anno cambiano scaglioni, aliquote, detrazioni o aliquote ENPAP. L'utente (o chi mantiene l'app) deve poter aggiungere le regole di un nuovo anno senza modificare il modo in cui i calcoli sono eseguiti, e poter ricalcolare anni passati con le regole di allora.

**Why this priority**: non dà valore immediato, ma garantisce che i risultati restino corretti negli anni e che i calcoli passati siano riproducibili.

**Independent Test**: aggiungendo un set di regole per un nuovo anno con valori diversi, lo stesso caso restituisce risultati diversi e coerenti con quelle regole, mentre i risultati degli anni precedenti restano invariati.

**Acceptance Scenarios**:

1. **Given** regole disponibili per due anni diversi, **When** lo stesso caso viene calcolato per ciascun anno, **Then** ogni calcolo usa solo le regole del proprio anno.
2. **Given** un anno senza regole definite, **When** l'utente lo seleziona, **Then** il sistema lo segnala invece di usare silenziosamente le regole di un altro anno.
3. **Given** una regola di cui la fonte normativa non è stata ancora verificata, **When** compare in un risultato, **Then** il sistema la segnala come "da verificare".

---

### User Story 5 - Distribuire meglio il carico fiscale: strategia dei versamenti (Priority: P2)

L'utente vede quanto dovrà versare nei prossimi mesi e confronta **piani di versamento** alternativi per evitare picchi di uscita, soprattutto nel passaggio dal primo anno (poche tasse versate) al secondo (saldo del primo anno più acconto basato sul primo anno). Il sistema confronta: (1) il **minimo di legge** con il metodo storico; (2) il **metodo previsionale**, che versa meno se il reddito atteso è inferiore; (3) un **acconto volontario anticipato** (per esempio un versamento in più a fine 2027, che non è una perdita ma un credito sul saldo e riduce il picco di giugno 2028); (4) la **rateizzazione** di saldo e primo acconto, con interessi; (5) il **differimento con maggiorazione** di una piccola percentuale, quando ammesso. Per ogni piano mostra versamenti mese per mese, il picco, i costi aggiuntivi, il rischio di sanzione per versamento insufficiente e il totale d'imposta, che resta lo stesso. Propone il piano che riduce di più il picco mensile con costi dichiarati, spiegando le ipotesi.

**Why this priority**: l'imposta totale non cambia, ma il momento in cui si paga sì; per chi inizia la partita IVA gestire il picco evita di restare senza liquidità o di pagare sanzioni.

**Independent Test**: con un caso del primo anno (2027) e uno del secondo, il sistema produce per ciascun piano i versamenti per mese, il picco e i costi coerenti con il calcolo manuale, e il totale d'imposta è uguale in tutti i piani.

**Acceptance Scenarios**:

1. **Given** il primo anno senza storico professionale, **When** l'utente apre la strategia, **Then** vede l'effetto su giugno e novembre dell'anno dopo con ciascun piano e il piano consigliato.
2. **Given** un piano con acconto volontario anticipato, **When** l'utente lo seleziona, **Then** il sistema mostra l'importo versato in più, la data scelta e di quanto scende il picco successivo.
3. **Given** un piano previsionale con reddito stimato inferiore al reale, **When** il sistema lo mostra, **Then** segnala il rischio di sanzione e interessi per versamento insufficiente.
4. **Given** una rateizzazione di saldo e primo acconto, **When** l'utente la seleziona, **Then** il sistema mostra le rate, gli interessi complessivi e le scadenze.
5. **Given** qualsiasi piano, **When** l'utente lo confronta con gli altri, **Then** il totale d'imposta dell'anno è identico e cambiano solo tempi e costi.

---

### Edge Cases

- Reddito professionale **negativo** (perdita dell'anno): come incide sul reddito complessivo e sui contributi ENPAP.
- Reddito professionale **zero** o molto basso: sono comunque dovuti i contributi minimi ENPAP.
- **Più CU** nello stesso anno (due datori di lavoro) o rapporto di lavoro dipendente che termina in corso d'anno.
- Reddito complessivo che porta alla **riduzione o perdita delle detrazioni** per lavoro dipendente rispetto a quelle già applicate in busta paga.
- **Conguaglio a credito** (l'utente ha trattenuto più del dovuto, per esempio con una perdita professionale).
- **Contributi ENPAP versati in un anno diverso** da quello di competenza (deducibilità per cassa).
- Scenario ipotetico che **supera più soglie** di scaglione o riduce il reddito (spesa ipotetica).
- Importi con **arrotondamenti** (centesimi nei calcoli intermedi, euro nelle voci di dichiarazione).
- Anno d'imposta **non ancora concluso**: dati parziali e proiezioni a fine anno.
- Regole di un anno **incomplete o non verificate**: il calcolo prosegue con il risultato marcato "provvisorio"; se manca una regola essenziale (per esempio gli scaglioni) il calcolo non è possibile.
- Acconto non dovuto perché l'imposta di riferimento è sotto la soglia minima, o acconto volontario superiore al dovuto che genera credito.
- Soggetto agli indici di affidabilità fiscale o no: cambia ripartizione e date degli acconti.
- Metodo previsionale con reddito atteso molto inferiore al reale: rischio di versamento insufficiente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST accettare per un anno d'imposta i dati della Certificazione Unica: reddito imponibile da lavoro dipendente, ritenute IRPEF, addizionale regionale e comunale trattenute, detrazioni fruite (distinguendo quelle per lavoro dipendente da quelle per familiari a carico), e permettere più CU nello stesso anno.
- **FR-002**: Il sistema MUST accettare il reddito professionale netto dell'anno determinato per cassa (incassi effettivi meno spese inerenti pagate nell'anno), anche negativo.
- **FR-003**: Il sistema MUST calcolare il reddito complessivo come somma del reddito da lavoro dipendente e del reddito professionale netto, al netto dei contributi previdenziali obbligatori deducibili.
- **FR-004**: Il sistema MUST calcolare i contributi ENPAP dell'anno: soggettivo con l'aliquota in vigore per l'anno, integrativo, maternità e i minimi previsti, secondo le regole dell'anno.
- **FR-005**: Il sistema MUST dedurre dal reddito complessivo il contributo soggettivo e il contributo di maternità versati nell'anno, e MUST NOT dedurre il contributo integrativo. Nelle stime di un anno non concluso il sistema MUST includere anche i contributi previsti entro il 31 dicembre secondo il calendario ENPAP delle regole dell'anno, mostrandoli a parte come "previsti, non ancora pagati" con il loro effetto sulle imposte; per un anno concluso MUST contare solo i versamenti registrati. Il sistema MUST permettere di registrare i versamenti ENPAP (data, importo, tipo).
- **FR-006**: Il sistema MUST calcolare l'IRPEF lorda applicando gli scaglioni progressivi dell'anno al reddito complessivo.
- **FR-007**: Il sistema MUST ricalcolare le detrazioni per lavoro dipendente sul reddito complessivo, confrontarle con quelle già fruite in CU e applicare solo la differenza spettante.
- **FR-008**: Il sistema MUST calcolare le addizionali regionale e comunale sul reddito complessivo, usando le aliquote indicate dall'utente per la propria residenza: per la regionale una tabella a scaglioni di reddito (che può avere un solo scaglione), per la comunale una percentuale con soglia di esenzione facoltativa. Ogni aliquota MUST avere l'anno di riferimento e lo stato di verifica, e il sistema MUST segnalare se mancano per l'anno calcolato.
- **FR-009**: Il sistema MUST sottrarre le imposte già trattenute dal datore di lavoro e le ritenute subite, e determinare il **conguaglio** a debito o a credito.
- **FR-010**: Il sistema MUST indicare lo scaglione IRPEF raggiunto, l'aliquota marginale e quanto reddito manca al prossimo scaglione.
- **FR-011**: Il sistema MUST accompagnare ogni risultato intermedio e finale con una spiegazione in linguaggio chiaro della logica fiscale applicata e della regola usata.
- **FR-012**: Il sistema MUST permettere scenari "what-if" che aggiungano o tolgano compensi o spese all'anno, mostrando il confronto prima/dopo di reddito complessivo, scaglione, imposta, contributi ENPAP e conguaglio.
- **FR-013**: Il sistema MUST stimare, per ogni anno e scenario, gli importi dovuti a giugno (saldo più primo acconto) e a novembre dell'anno successivo (secondo acconto) sia con metodo storico sia con metodo previsionale, mostrarne il confronto e MUST distinguere la quota dovuta allo scenario.
- **FR-014**: Gli scenari MUST NOT alterare i dati reali dell'anno e MUST poter essere scartati.
- **FR-015**: Il sistema MUST gestire il primo anno di partita IVA senza storico professionale, calcolando gli acconti sullo storico del solo lavoro dipendente e avvisando l'utente dell'impatto sul saldo dell'anno successivo.
- **FR-016**: Le regole fiscali (scaglioni, aliquote, detrazioni, aliquote e minimi ENPAP, soglie) MUST essere raccolte in un set distinto per ciascun anno d'imposta, aggiornabile senza modificare il modo in cui i calcoli sono eseguiti, e ogni regola MUST riportare la fonte normativa e lo stato di verifica.
- **FR-017**: Il sistema MUST segnalare esplicitamente ogni anno senza regole disponibili e ogni regola non verificata, senza applicare valori di altri anni. Con regole presenti ma non verificate il sistema MUST calcolare comunque, marcando ogni risultato come "provvisorio" con un avviso evidente e l'elenco delle regole non verificate usate, e MUST NOT presentarlo come definitivo; per un anno senza alcuna regola MUST NOT calcolare.
- **FR-018**: Tutti gli importi MUST essere gestiti senza errori di arrotondamento e con regole di arrotondamento esplicite e documentate.
- **FR-019**: Il sistema MUST segnalare dati incompleti o incoerenti con messaggi chiari e non presentare come definitivo un risultato calcolato con dati mancanti.
- **FR-020**: Il sistema MUST mostrare che i risultati sono stime fino a verifica con il commercialista o con la dichiarazione ufficiale.
- **FR-021**: Il sistema MUST disporre di una batteria di casi di prova con risultati verificati a mano che copra: solo CU, CU più reddito professionale, perdita professionale, superamento di scaglione, primo anno di P.IVA e confronto tra due anni di regole.
- **FR-022**: Il sistema MUST permettere di assegnare i compensi di attività diverse da quella di psicologo (specifica 003) a un trattamento previdenziale configurabile (ENPAP o Gestione Separata INPS), da verificare con ENPAP e commercialista, e MUST segnalare il caso come non verificato finché non confermato.
- **FR-023**: Il sistema MUST accettare dalle specifiche 004 e 008 gli oneri deducibili (oltre ai contributi ENPAP) e le spese detraibili dell'anno e MUST applicarli: deduzioni dal reddito complessivo e detrazioni dall'imposta con aliquote, franchigie e limiti previsti dall'anno, indicando l'eventuale parte detraibile non utilizzabile perché eccede l'imposta (incapienza) e il risparmio d'imposta di ogni voce.

- **FR-024**: Il sistema MUST calcolare gli acconti con entrambi i metodi, applicando dalle regole dell'anno: soglia minima sotto cui l'acconto non è dovuto, ripartizione tra prima e seconda rata (per esempio 40% e 60%, oppure 50% e 50% per i soggetti agli indici di affidabilità fiscale, da verificare) e acconto sulle addizionali.
- **FR-025**: Il sistema MUST confrontare piani di versamento alternativi: minimo di legge (storico), previsionale, acconto volontario anticipato con importo e data scelti dall'utente, rateizzazione di saldo e primo acconto, differimento con maggiorazione quando ammesso.
- **FR-026**: Per ogni piano il sistema MUST mostrare i versamenti mese per mese, il picco mensile, i costi aggiuntivi (interessi, maggiorazioni), il rischio di sanzione per versamento insufficiente e il totale d'imposta, che MUST essere identico tra i piani.
- **FR-027**: Il sistema MUST proporre il piano che riduce di più il picco mensile entro i costi dichiarati e MUST spiegarne ipotesi e motivi; nel primo anno MUST evidenziare l'effetto su giugno e novembre dell'anno successivo.
- **FR-028**: Con il metodo previsionale il sistema MUST richiedere o ricavare il reddito atteso, conservarlo come ipotesi e avvisare del rischio di versamento insufficiente se la stima è inferiore a quella aggiornata.
- **FR-029**: Il sistema MUST NOT proporre strategie che alterino date o importi di incassi e fatture, né pratiche elusive: ammette solo scelte sui tempi e sul metodo di versamento previste dalla normativa.
- **FR-030**: Percentuali e ripartizione degli acconti, soglie minime, interessi di rateizzazione, maggiorazioni, date e ammissibilità del differimento MUST stare nel set di regole per anno con fonte e stato di verifica; le regole non verificate MUST essere segnalate.
- **FR-031**: Il sistema MUST permettere di registrare gli acconti realmente versati e MUST usarli per saldo e confronti, trattando l'eventuale eccedenza come credito.
- **FR-032**: Il sistema MUST permettere di inserire per ogni anno un importo complessivo di altre detrazioni d'imposta spettanti per familiari a carico e altre voci (anche zero), applicarlo nel calcolo dell'imposta netta e mostrarlo nella spiegazione come dato inserito dall'utente, non calcolato. Il sistema MUST confrontare tale importo con le detrazioni per familiari già fruite in CU e applicare solo la differenza (a debito se spettano meno di quanto fruito), come per le detrazioni da lavoro dipendente (FR-007).

### Key Entities *(include if feature involves data)*

- **Piano di versamento**: strategia (minimo storico, previsionale, acconto volontario, rateizzazione, differimento), versamenti per data, picco, costi, rischio, totale d'imposta.
- **Acconto**: metodo, rata, importo dovuto e versato, data, eventuale eccedenza a credito.

- **Anno d'imposta e set di regole**: l'insieme dei parametri normativi di un anno (scaglioni, aliquote IRPEF, formula delle detrazioni, aliquote e minimi ENPAP, soglie), con fonte e stato di verifica per ciascuno.
- **Certificazione Unica (CU)**: reddito imponibile, ritenute IRPEF, addizionali trattenute, detrazioni fruite, riferiti a un anno e a un datore di lavoro.
- **Reddito professionale**: ricavi per cassa, spese inerenti pagate, reddito netto dell'anno.
- **Contributi ENPAP**: dovuti (soggettivo, integrativo, maternità) e versati nell'anno, con indicazione di quali sono deducibili.
- **Scenario**: variazione ipotetica (compensi o spese) applicata a un anno, separata dai dati reali.
- **Risultato del calcolo**: reddito complessivo, imposta lorda, detrazioni, addizionali, imposte già trattenute, conguaglio, scaglione e aliquota marginale, stima di giugno, con spiegazione per ogni voce.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In tutti i casi di prova verificati a mano, i risultati coincidono con il calcolo di riferimento al centesimo (0 scostamenti).
- **SC-002**: L'utente ottiene il quadro completo dell'anno inserendo i dati della CU e il reddito professionale in meno di 5 minuti.
- **SC-003**: Una simulazione "+X euro di compensi" restituisce il confronto prima/dopo in meno di 5 secondi dal momento in cui l'utente inserisce l'importo.
- **SC-004**: Il 100% dei risultati mostrati ha una spiegazione leggibile da una persona senza competenze fiscali, con indicazione della regola e dell'anno applicati.
- **SC-005**: Aggiungere le regole di un nuovo anno non modifica i risultati degli anni già calcolati (verifica su un caso confrontato prima e dopo).
- **SC-006**: Per il primo anno di P.IVA, l'importo da accantonare per il saldo dell'anno successivo compare nello stesso quadro del risultato, accompagnato dall'avviso sul primo anno, senza che l'utente debba cercarlo in altre schermate.
- **SC-007**: In tutti i casi di prova il totale d'imposta è identico tra i piani di versamento e i versamenti per mese coincidono al centesimo con il calcolo manuale.
- **SC-008**: Per il primo anno l'utente vede in meno di 10 secondi il picco di giugno dell'anno dopo con e senza strategia.

## Assumptions

- L'utente è psicologo con partita IVA in regime ordinario dal 2027, iscritto all'ENPAP (non alla Gestione Separata INPS), con reddito da lavoro dipendente superiore a 35.000 €; il regime forfettario è escluso e non va proposto. L'utente **rimane dipendente in parallelo** alla partita IVA: ogni anno c'è una CU e il reddito è sempre in cumulo; la modalità "solo partita IVA" è rinviata.
- Gli **scaglioni e le aliquote IRPEF 2027, le detrazioni per lavoro dipendente 2027 e le soglie** non sono ancora verificati su fonte ufficiale: l'app li tratta come regole "da verificare" finché non vengono confermati. Per gli anni precedenti si usano le regole in vigore.
- Aliquote ENPAP per anno: contributo soggettivo 10% fino al 2026, 11% nel 2027, poi +1 punto all'anno fino al 15% dal 2031 (salvo scelta volontaria di aliquota maggiore); contributo integrativo 4% dal 2027 (2% prima). Questi valori derivano dalla delibera ENPAP n. 02/26 del 23/04/2026; **minimi 2027, importo della maternità, agevolazioni per nuovi iscritti, scadenze del primo anno e decorrenza esatta dell'11%** sono da verificare con l'ENPAP prima della conferma.
- Il contributo soggettivo e quello di maternità sono deducibili nell'anno di versamento (principio di cassa); l'integrativo non lo è.
- Le aliquote delle addizionali regionale e comunale sono inserite dall'utente in base alla propria residenza, salvate nel suo profilo (non nel repository pubblico) e verificate per ogni anno sui siti ufficiali della regione e del comune; la regionale può essere a scaglioni, la comunale può avere una soglia di esenzione.
- Bonus e detrazioni specifiche per fasce di reddito basse non sono considerati in questa prima versione. Le detrazioni per familiari a carico non sono calcolate in automatico: l'utente inserisce un importo complessivo di "altre detrazioni" (anche zero); la presenza di familiari a carico e la percentuale di carico servono alle spese detraibili (specifica 004). Regole su età, limiti di reddito e rapporto con l'assegno unico sono da verificare col commercialista prima di automatizzare il calcolo.
- Il motore calcola gli acconti sia con il metodo storico sia con quello previsionale e confronta piani di versamento (storia 5); il calendario delle scadenze con i codici tributo F24 appartiene al modulo Scadenzario (specifica 004). Le regole di base (acconto storico sull'imposta dell'anno prima, ripartizione 40/60 o 50/50 per i soggetti ISA, rateizzazione con interessi mensili, differimento con maggiorazione) risultano da fonti di settore e sono **da verificare** su fonte ufficiale per il 2027 e gli anni successivi; per esempio per il 2026 le fonti non concordano sulle date per i soggetti ISA. Se l'utente sia o no soggetto agli indici di affidabilità fiscale (ISA) è da verificare con il commercialista e cambia ripartizione e date.
- Un versamento di acconto superiore al dovuto è ammesso e genera credito sul saldo: questo è alla base della strategia dell'acconto volontario; la normativa va verificata col commercialista prima di applicarla.
- La perdita professionale riduce il reddito complessivo dell'anno; il trattamento esatto è da confermare in fase di chiarimento.
- **Fuori ambito**: fatturazione, registro costi e deducibilità spese, scadenzario F24 e relativi calcoli di calendario, salvataggio dei dati nel database e autenticazione (specifica 002), grafica e dashboard. Questo modulo fornisce i calcoli sui quali queste parti si appoggeranno.
- Il risultato è una stima per uso personale e non sostituisce la dichiarazione ufficiale né il parere del commercialista.
