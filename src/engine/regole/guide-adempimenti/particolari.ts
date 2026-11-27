import type { Guida } from './tipi';

/** Guide del gruppo «Situazioni particolari» (specifica 015, contracts/guida.md). Controllo del 27/11/2026. */

const ADE = { nome: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/', ufficiale: true };
const ADE_COMUNICAZIONI = {
  nome: 'Agenzia delle Entrate: comunicazioni di irregolarità',
  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/schede/comunicazioni/comunicazioni-irregolarita',
  ufficiale: true,
};
const ENPAP = { nome: 'ENPAP', url: 'https://www.enpap.it/', ufficiale: true };

export const GUIDE_PARTICOLARI: Guida[] = [
  {
    id: 'variare-piva',
    gruppo: 'particolari',
    titolo: 'Cambiare i dati della partita IVA',
    riga: 'Indirizzo, codice attività, domicilio fiscale.',
    frequenza: 'se_serve',
    paroleChiave: ['variazione', 'partita iva', 'cambio indirizzo', 'codice ateco', 'AA9'],
    pertinenza: 'sempre',
    inBreve: 'Se cambiano indirizzo, luogo dove conservi i documenti o attività svolta, lo comunichi con lo stesso modello dell\'apertura, scegliendo «variazione dati».',
    quando: 'Entro 30 giorni dal cambiamento.',
    doveSiFa: 'Servizi online dell\'Agenzia delle Entrate o intermediario.',
    passi: [
      { testo: 'Apri il modello AA9 e scegli «variazione dati».', casella: 'quadro_a' },
      { testo: 'Aggiorna solo i dati cambiati (es. il codice ATECO {{adempimenti.codice_ateco}} o l\'indirizzo).', casella: 'quadro_b' },
      { testo: 'Invia e conserva la ricevuta; aggiorna gli stessi dati in Fiscal.', casella: 'firma' },
      { testo: 'Comunica il cambio anche a ENPAP e all\'Ordine se riguarda i loro dati.' },
    ],
    fonti: [ADE, ENPAP],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/impostazioni/attivita/', testo: 'Partita IVA e attività' },
    disegno: { modulo: 'inizio_attivita', caselle: { quadro_a: 1, quadro_b: 2, firma: 3 } },
  },
  {
    id: 'chiudere-piva',
    gruppo: 'particolari',
    titolo: 'Chiudere la partita IVA',
    riga: 'Cessazione dell\'attività e ultimi adempimenti.',
    frequenza: 'se_serve',
    paroleChiave: ['chiusura', 'cessazione', 'chiudere partita iva'],
    pertinenza: 'sempre',
    inBreve:
      'Quando smetti la libera professione chiudi la partita IVA con la dichiarazione di cessazione. Restano da fare la dichiarazione dei redditi di quell\'anno e i contributi ENPAP.',
    quando: 'Entro 30 giorni dalla fine dell\'attività, dopo aver incassato o fatturato tutto.',
    doveSiFa: 'Servizi online dell\'Agenzia delle Entrate (modello AA9, cessazione) e area riservata ENPAP.',
    passi: [
      { testo: 'Emetti le ultime fatture e incassa i crediti.' },
      { testo: 'Invia il modello AA9 con «cessazione attività».', casella: 'quadro_a' },
      { testo: 'Comunica la cessazione a ENPAP.' },
      { testo: 'L\'anno dopo fai la dichiarazione dei redditi e paga gli ultimi contributi.' },
    ],
    parere: 'Con compensi ancora da incassare o beni da ammortizzare, chiedi a un professionista come chiudere.',
    fonti: [ADE, ENPAP],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/dichiarazione/', testo: 'Dichiarazione' },
    disegno: { modulo: 'inizio_attivita', caselle: { quadro_a: 2 } },
  },
  {
    id: 'avviso-irregolarita',
    gruppo: 'particolari',
    titolo: 'Una comunicazione dall\'Agenzia delle Entrate',
    riga: 'Avviso bonario o lettera di compliance: come leggerla e rispondere.',
    frequenza: 'se_serve',
    paroleChiave: ['avviso bonario', 'irregolarità', 'lettera', 'compliance', 'cartella', '36-bis'],
    pertinenza: 'sempre',
    inBreve:
      'Se l\'Agenzia trova una differenza nella dichiarazione o nei versamenti, ti manda una comunicazione. Non è una cartella: puoi pagare con una sanzione ridotta o spiegare perché è sbagliata.',
    quando: 'Rispondi entro il termine scritto nella comunicazione: di solito pochi mesi, poi la sanzione aumenta.',
    doveSiFa: 'Nel Cassetto fiscale e con il servizio di assistenza (CIVIS) dell\'Agenzia delle Entrate.',
    passi: [
      { testo: 'Leggi l\'anno e il tributo e confronta con i versamenti registrati in Fiscal.' },
      { testo: 'Se hai pagato davvero, manda le quietanze con CIVIS.' },
      { testo: 'Se è giusto, paga con l\'F24 precompilato allegato alla comunicazione, nei termini.' },
      { testo: 'Registra il pagamento in Fiscal.' },
    ],
    parere: 'Se la somma è alta o non capisci il motivo, chiedi subito a un professionista: i termini sono brevi.',
    fonti: [ADE_COMUNICAZIONI],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/tasse/versamenti/', testo: 'Tasse → Versamenti' },
  },
];
