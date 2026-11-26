import type { Scaglione } from '../regole/irpef/tipi';
import type { Conversione, Convertitore } from './tipi';

/**
 * Conversioni tra le unità del file di aggiornamento e quelle delle regole (specifica 014, research.md R-05).
 * Nel file: percentuali come 23 (= 23%), euro con al massimo due decimali, date AAAA-MM-GG. Nelle regole:
 * frazioni (0.23) e centesimi interi. Nessuna aritmetica in virgola mobile sugli importi: si lavora sulla
 * stringa decimale. I limiti di plausibilità stanno qui, accanto alla conversione.
 */

const ok = <T>(valore: T): Conversione<T> => ({ ok: true, valore });
const no = <T>(motivo: string): Conversione<T> => ({ ok: false, motivo });

/** Numero o stringa decimale ("2", "2.5", "2.50", 2.5) → { mantissa, scala } senza perdere cifre. */
function decimale(x: unknown, maxDecimali: number): { mantissa: bigint; scala: number } | null {
  let t: string;
  if (typeof x === 'number') {
    if (!Number.isFinite(x)) return null;
    t = String(x);
    if (/e/i.test(t)) return null;
  } else if (typeof x === 'string') {
    t = x.trim().replace(',', '.');
  } else return null;
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(t);
  if (!m) return null;
  const dec = (m[3] ?? '').replace(/0+$/, '');
  if (dec.length > maxDecimali) return null;
  return { mantissa: BigInt(`${m[1]}${m[2]}${dec}`), scala: dec.length };
}

const fmt = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 4 });

/** Euro (max 2 decimali) → centesimi interi. */
export function euroDaFile(x: unknown): number | null {
  const d = decimale(x, 2);
  if (!d) return null;
  return Number(d.mantissa * 10n ** BigInt(2 - d.scala));
}

/** Centesimi → euro per il file (numero con al massimo due decimali). */
export const euroAFile = (centesimi: number): number => Number((centesimi / 100).toFixed(2));

/** Percentuale (max 4 decimali) → frazione, senza errori di arrotondamento sul letterale. */
export function percentualeDaFile(x: unknown): number | null {
  const d = decimale(x, 4);
  if (!d) return null;
  return Number(`${d.mantissa}e-${d.scala + 2}`);
}

/** Frazione → percentuale per il file (23 per 0.23). */
export const percentualeAFile = (f: number): number => Number((f * 100).toPrecision(12));

export function percentuale(min: number, max: number): Convertitore<number> {
  return {
    unita: `percentuale (23 = 23%), tra ${fmt(min)} e ${fmt(max)}`,
    aFile: percentualeAFile,
    daFile: (x) => {
      const f = percentualeDaFile(x);
      if (f === null) return no('serve una percentuale come numero (es. 23 per il 23%)');
      const p = percentualeAFile(f);
      if (p < min || p > max)
        return no(`${fmt(p)}% è fuori dai valori plausibili (${fmt(min)}–${fmt(max)}%): hai scritto 0,23 invece di 23?`);
      return ok(f);
    },
  };
}

export function euro(min: number, max: number): Convertitore<number> {
  return {
    unita: `euro con il punto decimale (es. 2.00), tra ${fmt(min)} e ${fmt(max)}`,
    aFile: euroAFile,
    daFile: (x) => {
      const c = euroDaFile(x);
      if (c === null) return no('serve un importo in euro con al massimo due decimali (es. 2.00)');
      if (c < min * 100 || c > max * 100)
        return no(`${fmt(c / 100)} € è fuori dai valori plausibili (${fmt(min)}–${fmt(max)} €)`);
      return ok(c);
    },
  };
}

/** Euro che può mancare (es. minimo ENPAP non ancora pubblicato): null nel file = mancante. */
export function euroOpzionale(min: number, max: number): Convertitore<number | null> {
  const base = euro(min, max);
  return {
    unita: `${base.unita}; null se non ancora pubblicato`,
    aFile: (v) => (v === null ? null : base.aFile(v)),
    daFile: (x) => (x === null ? no('valore mancante: se non è pubblicato, non inserire la voce') : base.daFile(x)),
  };
}

