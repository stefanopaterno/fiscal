/**
 * Totali dello storico (specifica 003, FR-011, FR-018): emesso (note di credito sottratte),
 * incassato e da incassare. Le bozze non contano; le fatture annullate non sono "da incassare".
 */
export type DocumentoTotali = {
  id: string;
  tipo: 'fattura' | 'nota_credito';
  stato: 'bozza' | 'emessa' | 'annullata';
  totale: number;
  netto: number;
};

export function totaliFatture(
  documenti: DocumentoTotali[],
  incassi: { fattura_id: string; importo: number }[],
): { emesso: number; incassato: number; daIncassare: number; documenti: number } {
  const validi = documenti.filter((d) => d.stato !== 'bozza');
  const incassatoPer = new Map<string, number>();
  for (const i of incassi) incassatoPer.set(i.fattura_id, (incassatoPer.get(i.fattura_id) ?? 0) + i.importo);
  let emesso = 0;
  let incassato = 0;
  let daIncassare = 0;
  for (const d of validi) {
    emesso += d.tipo === 'nota_credito' ? -d.totale : d.totale;
    if (d.tipo !== 'fattura') continue;
    const preso = incassatoPer.get(d.id) ?? 0;
    incassato += preso;
    if (d.stato === 'emessa') daIncassare += Math.max(0, d.netto - preso);
  }
  return { emesso, incassato, daIncassare, documenti: validi.length };
}
