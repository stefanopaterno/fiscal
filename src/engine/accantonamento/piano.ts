import { divisioneArrotondata, perAliquota } from '../irpef/aritmetica';

/**
 * Piano mensile, interessi e netto reale (specifica 007, FR-007, FR-008, FR-015, research R-04, R-05).
 */

/** Interessi netti a capitalizzazione semplice: capitale × tasso × (1 − ritenuta) × mesi / 12. */
export function interessiNetti(capitale: number, tasso: number, ritenuta: number, mesi: number): number {
  if (capitale <= 0 || tasso <= 0 || mesi <= 0) return 0;
  return divisioneArrotondata(perAliquota(capitale, tasso * (1 - ritenuta)) * mesi, 12);
}

const mesiTra = (da: string, a: string) =>
  Number(a.slice(0, 4)) * 12 + Number(a.slice(5, 7)) - (Number(da.slice(0, 4)) * 12 + Number(da.slice(5, 7)));

export function pianoMensile(p: {
  fabbisogno: number;
  saldo: number;
  oggi: string;
  scadenza: string;
  tasso?: number | null;
  ritenuta?: number;
}): { mesi: number; mensile: number; interessi: number; mancante: number } {
  const mesi = Math.max(1, mesiTra(p.oggi, p.scadenza));
  const mancante = Math.max(0, p.fabbisogno - p.saldo);
  const quota = (x: number) => Math.ceil(x / mesi);
  let mensile = quota(mancante);
  let interessi = 0;
  if (p.tasso && p.tasso > 0 && mancante > 0) {
    const r = p.ritenuta ?? 0.26;
    // interessi sul saldo per tutti i mesi e sui versamenti mensili per il tempo medio di giacenza
    interessi = interessiNetti(p.saldo, p.tasso, r, mesi) + interessiNetti(mensile * mesi, p.tasso, r, (mesi - 1) / 2);
    mensile = quota(Math.max(0, mancante - interessi));
  }
  return { mesi, mensile, interessi, mancante };
}

/** Netto reale disponibile della partita IVA: niente stipendio, niente crediti non incassati. */
export const nettoReale = (v: { incassato: number; spese: number; necessari: number }) =>
  v.incassato - v.spese - v.necessari;
