import type { Regola } from '../regole/tipi';
import { valoreInUso, type AddizionaliPerAnno } from './anteprima';
import { CATALOGO } from './catalogo';
import type { Area, ParametroCatalogo } from './tipi';

/**
 * Richiesta per Claude (specifica 014, FR-004..FR-008, research.md R-09, contracts/richiesta-template.md).
 * Documento Markdown con prompt, priorità «da verificare», catalogo con i valori in uso, fonti e formato della
 * risposta. Niente dati personali: l'unica eccezione sono regione e comune, solo se l'utente li indica.
 */

export type OpzioniRichiesta = {
  /** Data di oggi (AAAA-MM-GG). */
  oggi: string;
  anni: number[];
  ambito?: { regione: string; comune: string };
  /** Aliquote delle addizionali per anno (dai dati dell'utente), per mostrare i valori in uso. */
  addizionali?: AddizionaliPerAnno;
};

const TITOLI_AREA: Record<Area, string> = {
  irpef: 'IRPEF',
  acconti: 'Acconti e versamenti',
  enpap: 'ENPAP',
  fatturazione: 'Fatturazione',
  spese: 'Spese e oneri',
  scadenze: 'Scadenze',
  f24: 'Codici tributo F24',
  adempimenti: 'Adempimenti (guide)',
  addizionali: 'Addizionali',
};

const DECORRENZA: Record<ParametroCatalogo['decorrenza'], string> = {
  anno: 'anno',
  data: 'data',
  anno_solare: 'anno solare',
};

const it = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
/** Celle di tabella: niente barre verticali né a capo. */
const cella = (s: string) => s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const valoreFile = (p: ParametroCatalogo, r: Regola<unknown> | undefined): string =>
  !r ? '—' : r.valore === null ? '— (mancante)' : cella(JSON.stringify(p.conv.aFile(r.valore)));
const stato = (r: Regola<unknown> | undefined) => (!r ? '—' : r.stato === 'verificata' ? 'verificata' : 'da verificare');

/** Contesto in cui si legge il valore in uso: per data, oggi se è dell'anno, altrimenti il 1° gennaio. */
function contesto(p: ParametroCatalogo, anno: number, oggi: string) {
  return p.decorrenza === 'data' ? { anno, data: oggi.startsWith(`${anno}-`) ? oggi : `${anno}-01-01` } : { anno };
}

