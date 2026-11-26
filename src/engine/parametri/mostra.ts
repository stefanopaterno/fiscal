import { formattaEuro } from '../importi';
import type { ParametroCatalogo } from './tipi';

/** Valori dei parametri in parole semplici per l'interfaccia (specifica 014, FR-014, FR-023). */

const pct = (f: number) => `${Number((f * 100).toPrecision(12)).toLocaleString('it-IT', { maximumFractionDigits: 4 })}%`;
const data = (mg: string) => (/^\d{2}-\d{2}$/.test(mg) ? `${mg.slice(3)}/${mg.slice(0, 2)}` : mg);

export function mostraValore(p: ParametroCatalogo, v: unknown): string {
  if (v === undefined) return '—';
  if (v === null) return 'non ancora pubblicato';
  const unita = p.conv.unita;
  if (Array.isArray(v) && v.every((s) => s && typeof s === 'object' && 'aliquota' in s)) {
    return (v as { finoA?: number | null; fino_a?: number | null; aliquota: number }[])
      .map((s) => {
        const limite = s.finoA ?? s.fino_a ?? null;
        return limite === null ? `${pct(s.aliquota)} oltre` : `${pct(s.aliquota)} fino a ${formattaEuro(limite)}`;
      })
      .join('; ');
  }
  if (typeof v === 'number') {
    if (unita.startsWith('percentuale')) return pct(v);
    if (unita.startsWith('euro')) return formattaEuro(v);
    return String(v);
  }
  if (typeof v === 'string') return unita.startsWith('mese-giorno') ? data(v) : v;
  if (typeof v === 'boolean') return v ? 'sì' : 'no';
  // oggetti: si mostrano nelle unità del file, leggibili
  try {
    return JSON.stringify(p.conv.aFile(v as never))
      .replace(/[{}"]/g, '')
      .replace(/,/g, ', ')
      .replace(/:/g, ': ')
      .replace(/_/g, ' ');
  } catch {
    return JSON.stringify(v);
  }
}
