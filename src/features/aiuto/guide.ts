/**
 * Guide passo passo (specifica 011, US2, FR-004): le operazioni principali spiegate la prima volta, con cosa fare e
 * cosa controllare a ogni passo. Nessun valore normativo nei testi (FR-009): le cifre stanno nelle pagine e nei
 * fumetti, che le prendono dalle regole dell'anno.
 */
export type Passo = { titolo: string; cosa: string; controlla: string; href: string; pagina: string };
export type Guida = { id: string; titolo: string; perche: string; passi: Passo[] };

export const GUIDE: Guida[] = [
  {
    id: 'partita_iva',
    titolo: 'Configurare la partita IVA',
    perche: 'Senza i tuoi dati e almeno un\'attività non si possono emettere fatture.',
    passi: [
      { titolo: 'I tuoi dati', cosa: 'Scrivi nome, codice fiscale, partita IVA, indirizzo dello studio e data di inizio attività.', controlla: 'La partita IVA ha 11 cifre e la data di inizio è quella del certificato di attribuzione.', href: '/impostazioni/attivita/', pagina: 'Attività' },
      { titolo: 'La tua attività', cosa: 'Aggiungi un\'attività, per esempio «Psicoterapia», con il tipo di IVA: esente per le prestazioni sanitarie.', controlla: 'Se fai anche formazione o consulenze ad aziende, crea un\'attività separata con IVA.', href: '/impostazioni/attivita/', pagina: 'Attività' },
      { titolo: 'Integrativo ENPAP', cosa: 'Scegli se addebitare l\'integrativo al paziente o tenerlo a carico tuo.', controlla: 'Nel secondo caso il prezzo resta uguale e l\'integrativo si scorpora dal compenso.', href: '/impostazioni/attivita/', pagina: 'Attività' },
      { titolo: 'Prova o produzione', cosa: 'Finché provi resta in modalità prova: le fatture non hanno valore fiscale.', controlla: 'Passa alla produzione solo quando sei pronto: non si torna indietro.', href: '/impostazioni/modalita/', pagina: 'Prova e produzione' },
    ],
  },
  {
    id: 'fattura',
    titolo: 'Emettere la prima fattura',
    perche: 'La fattura è il punto di partenza: da lì vengono incasso, tasse e invio alla Tessera Sanitaria.',
    passi: [
      { titolo: 'Il cliente', cosa: 'Aggiungi il paziente nella rubrica con nome, cognome e codice fiscale.', controlla: 'Se il paziente si oppone all\'invio alla Tessera Sanitaria, segnalo nella scheda.', href: '/clienti/scheda/', pagina: 'Nuovo cliente' },
      { titolo: 'La fattura', cosa: 'Crea la fattura, scegli il cliente e scrivi la prestazione e il compenso.', controlla: 'Guarda il riepilogo: integrativo, bollo e, per gli enti, ritenuta sono calcolati da soli. Nella descrizione niente dati clinici.', href: '/fatture/nuova/', pagina: 'Nuova fattura' },
      { titolo: 'Emetti', cosa: 'Tocca «Emetti»: la fattura prende il numero e non si modifica più.', controlla: 'Per correggerla dopo serve una nota di credito.', href: '/fatture/', pagina: 'Fatture' },
      { titolo: 'L\'incasso', cosa: 'Quando ti pagano, registra l\'incasso dal dettaglio della fattura.', controlla: 'Sotto compare quanto mettere da parte: tocca «Fatto» quando l\'hai spostato.', href: '/fatture/', pagina: 'Fatture' },
      { titolo: 'Tessera Sanitaria', cosa: 'Invia le fatture sanitarie del mese entro la fine del mese dopo.', controlla: 'In Adempimenti vedi quali sono ancora da inviare.', href: '/adempimenti/', pagina: 'Adempimenti' },
    ],
  },
  {
    id: 'parametri',
    titolo: 'Aggiornare aliquote e scadenze con Claude',
    perche: 'Le regole cambiano durante l\'anno (Legge di Bilancio, ENPAP, proroghe): così Fiscal resta aggiornato senza toccare il passato.',
    passi: [
      { titolo: 'Prepara la richiesta', cosa: 'In Parametri fiscali → «Prepara richiesta» scegli gli anni e, se vuoi le addizionali, regione e comune.', controlla: 'Il testo non contiene importi, nomi né codice fiscale.', href: '/impostazioni/parametri/', pagina: 'Parametri fiscali' },
      { titolo: 'Chiedi a Claude', cosa: 'Copia la richiesta e incollala a Claude con la ricerca sul web attiva.', controlla: 'Claude risponde con un file JSON e una fonte ufficiale per ogni valore.', href: '/impostazioni/parametri/', pagina: 'Parametri fiscali' },
      { titolo: 'Importa e controlla', cosa: 'In «Importa» incolla la risposta e tocca «Controlla»: vedi prima → dopo e quanto cambiano le tue tasse.', controlla: 'Le voci senza fonte ufficiale restano «da verificare»; quelle sbagliate sono scartate con il motivo.', href: '/impostazioni/parametri/', pagina: 'Parametri fiscali' },
      { titolo: 'Approva', cosa: 'Scegli le voci e approva: da quel momento i calcoli usano i nuovi valori, dall\'anno o dalla data giusta.', controlla: 'Fatture emesse e anni chiusi non cambiano. Se sbagli, «Annulla» in «In uso».', href: '/impostazioni/parametri/', pagina: 'Parametri fiscali' },
    ],
  },
  {
    id: 'cu',
    titolo: 'Inserire la CU',
    perche: 'La CU dice quanto guadagni da dipendente: senza, l\'app non può calcolare le tasse della partita IVA.',
    passi: [
      { titolo: 'Trova la CU', cosa: 'Il datore di lavoro la consegna entro marzo; spesso è nel portale del personale.', controlla: 'Usa la CU dell\'anno giusto: quella di marzo 2028 è dei redditi 2027.', href: '/dichiarazione/scadenze/', pagina: 'Scadenze' },
      { titolo: 'Copia i numeri', cosa: 'In «Dati dell\'anno» scrivi i valori: il «?» di ogni campo dice il punto della CU.', controlla: 'Reddito ai punti 1 e 2, IRPEF trattenuta al punto 21.', href: '/tasse/dati/', pagina: "Dati dell'anno" },
      { titolo: 'Le addizionali', cosa: 'Inserisci le aliquote di regione e comune e segnale «verificate».', controlla: 'Le trovi sul sito del Dipartimento delle Finanze.', href: '/tasse/dati/', pagina: "Dati dell'anno" },
      { titolo: 'Guarda il calcolo', cosa: 'Apri Tasse: vedi conguaglio, scaglione e quanto versare.', controlla: 'Se compare «provvisorio», qualche dato o regola manca ancora.', href: '/tasse/', pagina: 'Tasse' },
    ],
  },
  {
    id: 'spesa',
    titolo: 'Registrare una spesa',
    perche: 'Ogni spesa per il lavoro abbassa il reddito della partita IVA e quindi le tasse.',
    passi: [
      { titolo: 'La spesa', cosa: 'Registra data del pagamento, importo e categoria.', controlla: 'Conta la data in cui hai pagato, non quella della fattura.', href: '/spese/scheda/', pagina: 'Spesa' },
      { titolo: 'Come hai pagato', cosa: 'Indica carta, bonifico o contanti.', controlla: 'Alcune spese si deducono solo se pagate in modo tracciabile.', href: '/spese/scheda/', pagina: 'Spesa' },
      { titolo: 'Il giustificativo', cosa: 'Allega la foto dello scontrino o la fattura.', controlla: 'Senza giustificativo il commercialista potrebbe non dedurla.', href: '/spese/', pagina: 'Spese' },
      { titolo: 'Beni che durano', cosa: 'Computer e arredi vanno nel registro dei beni.', controlla: 'Sopra una certa cifra si deducono in più anni: il «?» del registro spiega quanto.', href: '/spese/beni/', pagina: 'Beni durevoli' },
    ],
  },
  {
    id: 'esito',
    titolo: 'Capire il saldo della dichiarazione',
    perche: 'Con la partita IVA i rimborsi non arrivano più in busta paga: abbassano il saldo di giugno.',
    passi: [
      { titolo: 'La checklist', cosa: 'Apri Dichiarazione e completa le voci «Da fornire».', controlla: 'La barra si riempie quando hai tutto.', href: '/dichiarazione/', pagina: 'Dichiarazione' },
      { titolo: 'L\'esito voce per voce', cosa: 'Leggi l\'esito: dall\'imposta lorda al saldo.', controlla: 'Ogni detrazione dice di quanto abbassa il saldo.', href: '/dichiarazione/', pagina: 'Dichiarazione' },
      { titolo: 'Se c\'è un credito', cosa: 'Scegli col commercialista se tenerlo in compensazione o chiederlo a rimborso.', controlla: 'Un rimborso non incassato non conta come soldi disponibili.', href: '/dichiarazione/', pagina: 'Dichiarazione' },
      { titolo: 'Le scadenze', cosa: 'Controlla giugno e novembre nelle scadenze e portale nel calendario del telefono.', controlla: 'Segna «Fatta» dopo aver pagato.', href: '/dichiarazione/scadenze/', pagina: 'Scadenze' },
    ],
  },
  {
    id: 'pacchetto',
    titolo: 'Mandare i dati al commercialista',
    perche: 'Un solo file protetto con tutto quello che serve, senza dati clinici.',
    passi: [
      { titolo: 'Periodo e sezioni', cosa: 'Scegli l\'anno e le sezioni da includere.', controlla: 'Per la dichiarazione serve l\'anno intero.', href: '/dichiarazione/pacchetto/', pagina: 'Pacchetto' },
      { titolo: 'I controlli', cosa: 'Tocca «Controlla e prepara» e sistema gli avvisi che puoi.', controlla: 'Gli avvisi rimasti finiscono nel documento.', href: '/dichiarazione/pacchetto/', pagina: 'Pacchetto' },
      { titolo: 'Genera e salva la password', cosa: 'Genera il pacchetto: scarichi lo ZIP e vedi la password una volta sola.', controlla: 'Copiala subito: Fiscal non la conserva.', href: '/dichiarazione/pacchetto/', pagina: 'Pacchetto' },
      { titolo: 'Invia', cosa: 'Manda il file per email e la password per un altro canale.', controlla: 'Il commercialista lo apre con 7-Zip, WinRAR, Keka o The Unarchiver.', href: '/dichiarazione/pacchetto/', pagina: 'Pacchetto' },
    ],
  },
  {
    id: 'consensi',
    titolo: 'Registrare un consenso informato',
    perche: 'Il consenso va raccolto prima di iniziare: Fiscal tiene la prova di chi ha firmato, quando e quale testo.',
    passi: [
      { titolo: 'I tipi', cosa: 'In «Tipi e modelli» crea i tuoi tipi di consenso, per esempio «Percorso individuale».', controlla: 'Fiscal non propone tipi né testi: sono scelte tue.', href: '/consensi/modelli/', pagina: 'Tipi e modelli' },
      { titolo: 'Il tuo testo', cosa: 'Carica il PDF del tuo modello con versione e data da cui vale.', controlla: 'Con una versione nuova i pazienti con la vecchia diventano «da rinnovare».', href: '/consensi/modelli/', pagina: 'Tipi e modelli' },
      { titolo: 'Il consenso', cosa: 'Apri il paziente in Consensi e registra tipo, versione, data e chi ha firmato.', controlla: 'Per un minore servono entrambi i genitori o il rappresentante legale.', href: '/consensi/', pagina: 'Consensi' },
      { titolo: 'La copia firmata', cosa: 'Se vuoi, allega la foto o il PDF firmato.', controlla: 'Prima firma il DPA con Supabase: lo ricorda l\'avviso in pagina.', href: '/consensi/', pagina: 'Consensi' },
    ],
  },
  {
    id: 'archivio',
    titolo: 'Tenere in ordine i documenti',
    perche: 'CU, ricevute e fatture ricevute in un posto solo, ritrovabili quando servono.',
    passi: [
      { titolo: 'Carica', cosa: 'In Documenti carica PDF o foto e scegli il tipo (CU, ricevuta, contratto…).', controlla: 'Niente cartelle cliniche o consensi: solo documenti della contabilità.', href: '/documenti/', pagina: 'Documenti' },
      { titolo: 'Fatture ricevute', cosa: 'Importa lo ZIP scaricato da Fatture e Corrispettivi.', controlla: 'I doppioni vengono saltati da soli.', href: '/documenti/', pagina: 'Documenti' },
      { titolo: 'Classifica', cosa: 'Per ogni fattura ricevuta scegli se è una spesa dell\'attività.', controlla: 'Se sì, la spesa si crea con un tocco.', href: '/documenti/', pagina: 'Documenti' },
      { titolo: 'Conservazione a norma', cosa: 'Aderisci al servizio gratuito di conservazione dell\'Agenzia delle Entrate.', controlla: 'L\'archivio di Fiscal non sostituisce la conservazione a norma.', href: '/dichiarazione/', pagina: 'Dichiarazione' },
    ],
  },
];

export const guida = (id: string) => GUIDE.find((g) => g.id === id);
