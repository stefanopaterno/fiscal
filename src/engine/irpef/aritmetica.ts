/**
 * Aritmetica intera per il motore IRPEF (research R-09): tutto in centesimi, nessun numero decimale
 * nei passaggi. Arrotondamento commerciale (metà per eccesso in valore assoluto).
 */

/** n / d arrotondato al più vicino, metà lontano da zero. d > 0. */
export function divisioneArrotondata(n: number, d: number): number {
  const segno = n < 0 ? -1 : 1;
  const a = Math.abs(n);
  return segno * Math.floor((2 * a + d) / (2 * d));
}

const SCALA_ALIQUOTA = 1_000_000;

/** Importo × aliquota (frazione con al massimo 6 decimali), arrotondato al centesimo. */
export function perAliquota(centesimi: number, aliquota: number): number {
  const parti = Math.round(aliquota * SCALA_ALIQUOTA);
  return divisioneArrotondata(centesimi * parti, SCALA_ALIQUOTA);
}

/** Coefficiente numeratore/denominatore con 4 decimali, espresso in decimillesimi (0,5455 → 5455). */
export function coefficiente4(numeratore: number, denominatore: number): number {
  return divisioneArrotondata(numeratore * 10_000, denominatore);
}

/** Importo × coefficiente in decimillesimi, arrotondato al centesimo. */
export function perCoefficiente(centesimi: number, decimillesimi: number): number {
  return divisioneArrotondata(centesimi * decimillesimi, 10_000);
}

export const somma = (valori: number[]): number => valori.reduce((a, b) => a + b, 0);

/** "0,5455" per le spiegazioni. */
export const coefficienteInTesto = (decimillesimi: number): string =>
  (decimillesimi / 10_000).toFixed(4).replace('.', ',');

/** "33%" o "1,23%". */
export const percentualeInTesto = (aliquota: number): string =>
  `${(Math.round(aliquota * 1_000_000) / 10_000).toLocaleString('it-IT', { maximumFractionDigits: 4 })}%`;
