import type { Regola } from '../tipi';

/**
 * Regole IRPEF, acconti e previdenza per anno d'imposta (specifica 001, research R-10).
 * Importi in centesimi, aliquote come frazione (0.23 = 23%). Ogni valore ha fonte e stato:
 * con un valore `null` la regola manca e il risultato è "provvisorio" (mai valori inventati).
 */
export type Scaglione = {
  /** Limite superiore dello scaglione in centesimi; null per l'ultimo (nessun limite). */
  finoA: number | null;
  aliquota: number;
};

/** Detrazione per lavoro dipendente (art. 13 c. 1 e 1.1 TUIR), sul reddito complessivo. */
export type ParametriDetrazioneLavoro = {
  /** Importo fisso fino alla prima soglia. */
  importoFisso: number;
  primaSoglia: number;
  /** Seconda fascia: base + aggiunta × (secondaSoglia − R) / (secondaSoglia − primaSoglia). */
  base: number;
  aggiunta: number;
  secondaSoglia: number;
  /** Terza fascia: base × (terzaSoglia − R) / (terzaSoglia − secondaSoglia); zero oltre. */
  terzaSoglia: number;
  /** Maggiorazione per redditi oltre `oltre` e fino a `finoA` (compreso). */
  maggiorazione: { importo: number; oltre: number; finoA: number };
};

/** Ulteriore detrazione per i lavoratori dipendenti (art. 1 c. 6 L. 207/2024). */
export type ParametriUlterioreDetrazione = {
  importo: number;
  /** Spetta per redditi oltre `oltre`… */
  oltre: number;
  /** …piena fino a `pienaFinoA`, poi decresce fino a zero a `azzeraA`. */
  pienaFinoA: number;
  azzeraA: number;
};

export type ParametriAcconti = {
  /** Quota della "differenza" dovuta come acconto (1 = 100%). */
  percentuale: number;
  /** Acconto non dovuto se la base non supera questa soglia (centesimi). */
  sogliaNonDovuto: number;
  /** Fino a questa soglia l'acconto si versa tutto a novembre. */
  sogliaUnicaSoluzione: number;
  /** Quota della prima rata: soggetti non ISA e soggetti ISA. */
  primaRata: { nonIsa: number; isa: number };
  /** Acconto dell'addizionale comunale (quota della comunale dovuta). */
  addizionaleComunale: number;
  /** Il primo acconto si versa a giugno, il secondo a novembre (numero del mese). */
  mesePrimo: number;
  meseSecondo: number;
  /** Se vero, la "differenza" per l'acconto dell'anno dopo va ricalcolata con gli scaglioni precedenti. */
  conScaglioniPrecedenti: boolean;
};

export type ParametriRateizzazione = {
  maxRate: number;
  /** Interessi di ciascuna rata sull'importo della rata (la prima senza interessi), titolari di P.IVA. */
  interessiPerRata: number[];
};

export type ParametriDifferimento = { maggiorazione: number; giorni: number };

/** Contributi ENPAP del reddito dell'anno (si versano l'anno dopo). */
export type RegoleEnpap = {
  aliquotaSoggettivo: Regola<number>;
  aliquotaIntegrativo: Regola<number>;
  minimoSoggettivo: Regola<number | null>;
  minimoIntegrativo: Regola<number | null>;
  maternita: Regola<number | null>;
  /** Scadenza del saldo sui redditi dell'anno, nell'anno dopo ("MM-GG"). */
  scadenzaSaldo: Regola<string>;
};

export type RegoleIrpef = {
  anno: number;
  scaglioni: Regola<Scaglione[]>;
  detrazioneLavoro: Regola<ParametriDetrazioneLavoro>;
  ulterioreDetrazione: Regola<ParametriUlterioreDetrazione>;
  /** L'ulteriore detrazione va rapportata ai giorni di lavoro? */
  ulterioreRagguagliata: Regola<boolean>;
  /** Addizionali dovute solo se l'IRPEF netta è maggiore di zero (art. 50 c. 2 D.Lgs. 446/1997). */
  addizionaliSoloConIrpefDovuta: Regola<boolean>;
  acconti: Regola<ParametriAcconti>;
  rateizzazione: Regola<ParametriRateizzazione>;
  differimento: Regola<ParametriDifferimento>;
  enpap: RegoleEnpap;
};
