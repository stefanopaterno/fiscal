/**
 * Tipi delle regole fiscali per anno (costituzione, principio I: regole separate e versionate per anno).
 * Ogni regola porta la fonte normativa e lo stato di verifica: le regole "da_verificare" vengono
 * segnalate nei risultati, così l'utente sa che sono stime.
 */
export type StatoVerifica = 'verificata' | 'da_verificare';

export type Regola<T> = { valore: T; fonte: string; stato: StatoVerifica };

export type RegoleFatturazione = {
  anno: number;
  /** Contributo integrativo ENPAP addebitato in fattura (frazione, es. 0.04). */
  aliquotaIntegrativo: Regola<number>;
  /** IVA ordinaria (frazione, es. 0.22). */
  aliquotaIva: Regola<number>;
  /** Soglia oltre cui scatta il bollo, in centesimi (strettamente maggiore). */
  sogliaBollo: Regola<number>;
  /** Importo del bollo, in centesimi. */
  importoBollo: Regola<number>;
  /** Ritenuta d'acconto sul compenso (frazione, es. 0.2). */
  aliquotaRitenuta: Regola<number>;
  /** Il contributo integrativo è escluso dalla base della ritenuta. */
  integrativoFuoriRitenuta: Regola<boolean>;
  diciture: { esenzione: string; bollo: string; opposizioneSts: string };
};
