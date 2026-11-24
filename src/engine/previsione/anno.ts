import { imposteAnno } from '../accantonamento/incasso';
import { stimaVersamenti, type StimaVersamenti } from '../irpef/acconti';
import { calcolaAnno, type InputAnno } from '../irpef/anno';
import { divisioneArrotondata } from '../irpef/aritmetica';
import { contributiEnpap } from '../irpef/enpap';

/**
 * Previsione di fine anno (specifica 006, FR-002, FR-008, FR-009): il motore della 001 applicato ai dati reali
 * più i compensi previsti. Spese deducibili e ritenute dei mesi futuri seguono il rapporto con i compensi
 * avuto finora (ipotesi dichiarata). Nessuna regola fiscale qui.
 */
export type BaseAnno = {
  /** Input dell'anno con i soli dati reali (da `raccogliAnno`). */
  input: InputAnno;
  compensiReali: number;
  /** Spese deducibili reali dell'anno (008 + altre spese). */
  deducibiliReali: number;
  ritenuteReali: number;
  soggettoIsa: boolean;
  /** Reddito inserito a mano: i compensi futuri non lo cambiano. */
  manuale: boolean;
};

export type PrevisioneAnno = {
  compensi: number;
  reddito: number;
  /** IRPEF e addizionali dovute in più per la partita IVA (con e senza). */
  imposte: number;
  /** Soggettivo e maternità ENPAP. */
  contributi: number;
  integrativo: number;
  /** Tasse e contributi della partita IVA. */
  totale: number;
  aliquotaMarginale: number;
  stima: StimaVersamenti;
  enpap: { importo: number; scadenza: string };
  provvisorio: boolean;
};

export function previsioneAnno(b: BaseAnno, compensiFuturi: number): PrevisioneAnno {
  const rapporto = (x: number) => (b.compensiReali > 0 ? divisioneArrotondata(x * compensiFuturi, b.compensiReali) : 0);
  const reddito = b.manuale
    ? b.input.redditoProfessionale
    : b.input.redditoProfessionale + compensiFuturi - rapporto(b.deducibiliReali);
  const input: InputAnno = {
    ...structuredClone(b.input),
    redditoProfessionale: reddito,
    ritenuteSubite: (b.input.ritenuteSubite ?? 0) + (b.manuale ? 0 : rapporto(b.ritenuteReali)),
  };
  const con = calcolaAnno(input);
  const senza = calcolaAnno({ ...structuredClone(b.input), redditoProfessionale: 0, ritenuteSubite: 0 });
  const imposte = Math.max(0, imposteAnno(con) - imposteAnno(senza));
  const compensi = b.compensiReali + compensiFuturi;
  const attivo = compensi > 0 || b.manuale;
  const c = attivo ? contributiEnpap(input.anno, { redditoProfessionale: reddito, volumeAffari: compensi }) : null;
  const contributi = c ? c.soggettivo + c.maternita : 0;
  return {
    compensi,
    reddito,
    imposte,
    contributi,
    integrativo: c?.integrativo ?? 0,
    totale: imposte + contributi,
    aliquotaMarginale: con.scaglione.aliquotaMarginale,
    stima: stimaVersamenti(con, { metodo: 'storico', soggettoIsa: b.soggettoIsa }),
    enpap: { importo: c ? c.soggettivo + c.maternita + c.integrativo : 0, scadenza: c?.scadenza ?? `${input.anno + 1}-10-01` },
    provvisorio: con.provvisorio || (c?.provvisorio ?? false),
  };
}

/**
 * Righe del prospetto (FR-001, FR-012): per ogni mese compensi, cumulato, reddito cumulato e imposte
 * maturate se l'anno finisse lì; il mese in cui l'aliquota sul prossimo euro cambia è segnalato.
 */
export type RigaMese = {
  mese: number;
  compensi: number;
  cumulato: number;
  reddito: number;
  imposteMaturate: number;
  aliquota: number;
  cambioScaglione: boolean;
};

export function righeMensili(b: BaseAnno, valori: number[]): RigaMese[] {
  let cumulato = 0;
  let prima: number | null = null;
  const senza = calcolaAnno({ ...structuredClone(b.input), redditoProfessionale: 0, ritenuteSubite: 0 });
  const totaleReali = b.compensiReali;
  return valori.map((v, i) => {
    cumulato += v;
    // reddito al mese: compensi cumulati meno spese nella stessa proporzione dell'anno
    const deducibili = totaleReali > 0 ? divisioneArrotondata(b.deducibiliReali * cumulato, Math.max(totaleReali, cumulato)) : 0;
    const reddito = b.manuale ? divisioneArrotondata(b.input.redditoProfessionale * (i + 1), 12) : cumulato - deducibili;
    const r = calcolaAnno({ ...structuredClone(b.input), redditoProfessionale: reddito, ritenuteSubite: 0 });
    const aliquota = r.scaglione.aliquotaMarginale;
    const cambio = prima != null && aliquota !== prima;
    prima = aliquota;
    return {
      mese: i + 1,
      compensi: v,
      cumulato,
      reddito,
      imposteMaturate: Math.max(0, imposteAnno(r) - imposteAnno(senza)),
      aliquota,
      cambioScaglione: cambio,
    };
  });
}

/**
 * Netto dell'anno (FR-011, T008): compensi meno spese deducibili (le future in proporzione, come per il reddito)
 * meno tasse e contributi della partita IVA. Non conta IVA, integrativo e bollo, che non sono tuoi.
 */
export function nettoAnno(b: BaseAnno, compensiFuturi: number): number {
  const spese = b.deducibiliReali + (b.compensiReali > 0 ? divisioneArrotondata(b.deducibiliReali * compensiFuturi, b.compensiReali) : 0);
  const p = previsioneAnno(b, compensiFuturi);
  return p.compensi - spese - p.totale;
}

/**
 * Compensi futuri che servono per arrivare a un netto (ricerca per bisezione sul motore: tiene conto degli
 * scaglioni e dei contributi). Null se l'obiettivo è già raggiunto o non si raggiunge entro dieci volte il netto.
 */
export function compensiPerNetto(b: BaseAnno, obiettivo: number): number | null {
  if (b.manuale || nettoAnno(b, 0) >= obiettivo) return null;
  let basso = 0;
  let alto = Math.max(100_00, obiettivo * 10);
  if (nettoAnno(b, alto) < obiettivo) return null;
  while (alto - basso > 100) {
    const medio = Math.floor((basso + alto) / 2);
    if (nettoAnno(b, medio) >= obiettivo) alto = medio;
    else basso = medio;
  }
  return Math.ceil(alto / 100) * 100;
}
