/**
 * Fatture ricevute importate (specifica 010, FR-016, FR-017): riconoscimento dei file e chiave per i doppioni.
 * Il riconoscimento usa il contenuto (radice XML), non il nome: i file di metadati del download massivo
 * hanno nomi diversi a seconda del canale ("_metaDato", "_MT_"...).
 */
export type TipoFileImportato = 'fattura' | 'metadati' | 'altro';

export function riconosciFileFattura(nome: string, testo: string): TipoFileImportato {
  const inizio = testo.slice(0, 2000);
  if (/<([A-Za-z0-9_]+:)?FileMetadati[\s>]/.test(inizio)) return 'metadati';
  if (/<([A-Za-z0-9_]+:)?FatturaElettronica[\s>]/.test(inizio)) return 'fattura';
  if (/_m(eta)?dat[oi]|_MT_/i.test(nome) && inizio.includes('<?xml')) return 'metadati';
  return 'altro';
}

/** Chiave del doppione: fornitore (partita IVA o codice fiscale) + numero + data; null se mancano dati. */
export function chiaveFattura(d: {
  partitaIva: string | null;
  codiceFiscale: string | null;
  numero: string | null;
  data: string | null;
}): string | null {
  const fornitore = (d.partitaIva ?? d.codiceFiscale)?.trim().toUpperCase();
  const numero = d.numero?.trim();
  if (!fornitore || !numero || !d.data) return null;
  return `${fornitore}|${numero}|${d.data}`;
}

/** È un file firmato? Dal nome (".p7m") o dai primi byte (DER SEQUENCE o Base64 di "MI"). */
export function sembraP7m(nome: string, byte: Uint8Array): boolean {
  if (/\.p7m$/i.test(nome)) return true;
  return byte[0] === 0x30 && byte[1] === 0x80;
}
