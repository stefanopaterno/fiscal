# My Fiscal Constitution

## Core Principles

### I. Motore Fiscale Separato e Versionato per Anno (NON-NEGOTIABLE)
Tutta la logica fiscale (scaglioni IRPEF, aliquote, detrazioni, soglie, acconti, codici tributo,
aliquote previdenziali) MUST vivere in moduli dedicati, privi di dipendenze dall'interfaccia
utente, con un set di regole distinto per ciascun anno d'imposta (es. `taxRules2026`).
Nessun valore normativo MUST essere scritto "a mano" nella UI o nei componenti. Il passaggio
all'anno successivo MUST richiedere solo l'aggiunta di un nuovo set di regole, non la modifica
del motore.
*Motivazione*: le norme cambiano ogni anno; i calcoli storici devono restare riproducibili.

### II. Calcoli Spiegabili e Fedeli alla Normativa
Ogni risultato fiscale mostrato (imposta, acconto, accantonamento, netto reale) MUST essere
accompagnato da una spiegazione sintetica e in linguaggio chiaro della logica applicata
(es. aliquota marginale e scaglione di riferimento). Il reddito professionale MUST essere
determinato per cassa (incassi effettivi meno spese inerenti pagate nel periodo d'imposta).
Ogni regola MUST indicare la fonte normativa di riferimento. Quando una regola è incerta o
dipende da una scelta dell'utente, l'app MUST segnalarlo invece di assumere un valore.
*Motivazione*: l'utente prende decisioni economiche sulla base dei numeri; devono essere
verificabili.

### III. Test-First sui Calcoli (NON-NEGOTIABLE)
Ogni funzione del motore fiscale MUST avere test automatici scritti prima dell'implementazione,
con casi numerici verificati a mano (o da fonti ufficiali) per: cumulo CU + reddito
professionale, scaglioni IRPEF, ritenuta d'acconto 20%, bollo da 2 € oltre 77,47 €, contributo
integrativo/rivalsa, IVA, saldo e acconti (metodo storico e previsionale). Una modifica alle
regole fiscali MUST essere accompagnata dall'aggiornamento dei test. Gli importi MUST essere
gestiti senza errori di arrotondamento da virgola mobile (interi in centesimi o tipo decimale)
con regole di arrotondamento esplicite.
*Motivazione*: un errore di calcolo ha conseguenze economiche dirette.

### IV. Architettura e Modello Dati Prima del Codice
Prima di scrivere codice per un modulo, MUST essere approvato il modello dati (schema
JSON/DB) e l'architettura del modulo. Lo sviluppo MUST procedere per moduli incrementali,
ciascuno testabile e utilizzabile in modo indipendente. I moduli core sono: Dashboard "Netto
Reale & Salvadanaio Tasse", Fatturazione & Parcella Builder, Registro Costi & Deducibilità,
Simulatore CU + P.IVA, Scadenzario F24 & Piano Acconti. Ogni scelta architetturale MUST
supportare almeno uno di questi moduli.
*Motivazione*: evitare riscritture e mantenere ogni passo verificabile.

### V. Configurabilità dell'Assetto Fiscale e Previdenziale
Le variabili dell'assetto dell'utente MUST essere configurazioni, non codice: tipo di
previdenza (Cassa autonoma come ENPAP con contributo soggettivo, integrativo e maternità,
oppure Gestione Separata INPS con eventuale rivalsa del 4%), regime IVA (22%, esenzioni,
split payment, reverse charge), periodicità delle liquidazioni IVA (mensile o trimestrale con
maggiorazione 1%), percentuali di deducibilità e detraibilità IVA per categoria di spesa.
*Motivazione*: l'assetto può cambiare senza dover riscrivere l'app.

### VI. Interfaccia Minimalista, Data-Driven e Responsive
La UI MUST essere moderna, ordinata e priva di elementi superflui: card con KPI chiari, grafici
a barre/ciambella per il breakdown fiscale. I componenti dell'interfaccia MUST essere quelli di
Fluent UI 9 (`@fluentui/react-components`), con un tema chiaro e scuro coerente; il layout
(navigazione, disposizione delle schermate) sarà definito più avanti. TODO(LAYOUT): scegliere
layout e tema nel piano; lo stile iOS di My Money non è più il riferimento. Ogni
schermata MUST rispondere a una decisione concreta dell'utente (es. "quanto posso spendere
oggi?", "quanto pagherò a giugno?"). Il testo dell'interfaccia MUST essere in italiano, chiaro
e privo di legalese inutile. Ogni schermata, campo, importo calcolato e termine tecnico MUST
avere un aiuto contestuale in linguaggio semplicissimo, con esempio e spiegazione di "perché
mi viene chiesto" e "da dove viene questo numero" (specifica 011).
L'app MUST essere un'unica base di codice, progettata mobile-first e pienamente utilizzabile
sia da telefono sia da PC: nessuna versione separata per dispositivo. Ogni schermata MUST
funzionare senza scroll orizzontale dai 360 px di larghezza in su, con elementi interattivi
adatti al tocco (area minima 44 px). Le azioni frequenti (registrare un incasso o una spesa,
consultare il Netto Reale) MUST essere completabili da telefono con pochi passaggi.
*Motivazione*: l'app è uno strumento personale di uso frequente su più dispositivi; la
chiarezza viene prima della quantità di dati e un solo codice evita calcoli divergenti.

### VII. Dati su Supabase con Login a Due Fattori e Accesso per Riga (NON-NEGOTIABLE)
I dati fiscali ed economici dell'utente MUST risiedere in un database Supabase (Postgres)
del progetto dell'utente, unica fonte di verità per PC e telefono. L'accesso ai dati MUST
richiedere un login con autenticazione a due fattori (MFA di Supabase Auth) e sessioni con
scadenza. Ogni tabella MUST avere Row Level Security attiva con regole che consentono la
lettura e la scrittura solo al proprietario autenticato delle righe; nessuna tabella MUST
esistere senza queste regole, e le regole MUST avere test automatici che dimostrino che un
utente non autenticato o diverso non legge né scrive nulla.
Nel client e nel repository MUST comparire solo l'indirizzo del progetto e la chiave pubblica
(anon/publishable); la chiave di servizio (`service_role`) e ogni altra chiave segreta MUST NOT
comparire mai nel codice, nel repository, nei log o nel browser.
I dati sono conservati in chiaro sul server, per scelta consapevole dell'utente: chi ha accesso
amministrativo al progetto Supabase può leggerli. L'account Supabase dell'utente MUST quindi
essere protetto con 2FA e il progetto MUST NOT avere altri membri senza decisione esplicita.
Nessun dato MUST essere inviato ad altri servizi di terzi, nemmeno per telemetria. Gli export e
i backup in file MUST essere cifrati per impostazione predefinita (l'export in chiaro MUST
richiedere una scelta esplicita) e l'app MUST ricordare all'utente il backup quando l'ultimo è
lontano nel tempo. Lo schema del database MUST essere versionato con migrazioni.
Il repository del codice MUST NOT contenere dati personali (le cartelle di dati personali MUST
essere in `.gitignore`). Come in My Money, l'app MUST offrire la modalità che nasconde gli
importi finché non vengono mostrati esplicitamente, con ri-oscuramento quando l'app va in
background e blocco automatico per inattività.
*Motivazione*: i dati devono essere uguali su PC e telefono senza passaggi manuali; la
protezione si basa su accesso autenticato a due fattori e su regole di accesso per riga, con un
rischio residuo (dati leggibili dal gestore del progetto) accettato dall'utente.

## Vincoli di Dominio e Tecnici

- **Natura dell'app**: My Fiscal è uno strumento personale di simulazione e organizzazione, non
  sostituisce il commercialista né le dichiarazioni ufficiali. L'app MUST mostrare in modo
  visibile che i risultati sono stime fino a verifica.
- **Riferimento normativo**: normativa fiscale italiana vigente per gli anni 2026/2027.
- **Privacy dei dati**: vedi principio VII. I dati fiscali e personali sono conservati solo nel
  progetto Supabase dell'utente; nessun altro servizio di terzi li riceve.
- **Stack tecnologico** (valutato il 2026-11-21 in funzione dell'hosting su Vercel): applicazione
  **a più pagine** (non a pagina singola), con una pagina vera e un indirizzo proprio per ogni
  sezione (dashboard, fatture, spese, simulatore, scadenzario, archivio, impostazioni, ecc.).
  Tecnologie: TypeScript, React (richiesto da Fluent UI 9, che è una libreria per React),
  Next.js con instradamento a file e **esportazione statica** (`output: 'export'`, che produce
  una pagina HTML per ogni percorso), Fluent UI 9, PWA con service worker (libreria da scegliere
  nel piano) e client JavaScript di Supabase per accesso ai dati e autenticazione. Di Next.js
  MUST essere usata solo l'esportazione statica: MUST NOT essere usati funzioni server, route
  handler, middleware, azioni server né rendering a ogni richiesta, perché un server di mezzo
  vedrebbe i dati dei pazienti (principio VII). Login e controllo dell'accesso avvengono nel
  browser con Supabase e Row Level Security; ogni pagina protetta MUST reindirizzare al login
  se non c'è una sessione con secondo fattore valido. Libreria di test: Vitest. Il motore fiscale
  MUST essere un modulo TypeScript puro, senza dipendenze da UI, browser o rete, eseguibile e
  testabile da riga di comando. Versioni esatte di Next.js, React, Fluent UI 9 e Vitest,
  gestore di pacchetti e versione di Node: da fissare nel piano (e bloccate nel file di lock).
  Calcoli, PDF, file Excel e pacchetti cifrati MUST essere generati nel browser dell'utente, non
  in funzioni server. TODO(PWA_NEXT): scegliere nel piano come gestire il service worker con
  l'esportazione statica di Next.js.
  Roadmap: la release successiva alla prima prevede job schedulati lato server (notifiche e
  salvataggi automatici); il piano della prima versione MUST non precluderli. Preferenza
  indicata per quei job: funzioni pianificate di Supabase (pg_cron ed Edge Functions), perché i
  dati restano dentro il solo progetto Supabase; i Cron Job di Vercel MUST NOT elaborare dati
  personali. TODO(NOTIFICHE_JOB): confermare nel piano della release successiva meccanismo e
  canale delle notifiche.
- **Hosting**: l'app (solo file statici prodotti dall'esportazione statica di Next.js, cartella `out`) MUST essere
  pubblicata su Vercel in HTTPS, collegato al repository GitHub `stefanopaterno/fiscal`
  (pubblicazione a ogni push su `main`). Vercel MUST servire solo il codice dell'app: nessuna
  funzione server (Serverless, Edge o Cron) di Vercel MUST ricevere, elaborare o conservare dati
  fiscali o personali; i dati viaggiano solo tra il browser e Supabase. Il repository è pubblico
  e MUST NOT contenere dati personali né chiavi segrete (principio VII). Le variabili di ambiente
  di Vercel (prefisso `VITE_`, incorporate nel codice pubblico) MUST contenere solo l'indirizzo
  del progetto e la chiave pubblica di Supabase; la chiave di servizio (`service_role`) MUST NOT
  essere mai su Vercel né nel repository. La configurazione di Vercel (`vercel.json`) MUST
  riportare: percorsi con barra finale coerenti con le pagine esportate, intestazioni di sicurezza
  (HSTS, Content-Security-Policy limitata alla propria origine e al progetto Supabase,
  X-Content-Type-Options, X-Frame-Options o frame-ancestors, Referrer-Policy, Permissions-Policy)
  e intestazioni di cache che non conservino mai a lungo `index.html` e il service worker. Il
  service worker MUST NOT memorizzare risposte con dati dell'utente. Le anteprime di Vercel per
  rami e richieste di modifica MUST essere disattivate o protette e MUST NOT usare il database di
  produzione. TODO(VERCEL_PIANO): verificare che il piano gratuito Hobby di Vercel (previsto per
  uso personale non commerciale) sia ammesso per questo uso professionale personale; in caso
  contrario valutare il piano a pagamento o un altro hosting statico.
- **Pagina di cortesia**: la pagina `index.html` alla radice ("Soarlyai project") MUST restare
  invariata finché l'utente non decide diversamente; l'app non la sostituisce né la modifica.
  TODO(ACCESSO_APP): decidere più avanti come si raggiunge l'app dalla pagina di cortesia
  (percorso dedicato o altro); fino ad allora l'app non è collegata alla pagina di cortesia.
- **Database**: Supabase, progetto `https://aldiyymgvngvdrroluus.supabase.co`. L'indirizzo è
  pubblico per natura, ma l'accesso ai dati MUST dipendere solo da login, 2FA e Row Level
  Security. TODO(REGIONE): verificare la regione del progetto, preferibilmente UE.
- **Multi-dispositivo**: PC e telefono leggono e scrivono gli stessi dati dal database.
- **Uso senza connessione**: nella prima versione l'accesso ai dati richiede la connessione. Se la
  rete cade durante un inserimento, il dato MUST essere conservato in una coda protetta sul
  dispositivo e inviato al ritorno della rete, senza mai perderlo; MUST NOT esistere una copia
  completa dei dati sul dispositivo. L'uso offline completo (consultazione e inserimento) è
  rinviato. TODO(OFFLINE_CODA): scegliere nel piano come proteggere la coda sul dispositivo e come
  gestire i conflitti.
- **Storage dati e backup**: database Supabase come fonte di verità, più export e backup in file
  cifrati. Struttura del file di backup e politica di ripristino: da definire nel piano.
- **Autenticazione a due fattori**: login di Supabase Auth con secondo fattore obbligatorio per
  ogni accesso ai dati. Sono obbligatori codici di recupero e blocco automatico per inattività.
  Secondo fattore deciso: app di autenticazione con codici temporanei (l'utente usa Google
  Authenticator), senza SMS. Recupero: codici monouso, frase di recupero personale (solo per avviare un
  ripristino con attesa e avviso, mai per saltare il secondo fattore) e ripristino da
  amministratore; nessun reset via e-mail. TODO(RECUPERO_ATTESA): durata dell'attesa e canale
  dell'avviso da definire nel piano (vedi specifica 002).
- **Dati dei pazienti (categoria particolare GDPR)**: i dati di pazienti e clienti sono dati
  relativi alla salute. L'app MUST conservarne solo il minimo necessario a fatture e Sistema
  Tessera Sanitaria (identificativi) e MUST NOT conservare dati clinici (diagnosi, note di
  seduta, contenuti delle sedute) in nessuna tabella, allegato o esportazione. Questi dati MUST
  essere oscurati dalla modalità che nasconde gli importi. Fa eccezione il consenso informato:
  l'app MAY conservare per ogni paziente il consenso (data, versione del testo, firmatario,
  eventuale copia firmata, revoca), che MUST restare separato da ogni contenuto clinico e MUST
  seguire le stesse protezioni dei dati dei pazienti (specifica 005). Le copie dei consensi restano in chiaro per scelta dell'utente (rischio
  accettato). TODO(GDPR): definire l'accordo sul trattamento dei dati con il fornitore del
  database, la regione UE del progetto, l'informativa ai pazienti e valutare nel piano la
  cifratura dei soli campi identificativi dei pazienti.