const GIORNI_MESE = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const meseGiorno: Convertitore<string> = {
  unita: 'mese-giorno "MM-GG" (es. "06-30")',
  aFile: (v) => v,
  daFile: (x) => {
    if (typeof x !== 'string') return no('serve una data "MM-GG"');
    const m = /^(\d{2})-(\d{2})$/.exec(x.trim());
    if (!m) return no('serve una data "MM-GG" (es. "06-30")');
    const mese = Number(m[1]);
    const giorno = Number(m[2]);
    if (mese < 1 || mese > 12 || giorno < 1 || giorno > GIORNI_MESE[mese - 1]!) return no(`"${x}" non è una data valida`);
    return ok(x.trim());
  },
};

export function mese(): Convertitore<number> {
  return {
    unita: 'numero del mese (1–12)',
    aFile: (v) => v,
    daFile: (x) => (Number.isInteger(x) && (x as number) >= 1 && (x as number) <= 12 ? ok(x as number) : no('serve un mese da 1 a 12')),
  };
}

export function intero(min: number, max: number, cosa: string): Convertitore<number> {
  return {
    unita: `numero intero (${cosa}), tra ${min} e ${max}`,
    aFile: (v) => v,
    daFile: (x) =>
      Number.isInteger(x) && (x as number) >= min && (x as number) <= max
        ? ok(x as number)
        : no(`serve un numero intero tra ${min} e ${max} (${cosa})`),
  };
}

export const siNo: Convertitore<boolean> = {
  unita: 'true o false',
  aFile: (v) => v,
  daFile: (x) => (typeof x === 'boolean' ? ok(x) : no('serve true o false')),
};

export function codice(formato: RegExp, esempio: string): Convertitore<string> {
  return {
    unita: `codice (es. "${esempio}")`,
    aFile: (v) => v,
    daFile: (x) => {
      const t = typeof x === 'number' ? String(x) : x;
      return typeof t === 'string' && formato.test(t.trim()) ? ok(t.trim()) : no(`codice non valido (atteso come "${esempio}")`);
    },
  };
}

export function testo(max: number): Convertitore<string> {
  return {
    unita: `testo (al massimo ${max} caratteri)`,
    aFile: (v) => v,
    daFile: (x) => {
      if (typeof x !== 'string' || x.trim() === '') return no('serve un testo');
      if (x.length > max) return no(`testo troppo lungo (massimo ${max} caratteri)`);
      return ok(x.trim());
    },
  };
}

/**
 * Scaglioni: [{ fino_a: 28000, aliquota: 23 }, …, { fino_a: null, aliquota: 43 }]. Limiti crescenti, solo
 * l'ultimo senza limite, aliquote tra min e max (percentuali), aliquote non decrescenti se `progressivi`.
 */
export function scaglioni(min: number, max: number, progressivi = true): Convertitore<Scaglione[]> {
  return {
    unita: `scaglioni [{ "fino_a": euro o null per l'ultimo, "aliquota": percentuale tra ${fmt(min)} e ${fmt(max)} }]`,
    aFile: (v) => v.map((s) => ({ fino_a: s.finoA === null ? null : euroAFile(s.finoA), aliquota: percentualeAFile(s.aliquota) })),
    daFile: (x) => {
      if (!Array.isArray(x) || x.length === 0 || x.length > 10) return no('servono da 1 a 10 scaglioni');
      const out: Scaglione[] = [];
      for (const [i, s] of x.entries()) {
        if (typeof s !== 'object' || s === null) return no(`scaglione ${i + 1} non valido`);
        const r = s as Record<string, unknown>;
        const ultimo = i === x.length - 1;
        if (ultimo !== (r.fino_a === null)) return no('solo l\'ultimo scaglione ha "fino_a": null');
        const finoA = r.fino_a === null ? null : euroDaFile(r.fino_a);
        if (r.fino_a !== null && (finoA === null || finoA <= 0)) return no(`limite dello scaglione ${i + 1} non valido`);
        const aliq = percentualeDaFile(r.aliquota);
        if (aliq === null) return no(`aliquota dello scaglione ${i + 1} non valida`);
        const p = percentualeAFile(aliq);
        if (p < min || p > max) return no(`aliquota ${fmt(p)}% dello scaglione ${i + 1} fuori dai valori plausibili (${fmt(min)}–${fmt(max)}%)`);
        const prec = out[i - 1];
        if (prec && finoA !== null && prec.finoA !== null && finoA <= prec.finoA) return no('i limiti degli scaglioni devono essere crescenti');
        if (progressivi && prec && aliq < prec.aliquota) return no('le aliquote degli scaglioni non possono scendere');
        out.push({ finoA, aliquota: aliq });
      }
      return ok(out);
    },
  };
}

