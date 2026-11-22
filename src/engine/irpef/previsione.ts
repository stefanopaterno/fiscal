import { anniConRegoleIrpef } from '../regole/irpef';
import { calcolaAnno, type InputAnno } from './anno';

/**
 * Stima della "differenza" dell'anno dopo per il metodo previsionale (FR-028): IRPEF in più dovuta alla
 * partita IVA con il reddito atteso, a parità di CU (le ritenute del datore coprono la parte da dipendente).
 * Se mancano le regole dell'anno dopo usa quelle dell'anno e lo dice: per il 2028 è una stima ottimista,
 * perché lo scaglione al 33% fino a 55.000 € (DDL 2027) vale solo per il 2027.
 */
export type Previsione = {
  differenzaAttesa: number;
  annoRegole: number;
  regoleDellAnnoDopo: boolean;
  avviso: string | null;
};

export function differenzaPrevista(input: InputAnno, redditoAtteso: number): Previsione {
  const annoDopo = input.anno + 1;
  const regoleDellAnnoDopo = anniConRegoleIrpef().includes(annoDopo);
  const annoRegole = regoleDellAnnoDopo ? annoDopo : input.anno;
  const comune: InputAnno = {
    ...input,
    anno: annoRegole,
    ritenuteSubite: 0,
    versamentiPrevidenza: [],
    contributiPrevisti: 0,
    accontiVersati: undefined,
  };
  const conPiva = calcolaAnno({ ...comune, redditoProfessionale: redditoAtteso });
  const soloCu = calcolaAnno({ ...comune, redditoProfessionale: 0 });
  return {
    differenzaAttesa: Math.max(0, conPiva.irpefNetta - soloCu.irpefNetta),
    annoRegole,
    regoleDellAnnoDopo,
    avviso: regoleDellAnnoDopo
      ? null
      : `Le regole ${annoDopo} non ci sono ancora: la stima usa quelle ${input.anno}. Se lo scaglione cambia (per esempio se il 33% torna a fermarsi a 50.000 €) l'imposta vera può essere più alta.`,
  };
}
