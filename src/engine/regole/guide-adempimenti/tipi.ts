import type { StatoVerifica } from '../tipi';

/**
 * Guide agli adempimenti (specifica 015, data-model.md). Testi con segnaposto `{{…}}` risolti dalle regole
 * (valori.ts): nessun codice tributo, data di scadenza o aliquota scritta a mano (FR-007).
 */

/** Testo con segnaposto `{{f24.x}}`, `{{scadenza.x}}`, `{{fattura.x}}`, `{{enpap.x}}`, `{{adempimenti.x}}`. */
export type Testo = string;

export type GruppoGuida = 'apertura' | 'fattura' | 'versamenti' | 'dichiarazioni' | 'particolari';
export type Frequenza = 'una_volta' | 'ogni_fattura' | 'ogni_mese' | 'ogni_trimestre' | 'ogni_anno' | 'se_serve';
export type PertinenzaGuida = 'sempre' | 'iva' | 'bollo' | 'sts';
export type ModuloDisegno = 'f24' | 'redditi' | 'inizio_attivita' | 'fattura';

export type Passo = { testo: Testo; /** Casella del disegno collegata. */ casella?: string; avvertenza?: Testo };

export type Campo = { modulo: string; campo: string; valore: Testo; aiuto: Testo };

export type Disegno = { modulo: ModuloDisegno; /** Caselle evidenziate: id della casella → numero del passo (1…n). */ caselle: Record<string, number> };

export type FonteGuida = { nome: string; url: string; ufficiale: boolean };

export type Guida = {
  id: string;
  gruppo: GruppoGuida;
  titolo: string;
  riga: string;
  frequenza: Frequenza;
  paroleChiave: string[];
  pertinenza: PertinenzaGuida;
  inBreve: Testo;
  quando: Testo;
  doveSiFa: Testo;
  cosaTiServe?: Testo[];
  passi: Passo[];
  campi?: Campo[];
  errori?: Testo[];
  parere?: Testo;
  fonti: FonteGuida[];
  ultimoControllo: string;
  stato: StatoVerifica;
  daVerificare?: string[];
  apriInFiscal?: { href: string; testo: string };
  disegno?: Disegno;
};
