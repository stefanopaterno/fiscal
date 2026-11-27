import type { Guida } from './tipi';

/** Guide del gruppo «Ogni fattura» (specifica 015, contracts/guida.md). Controllo del 27/11/2026. */

const ADE = { nome: 'Agenzia delle Entrate: fatturazione elettronica', url: 'https://www.agenziaentrate.gov.it/portale/web/guest/aree-tematiche/fatturazione-elettronica', ufficiale: true };
const FATTURAPA = { nome: 'FatturaPA: specifiche tecniche', url: 'https://www.fatturapa.gov.it/', ufficiale: true };
const STS = { nome: 'Sistema Tessera Sanitaria', url: 'https://sistemats1.sanita.finanze.it/', ufficiale: true };

export const GUIDE_FATTURA: Guida[] = [
  {
    id: 'emettere-fattura',
    gruppo: 'fattura',
    titolo: 'Emettere la fattura elettronica esente',
    riga: 'Prestazione sanitaria: esenzione IVA, integrativo, bollo, ritenuta.',
    frequenza: 'ogni_fattura',
    paroleChiave: ['fattura', 'fattura elettronica', 'esente', 'natura', 'bollo', 'integrativo', 'ritenuta', 'sdi'],
    pertinenza: 'sempre',
    inBreve:
      'Le prestazioni di psicologia sono esenti da IVA. In fattura metti la prestazione, il contributo integrativo ENPAP e, sopra la soglia, il bollo. Se il cliente è un\'azienda o un ente, c\'è anche la ritenuta d\'acconto.',
    quando: 'Al momento del pagamento (principio di cassa): la data della fattura è il giorno dell\'incasso.',
    doveSiFa:
      'In Fiscal prepari la fattura e i numeri; il file XML lo trasmetti al Sistema di Interscambio con i servizi gratuiti dell\'Agenzia delle Entrate o con il tuo programma di invio.',
    cosaTiServe: ['Dati del paziente o del cliente, con codice fiscale.', 'Se il paziente si oppone all\'invio al Sistema Tessera Sanitaria, la sua richiesta scritta.'],
    passi: [
      { testo: 'Controlla i tuoi dati di professionista: partita IVA, regime ordinario, indirizzo.', casella: 'cedente' },
      { testo: 'Scegli il paziente o il cliente: per i privati basta il codice fiscale.', casella: 'cliente' },
      { testo: 'Scrivi la prestazione senza dati clinici (es. «colloquio psicologico») e il compenso.', casella: 'righe' },
      { testo: 'Per le prestazioni sanitarie la natura IVA è {{adempimenti.natura_esente}}, con la dicitura dell\'esenzione.', casella: 'natura' },
      { testo: 'Aggiungi il contributo integrativo ENPAP del {{fattura.aliquota_integrativo}} come cassa previdenziale.', casella: 'cassa' },
      { testo: 'Sopra {{fattura.soglia_bollo}} metti il bollo virtuale da {{fattura.importo_bollo}}.', casella: 'bollo' },
      { testo: 'Se il cliente è un sostituto d\'imposta, la ritenuta del {{fattura.aliquota_ritenuta}} si toglie dal totale da pagare.', casella: 'ritenuta' },
      { testo: 'Controlla il totale ed emetti: poi trasmetti il file al Sistema di Interscambio.', casella: 'invio' },
    ],
    campi: [
      { modulo: 'Fattura elettronica, riga', campo: 'Natura', valore: '{{adempimenti.natura_esente}}', aiuto: 'Il codice delle operazioni esenti da IVA (art. 10 del decreto IVA).' },
      { modulo: 'Fattura elettronica, dati generali', campo: 'Bollo virtuale', valore: 'sì, {{fattura.importo_bollo}}', aiuto: 'Solo sulle fatture esenti sopra {{fattura.soglia_bollo}}. Si paga poi ogni trimestre con l\'F24.' },
      { modulo: 'Fattura elettronica, cassa previdenziale', campo: 'Tipo cassa', valore: 'TC07 (ENPAP)', aiuto: 'Il codice della cassa degli psicologi nella fattura elettronica.' },
    ],
    errori: [
      'Scrivere diagnosi o dettagli clinici nella descrizione.',
      'Dimenticare il bollo sopra la soglia: poi lo paghi tu con la sanzione.',
      'Mettere la ritenuta a un paziente privato: si applica solo ad aziende, enti e professionisti.',
    ],
    fonti: [ADE, FATTURAPA],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/fatture/nuova/', testo: 'Nuova fattura' },
    disegno: { modulo: 'fattura', caselle: { cedente: 1, cliente: 2, righe: 3, natura: 4, cassa: 5, bollo: 6, ritenuta: 7, invio: 8 } },
  },
  {
    id: 'opposizione-sts',
    gruppo: 'fattura',
    titolo: 'Opposizione del paziente all\'invio al Sistema TS',
    riga: 'Quando il paziente non vuole che la spesa vada nel suo 730 precompilato.',
    frequenza: 'se_serve',
    paroleChiave: ['opposizione', 'tessera sanitaria', 'privacy', 'sts'],
    pertinenza: 'sts',
    inBreve:
      'Il paziente può chiedere che la sua spesa non venga inviata al Sistema Tessera Sanitaria. In quel caso non la invii e in fattura lo segnali.',
    quando: 'Al momento della prestazione, prima di emettere la fattura.',
    doveSiFa: 'Nella scheda del paziente in Fiscal e nella fattura.',
    passi: [
      { testo: 'Fatti dare la richiesta di opposizione dal paziente e conservala.' },
      { testo: 'Segna l\'opposizione nella scheda del paziente in Fiscal.' },
      { testo: 'Le fatture di quel paziente riportano la dicitura dell\'opposizione e non compaiono tra quelle da inviare.' },
    ],
    errori: ['Inviare comunque la spesa: è un trattamento di dati non consentito.'],
    fonti: [STS],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/clienti/', testo: 'Clienti' },
  },
  {
    id: 'invio-sts',
    gruppo: 'fattura',
    titolo: 'Inviare le spese al Sistema Tessera Sanitaria',
    riga: 'Una volta l\'anno, le fatture sanitarie dei pazienti dell\'anno prima.',
    frequenza: 'ogni_anno',
    paroleChiave: ['tessera sanitaria', 'sts', 'invio', 'spese sanitarie', '730 precompilato'],
    pertinenza: 'sts',
    inBreve:
      'Le fatture ai pazienti (salvo opposizione) si comunicano al Sistema Tessera Sanitaria una volta l\'anno: servono per il 730 precompilato dei pazienti. Puoi anche inviarle man mano durante l\'anno.',
    quando: 'Tutte le fatture dell\'anno prima entro il {{scadenza.sts}}.',
    doveSiFa: 'Sul portale del Sistema Tessera Sanitaria (inserimento manuale o file).',
    passi: [
      { testo: 'In Fiscal apri Adempimenti: trovi le fatture ancora da inviare.' },
      { testo: 'Entra nel portale del Sistema Tessera Sanitaria e inserisci i documenti di spesa.' },
      { testo: 'Per le prestazioni degli psicologi il tipo di spesa è quello delle prestazioni sanitarie.' },
      { testo: 'Torna in Fiscal e segna le fatture come inviate.' },
    ],
    errori: ['Aspettare l\'ultimo giorno: conviene inviare man mano, così a gennaio resta poco.', 'Includere le fatture ad aziende o enti: si inviano solo quelle ai pazienti.'],
    fonti: [STS, { nome: 'DM MEF 29/10/2025 (Gazzetta Ufficiale n. 261 del 10/11/2025)', url: 'https://www.gazzettaufficiale.it/eli/gu/2025/11/10/261/sg/pdf', ufficiale: true }],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/adempimenti/', testo: 'Adempimenti' },
  },
  {
    id: 'nota-credito',
    gruppo: 'fattura',
    titolo: 'Nota di credito',
    riga: 'Per annullare o correggere una fattura già emessa.',
    frequenza: 'se_serve',
    paroleChiave: ['nota di credito', 'storno', 'rimborso', 'errore fattura', 'TD04'],
    pertinenza: 'sempre',
    inBreve: 'Una fattura emessa non si cancella: si annulla con una nota di credito e, se serve, se ne emette una nuova giusta.',
    quando: 'Appena ti accorgi dell\'errore o quando restituisci un compenso.',
    doveSiFa: 'In Fiscal dalla fattura da correggere, poi trasmessa al Sistema di Interscambio come la fattura.',
    passi: [
      { testo: 'Apri la fattura sbagliata in Fiscal e scegli «Nota di credito».' },
      { testo: 'La nota riprende gli importi: integrativo e bollo si stornano con la stessa logica.' },
      { testo: 'Trasmetti la nota al Sistema di Interscambio.' },
      { testo: 'Se la spesa era già stata inviata al Sistema Tessera Sanitaria, invia anche il rimborso.' },
    ],
    fonti: [ADE],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/fatture/', testo: 'Fatture' },
  },
];
