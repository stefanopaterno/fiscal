import type { Regola } from '../tipi';

/**
 * Regole delle spese e degli oneri per anno (specifica 008, research R-01..R-03). Importi in centesimi,
 * percentuali come frazione. Ogni voce ha fonte e stato: le regole "da_verificare" sono segnalate.
 */
export type CategoriaSpesa = {
  codice: string;
  nome: string;
  /** Quota deducibile (1 = 100%). */
  percentuale: number;
  /** Tetto annuo della categoria in euro (centesimi), sulla parte deducibile. */
  tettoAnnuo?: number;
  /** Tetto annuo come quota dei compensi dell'anno (es. 0.02 = 2%). */
  tettoSuCompensi?: number;
  /** Deducibile solo se pagata con strumenti tracciabili. */
  richiedeTracciabilita: boolean;
  /** Disattivata finché l'utente non la attiva (studio fisico, FR-026). */
  attivaDiDefault: boolean;
  /** "comunque": spesa utile al lavoro; "risparmio": si fa soprattutto per il vantaggio fiscale. */
  natura: 'comunque' | 'risparmio';
  esempio: string;
  regola: Regola<true>;
};

export type CategoriaBene = { codice: string; nome: string; coefficiente: number; regola: Regola<true> };

export type VoceOnere = {
  codice: string;
  nome: string;
  tipo: 'deduzione' | 'detrazione';
  /** Detrazione: aliquota (es. 0.19). */
  aliquota?: number;
  /** Franchigia sotto cui non spetta nulla (centesimi). */
  franchigia?: number;
  /** Limite annuo della spesa agevolabile (centesimi). */
  limite?: number;
  /** Deduzione: limite come quota del reddito complessivo. */
  limiteSuReddito?: number;
  /** Contributo volontario: aliquota massima sul reddito professionale (obbligatoria compresa). */
  aliquotaMassimaVolontaria?: number;
  richiedeTracciabilita: boolean;
  /** Esclusa dal tetto dell'art. 16-ter. */
  fuoriTetto16ter: boolean;
  natura: 'comunque' | 'risparmio';
  /** Denaro vincolato (previdenza): compare nei consigli solo con l'accantonamento coperto. */
  vincolata: boolean;
  /** È una scelta da consigliare (fondo pensione, donazioni)? Spese mediche e mutuo no: non si fanno per le tasse. */
  consigliabile: boolean;
  regola: Regola<true>;
};

export type Tetto16ter = {
  soglie: { oltre: number; base: number }[];
  /** Coefficiente per numero di figli a carico: indice = figli (l'ultimo vale per "o più"). */
  coefficientiFigli: number[];
};

export type RegoleSpese = {
  anno: number;
  categorie: CategoriaSpesa[];
  beni: { sogliaImmediata: Regola<number>; primoAnnoMeta: Regola<boolean>; categorie: CategoriaBene[] };
  oneri: VoceOnere[];
  tetto16ter: Regola<Tetto16ter>;
  /** Scadenza per pagare le spese dell'anno ("MM-GG") e inizio dei promemoria. */
  scadenza: Regola<{ pagamentoEntro: string; promemoriaDal: string }>;
};