/**
 * Oggetto con campi convertiti uno per uno. `campi` associa il nome nel file alla chiave interna e al suo
 * convertitore. Tutti i campi sono obbligatori; campi in più sono rifiutati.
 */
export function oggetto<T extends Record<string, unknown>>(
  campi: { [K in keyof T]: [nomeFile: string, conv: Convertitore<T[K]>] },
  controllo?: (v: T) => string | null,
): Convertitore<T> {
  const voci = Object.entries(campi) as [keyof T & string, [string, Convertitore<unknown>]][];
  return {
    unita: `oggetto { ${voci.map(([, [n, c]]) => `"${n}": ${c.unita}`).join('; ')} }`,
    aFile: (v) => Object.fromEntries(voci.map(([k, [n, c]]) => [n, c.aFile(v[k])])),
    daFile: (x) => {
      if (typeof x !== 'object' || x === null || Array.isArray(x)) return no('serve un oggetto con i campi indicati');
      const r = x as Record<string, unknown>;
      const attesi = new Set(voci.map(([, [n]]) => n));
      const extra = Object.keys(r).filter((k) => !attesi.has(k));
      if (extra.length) return no(`campi non previsti: ${extra.join(', ')}`);
      const out: Record<string, unknown> = {};
      for (const [k, [n, c]] of voci) {
        if (!(n in r)) return no(`manca il campo "${n}"`);
        const e = c.daFile(r[n]);
        if (!e.ok) return no(`${n}: ${e.motivo}`);
        out[k] = e.valore;
      }
      const errore = controllo?.(out as T);
      return errore ? no(errore) : ok(out as T);
    },
  };
}

/** Elenco di valori dello stesso tipo, di lunghezza fissa o variabile. */
export function elenco<T>(conv: Convertitore<T>, minimo: number, massimo: number): Convertitore<T[]> {
  return {
    unita: `elenco di ${minimo}–${massimo} valori: ${conv.unita}`,
    aFile: (v) => v.map(conv.aFile),
    daFile: (x) => {
      if (!Array.isArray(x) || x.length < minimo || x.length > massimo) return no(`servono da ${minimo} a ${massimo} valori`);
      const out: T[] = [];
      for (const [i, el] of x.entries()) {
        const e = conv.daFile(el);
        if (!e.ok) return no(`valore ${i + 1}: ${e.motivo}`);
        out.push(e.valore);
      }
      return ok(out);
    },
  };
}

/**
 * Variazione anomala (research.md R-06): un numero cambia di più del 50% o una percentuale di più di 10 punti.
 * Confronta tutte le foglie numeriche dei due valori (stesse forme).
 */
export function variazioneAnomala(prima: unknown, dopo: unknown): boolean {
  const foglie = (v: unknown, out: number[] = []): number[] => {
    if (typeof v === 'number') out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => foglie(x, out));
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => foglie(x, out));
    return out;
  };
  const a = foglie(prima);
  const b = foglie(dopo);
  if (a.length !== b.length) return true;
  return a.some((x, i) => {
    const y = b[i]!;
    if (x === y) return false;
    if (Math.abs(x) <= 1 && Math.abs(y) <= 1) return Math.abs(y - x) > 0.1; // frazioni (aliquote)
    return x === 0 || Math.abs(y - x) / Math.abs(x) > 0.5;
  });
}
