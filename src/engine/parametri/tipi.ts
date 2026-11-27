import type { Regola, StatoVerifica } from '../regole/tipi';

/**
 * Tipi della specifica 014 (data-model.md): catalogo dei parametri aggiornabili da file, voci del file di
 * aggiornamento, esiti della validazione e righe del registro. Nessun accesso al database (principio I).
 */

/** Set di regole su cui agisce un parametro. Le addizionali stanno nei dati dell'utente, non nel codice. */
export type Insieme = 'irpef' | 'fatturazione' | 'spese' | 'scadenze' | 'f24' | 'adempimenti' | 'addizionali';

/** Come vale un nuovo valore (research.md R-03). */
export type Decorrenza = 'anno' | 'data' | 'anno_solare';

export type Area = 'irpef' | 'acconti' | 'enpap' | 'fatturazione' | 'spese' | 'scadenze' | 'f24' | 'adempimenti' | 'addizionali';

export type StatoNorma = 'in_vigore' | 'approvata_non_pubblicata' | 'proposta';

export type FonteVoce = { titolo: string; riferimento?: string; url: string; data_atto: string };

export type FonteUfficiale = { nome: string; url: string };

/** Risultato di una conversione dal file: valore nelle unità delle regole, oppure motivo del rifiuto. */
export type Conversione<T> = { ok: true; valore: T } | { ok: false; motivo: string };

/** Conversione tra le unità del file (percentuali, euro) e quelle delle regole (frazioni, centesimi). */
export type Convertitore<T> = {
  /** Descrizione dell'unità per la richiesta a Claude (es. «percentuale: 23 = 23%»). */
  unita: string;
  aFile(valore: T): unknown;
  daFile(valore: unknown): Conversione<T>;
};

/** Parametro del catalogo (data-model.md `ParametroCatalogo`). */
export type ParametroCatalogo<T = unknown> = {
  chiave: string;
  area: Area;
  insieme: Insieme;
  nome: string;
  spiegazione: string;
  decorrenza: Decorrenza;
  fonti: FonteUfficiale[];
  conv: Convertitore<T>;
  /** Percorso della regola nel set (serve al controllo di copertura del catalogo). */
  percorso: string;
  /** Valore del set per l'anno; undefined per le addizionali (dati dell'utente). */
  leggi?(set: unknown): Regola<T> | undefined;
  /** Copia del set con il nuovo valore (immutabile). */
  applica?(set: unknown, regola: Regola<T>): unknown;
};

/** Voce del file di aggiornamento (contracts/file-aggiornamento.schema.json `voce`). */
export type VoceFile = {
  chiave: string;
  anno?: number;
  dal?: string;
  valore: unknown;
  fonte: FonteVoce;
  stato_proposto: StatoVerifica;
  stato_norma: StatoNorma;
  nota?: string;
};

export type ModificaProgramma = { titolo: string; descrizione: string; dal?: string; fonte: FonteVoce };

/** File di aggiornamento letto e controllato nella forma (non ancora nei valori). */
export type FileAggiornamento = {
  versione_schema: 1;
  data_ricerca: string;
  anni: number[];
  ambito?: { regione: string; comune: string };
  voci: unknown[];
  modifiche_programma: ModificaProgramma[];
  fonti_controllate?: { nome: string; url: string; raggiunta: boolean }[];
};

export type GruppoEsito = 'cambia' | 'conferma' | 'scartata' | 'bloccata' | 'programma';

/** Esito di una voce dopo la validazione (data-model.md `EsitoVoce`). */
export type EsitoVoce = {
  indice: number;
  gruppo: GruppoEsito;
  chiave: string;
  nome: string;
  anno?: number;
  dal?: string;
  motivi: string[];
  /** Valori nelle unità delle regole. */
  prima?: unknown;
  dopo?: unknown;
  statoPrima?: StatoVerifica;
  statoFinale?: StatoVerifica;
  statoNorma?: StatoNorma;
  fonte?: FonteVoce;
  nota?: string;
  anomala: boolean;
  fileVecchio: boolean;
  /** Impatto in centesimi sulle imposte dell'anno (positivo = paghi di più). */
  impatto?: number | null;
  /** Spiegazione dell'impatto quando non è in euro (scadenze, codici). */
  impattoTesto?: string;
};

/** Riga del registro (data-model.md `aggiornamenti_parametri`). Valori nelle unità delle regole. */
export type RigaRegistro = {
  id: string;
  azione: 'approvato' | 'annullato';
  annulla_id: string | null;
  importazione_id?: string | null;
  chiave: string;
  anno: number | null;
  dal: string | null;
  valore: unknown;
  valore_precedente?: unknown;
  fonte: FonteVoce | null;
  stato: StatoVerifica;
  stato_norma: StatoNorma;
  spiegazione?: string | null;
  creato_il: string;
};

/** Da dove viene il valore in uso di un parametro. */
export type Origine =
  | { tipo: 'programma' }
  | { tipo: 'riportato'; daAnno: number }
  | { tipo: 'aggiornamento'; riga: RigaRegistro; allineato: boolean };
