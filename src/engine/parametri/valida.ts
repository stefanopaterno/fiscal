import type { Regola } from '../regole/tipi';
import { DOMINI_UFFICIALI, parametro } from './catalogo';
import { leggiFonte } from './leggi-file';
import { righeAttive, uguali } from './risolvi';
import type { EsitoVoce, FileAggiornamento, ParametroCatalogo, RigaRegistro, StatoNorma, VoceFile } from './tipi';
import { variazioneAnomala } from './unita';

/**
 * Validazione voce per voce (specifica 014, research.md R-06, FR-011..FR-013, FR-015, FR-017). Ogni voce finisce
 * in un gruppo (cambia, conferma, scartata, bloccata) con i motivi in parole semplici. Nessun valore cambia qui.
 */

export type ContestoValidazione = {
  /** Anni chiusi dalla Dichiarazione (004): le loro voci sono bloccate. */
  anniChiusi: number[];
  /** Regione e comune indicati dall'utente nella richiesta (per le addizionali). */
  ambito?: { regione: string; comune: string };
  /** Domini ufficiali in più (siti di regione e comune). */
  dominiExtra?: string[];
  registro: readonly RigaRegistro[];
  /** Valore in uso del parametro nel contesto, o undefined se l'anno non ha regole. */
  inUso: (p: ParametroCatalogo, contesto: { anno: number; data?: string }) => Regola<unknown> | undefined;
};

const NORME: StatoNorma[] = ['in_vigore', 'approvata_non_pubblicata', 'proposta'];
const eData = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x));
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

/** Il collegamento è su un dominio ufficiale (uguale o sottodominio, confrontando l'host, mai il testo). */
export function fonteUfficiale(url: string, extra: string[] = []): boolean {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    host = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  return [...DOMINI_UFFICIALI, ...extra.map((d) => d.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))]
    .filter(Boolean)
    .some((d) => host === d || host.endsWith(`.${d}`));
}

function leggiVoce(x: unknown): VoceFile | string {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return 'voce non valida';
  const v = x as Record<string, unknown>;
  if (typeof v.chiave !== 'string' || v.chiave.length > 120) return 'chiave mancante';
  const fonte = leggiFonte(v.fonte);
  if (typeof fonte === 'string') return fonte;
  if (v.stato_proposto !== 'verificata' && v.stato_proposto !== 'da_verificare') return 'stato_proposto deve essere «verificata» o «da_verificare»';
  if (!NORME.includes(v.stato_norma as StatoNorma)) return 'stato_norma non valido';
  if (v.nota !== undefined && !(typeof v.nota === 'string' && v.nota.length <= 500)) return 'nota oltre 500 caratteri';
  const haAnno = v.anno !== undefined;
  const haDal = v.dal !== undefined;
  if (haAnno === haDal) return 'serve esattamente uno tra «anno» e «dal»';
  if (haAnno && !(Number.isInteger(v.anno) && (v.anno as number) >= 2000 && (v.anno as number) <= 2100)) return 'anno non valido';
  if (haDal && !eData(v.dal)) return '«dal» deve essere una data AAAA-MM-GG';
  if (!('valore' in v)) return 'valore mancante';
  return {
    chiave: v.chiave,
    ...(haAnno ? { anno: v.anno as number } : { dal: v.dal as string }),
    valore: v.valore,
    fonte,
    stato_proposto: v.stato_proposto,
    stato_norma: v.stato_norma as StatoNorma,
    ...(typeof v.nota === 'string' ? { nota: v.nota.trim() } : {}),
  };
}

