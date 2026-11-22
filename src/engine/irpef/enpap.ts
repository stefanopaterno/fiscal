import { formattaEuro as e } from '../importi';
import { regoleIrpefPerAnno } from '../regole/irpef';
import { perAliquota } from './aritmetica';

/**
 * Contributi ENPAP sul reddito di un anno (research R-07). Si versano l'anno dopo (saldo entro il 1° ottobre)
 * e soggettivo e maternità si deducono nell'anno in cui si pagano; l'integrativo lo paga il cliente.
 * Minimi mancanti nelle regole ⇒ contati come zero e segnalati (mai valori inventati).
 */
export type ContributiEnpap = {
  anno: number;
  soggettivo: number;
  integrativo: number;
  maternita: number;
  /** Soggettivo + maternità: abbasseranno l'IRPEF dell'anno in cui li versi. */
  deducibili: number;
  scadenza: string;
  mancanti: string[];
  provvisorio: boolean;
  spiegazione: string;
};

export function contributiEnpap(
  anno: number,
  dati: { redditoProfessionale: number; volumeAffari: number },
): ContributiEnpap {
  const r = regoleIrpefPerAnno(anno).enpap;
  const mancanti: string[] = [];
  const aliquota = r.aliquotaSoggettivo.valore;
  const proporzionale = perAliquota(Math.max(0, dati.redditoProfessionale), aliquota);
  const minimo = r.minimoSoggettivo.valore;
  if (minimo === null) mancanti.push(`minimo del contributo soggettivo ${anno}`);
  const soggettivo = Math.max(proporzionale, minimo ?? 0);

  const integrativoProp = perAliquota(Math.max(0, dati.volumeAffari), r.aliquotaIntegrativo.valore);
  const minimoInt = r.minimoIntegrativo.valore;
  if (minimoInt === null) mancanti.push(`minimo del contributo integrativo ${anno}`);
  const integrativo = Math.max(integrativoProp, minimoInt ?? 0);

  const maternitaR = r.maternita.valore;
  if (maternitaR === null) mancanti.push(`contributo di maternità ${anno}`);
  const maternita = maternitaR ?? 0;

  const scadenza = `${anno + 1}-${r.scadenzaSaldo.valore}`;
  const daVerificare = [
    r.aliquotaSoggettivo,
    r.aliquotaIntegrativo,
    r.minimoSoggettivo,
    r.minimoIntegrativo,
    r.maternita,
  ].some((x) => x.stato === 'da_verificare');
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`.replace('.', ',');
  return {
    anno,
    soggettivo,
    integrativo,
    maternita,
    deducibili: soggettivo + maternita,
    scadenza,
    mancanti,
    provvisorio: daVerificare || mancanti.length > 0,
    spiegazione:
      `Sul reddito professionale ${anno} paghi all'ENPAP il soggettivo al ${pct(aliquota)} (${e(soggettivo)})` +
      `${maternita > 0 ? `, la maternità (${e(maternita)})` : ''} e giri l'integrativo al ${pct(r.aliquotaIntegrativo.valore)} incassato dai clienti (${e(integrativo)}). ` +
      `Il saldo scade il ${scadenza.split('-').reverse().join('/')}. Soggettivo e maternità abbassano l'IRPEF dell'anno in cui li paghi.` +
      (mancanti.length > 0 ? ` Mancano ancora: ${mancanti.join(', ')}; il calcolo li conta come zero.` : ''),
  };
}
