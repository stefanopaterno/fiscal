/**
 * Lettura di una fattura elettronica ricevuta (FatturaPA XML, tracciato SDI) per precompilare una spesa
 * (specifica 008, assunzione: "dai file XML delle fatture ricevute l'app precompila fornitore, data, importo
 * e IVA"). Funzione pura sul testo XML già estratto: riceve i valori dei nodi, non legge file.
 */
export type DatiFatturaRicevuta = {
  fornitore: string | null;
  partitaIva: string | null;
  data: string | null;
  numero: string | null;
  /** ImportoTotaleDocumento in centesimi (IVA compresa). */
  totale: number | null;
  /** Somma delle imposte del riepilogo, in centesimi. */
  iva: number;
  descrizione: string | null;
};

/** "123.45" (formato XML, punto decimale) → centesimi. */
export function importoXml(t: string | null | undefined): number | null {
  if (t == null) return null;
  const m = /^\s*(-?)(\d+)(?:\.(\d{1,8}))?\s*$/.exec(t);
  if (!m) return null;
  const decimali = (m[3] ?? '').padEnd(3, '0');
  const cent = Number(m[2]) * 100 + Number(decimali.slice(0, 2)) + (Number(decimali[2]) >= 5 ? 1 : 0);
  return m[1] === '-' ? -cent : cent;
}

/** Estrae i dati da un documento XML già analizzato (DOMParser nel browser, o equivalente nei test). */
export function leggiFatturaRicevuta(doc: Document): DatiFatturaRicevuta {
  const primo = (radice: ParentNode | null, nome: string): Element | null => {
    if (!radice) return null;
    const tutti = (radice as Element | Document).getElementsByTagName('*');
    for (const el of Array.from(tutti)) if (el.localName === nome) return el;
    return null;
  };
  const testo = (radice: ParentNode | null, nome: string) => primo(radice, nome)?.textContent?.trim() || null;
  const cedente = primo(doc, 'CedentePrestatore');
  const anagrafica = primo(cedente, 'Anagrafica');
  const denominazione = testo(anagrafica, 'Denominazione');
  const persona = [testo(anagrafica, 'Nome'), testo(anagrafica, 'Cognome')].filter(Boolean).join(' ');
  const generali = primo(doc, 'DatiGeneraliDocumento');
  const riepiloghi = Array.from(doc.getElementsByTagName('*')).filter((e) => e.localName === 'DatiRiepilogo');
  const iva = riepiloghi.reduce((t, r) => t + (importoXml(testo(r, 'Imposta')) ?? 0), 0);
  const imponibile = riepiloghi.reduce((t, r) => t + (importoXml(testo(r, 'ImponibileImporto')) ?? 0), 0);
  const totaleDichiarato = importoXml(testo(generali, 'ImportoTotaleDocumento'));
  return {
    fornitore: denominazione ?? (persona || null),
    partitaIva: testo(primo(cedente, 'IdFiscaleIVA'), 'IdCodice'),
    data: testo(generali, 'Data'),
    numero: testo(generali, 'Numero'),
    totale: totaleDichiarato ?? (riepiloghi.length ? imponibile + iva : null),
    iva,
    descrizione: testo(primo(doc, 'DettaglioLinee'), 'Descrizione'),
  };
}
