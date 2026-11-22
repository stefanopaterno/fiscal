import { perAliquota } from '../irpef/aritmetica';
import { regoleSpesePerAnno } from '../regole/spese';

/**
 * Beni durevoli (specifica 008, research R-02): fino a 516,46 € deduzione intera nell'anno di acquisto,
 * oltre ammortamento al coefficiente della categoria fino a esaurimento (ultima quota = residuo).
 * Le regole sono quelle dell'anno di acquisto.
 */
export type BeneInput = {
  costo: number;
  dataAcquisto: string;
  categoria: string;
  coefficiente?: number | null;
  dataDismissione?: string | null;
};

export type PianoAmmortamento = {
  immediata: boolean;
  coefficiente: number;
  quote: { anno: number; quota: number; residuo: number }[];
  avvisi: string[];
};

export function pianoAmmortamento(bene: BeneInput): PianoAmmortamento {
  const anno = Number(bene.dataAcquisto.slice(0, 4));
  const regole = regoleSpesePerAnno(anno).beni;
  const cat = regole.categorie.find((c) => c.codice === bene.categoria);
  const coefficiente = bene.coefficiente ?? cat?.coefficiente ?? 0.2;
  const avvisi: string[] = [];
  if (!cat)
    avvisi.push('Categoria del bene sconosciuta: uso il 20%. Verifica il coefficiente col commercialista.');
  if (bene.costo <= regole.sogliaImmediata.valore)
    return { immediata: true, coefficiente: 1, quote: [{ anno, quota: bene.costo, residuo: 0 }], avvisi };

  const annoFine = bene.dataDismissione ? Number(bene.dataDismissione.slice(0, 4)) : Infinity;
  const quote: PianoAmmortamento['quote'] = [];
  let residuo = bene.costo;
  for (let a = anno; residuo > 0 && a < annoFine && a < anno + 100; a++) {
    let quota = perAliquota(bene.costo, coefficiente);
    if (a === anno && regole.primoAnnoMeta.valore) quota = perAliquota(quota, 0.5);
    quota = Math.min(quota, residuo);
    residuo -= quota;
    quote.push({ anno: a, quota, residuo });
  }
  if (bene.dataDismissione)
    avvisi.push(
      "Bene venduto o dismesso: le quote si fermano. Sull'eventuale plusvalenza o minusvalenza senti il commercialista.",
    );
  return { immediata: false, coefficiente, quote, avvisi };
}

/** Somma delle quote di un anno su tutti i beni. */
export function quoteAmmortamentoAnno(beni: BeneInput[], anno: number): number {
  return beni.reduce((t, b) => t + (pianoAmmortamento(b).quote.find((q) => q.anno === anno)?.quota ?? 0), 0);
}
