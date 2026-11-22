import { formattaEuro as e } from '../importi';
import { ErroreIrpef, regoleIrpefPerAnno } from '../regole/irpef';
import { perAliquota, percentualeInTesto, somma } from './aritmetica';
import type { RisultatoAnno } from './anno';

/**
 * Acconti IRPEF per l'anno dopo (research R-05). Le regole usate sono quelle dell'anno del reddito,
 * perché l'acconto si calcola nella sua dichiarazione.
 */
export type OpzioniAcconti = {
  metodo: 'storico' | 'previsionale';
  /** Previsionale: IRPEF netta attesa dell'anno dopo meno le ritenute attese. */
  differenzaAttesa?: number | null;
  soggettoIsa: boolean;
};

export type Acconti = {
  metodo: OpzioniAcconti['metodo'];
  base: number;
  totale: number;
  primo: number;
  secondo: number;
  unicaSoluzione: boolean;
  nonDovuto: boolean;
  accontoAddComunale: number;
  spiegazione: string;
};

export function calcolaAcconti(base: RisultatoAnno, op: OpzioniAcconti): Acconti {
  const p = regoleIrpefPerAnno(base.anno).acconti.valore;
  if (op.metodo === 'previsionale' && op.differenzaAttesa == null)
    throw new ErroreIrpef("Per il metodo previsionale serve la stima dell'imposta dell'anno dopo.");
  const riferimento = op.metodo === 'storico' ? base.differenza : op.differenzaAttesa!;
  const baseAcconto = Math.max(0, riferimento);
  const accontoAddComunale = base.addizionali?.comunale.accontoAnnoDopo ?? 0;
  const annoDopo = base.anno + 1;
  const dove =
    op.metodo === 'storico'
      ? `sulla "differenza" ${base.anno} (IRPEF netta meno ritenute: ${e(base.differenza)})`
      : `sull'imposta che prevedi per il ${annoDopo} (${e(baseAcconto)})`;

  if (baseAcconto <= p.sogliaNonDovuto) {
    return {
      metodo: op.metodo,
      base: baseAcconto,
      totale: 0,
      primo: 0,
      secondo: 0,
      unicaSoluzione: false,
      nonDovuto: true,
      accontoAddComunale,
      spiegazione: `Calcolato ${dove}: non supera ${e(p.sogliaNonDovuto)}, quindi nel ${annoDopo} non devi acconti IRPEF.`,
    };
  }
  const totale = perAliquota(baseAcconto, p.percentuale);
  const quota = op.soggettoIsa ? p.primaRata.isa : p.primaRata.nonIsa;
  const unica = totale <= p.sogliaUnicaSoluzione;
  const primo = unica ? 0 : perAliquota(totale, quota);
  const secondo = totale - primo;
  const rischio =
    op.metodo === 'previsionale'
      ? " Attenzione: se l'imposta vera supera la stima, sulla parte non versata paghi interessi e una sanzione del 25% (ridotta se rimedi con il ravvedimento)."
      : '';
  return {
    metodo: op.metodo,
    base: baseAcconto,
    totale,
    primo,
    secondo,
    unicaSoluzione: unica,
    nonDovuto: false,
    accontoAddComunale,
    spiegazione:
      `Acconto ${annoDopo} calcolato ${dove}: ${percentualeInTesto(p.percentuale)} = ${e(totale)}. ` +
      (unica
        ? `Fino a ${e(p.sogliaUnicaSoluzione)} si versa tutto a novembre.`
        : `Prima rata a giugno il ${percentualeInTesto(quota)} (${e(primo)}), seconda a novembre (${e(secondo)})${op.soggettoIsa ? ' (soggetto agli indici di affidabilità: 50 e 50)' : ''}.`) +
      " Non è un'imposta in più: è un anticipo che scali dal saldo dell'anno dopo." +
      rischio,
  };
}

export type VoceVersamento =
  | 'saldo_irpef'
  | 'saldo_add_regionale'
  | 'saldo_add_comunale'
  | 'acconto_add_comunale'
  | 'acconto_irpef_1'
  | 'acconto_irpef_2';

export type StimaVersamenti = {
  meseGiugno: string;
  meseNovembre: string;
  voci: { voce: VoceVersamento; mese: string; importo: number }[];
  /** Da versare a giugno (saldo + addizionali + primo acconto), compensando i crediti. */
  giugno: number;
  novembre: number;
  /** Credito che resta dopo la compensazione di giugno. */
  credito: number;
  acconti: Acconti;
};

/** Cosa si versa a giugno e a novembre dell'anno dopo (FR-013). */
export function stimaVersamenti(base: RisultatoAnno, op: OpzioniAcconti): StimaVersamenti {
  const acconti = calcolaAcconti(base, op);
  const p = regoleIrpefPerAnno(base.anno).acconti.valore;
  const mese = (m: number) => `${base.anno + 1}-${String(m).padStart(2, '0')}`;
  const giugnoM = mese(p.mesePrimo);
  const novembreM = mese(p.meseSecondo);
  const voci: StimaVersamenti['voci'] = [
    { voce: 'saldo_irpef', mese: giugnoM, importo: base.conguaglioIrpef },
    { voce: 'saldo_add_regionale', mese: giugnoM, importo: base.addizionali?.regionale.conguaglio ?? 0 },
    { voce: 'saldo_add_comunale', mese: giugnoM, importo: base.addizionali?.comunale.conguaglio ?? 0 },
    { voce: 'acconto_add_comunale', mese: giugnoM, importo: acconti.accontoAddComunale },
    { voce: 'acconto_irpef_1', mese: giugnoM, importo: acconti.primo },
    { voce: 'acconto_irpef_2', mese: novembreM, importo: acconti.secondo },
  ];
  const sommaGiugno = somma(voci.filter((v) => v.mese === giugnoM).map((v) => v.importo));
  const creditoGiugno = Math.max(0, -sommaGiugno);
  const novembre = Math.max(0, acconti.secondo - creditoGiugno);
  return {
    meseGiugno: giugnoM,
    meseNovembre: novembreM,
    voci,
    giugno: Math.max(0, sommaGiugno),
    novembre,
    credito: Math.max(0, creditoGiugno - acconti.secondo),
    acconti,
  };
}
