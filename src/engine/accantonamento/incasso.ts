import { formattaEuro as e } from '../importi';
import { calcolaAnno, type InputAnno, type RisultatoAnno } from '../irpef/anno';
import { divisioneArrotondata, perAliquota, percentualeInTesto } from '../irpef/aritmetica';
import { contributiEnpap } from '../irpef/enpap';
import { anniConRegoleIrpef } from '../regole/irpef';

/**
 * Accantonamento di un incasso (specifica 007, FR-001, FR-002, research R-01): imposte e soggettivo ENPAP
 * dovuti per quel compenso (motore 001, con e senza), più integrativo, IVA e bollo incassati, meno la
 * ritenuta già versata dal cliente. Il margine di sicurezza vale su imposte e soggettivo, a parte.
 */
export type QuoteIncasso = {
  compenso: number;
  integrativo: number;
  iva: number;
  bollo: number;
  ritenuta: number;
  incassato: number;
};

/** Quote di una fattura coperte da un incasso, in proporzione al netto (come `redditoDiCassa`). */
export function quoteIncasso(
  f: { totale_compensi: number; totale_integrativo: number; iva: number; bollo: number; ritenuta: number; netto: number },
  importo: number,
): QuoteIncasso {
  const q = (x: number) => (f.netto > 0 ? divisioneArrotondata(importo * x, f.netto) : 0);
  return {
    compenso: q(f.totale_compensi),
    integrativo: q(f.totale_integrativo),
    iva: q(f.iva),
    bollo: q(f.bollo),
    ritenuta: q(f.ritenuta),
    incassato: importo,
  };
}

export const imposteAnno = (r: RisultatoAnno) =>
  r.irpefNetta + (r.addizionali ? r.addizionali.regionale.dovuta + r.addizionali.comunale.dovuta : 0);

export function soggettivo(anno: number, reddito: number): number {
  if (!anniConRegoleIrpef().includes(anno)) return 0;
  return contributiEnpap(anno, { redditoProfessionale: reddito, volumeAffari: 0 }).soggettivo;
}

export type Accantonamento = QuoteIncasso & {
  imposte: number;
  contributi: number;
  margine: number;
  totale: number;
  netto: number;
  aliquotaMarginale: number;
  spiegazione: string;
};

/** `input` è l'anno com'è oggi, con l'incasso già compreso nel reddito professionale. */
export function accantonamentoIncasso(input: InputAnno, q: QuoteIncasso, opz: { margine: number }): Accantonamento {
  const con = calcolaAnno(structuredClone(input));
  const senza = calcolaAnno({ ...structuredClone(input), redditoProfessionale: input.redditoProfessionale - q.compenso });
  const imposte = Math.max(0, imposteAnno(con) - imposteAnno(senza));
  const contributi = Math.max(0, soggettivo(input.anno, input.redditoProfessionale) - soggettivo(input.anno, input.redditoProfessionale - q.compenso));
  const margine = perAliquota(imposte + contributi, opz.margine);
  const totale = Math.max(0, imposte + contributi + margine + q.integrativo + q.iva + q.bollo - q.ritenuta);
  const parti = [
    `${e(imposte)} di IRPEF e addizionali (la parte di reddito oltre la busta paga è al ${percentualeInTesto(con.scaglione.aliquotaMarginale)})`,
    `${e(contributi)} di contributo soggettivo ENPAP`,
  ];
  if (margine) parti.push(`${e(margine)} di margine di sicurezza`);
  if (q.integrativo) parti.push(`${e(q.integrativo)} di contributo integrativo da girare all'ENPAP`);
  if (q.iva) parti.push(`${e(q.iva)} di IVA da versare`);
  if (q.bollo) parti.push(`${e(q.bollo)} di bollo da versare`);
  return {
    ...q,
    imposte,
    contributi,
    margine,
    totale,
    netto: q.incassato - totale,
    aliquotaMarginale: con.scaglione.aliquotaMarginale,
    spiegazione:
      `Metti da parte ${parti.join(', ')}` +
      (q.ritenuta ? `, meno ${e(q.ritenuta)} di ritenuta che il cliente ha già versato per te` : '') +
      `: ${e(totale)}. Ti restano ${e(q.incassato - totale)}.`,
  };
}
