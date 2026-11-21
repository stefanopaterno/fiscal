/**
 * Quota di operazioni imponibili e pro-rata di detraibilità IVA (specifica 003, FR-024, research R-03).
 * Pro-rata (art. 19-bis DPR 633/72): percentuale arrotondata all'unità superiore solo se la parte
 * decimale supera 0,5, altrimenti all'unità inferiore. Calcolo con numeri interi (centesimi).
 */
export function quotaImponibile(input: { imponibili: number; esenti: number }): {
  quota: number;
  prorata: number;
} {
  const totale = input.imponibili + input.esenti;
  if (totale <= 0) return { quota: 0, prorata: 0 };
  const quota = Math.round((input.imponibili * 10000) / totale) / 100;
  const numeratore = input.imponibili * 100;
  const intera = Math.floor(numeratore / totale);
  const resto = numeratore - intera * totale;
  const prorata = resto * 2 > totale ? intera + 1 : intera;
  return { quota, prorata };
}
