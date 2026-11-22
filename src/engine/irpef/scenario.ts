import { formattaEuro as e } from '../importi';
import { ErroreIrpef } from '../regole/irpef';
import { percentualeInTesto } from './aritmetica';
import { stimaVersamenti } from './acconti';
import { calcolaAnno, type InputAnno, type RisultatoAnno } from './anno';
import { contributiEnpap } from './enpap';

/**
 * Simulatore "e se fatturo ancora X?" (FR-012..FR-014). Lavora su una copia: i dati reali non cambiano.
 * Il costo dello scenario è IRPEF + addizionali dell'anno + contributo soggettivo ENPAP (che si paga
 * l'anno dopo e allora abbassa un po' l'IRPEF di quell'anno).
 */
export type Variazione = { compensi?: number; spese?: number };

export type ConfrontoScenario = {
  prima: RisultatoAnno;
  dopo: RisultatoAnno;
  differenze: {
    redditoComplessivo: number;
    redditoImponibile: number;
    irpef: number;
    addizionali: number;
    conguaglio: number;
    contributiEnpap: number;
    costoTotale: number;
  };
  giugno: { prima: number; dopo: number; differenza: number; mese: string };
  novembre: { prima: number; dopo: number; differenza: number };
  /** Quota dei compensi in più che resta davvero, dopo imposte e contributi. */
  nettoScenario: number;
  superaScaglione: boolean;
  spiegazione: string;
};

const addizionaliDovute = (r: RisultatoAnno) =>
  r.addizionali ? r.addizionali.regionale.dovuta + r.addizionali.comunale.dovuta : 0;

export function confrontaScenario(
  input: InputAnno,
  variazione: Variazione,
  opzioni: { soggettoIsa: boolean },
): ConfrontoScenario {
  const compensi = variazione.compensi ?? 0;
  const spese = variazione.spese ?? 0;
  if (!Number.isInteger(compensi) || !Number.isInteger(spese) || compensi < 0 || spese < 0)
    throw new ErroreIrpef('Compensi e spese dello scenario vanno inseriti come importi positivi.');

  const copia: InputAnno = structuredClone(input);
  const prima = calcolaAnno(copia);
  const dopo = calcolaAnno({ ...copia, redditoProfessionale: copia.redditoProfessionale + compensi - spese });

  const enpapPrima = contributiEnpap(input.anno, {
    redditoProfessionale: prima.redditoProfessionale,
    volumeAffari: 0,
  });
  const enpapDopo = contributiEnpap(input.anno, {
    redditoProfessionale: dopo.redditoProfessionale,
    volumeAffari: 0,
  });
  const dEnpap = enpapDopo.soggettivo - enpapPrima.soggettivo;

  const dIrpef = dopo.irpefNetta - prima.irpefNetta;
  const dAdd = addizionaliDovute(dopo) - addizionaliDovute(prima);
  const costo = dIrpef + dAdd + dEnpap;

  const op = { metodo: 'storico' as const, soggettoIsa: opzioni.soggettoIsa };
  const vPrima = stimaVersamenti(prima, op);
  const vDopo = stimaVersamenti(dopo, op);

  const supera = dopo.scaglione.aliquotaMarginale !== prima.scaglione.aliquotaMarginale;
  const variazioneNetta = compensi - spese;
  const quota = variazioneNetta !== 0 ? costo / variazioneNetta : 0;

  let spiegazione: string;
  if (variazioneNetta > 0) {
    spiegazione =
      `Con ${e(variazioneNetta)} in più di reddito paghi ${e(dIrpef)} di IRPEF, ${e(dAdd)} di addizionali e ${e(dEnpap)} di contributo soggettivo ENPAP: ` +
      `${e(costo)} in tutto, circa il ${Math.round(quota * 100)}%. Ti restano ${e(variazioneNetta - costo)}.`;
    if (supera)
      spiegazione += ` Superi lo scaglione del ${percentualeInTesto(prima.scaglione.aliquotaMarginale)}: solo la parte oltre ${e(prima.scaglione.sogliaSuccessiva ?? 0)} paga il ${percentualeInTesto(dopo.scaglione.aliquotaMarginale)}, non tutto il reddito.`;
    if (dopo.detrazioneLavoro < prima.detrazioneLavoro)
      spiegazione += ` Perdi anche ${e(prima.detrazioneLavoro - dopo.detrazioneLavoro)} di detrazione per lavoro dipendente.`;
    if (enpapDopo.mancanti.length > 0) spiegazione += " I minimi ENPAP dell'anno non sono ancora noti.";
  } else {
    spiegazione = `Con ${e(-variazioneNetta)} di reddito in meno risparmi ${e(-costo)} tra IRPEF, addizionali e contributi.`;
  }
  spiegazione += ` A giugno ${vDopo.meseGiugno.slice(0, 4)} verseresti ${e(vDopo.giugno)} invece di ${e(vPrima.giugno)} (saldo più primo acconto).`;

  return {
    prima,
    dopo,
    differenze: {
      redditoComplessivo: dopo.redditoComplessivo - prima.redditoComplessivo,
      redditoImponibile: dopo.redditoImponibile - prima.redditoImponibile,
      irpef: dIrpef,
      addizionali: dAdd,
      conguaglio: dopo.conguaglioTotale - prima.conguaglioTotale,
      contributiEnpap: dEnpap,
      costoTotale: costo,
    },
    giugno: {
      prima: vPrima.giugno,
      dopo: vDopo.giugno,
      differenza: vDopo.giugno - vPrima.giugno,
      mese: vDopo.meseGiugno,
    },
    novembre: { prima: vPrima.novembre, dopo: vDopo.novembre, differenza: vDopo.novembre - vPrima.novembre },
    nettoScenario: variazioneNetta - costo,
    superaScaglione: supera,
    spiegazione,
  };
}