export function validaFile(file: FileAggiornamento, ctx: ContestoValidazione): EsitoVoce[] {
  const esiti: EsitoVoce[] = file.voci.map((x, indice): EsitoVoce => {
    const base = { indice, anomala: false, fileVecchio: false };
    const v = leggiVoce(x);
    const chiaveGrezza = x && typeof x === 'object' && typeof (x as Record<string, unknown>).chiave === 'string' ? String((x as Record<string, unknown>).chiave).slice(0, 120) : '?';
    if (typeof v === 'string') return { ...base, gruppo: 'scartata', chiave: chiaveGrezza, nome: chiaveGrezza, motivi: [v] };

    const comune = { ...base, chiave: v.chiave, anno: v.anno, dal: v.dal, fonte: v.fonte, nota: v.nota, statoNorma: v.stato_norma };
    const p = parametro(v.chiave);
    if (!p) return { ...comune, gruppo: 'scartata', nome: v.chiave, motivi: ['chiave sconosciuta: non è nel catalogo dei parametri'] };
    const conNome = { ...comune, nome: p.nome };

    if (p.decorrenza === 'data' && v.dal === undefined)
      return { ...conNome, gruppo: 'scartata', motivi: ['questo parametro vale dalla data dell\'operazione: serve «dal», non «anno»'] };
    if (p.decorrenza !== 'data' && v.anno === undefined)
      return { ...conNome, gruppo: 'scartata', motivi: ['questo parametro vale per anno: serve «anno», non «dal»'] };

    if (p.insieme === 'addizionali') {
      if (!file.ambito || !ctx.ambito) return { ...conNome, gruppo: 'scartata', motivi: ['addizionali senza regione e comune: non so a chi si riferiscono'] };
      if (norm(file.ambito.regione) !== norm(ctx.ambito.regione) || norm(file.ambito.comune) !== norm(ctx.ambito.comune))
        return { ...conNome, gruppo: 'scartata', motivi: [`addizionali di ${file.ambito.comune} (${file.ambito.regione}), non del tuo comune`] };
    }

    const conv = p.conv.daFile(v.valore);
    if (!conv.ok) return { ...conNome, gruppo: 'scartata', motivi: [conv.motivo] };
    const dopo = conv.valore;

    const motivi: string[] = [];
    let statoFinale = v.stato_proposto;
    if (statoFinale === 'verificata' && !fonteUfficiale(v.fonte.url, ctx.dominiExtra)) {
      statoFinale = 'da_verificare';
      motivi.push('la fonte non è un sito ufficiale: resta «da verificare»');
    }
    if (statoFinale === 'verificata' && v.stato_norma !== 'in_vigore') {
      statoFinale = 'da_verificare';
      motivi.push(v.stato_norma === 'proposta' ? 'norma solo proposta, non ancora in vigore' : 'norma approvata ma non ancora pubblicata');
    }

    const annata = v.anno ?? Number(v.dal!.slice(0, 4));
    const prima = ctx.inUso(p, { anno: annata, data: v.dal });
    const conPrimaDopo = { ...conNome, motivi, prima: prima?.valore, dopo, statoPrima: prima?.stato, statoFinale };
    if (ctx.anniChiusi.includes(annata))
      return {
        ...conPrimaDopo,
        gruppo: 'bloccata',
        motivi: [`il ${annata} è chiuso: cambia solo con una norma retroattiva, riapri l'anno dalla Dichiarazione se è il caso`],
      };

    // File superato: sullo stesso parametro c'è un aggiornamento approvato dopo la data della ricerca
    const fileVecchio = righeAttive(ctx.registro).some(
      (r) => r.chiave === p.chiave && (r.anno ?? null) === (v.anno ?? null) && r.creato_il.slice(0, 10) > file.data_ricerca,
    );
    if (fileVecchio) motivi.push('hai approvato un aggiornamento più recente di questa ricerca: il file potrebbe essere superato');
    if (!prima) motivi.push(`il programma non ha ancora regole per il ${annata}: gli altri valori saranno riportati dall'anno prima e «da verificare»`);

    if (prima && uguali(prima.valore, dopo)) {
      if (prima.stato === 'da_verificare' && statoFinale === 'verificata') motivi.unshift('stesso valore, ora confermato da fonte ufficiale');
      else motivi.unshift('stesso valore già in uso');
      return { ...conPrimaDopo, gruppo: 'conferma', fileVecchio };
    }
    const anomala = prima !== undefined && prima.valore !== null && variazioneAnomala(prima.valore, dopo);
    if (anomala) motivi.push('variazione molto forte rispetto al valore in uso: controlla bene prima di approvare');
    return { ...conPrimaDopo, gruppo: 'cambia', anomala, fileVecchio };
  });

  // Doppioni: stesso parametro e stessa decorrenza; vale l'ultima voce del file
  const ultime = new Map<string, number>();
  for (const e of esiti) if (e.gruppo === 'cambia' || e.gruppo === 'conferma') ultime.set(`${e.chiave}|${e.anno ?? e.dal}`, e.indice);
  return esiti.map((e) =>
    (e.gruppo === 'cambia' || e.gruppo === 'conferma') && ultime.get(`${e.chiave}|${e.anno ?? e.dal}`) !== e.indice
      ? { ...e, gruppo: 'scartata', motivi: ['doppione: nel file c\'è un\'altra voce per lo stesso parametro e la stessa decorrenza (vale l\'ultima)'] }
      : e,
  );
}
