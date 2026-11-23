import { calcolaAnno, type InputAnno } from '../irpef/anno';
import { perAliquota, percentualeInTesto } from '../irpef/aritmetica';
import { regoleIrpefPerAnno } from '../regole/irpef';
import { imposteAnno, soggettivo } from './incasso';

/**
 * Percentuale del mese (specifica 007, FR-003, research R-02): quanto mettere da parte ogni 100 € di
 * compenso (imposte e soggettivo, più margine), con i motivi; integrativo, IVA e bollo incassati si mettono
 * da parte per intero e sono indicati a parte.
 */
export type PercentualeMese = {
  per100: number;
  imposte: number;
  contributi: number;
  margine: number;
  aliquotaMarginale: number;
  aliquotaEnpap: number;
  detrazioneLavoro: number;
  motivi: string[];
};

const CENTO = 100_00;

export function percentualeMese(input: InputAnno, opz: { margine: number }): PercentualeMese {
  const ora = calcolaAnno(structuredClone(input));
  const dopo = calcolaAnno({ ...structuredClone(input), redditoProfessionale: input.redditoProfessionale + CENTO });
  const imposte = Math.max(0, imposteAnno(dopo) - imposteAnno(ora));
  const contributi = Math.max(0, soggettivo(input.anno, input.redditoProfessionale + CENTO) - soggettivo(input.anno, input.redditoProfessionale));
  const margine = perAliquota(imposte + contributi, opz.margine);
  let aliquotaEnpap = 0;
  try {
    aliquotaEnpap = regoleIrpefPerAnno(input.anno).enpap.aliquotaSoggettivo.valore;
  } catch {
    aliquotaEnpap = 0;
  }
  const motivi = [
    `IRPEF: il tuo prossimo euro di partita IVA è al ${percentualeInTesto(ora.scaglione.aliquotaMarginale)}${
      ora.scaglione.mancaAlProssimo != null ? `, fino a ${Math.round((ora.scaglione.sogliaSuccessiva ?? 0) / 100).toLocaleString('it-IT')} € di imponibile` : ''
    }.`,
    `ENPAP: contributo soggettivo al ${percentualeInTesto(aliquotaEnpap)} sul reddito della partita IVA.`,
  ];
  if (ora.detrazioneLavoro > dopo.detrazioneLavoro)
    motivi.push('Ogni euro in più riduce un po\' la detrazione per lavoro dipendente: per questo la quota supera l\'aliquota.');
  if (margine) motivi.push(`Margine di sicurezza del ${percentualeInTesto(opz.margine)} su imposte e contributi.`);
  return {
    per100: imposte + contributi + margine,
    imposte,
    contributi,
    margine,
    aliquotaMarginale: ora.scaglione.aliquotaMarginale,
    aliquotaEnpap,
    detrazioneLavoro: ora.detrazioneLavoro,
    motivi,
  };
}

/** Che cosa è cambiato tra due fotografie della percentuale (SC-003). */
export function motiviCambio(prima: PercentualeMese, dopo: PercentualeMese): string[] {
  const m: string[] = [];
  if (prima.aliquotaMarginale !== dopo.aliquotaMarginale)
    m.push(`Sei passato dal ${percentualeInTesto(prima.aliquotaMarginale)} al ${percentualeInTesto(dopo.aliquotaMarginale)} di IRPEF sul prossimo euro.`);
  if (prima.aliquotaEnpap !== dopo.aliquotaEnpap)
    m.push(`Il contributo soggettivo ENPAP è passato dal ${percentualeInTesto(prima.aliquotaEnpap)} al ${percentualeInTesto(dopo.aliquotaEnpap)}.`);
  if (prima.detrazioneLavoro !== dopo.detrazioneLavoro)
    m.push(
      dopo.detrazioneLavoro < prima.detrazioneLavoro
        ? 'La detrazione per lavoro dipendente si è ridotta perché il reddito complessivo è cresciuto.'
        : 'La detrazione per lavoro dipendente è aumentata.',
    );
  if (prima.margine !== dopo.margine && m.length === 0) m.push('È cambiato il margine di sicurezza.');
  if (m.length === 0 && prima.per100 !== dopo.per100) m.push('Sono cambiati spese, contributi o dati dell\'anno.');
  return m;
}
