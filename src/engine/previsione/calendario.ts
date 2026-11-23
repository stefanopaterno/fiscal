import type { StimaVersamenti } from '../irpef/acconti';
import { percentualeInTesto } from '../irpef/aritmetica';
import { formattaEuro as e } from '../importi';

/**
 * Calendario dei pagamenti per i prossimi 18 mesi (specifica 006, FR-007, FR-008) e spiegazione delle
 * variazioni tra due previsioni salvate (FR-006).
 */
export type VocePagamento = { tipo: string; importo: number };
export type MesePagamenti = { mese: string; voci: VocePagamento[]; totale: number; piuPesante: boolean };

const ETICHETTE: Record<string, string> = {
  saldo_irpef: 'Saldo IRPEF',
  saldo_add_regionale: 'Saldo addizionale regionale',
  saldo_add_comunale: 'Saldo addizionale comunale',
  acconto_add_comunale: 'Acconto addizionale comunale',
  acconto_irpef_1: 'Primo acconto IRPEF',
  acconto_irpef_2: 'Secondo acconto IRPEF',
};

const aggiungiMesi = (mese: string, n: number) => {
  const t = Number(mese.slice(0, 4)) * 12 + Number(mese.slice(5, 7)) - 1 + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

export function calendarioPagamenti(
  oggi: string,
  anni: { anno: number; stima: StimaVersamenti; enpap: { importo: number; scadenza: string } }[],
  orizzonte = 18,
): MesePagamenti[] {
  const inizio = oggi.slice(0, 7);
  const fine = aggiungiMesi(inizio, orizzonte - 1);
  const perMese = new Map<string, VocePagamento[]>();
  const metti = (mese: string, v: VocePagamento) => {
    if (v.importo <= 0 || mese < inizio || mese > fine) return;
    perMese.set(mese, [...(perMese.get(mese) ?? []), v]);
  };
  for (const a of anni) {
    // a giugno i crediti compensano i debiti (come nel motore 001): con un credito si mostra il netto
    const giugno = a.stima.voci.filter((v) => v.mese === a.stima.meseGiugno);
    if (giugno.some((v) => v.importo < 0))
      metti(a.stima.meseGiugno, { tipo: `Saldo ${a.anno} e primo acconto ${a.anno + 1}, crediti compensati`, importo: a.stima.giugno });
    else
      for (const v of giugno)
        metti(v.mese, { tipo: `${ETICHETTE[v.voce]} (${v.voce.startsWith('acconto') ? a.anno + 1 : a.anno})`, importo: v.importo });
    metti(a.stima.meseNovembre, { tipo: `Secondo acconto IRPEF (${a.anno + 1})`, importo: a.stima.novembre });
    metti(a.enpap.scadenza.slice(0, 7), { tipo: `Contributi ENPAP (${a.anno})`, importo: a.enpap.importo });
  }
  const mesi = Array.from({ length: orizzonte }, (_, i) => aggiungiMesi(inizio, i));
  const righe = mesi.map((mese) => {
    const voci = perMese.get(mese) ?? [];
    return { mese, voci, totale: voci.reduce((t, v) => t + v.importo, 0), piuPesante: false };
  });
  const max = Math.max(0, ...righe.map((r) => r.totale));
  if (max > 0) righe.find((r) => r.totale === max)!.piuPesante = true;
  return righe;
}

export type Fotografia = {
  mese: string;
  metodo: string | null;
  compensiReali: number;
  compensiPrevisti: number;
  reddito: number;
  imposte: number;
  contributi: number;
  totale: number;
  aliquotaMarginale: number;
};

/** Perché la previsione è cambiata tra due fotografie (FR-006, SC-003). */
export function spiegaVariazione(prima: Fotografia, dopo: Fotografia): string[] {
  const d = dopo.totale - prima.totale;
  const segno = (x: number) => `${x >= 0 ? '+' : '−'}${e(Math.abs(x))}`;
  const motivi: string[] = [];
  const reali = dopo.compensiReali - prima.compensiReali;
  if (reali !== 0) motivi.push(`incassi reali ${segno(reali)}`);
  const attesi = dopo.compensiReali + dopo.compensiPrevisti - (prima.compensiReali + prima.compensiPrevisti);
  if (attesi !== reali) motivi.push(`compensi attesi a fine anno ${segno(attesi)}`);
  const spese = dopo.compensiReali + dopo.compensiPrevisti - dopo.reddito - (prima.compensiReali + prima.compensiPrevisti - prima.reddito);
  if (spese !== 0) motivi.push(`spese deducibili ${segno(spese)}`);
  if (prima.metodo !== dopo.metodo) motivi.push(`metodo cambiato (${prima.metodo ?? 'nessuno'} → ${dopo.metodo ?? 'nessuno'})`);
  if (prima.aliquotaMarginale !== dopo.aliquotaMarginale)
    motivi.push(`scaglione: dal ${percentualeInTesto(prima.aliquotaMarginale)} al ${percentualeInTesto(dopo.aliquotaMarginale)} sul prossimo euro`);
  if (motivi.length === 0) return d === 0 ? ['Nessuna variazione.'] : [`${segno(d)} per dati dell'anno o regole aggiornate.`];
  return [`${segno(d)}: ${motivi.join(', ')}.`];
}
