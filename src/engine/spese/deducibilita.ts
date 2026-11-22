import { formattaEuro as e } from '../importi';
import { perAliquota, somma } from '../irpef/aritmetica';
import { categoria, regoleSpesePerAnno } from '../regole/spese';
import { quoteAmmortamentoAnno, type BeneInput } from './ammortamento';

/**
 * Deducibilità delle spese professionali (specifica 008, research R-01). Principio di cassa: conta la data
 * del pagamento. Costo = importo − IVA detraibile (con attività esenti l'IVA è un costo). I tetti annui
 * (formazione 10.000 €, vitto 2% dei compensi, rappresentanza 1%) valgono sul totale della categoria.
 */
export type ModalitaPagamento = 'carta' | 'bonifico' | 'contanti' | 'altro';

export type SpesaInput = {
  data: string;
  categoria: string;
  importo: number;
  ivaDetraibile?: number;
  /** Percentuale personalizzata (con motivazione salvata altrove). */
  percentuale?: number | null;
  modalita: ModalitaPagamento;
  rimborsata?: boolean;
  haGiustificativo?: boolean;
  /** Acquisto di un bene durevole del registro: si deduce con l'ammortamento, non qui. */
  beneDurevole?: boolean;
};

export type DeducibileCategoria = {
  codice: string;
  nome: string;
  speso: number;
  deducibile: number;
  /** Parte che il tetto annuo esclude. */
  eccedenza: number;
  tetto: number | null;
};

export type TotaleSpese = {
  /** Spese dell'anno deducibili + quote di ammortamento. */
  deducibile: number;
  spese: number;
  ammortamenti: number;
  perCategoria: DeducibileCategoria[];
  senzaGiustificativo: number;
  avvisi: string[];
};

export function totaleSpeseAnno(
  spese: SpesaInput[],
  beni: BeneInput[],
  contesto: { anno: number; compensi: number },
): TotaleSpese {
  const regole = regoleSpesePerAnno(contesto.anno);
  const avvisi: string[] = [];
  const perCodice = new Map<string, { speso: number; deducibile: number }>();
  let senzaGiustificativo = 0;

  for (const s of spese) {
    if (!s.data.startsWith(`${contesto.anno}-`)) continue;
    const cat = categoria(regole, s.categoria);
    if (!cat) {
      avvisi.push(`Categoria sconosciuta "${s.categoria}": spesa non contata.`);
      continue;
    }
    if (s.haGiustificativo === false) senzaGiustificativo += 1;
    const x = perCodice.get(cat.codice) ?? { speso: 0, deducibile: 0 };
    x.speso += s.importo;
    perCodice.set(cat.codice, x);
    if (s.rimborsata) continue; // rimborso analitico dal cliente: né reddito né costo
    if (s.beneDurevole) continue; // dedotto con le quote di ammortamento del registro dei beni
    if (cat.richiedeTracciabilita && s.modalita === 'contanti') {
      avvisi.push(
        `${cat.nome}: ${e(s.importo)} pagati in contanti non sono deducibili (serve un pagamento tracciabile).`,
      );
      continue;
    }
    const costo = Math.max(0, s.importo - (s.ivaDetraibile ?? 0));
    x.deducibile += perAliquota(costo, s.percentuale ?? cat.percentuale);
  }

  const perCategoria: DeducibileCategoria[] = [...perCodice].map(([codice, x]) => {
    const cat = categoria(regole, codice)!;
    const tetti = [
      cat.tettoAnnuo ?? null,
      cat.tettoSuCompensi != null ? perAliquota(Math.max(0, contesto.compensi), cat.tettoSuCompensi) : null,
    ].filter((t): t is number => t !== null);
    const tetto = tetti.length ? Math.min(...tetti) : null;
    const deducibile = tetto === null ? x.deducibile : Math.min(x.deducibile, tetto);
    if (tetto !== null && x.deducibile > tetto)
      avvisi.push(
        `${cat.nome}: oltre il tetto annuo di ${e(tetto)}, ${e(x.deducibile - tetto)} non si deducono.`,
      );
    return {
      codice,
      nome: cat.nome,
      speso: x.speso,
      deducibile,
      eccedenza: x.deducibile - deducibile,
      tetto,
    };
  });

  const ammortamenti = quoteAmmortamentoAnno(beni, contesto.anno);
  const deducibileSpese = somma(perCategoria.map((c) => c.deducibile));
  if (senzaGiustificativo > 0)
    avvisi.push(
      `${senzaGiustificativo} ${senzaGiustificativo === 1 ? 'spesa è' : 'spese sono'} senza giustificativo: conserva scontrino o fattura.`,
    );
  return {
    deducibile: deducibileSpese + ammortamenti,
    spese: deducibileSpese,
    ammortamenti,
    perCategoria,
    senzaGiustificativo,
    avvisi,
  };
}