export function generaRichiesta(o: OpzioniRichiesta): string {
  const anni = [...new Set(o.anni)].sort((a, b) => a - b);
  const catalogo = CATALOGO.filter((p) => p.insieme !== 'addizionali' || o.ambito);
  const righe: string[] = [];
  const push = (...x: string[]) => righe.push(...x);

  push(
    '# Richiesta di aggiornamento dei parametri fiscali — Fiscal',
    '',
    `Generata il ${it(o.oggi)}. Anni richiesti: **${anni.join(', ')}**.`,
    '',
    '## 1. Prompt',
    '',
    "Sei un esperto di fiscalità italiana delle persone fisiche. Devi aggiornare i parametri fiscali di un'app di contabilità personale per uno **psicologo iscritto ENPAP, in regime ordinario (contabilità semplificata), che è anche lavoratore dipendente**.",
    `Anni richiesti: **${anni.join(', ')}**. Data di oggi: **${it(o.oggi)}**.`,
    '',
    'Per ogni parametro del catalogo (sezione 3):',
    '',
    `1. Cerca il valore in vigore per l'anno o dalla data indicata **sulle fonti ufficiali** della sezione 4 (Gazzetta Ufficiale, Normattiva, Agenzia delle Entrate, Dipartimento delle Finanze, ENPAP, INPS${o.ambito ? ', sito della regione e del comune' : ''}). Usa siti divulgativi solo per orientarti, mai come fonte.`,
    '2. Inserisci la voce nel file **solo se** il valore è diverso da quello in uso **oppure** se hai trovato una fonte ufficiale che conferma un valore oggi «da verificare». Se non trovi una fonte, **non inserire la voce**: non indovinare.',
    '3. Per ogni voce indica la fonte esatta: titolo dell\'atto, articolo/comma, collegamento `https://` alla pagina ufficiale, data dell\'atto.',
    '4. `stato_norma`: `in_vigore` solo se l\'atto è pubblicato e in vigore; `approvata_non_pubblicata` (es. legge approvata non ancora in Gazzetta); `proposta` (disegno di legge, bozza di delibera).',
    '5. `stato_proposto`: `verificata` solo con fonte ufficiale e norma in vigore; altrimenti `da_verificare`.',
    '6. Usa **esattamente** le chiavi e le unità del catalogo: percentuali come numeri (23 = 23%), euro con il punto decimale (2.00), date `AAAA-MM-GG`, scadenze `"MM-GG"`.',
    '7. «Decorrenza»: per «anno» e «anno solare» usa il campo `anno`; per «data» usa il campo `dal` (il giorno da cui vale il nuovo valore).',
    '8. Le novità che non sono un semplice cambio di valore (una detrazione nuova, un\'imposta nuova, un calcolo diverso, una regola che non è nel catalogo) mettile in `modifiche_programma`.',
    '9. In `fonti_controllate` elenca le fonti che hai consultato e se erano raggiungibili.',
    '10. Rispondi con **solo** il file JSON nel formato della sezione 5, dentro un blocco ```json. Nessun altro testo.',
    '',
  );

  // 2. Priorità: «da verificare» o mancanti
  push('## 2. Da controllare per primi (oggi «da verificare» o mancanti)', '', '| Chiave | Anno | Valore in uso | Fonte attuale |', '|---|---|---|---|');
  let priorita = 0;
  for (const anno of anni)
    for (const p of catalogo) {
      const r = valoreInUso(p, contesto(p, anno, o.oggi), o.addizionali);
      if (r && r.stato === 'verificata' && r.valore !== null) continue;
      if (!r && p.insieme !== 'addizionali') continue; // anno senza regole: tutto è da cercare (sezione 3)
      priorita++;
      push(`| \`${p.chiave}\` | ${anno} | ${valoreFile(p, r)} | ${r ? cella(r.fonte) : 'non inserito'} |`);
    }
  if (!priorita) push('| — | — | Nessun parametro da verificare | — |');
  push('');

  // 3. Catalogo
  push(
    '## 3. Catalogo dei parametri',
    '',
    '**Decorrenza**: «anno» = vale per tutto l\'anno d\'imposta (usa `anno`); «data» = vale per le operazioni da quella data in poi (usa `dal`); «anno solare» = scadenza di quell\'anno (usa `anno`).',
    '',
  );
  for (const anno of anni) {
    push(`### Anno ${anno}`, '');
    const aree = [...new Set(catalogo.map((p) => p.area))];
    for (const area of aree) {
      const titolo = area === 'addizionali' && o.ambito ? `Addizionali (${o.ambito.regione}, comune di ${o.ambito.comune})` : TITOLI_AREA[area];
      push(`#### ${titolo}`, '', '| Chiave | Unità | Decorrenza | Valore in uso | Stato |', '|---|---|---|---|---|');
      for (const p of catalogo.filter((x) => x.area === area)) {
        const r = valoreInUso(p, contesto(p, anno, o.oggi), o.addizionali);
        push(`| \`${p.chiave}\` | ${cella(p.conv.unita)} | ${DECORRENZA[p.decorrenza]} | ${valoreFile(p, r)} | ${stato(r)} |`);
      }
      push('');
    }
  }

  // 4. Fonti
  push('## 4. Fonti ufficiali da consultare', '', '| Area | Fonti |', '|---|---|');
  const aree = [...new Set(catalogo.map((p) => p.area))];
  for (const area of aree) {
    const fonti = new Map<string, string>();
    for (const p of catalogo.filter((x) => x.area === area)) for (const f of p.fonti) fonti.set(f.url, f.nome);
    const extra = area === 'addizionali' && o.ambito ? `; sito della regione ${o.ambito.regione} e del comune di ${o.ambito.comune}` : '';
    push(`| ${TITOLI_AREA[area]} | ${[...fonti].map(([url, nome]) => `${nome} (${url})`).join('; ')}${extra} |`);
  }
  push('');

  // 5. Formato
  const esempio = {
    versione_schema: 1,
    data_ricerca: o.oggi,
    anni,
    ...(o.ambito ? { ambito: o.ambito } : {}),
    voci: [
      {
        chiave: 'irpef.scaglioni',
        anno: anni[0],
        valore: [
          { fino_a: 28000, aliquota: 23 },
          { fino_a: 50000, aliquota: 33 },
          { fino_a: null, aliquota: 43 },
        ],
        fonte: { titolo: 'Titolo dell\'atto', riferimento: 'art. …, comma …', url: 'https://www.gazzettaufficiale.it/…', data_atto: 'AAAA-MM-GG' },
        stato_proposto: 'verificata',
        stato_norma: 'in_vigore',
        nota: 'Cosa cambia, in parole semplici.',
      },
      {
        chiave: 'fattura.importo_bollo',
        dal: `${anni[0]}-01-01`,
        valore: 2.0,
        fonte: { titolo: 'Titolo dell\'atto', url: 'https://www.agenziaentrate.gov.it/…', data_atto: 'AAAA-MM-GG' },
        stato_proposto: 'verificata',
        stato_norma: 'in_vigore',
      },
    ],
    modifiche_programma: [
      {
        titolo: 'Titolo breve della novità',
        descrizione: 'Cosa cambia e perché non è un semplice valore.',
        dal: 'AAAA-MM-GG',
        fonte: { titolo: 'Titolo dell\'atto', url: 'https://…', data_atto: 'AAAA-MM-GG' },
      },
    ],
    fonti_controllate: [{ nome: 'Gazzetta Ufficiale', url: 'https://www.gazzettaufficiale.it/', raggiunta: true }],
  };
  push(
    '## 5. Formato della risposta',
    '',
    'Un solo oggetto JSON con questa forma (versione 1). L\'esempio mostra la forma, non valori reali: sostituisci i «…» e non copiare i numeri.',
    '',
    '```json',
    JSON.stringify(esempio, null, 2),
    '```',
    '',
    'Regole del formato: `versione_schema` è sempre 1; ogni voce ha `chiave`, `valore`, `fonte`, `stato_proposto`, `stato_norma` ed esattamente uno tra `anno` e `dal`; `nota` al massimo 500 caratteri; al massimo 200 voci e 50 modifiche al programma.',
  );
  if (o.ambito) push('', `Le voci \`addizionali.*\` valgono per ${o.ambito.regione}, comune di ${o.ambito.comune}: riporta \`ambito\` come nell'esempio.`);
  return righe.join('\n') + '\n';
}
