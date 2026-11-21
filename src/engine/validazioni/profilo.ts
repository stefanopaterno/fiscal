import { codiceFiscaleValido } from './codice-fiscale';
import { partitaIvaValida } from './partita-iva';

/**
 * "Pronto a fatturare?" (specifica 003, FR-001, FR-002): dati obbligatori mancanti e controlli di forma
 * della configurazione della partita IVA. Gli stessi obbligatori sono controllati dal database in
 * emetti_fattura (supabase/migrations/20261121000400_fatturazione.sql).
 */
export type DatiProfilo = {
  nome?: string | null;
  cognome?: string | null;
  codice_fiscale?: string | null;
  partita_iva?: string | null;
  inizio_attivita?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  comune?: string | null;
  provincia?: string | null;
  pec?: string | null;
  codice_destinatario?: string | null;
  iban?: string | null;
};

export type EsitoProfilo = {
  pronto: boolean;
  /** Etichette dei dati obbligatori che mancano, nell'ordine della pagina. */
  mancanti: string[];
  /** Campo → spiegazione dell'errore di forma. */
  errori: Partial<Record<keyof DatiProfilo, string>>;
};

const OBBLIGATORI: [keyof DatiProfilo, string][] = [
  ['nome', 'Nome'],
  ['cognome', 'Cognome'],
  ['codice_fiscale', 'Codice fiscale'],
  ['partita_iva', 'Partita IVA'],
  ['inizio_attivita', 'Data di inizio attività'],
  ['indirizzo', 'Indirizzo'],
  ['cap', 'CAP'],
  ['comune', 'Comune'],
  ['provincia', 'Provincia'],
];

const pieno = (v: string | null | undefined): v is string => typeof v === 'string' && v.trim() !== '';

/** IBAN: lunghezza minima e codice di controllo (ISO 13616, modulo 97). */
export function ibanValido(valore: string): boolean {
  const iban = valore.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith('IT') && iban.length !== 27) return false;
  const riordinato = iban.slice(4) + iban.slice(0, 4);
  let resto = 0;
  for (const c of riordinato) {
    const n = /\d/.test(c) ? c : String(c.charCodeAt(0) - 55);
    for (const d of n) resto = (resto * 10 + Number(d)) % 97;
  }
  return resto === 1;
}

export function controllaProfilo(p: DatiProfilo, numeroAttivita: number): EsitoProfilo {
  const mancanti = OBBLIGATORI.filter(([campo]) => !pieno(p[campo])).map(([, etichetta]) => etichetta);
  if (numeroAttivita < 1) mancanti.push("Almeno un'attività");

  const errori: EsitoProfilo['errori'] = {};
  if (pieno(p.codice_fiscale) && !codiceFiscaleValido(p.codice_fiscale))
    errori.codice_fiscale = 'Il codice fiscale non è corretto: controlla lettere e numeri (sono 16).';
  if (pieno(p.partita_iva) && !partitaIvaValida(p.partita_iva))
    errori.partita_iva = 'La partita IVA non è corretta: sono 11 cifre, controlla di averle scritte tutte.';
  if (pieno(p.cap) && !/^\d{5}$/.test(p.cap.trim())) errori.cap = 'Il CAP è fatto di 5 cifre.';
  if (pieno(p.provincia) && !/^[A-Za-z]{2}$/.test(p.provincia.trim()))
    errori.provincia = 'Scrivi la sigla della provincia, 2 lettere (es. RM).';
  if (pieno(p.codice_destinatario) && !/^[A-Za-z0-9]{7}$/.test(p.codice_destinatario.trim()))
    errori.codice_destinatario = 'Il codice destinatario è di 7 caratteri (es. 0000000).';
  if (pieno(p.iban) && !ibanValido(p.iban))
    errori.iban = "L'IBAN non è corretto: controlla di averlo copiato tutto (in Italia sono 27 caratteri).";
  if (pieno(p.pec) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.pec.trim()))
    errori.pec = "L'indirizzo PEC non sembra un'e-mail.";

  return { pronto: mancanti.length === 0 && Object.keys(errori).length === 0, mancanti, errori };
}
