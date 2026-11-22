/**
 * Importi: l'app lavora in centesimi interi (principio I). Conversioni da e verso il testo in italiano.
 */
/** Importo in euro scritto dall'utente ("80", "80,5", "1.234,56") → centesimi; null se non valido. */
export function euroInCentesimi(testo: string): number | null {
  const t = testo.trim().replace(/\s|€/g, '');
  if (t === '') return null;
  // "38.000" o "1.234.567" senza virgola: in italiano il punto separa le migliaia
  const migliaia = !t.includes(',') && /^\d{1,3}(\.\d{3})+$/.test(t);
  const normale = t.includes(',')
    ? t.replace(/\./g, '').replace(',', '.')
    : migliaia
      ? t.replace(/\./g, '')
      : t;
  if (!/^\d+(\.\d{1,2})?$/.test(normale)) return null;
  const [interi, decimali = ''] = normale.split('.');
  return Number(interi) * 100 + Number(decimali.padEnd(2, '0'));
}

/** Centesimi → "1.234,56 €". */
export function formattaEuro(centesimi: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' }).format(
    centesimi / 100,
  );
}

/** Centesimi → testo modificabile ("80,00"). */
export function centesimiInTesto(centesimi: number): string {
  return (centesimi / 100).toFixed(2).replace('.', ',');
}
