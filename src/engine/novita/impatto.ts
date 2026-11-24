import { imposteAnno } from '../accantonamento/incasso';
import { calcolaAnno, type InputAnno } from '../irpef/anno';
import { regoleIrpefPerAnno } from '../regole/irpef';
import type { Notizia } from '../regole/novita';

/**
 * Impatto di una novità sui conti dell'utente (specifica 012, T006): IRPEF e addizionali dell'anno calcolate con
 * le regole in uso e con l'alternativa descritta nella notizia. Differenza positiva = con le regole in uso paghi
 * di più. Tutto nel browser: i dati dell'utente non escono dall'app.
 */
export type Impatto = { inUso: number; alternativa: number; differenza: number; provvisorio: boolean };

export function impattoNovita(n: Notizia, input: InputAnno): Impatto | null {
  if (!n.simulazione || n.simulazione.anno !== input.anno) return null;
  const con = calcolaAnno(input);
  const alt = calcolaAnno(input, n.simulazione.applica(regoleIrpefPerAnno(input.anno)));
  const inUso = imposteAnno(con);
  const alternativa = imposteAnno(alt);
  return { inUso, alternativa, differenza: inUso - alternativa, provvisorio: con.provvisorio };
}
