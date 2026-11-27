import type { FileAggiornamento, FonteVoce, ModificaProgramma } from './tipi';

/**
 * Lettura del file di aggiornamento (specifica 014, research.md R-05, FR-010, FR-013). Accetta il JSON puro o la
 * risposta di Claude con testo intorno o dentro un blocco ```json: prende il primo oggetto JSON che ha
 * `versione_schema`. Il contenuto è solo dati: niente viene eseguito o interpretato come istruzione.
 */

export const LIMITE_FILE = 256 * 1024;

export type Lettura = { ok: true; file: FileAggiornamento } | { ok: false; motivo: string };

const COME_CORREGGERE =
  'Chiedi a Claude: «Rispondi solo con il file JSON nel formato della sezione 5 della richiesta, versione_schema 1».';

/** Oggetti JSON bilanciati nel testo (rispetta le stringhe), nell'ordine in cui compaiono. */
function* oggettiJson(testo: string): Generator<string> {
  for (let inizio = testo.indexOf('{'); inizio !== -1; inizio = testo.indexOf('{', inizio + 1)) {
    let profondita = 0;
    let inStringa = false;
    let escape = false;
    for (let i = inizio; i < testo.length; i++) {
      const c = testo[i]!;
      if (inStringa) {
        if (escape) escape = false;
        else if (c === '\\') escape = true;
        else if (c === '"') inStringa = false;
      } else if (c === '"') inStringa = true;
      else if (c === '{') profondita++;
      else if (c === '}' && --profondita === 0) {
        yield testo.slice(inizio, i + 1);
        inizio = i;
        break;
      }
    }
  }
}

const eData = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x));
const stringa = (x: unknown, max: number): x is string => typeof x === 'string' && x.trim().length > 0 && x.length <= max;

/** Fonte valida secondo lo schema (titolo, https, data dell'atto). */
export function leggiFonte(x: unknown): FonteVoce | string {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return 'fonte mancante';
  const f = x as Record<string, unknown>;
  if (!stringa(f.titolo, 200)) return 'fonte senza titolo (o titolo oltre 200 caratteri)';
  if (!stringa(f.url, 500) || !/^https:\/\/[^\s]+$/.test(f.url)) return 'la fonte deve avere un collegamento https://';
  try {
    new URL(f.url);
  } catch {
    return 'collegamento della fonte non valido';
  }
  if (!eData(f.data_atto)) return 'fonte senza data dell\'atto (AAAA-MM-GG)';
  if (f.riferimento !== undefined && !(typeof f.riferimento === 'string' && f.riferimento.length <= 120))
    return 'riferimento della fonte oltre 120 caratteri';
  return { titolo: f.titolo.trim(), url: f.url, data_atto: f.data_atto, ...(f.riferimento ? { riferimento: String(f.riferimento).trim() } : {}) };
}

export function leggiFile(testo: string): Lettura {
  if (testo.length > LIMITE_FILE) return { ok: false, motivo: 'Il file è troppo grande (oltre 256 KB).' };
  let trovato: Record<string, unknown> | null = null;
  for (const blocco of oggettiJson(testo)) {
    try {
      const o = JSON.parse(blocco) as unknown;
      if (o && typeof o === 'object' && !Array.isArray(o) && 'versione_schema' in o) {
        trovato = o as Record<string, unknown>;
        break;
      }
    } catch {
      // non è JSON valido: si passa al blocco successivo
    }
  }
  if (!trovato) return { ok: false, motivo: `Non trovo un file di aggiornamento nel testo. ${COME_CORREGGERE}` };
  if (trovato.versione_schema !== 1)
    return { ok: false, motivo: `Versione del formato non supportata (${String(trovato.versione_schema)}). ${COME_CORREGGERE}` };
  if (!eData(trovato.data_ricerca)) return { ok: false, motivo: `Manca la data della ricerca. ${COME_CORREGGERE}` };
  const anni = trovato.anni;
  if (!Array.isArray(anni) || anni.length === 0 || anni.length > 10 || !anni.every((a) => Number.isInteger(a) && a >= 2000 && a <= 2100))
    return { ok: false, motivo: `Gli anni del file non sono validi. ${COME_CORREGGERE}` };
  if (!Array.isArray(trovato.voci) || trovato.voci.length > 200)
    return { ok: false, motivo: `Le voci mancano o sono più di 200. ${COME_CORREGGERE}` };
  const modifiche = trovato.modifiche_programma ?? [];
  if (!Array.isArray(modifiche) || modifiche.length > 50)
    return { ok: false, motivo: `Le modifiche al programma non sono un elenco valido. ${COME_CORREGGERE}` };

  let ambito: FileAggiornamento['ambito'];
  if (trovato.ambito !== undefined) {
    const a = trovato.ambito as Record<string, unknown> | null;
    if (!a || !stringa(a.regione, 60) || !stringa(a.comune, 80)) return { ok: false, motivo: `L'ambito (regione e comune) non è valido. ${COME_CORREGGERE}` };
    ambito = { regione: a.regione.trim(), comune: a.comune.trim() };
  }

  // Le modifiche al programma non valide si scartano una per una (non bloccano il file)
  const modificheValide: ModificaProgramma[] = [];
  for (const m of modifiche) {
    if (!m || typeof m !== 'object') continue;
    const r = m as Record<string, unknown>;
    const fonte = leggiFonte(r.fonte);
    if (!stringa(r.titolo, 160) || !stringa(r.descrizione, 1000) || typeof fonte === 'string') continue;
    if (r.dal !== undefined && !eData(r.dal)) continue;
    modificheValide.push({ titolo: r.titolo.trim(), descrizione: r.descrizione.trim(), fonte, ...(r.dal ? { dal: r.dal as string } : {}) });
  }

  const fonti = Array.isArray(trovato.fonti_controllate)
    ? (trovato.fonti_controllate as unknown[])
        .slice(0, 50)
        .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
        .filter((f) => stringa(f.nome, 120) && stringa(f.url, 500) && typeof f.raggiunta === 'boolean')
        .map((f) => ({ nome: String(f.nome), url: String(f.url), raggiunta: Boolean(f.raggiunta) }))
    : undefined;

  return {
    ok: true,
    file: {
      versione_schema: 1,
      data_ricerca: trovato.data_ricerca,
      anni: anni as number[],
      ...(ambito ? { ambito } : {}),
      voci: trovato.voci,
      modifiche_programma: modificheValide,
      ...(fonti ? { fonti_controllate: fonti } : {}),
    },
  };
}

/** Impronta di una modifica al programma per non duplicarla tra importazioni (research.md R-10). */
export function improntaModifica(m: Pick<ModificaProgramma, 'titolo' | 'fonte'>): string {
  const titolo = m.titolo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const url = m.fonte.url.replace(/[#?].*$/, '').replace(/\/+$/, '').toLowerCase();
  return `${titolo}|${url}`;
}
