import { ULTIMO_CONTROLLO } from '../regole/novita';
import { regoleAperte } from './regole-aperte';

/**
 * Calendario dei controlli (specifica 012, FR-001, FR-011): quando guardare se sono cambiate le regole.
 * Le addizionali si controllano alle date in cui regioni e comuni pubblicano le aliquote:
 * - regionale: legge regionale entro il 31/12 dell'anno prima, pubblicata dal Dipartimento delle Finanze
 *   a fine gennaio → da febbraio;
 * - comunale: la conferma esce verso il 20 dicembre dell'anno prima; con le proroghe dei bilanci le
 *   delibere arrivano fino ad aprile → dal 20 dicembre a gennaio e di nuovo a maggio.
 * Un controllo è chiuso quando le aliquote dell'anno sono segnate «verificate» nei dati dell'anno.
 */
export type Controllo = { chiave: string; titolo: string; perche: string; anno: number };

const mmgg = (iso: string) => iso.slice(5);

export function controlliDovuti(oggi: string, dati: { aliquoteVerificate: Map<number, boolean> }): Controllo[] {
  const anno = Number(oggi.slice(0, 4));
  const md = mmgg(oggi);
  const out: Controllo[] = [];
  const aperto = (a: number) => dati.aliquoteVerificate.get(a) !== true;

  // regionale dell'anno in corso: da febbraio a giugno (prima del saldo)
  if (md >= '02-01' && md <= '06-30' && aperto(anno))
    out.push({
      chiave: `addizionale_regionale-${anno}`,
      anno,
      titolo: `Aliquote dell'addizionale regionale ${anno}`,
      perche: `La regione le ha fissate entro il 31 dicembre e il Dipartimento delle Finanze le pubblica a fine gennaio: inseriscile nei dati del ${anno} e segnale «verificate».`,
    });
  // comunale dell'anno dopo: dal 20 dicembre a fine gennaio
  if ((md >= '12-20' || md <= '01-31') && aperto(md >= '12-20' ? anno + 1 : anno)) {
    const a = md >= '12-20' ? anno + 1 : anno;
    out.push({
      chiave: `addizionale_comunale-${a}`,
      anno: a,
      titolo: `Aliquota dell'addizionale comunale ${a}`,
      perche: `I comuni pubblicano la conferma o la nuova delibera verso il 20 dicembre: controlla aliquota e soglia di esenzione del ${a}.`,
    });
  }
  // comunale: secondo giro a maggio, per le delibere arrivate con la proroga dei bilanci
  if (md >= '05-01' && md <= '05-31' && aperto(anno))
    out.push({
      chiave: `addizionale_comunale-${anno}`,
      anno,
      titolo: `Aliquota dell'addizionale comunale ${anno} (dopo la proroga dei bilanci)`,
      perche: 'Con la proroga dei bilanci alcuni comuni deliberano fino ad aprile: ricontrolla prima del saldo di giugno.',
    });
  return out;
}

const giorno = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/** Il controllo settimanale delle novità è scaduto se l'ultimo ha più di 7 giorni. */
export function controlloSettimanale(oggi: string, ultimo: string = ULTIMO_CONTROLLO.data) {
  const giorni = Math.round((giorno(oggi) - giorno(ultimo)) / 86_400_000);
  return { giorni, scaduto: giorni > 7 };
}

/**
 * Prompt da incollare all'assistente quando il controllo è scaduto. Solo dati pubblici: le regole aperte
 * sono nel repository; regione e comune l'assistente li ha nella sua memoria locale, non qui.
 */
export function promptControllo(oggi: string): string {
  const aperte = regoleAperte();
  const elenco = [...new Set(aperte.map((r) => `${r.ambito} ${r.anno}`))].join(', ');
  return [
    `Controllo settimanale delle novità di Fiscal (oggi ${oggi.split('-').reverse().join('/')}, ultimo controllo ${ULTIMO_CONTROLLO.data.split('-').reverse().join('/')}).`,
    'Controlla sulle fonti ufficiali (Gazzetta Ufficiale, Agenzia delle Entrate, MEF e Dipartimento delle Finanze, ENPAP, INPS, Sistema Tessera Sanitaria, SDI) se ci sono novità che toccano le regole di Fiscal: IRPEF e addizionali, acconti, ENPAP, IVA e bollo, ritenute, spese e oneri, scadenze.',
    `Guarda in particolare le regole ancora da verificare (${aperte.length}: ${elenco}) e dimmi quali si possono segnare «verificate».`,
    'Controlla anche le addizionali della mia regione e del mio comune (le hai in memoria).',
    'Aggiorna le notizie nell\'app con fonte, decorrenza e regole toccate; per ogni modifica delle regole preparami la proposta (prima → dopo, casi di prova) e aspetta il mio sì prima di applicarla e pubblicare.',
  ].join('\n');
}
