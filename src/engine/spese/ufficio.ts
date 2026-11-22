import { perAliquota } from '../irpef/aritmetica';

/**
 * Quanto posso permettermi per un ufficio (specifica 008, US8, research R-06). Regole pratiche scelte
 * dall'utente (margine di sicurezza, rapporto massimo tra canone e incassi), non regole fiscali.
 * Canone massimo = incassi medi mensili × (1 − margine) × rapporto.
 */
export type BudgetUfficio = {
  incassiMedi: number;
  canoneMassimo: number;
  /** Sedute al mese per coprire il canone (per eccesso). */
  sedute: number;
  affidabile: boolean;
  avvisi: string[];
  ipotesi: string[];
};

export function budgetUfficio(
  incassiMensili: number[],
  parametri: { margine: number; rapporto: number },
  compensoMedioSeduta: number,
): BudgetUfficio {
  const n = incassiMensili.length;
  const media = n ? Math.round(incassiMensili.reduce((a, b) => a + b, 0) / n) : 0;
  const canone = perAliquota(perAliquota(media, 1 - parametri.margine), parametri.rapporto);
  const varianza = n ? incassiMensili.reduce((t, x) => t + (x - media) ** 2, 0) / n : 0;
  const cv = media > 0 ? Math.sqrt(varianza) / media : Infinity;
  const avvisi: string[] = [];
  if (n < 6) avvisi.push('Servono almeno 6 mesi di incassi per un suggerimento affidabile.');
  if (cv > 0.5) avvisi.push("Gli incassi cambiano molto da un mese all'altro: un affitto fisso è rischioso.");
  return {
    incassiMedi: media,
    canoneMassimo: canone,
    sedute: compensoMedioSeduta > 0 ? Math.ceil(canone / compensoMedioSeduta) : 0,
    affidabile: n >= 6 && cv <= 0.5,
    avvisi,
    ipotesi: [
      `Incassi medi degli ultimi ${n} mesi`,
      `Margine di sicurezza ${Math.round(parametri.margine * 100)}%`,
      `Canone al massimo il ${Math.round(parametri.rapporto * 100)}% degli incassi`,
    ],
  };
}

/** Incassi mensili sotto cui un canone non rispetta margine e rapporto (FR-024). */
export const sogliaIncassiPerCanone = (canone: number, p: { margine: number; rapporto: number }) =>
  Math.ceil(canone / ((1 - p.margine) * p.rapporto));
