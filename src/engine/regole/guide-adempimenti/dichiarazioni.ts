import type { Guida } from './tipi';

/** Guide del gruppo «Dichiarazioni annuali» (specifica 015, contracts/guida.md). Controllo del 27/11/2026. */

const ADE_REDDITI = {
  nome: 'Agenzia delle Entrate: Modello Redditi Persone fisiche',
  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/redditi-persone-fisiche',
  ufficiale: true,
};
const ADE_CU = { nome: 'Agenzia delle Entrate: Certificazione Unica', url: 'https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/certificazione-unica', ufficiale: true };
const ADE_IVA = { nome: 'Agenzia delle Entrate: dichiarazione IVA', url: 'https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/dichiarazione-iva', ufficiale: true };
const ENPAP = { nome: 'ENPAP: comunicazione reddituale', url: 'https://www.enpap.it/', ufficiale: true };

export const GUIDE_DICHIARAZIONI: Guida[] = [
  {
    id: 'redditi-pf',
    gruppo: 'dichiarazioni',
    titolo: 'Dichiarazione dei redditi con partita IVA',
    riga: 'Modello Redditi PF (non il 730): i quadri che ti riguardano.',
    frequenza: 'ogni_anno',
    paroleChiave: ['dichiarazione dei redditi', 'redditi pf', '740', 'unico', '730', 'quadro re', 'precompilata', 'isa'],
    pertinenza: 'sempre',
    inBreve:
      'Con la partita IVA la dichiarazione si fa con il Modello Redditi PF: il 730 non si può usare per i redditi di lavoro autonomo. Ci metti insieme lo stipendio (dalla CU) e il reddito della partita IVA.',
    quando:
      'La precompilata è disponibile dal {{scadenza.precompilata}}; le tasse si pagano entro il {{scadenza.saldo_acconto}}; l\'invio entro il {{scadenza.redditi_invio}}.',
    doveSiFa: 'Online con Redditi web dell\'Agenzia delle Entrate (partendo dalla precompilata) oppure tramite un intermediario.',
    cosaTiServe: [
      'La CU del datore di lavoro e le CU dei clienti che ti hanno fatto la ritenuta.',
      'Il riepilogo dell\'anno da Fiscal (Dichiarazione → Riepilogo): compensi, spese, contributi, ritenute.',
      'Le spese personali detraibili (mediche, mutuo, ecc.).',
    ],
    passi: [
      { testo: 'Apri Redditi web e parti dalla precompilata: controlla dati anagrafici e familiari.', casella: 'frontespizio' },
      { testo: 'Quadro RC: i redditi da lavoro dipendente sono già presi dalla CU; controllali con la CU.', casella: 'rc' },
      { testo: 'Quadro RE: compensi incassati, spese deducibili e reddito della partita IVA, come nel riepilogo di Fiscal.', casella: 're' },
      { testo: 'Quadro RP: oneri deducibili (contributi ENPAP pagati nell\'anno) e spese detraibili.', casella: 'rp' },
      { testo: 'Quadro RN: il calcolo dell\'IRPEF; controlla che il risultato sia vicino a quello di Fiscal.', casella: 'rn' },
      { testo: 'Quadro RV: addizionali regionale e comunale.', casella: 'rv' },
      { testo: 'Invia, scarica la ricevuta e chiudi l\'anno in Fiscal (Dichiarazione).', casella: 'invio' },
    ],
    campi: [
      { modulo: 'Redditi PF', campo: 'Quadro RE', valore: 'lavoro autonomo in regime ordinario', aiuto: 'Il quadro LM è per i forfettari: non è il tuo.' },
      { modulo: 'Redditi PF', campo: 'Ritenute subite', valore: 'nel quadro RE', aiuto: 'Le ritenute delle CU dei clienti si scalano dalle tasse.' },
    ],
    errori: [
      'Usare il 730: con la partita IVA non è ammesso.',
      'Mettere nel quadro RE il fatturato invece dell\'incassato: conta la data del pagamento.',
      'Dimenticare le ritenute delle CU dei clienti.',
      'Saltare gli ISA se dovuti per la tua attività.',
    ],
    parere: 'Il primo anno conviene farla controllare da un professionista, soprattutto per gli ISA e per i quadri RE e RP.',
    fonti: [ADE_REDDITI],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/dichiarazione/', testo: 'Dichiarazione' },
    disegno: { modulo: 'redditi', caselle: { frontespizio: 1, rc: 2, re: 3, rp: 4, rn: 5, rv: 6, invio: 7 } },
  },
  {
    id: 'dichiarazione-enpap',
    gruppo: 'dichiarazioni',
    titolo: 'Comunicazione annuale dei redditi a ENPAP',
    riga: 'Reddito e volume d\'affari dell\'anno prima, nell\'area riservata.',
    frequenza: 'ogni_anno',
    paroleChiave: ['enpap', 'comunicazione reddituale', 'dichiarazione enpap', 'volume d\'affari'],
    pertinenza: 'sempre',
    inBreve:
      'Ogni anno comunichi a ENPAP il reddito professionale e il volume d\'affari dell\'anno prima: su quei numeri si calcolano i contributi.',
    quando: 'Entro il {{scadenza.enpap}}, insieme al saldo dei contributi.',
    doveSiFa: 'Nell\'area riservata ENPAP.',
    passi: [
      { testo: 'Prendi da Fiscal (o dalla dichiarazione dei redditi) il reddito professionale e il volume d\'affari.' },
      { testo: 'Nell\'area riservata ENPAP compila la comunicazione reddituale.' },
      { testo: 'Il sistema calcola soggettivo, integrativo e maternità: confrontali con Fiscal.' },
      { testo: 'Paga (vedi la guida dei contributi ENPAP).' },
    ],
    errori: ['Comunicare il reddito prima della dichiarazione dei redditi definitiva e non correggerlo.'],
    fonti: [ENPAP],
    ultimoControllo: '2026-11-27',
    stato: 'da_verificare',
    daVerificare: ['Data e sanzioni per il ritardo vanno controllate ogni anno nelle istruzioni ENPAP.'],
    apriInFiscal: { href: '/dichiarazione/', testo: 'Dichiarazione' },
  },
  {
    id: 'dichiarazione-iva',
    gruppo: 'dichiarazioni',
    titolo: 'Dichiarazione IVA: quando non serve e quando sì',
    riga: 'Con sole prestazioni sanitarie esenti sei esonerato.',
    frequenza: 'ogni_anno',
    paroleChiave: ['dichiarazione iva', 'esonero', 'iva annuale'],
    pertinenza: 'iva',
    inBreve:
      'Se fai solo prestazioni sanitarie esenti, non presenti la dichiarazione IVA. Se nell\'anno hai emesso anche fatture con IVA, la dichiarazione serve.',
    quando: 'Entro il {{scadenza.iva_dichiarazione}}, per l\'anno prima.',
    doveSiFa: 'Servizi online dell\'Agenzia delle Entrate o intermediario.',
    passi: [
      { testo: 'In Fiscal controlla se nell\'anno ci sono fatture con IVA (Fatture, riepilogo IVA).' },
      { testo: 'Se non ce ne sono: niente dichiarazione IVA.' },
      { testo: 'Se ce ne sono: prepara la dichiarazione con il riepilogo annuale e il pro-rata, meglio con un professionista.' },
    ],
    parere: 'Con operazioni esenti e imponibili insieme, la dichiarazione IVA e il pro-rata conviene farli controllare.',
    fonti: [ADE_IVA, { nome: 'Art. 8 DPR 322/1998 (esonero)', url: 'https://www.normattiva.it/', ufficiale: true }],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/fatture/', testo: 'Fatture' },
  },
  {
    id: 'cu-ricevute',
    gruppo: 'dichiarazioni',
    titolo: 'Le CU dei clienti sostituti d\'imposta',
    riga: 'Controllare le ritenute che ti hanno fatto aziende ed enti.',
    frequenza: 'ogni_anno',
    paroleChiave: ['cu', 'certificazione unica', 'ritenuta', 'sostituto d\'imposta'],
    pertinenza: 'sempre',
    inBreve:
      'Le aziende e gli enti che ti pagano trattengono il {{fattura.aliquota_ritenuta}} e lo versano per te. Ogni anno ti mandano la CU: serve per scalare quelle ritenute dalle tue tasse.',
    quando: 'Le CU arrivano entro il {{scadenza.cu_rilascio}}.',
    doveSiFa: 'Le ricevi dai clienti (spesso via PEC); le trovi anche nella precompilata.',
    passi: [
      { testo: 'Raccogli le CU dei clienti e caricale in Fiscal (Documenti).' },
      { testo: 'Confronta compensi e ritenute con le fatture incassate in Fiscal.' },
      { testo: 'Se non tornano, chiedi al cliente di correggere la CU.' },
      { testo: 'Riporta le ritenute nel quadro RE della dichiarazione.' },
    ],
    errori: ['Dimenticare una CU: paghi due volte la stessa ritenuta.'],
    fonti: [ADE_CU],
    ultimoControllo: '2026-11-27',
    stato: 'verificata',
    apriInFiscal: { href: '/tasse/dati/', testo: 'Dati dell\'anno' },
  },
];