- **Profilo dell'utente**: psicologo libero professionista, regime ordinario, con reddito da lavoro
  dipendente (CU) in cumulo, che rimane dipendente in parallelo alla partita IVA (la modalità
  "solo partita IVA" è rinviata). Partita IVA con inizio attività nel 2027: il primo anno d'imposta
  della professione è il 2027 e MUST essere gestito come caso speciale (nessuno storico
  professionale per il calcolo degli acconti). Il regime forfettario è escluso perché il reddito
  da lavoro dipendente supera i 35.000 €: l'app MUST NOT proporlo né simularlo.
- **Previdenza (ENPAP, decisa)**: l'utente è iscritto all'ENPAP (cassa degli psicologi), NON alla
  Gestione Separata INPS per l'attività di psicologo (le attività diverse sono nel vincolo
  dedicato). Regole documentate dall'ente (delibera CIG n. 02/26 del 23/04/2026):
  contributo soggettivo con aliquota minima 10% fino al 2026, poi 11% (2027), 12% (2028),
  13% (2029), 14% (2030), 15% dal 2031, aumentabile volontariamente di un punto alla volta fino
  al 30% con opzione annuale; contributo integrativo (maggiorazione in fattura, ripetibile sul
  cliente) dal 2% al 4% dal 1° gennaio 2027, di cui 2% al conto separato e 2% al montante
  individuale. Il contributo soggettivo e quello di maternità sono deducibili; l'integrativo no.
  Le aliquote MUST stare nel set di regole per anno (principio I).
  TODO(ENPAP_2027): da verificare con ENPAP prima di fissarli nelle regole: minimi 2027
  (soggettivo, integrativo, maternità), agevolazioni per nuovi iscritti, scadenze di acconto e
  saldo del primo anno, e se l'espressione "adempimenti dovuti dal 1° gennaio 2027" significhi
  applicazione dell'11% al reddito 2027 o ai versamenti effettuati dal 2027.
