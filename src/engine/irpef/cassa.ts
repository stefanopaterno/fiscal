import { divisioneArrotondata, somma } from './aritmetica';

/**
 * Reddito professionale per cassa dagli incassi dell'anno (research R-08, principio di cassa art. 54 TUIR).
 * Ogni incasso copre una parte del netto della fattura: compensi, integrativo e ritenuta si attribuiscono
 * in proporzione (stessa formula della vista `reddito_cassa` della 003).
 */
export type FatturaPerCassa = {
  id: string;
  tipo: 'fattura' | 'nota_credito';
  totale_compensi: number;
  totale_integrativo: number;
  ritenuta: number;
  netto: number;
};
export type IncassoPerCassa = { fattura_id: string; data: string; importo: number };

export type RedditoDiCassa = {
  /** Compensi incassati, ritenuta compresa, senza integrativo, IVA e bollo. */
  compensi: number;
  /** Integrativo incassato (da girare all'ENPAP): base del volume d'affari ENPAP. */
  integrativo: number;
  /** Ritenute d'acconto subite sugli incassi dell'anno (si scomputano nell'anno dell'incasso). */
  ritenute: number;
  incassato: number;
};

export function redditoDiCassa(
  anno: number,
  fatture: FatturaPerCassa[],
  incassi: IncassoPerCassa[],
): RedditoDiCassa {
  const perId = new Map(fatture.map((f) => [f.id, f]));
  const quote = incassi
    .filter((i) => i.data.startsWith(`${anno}-`))
    .flatMap((i) => {
      const f = perId.get(i.fattura_id);
      if (!f || f.netto <= 0) return [];
      const quota = (x: number) => divisioneArrotondata(i.importo * x, f.netto);
      return [
        {
          compensi: quota(f.totale_compensi),
          integrativo: quota(f.totale_integrativo),
          ritenute: quota(f.ritenuta),
          incassato: i.importo,
        },
      ];
    });
  return {
    compensi: somma(quote.map((q) => q.compensi)),
    integrativo: somma(quote.map((q) => q.integrativo)),
    ritenute: somma(quote.map((q) => q.ritenute)),
    incassato: somma(quote.map((q) => q.incassato)),
  };
}