- **IVA e fatturazione (psicologo esente IVA, con eccezione)**: REGOLA GENERALE: l'attività di
  psicologo è esente IVA. Le prestazioni sanitarie di diagnosi, cura e riabilitazione
  (es. psicoterapia) sono esenti ex art. 10 n. 18 DPR 633/72, con dicitura in fattura e bollo
  da 2,00 € oltre 77,47 €. ECCEZIONE: le attività non sanitarie (consulenza, formazione, docenza)
  e ogni attività diversa da quella di psicologo MUST essere fatturate con IVA al 22%, salvo
  specifica esenzione, e non vanno al Sistema Tessera Sanitaria. L'esenzione vale per la singola
  operazione, non per la persona. Ogni voce di fattura MUST quindi essere classificata come
  esente o imponibile. Verifica del 2026-11-20 sul testo del DPR 633/72 (artt. 19, 19-bis, 36,
  fonte divulgativa da riscontrare): non risulta alcuna soglia di "attività prevalente" oltre la
  quale cambia il trattamento IVA; la coesistenza di operazioni esenti e imponibili comporta il
  pro-rata di detraibilità (operazioni imponibili / totale, arrotondato all'unità) e l'opzione
  di separazione delle attività (art. 36 c. 3, contabilità separata, almeno un triennio). L'app
  MUST quindi calcolare e mostrare il pro-rata, monitorare la quota di operazioni imponibili sul
  totale e avvisare quando cresce, perché la prevalenza può incidere su altro (codice ATECO,
  previdenza, indici di affidabilità, liquidazioni IVA). Le prestazioni sanitarie esenti MUST essere
  predisposte per il Sistema Tessera Sanitaria (con gestione dell'opposizione del paziente);
  le fatture verso persone fisiche non transitano dallo SDI, quelle verso enti e aziende sì.
  L'IVA sugli acquisti relativa ad attività esente è indetraibile: l'app MUST gestire il pro-rata
  quando coesistono attività esenti e imponibili.
  TODO(IVA_2027): verificare le novità normative 2027 su SDI/STS e l'esonero dalle liquidazioni
  per chi svolge solo operazioni esenti; con operazioni imponibili servono liquidazioni, registri
  e dichiarazione IVA (specifica da scrivere).
  TODO(IVA_PREVALENZA): confermare con il commercialista che non esiste soglia di prevalenza
  e se convenga l'opzione di separazione delle attività (art. 36 c. 3).
- **Attività diverse da quella di psicologo**: l'utente MAY emettere fatture per attività diverse
  (anche con altro codice ATECO). Ogni attività MUST essere configurabile con codice ATECO, natura
  IVA e trattamento previdenziale: i redditi non riconducibili all'attività di psicologo
  potrebbero non essere coperti dall'ENPAP e andare in Gestione Separata INPS (principio V).
  TODO(ATTIVITA_DIVERSE): verificare con ENPAP e commercialista il trattamento previdenziale e
  fiscale caso per caso.
- **Condivisione con il commercialista e documenti**: i prospetti per il commercialista MUST
  contenere solo dati legati alle fatture e alla contabilità (per esempio nome e codice fiscale
  del cliente come in fattura), MUST NOT contenere dati clinici, consensi o note sui pazienti,
  MUST offrire l'opzione di usare codici al posto dei nomi e MUST essere condivisi solo come
  file protetti, mai come indirizzi pubblici. I documenti ricevuti archiviati nell'app
  MUST seguire le protezioni del principio VII e non sostituiscono la conservazione a norma.

## Flusso di Sviluppo e Quality Gates

- Il lavoro segue il ciclo Spec Kit: constitution → specify → clarify → plan → tasks →
  implement. Le regole fiscali ambigue MUST essere chiarite (`/speckit-clarify`) prima del piano.
- Ogni piano (`plan.md`) MUST includere una verifica di conformità ai principi I–VII.
- Una funzionalità è completa solo se: i test del motore fiscale passano, la logica fiscale
  non è duplicata nella UI e i calcoli mostrati hanno la spiegazione prevista dal principio II.
- Le proposte di formule o schermate MUST includere una breve spiegazione fiscale della logica
  adottata.
- Il codice MUST essere pulito, modulare e commentato dove la logica fiscale non è ovvia.

## Governance

Questa costituzione prevale sulle altre pratiche di progetto. Gli emendamenti MUST essere
documentati (cosa cambia e perché), applicati a questo file e, se incidono su piani o specifiche
esistenti, accompagnati da un piano di allineamento. Il versionamento segue il semantic
versioning: MAJOR per rimozioni o ridefinizioni incompatibili di principi, MINOR per nuovi
principi o sezioni, PATCH per chiarimenti. Ogni piano e ogni revisione MUST verificare la
conformità ai principi; le deroghe MUST essere giustificate per iscritto nel piano. Il file
`CLAUDE.md` resta la guida di ruolo e contesto per lo sviluppo quotidiano.

**Version**: 2.6.1 | **Ratified**: 2026-11-19 | **Last Amended**: 2026-11-21
