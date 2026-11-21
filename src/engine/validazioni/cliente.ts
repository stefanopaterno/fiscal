import { codiceFiscaleValido } from './codice-fiscale';
import { partitaIvaValida } from './partita-iva';

/**
 * Dati minimi per intestare una fattura (specifica 003, FR-017; art. 21 DPR 633/1972):
 * nome e indirizzo del cliente, codice fiscale per le persone, partita IVA (o codice fiscale) per gli enti.
 * Nessun dato clinico.
 */
export type DatiCliente = {
  tipo: 'persona_fisica' | 'ente';
  nome?: string | null;
  cognome?: string | null;
  denominazione?: string | null;
  codice_fiscale?: string | null;
  partita_iva?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  comune?: string | null;
  provincia?: string | null;
  nazione?: string | null;
};

export type ErroriCliente = Partial<Record<keyof DatiCliente, string>>;

const pieno = (v: string | null | undefined): v is string => typeof v === 'string' && v.trim() !== '';
const OBBLIGATORIO = 'Serve per la fattura.';

export function controllaCliente(c: DatiCliente): ErroriCliente {
  const e: ErroriCliente = {};
  const italia = !pieno(c.nazione) || c.nazione.trim().toUpperCase() === 'IT';

  if (c.tipo === 'persona_fisica') {
    if (!pieno(c.nome)) e.nome = OBBLIGATORIO;
    if (!pieno(c.cognome)) e.cognome = OBBLIGATORIO;
    if (!pieno(c.codice_fiscale))
      e.codice_fiscale = 'Serve per la fattura e per il Sistema Tessera Sanitaria.';
    else if (italia && !codiceFiscaleValido(c.codice_fiscale))
      e.codice_fiscale = 'Il codice fiscale non è corretto: controlla lettere e numeri (sono 16).';
  } else {
    if (!pieno(c.denominazione)) e.denominazione = OBBLIGATORIO;
    if (pieno(c.partita_iva)) {
      if (!partitaIvaValida(c.partita_iva)) e.partita_iva = 'La partita IVA non è corretta (11 cifre).';
    } else if (!pieno(c.codice_fiscale)) {
      e.partita_iva = "Serve la partita IVA oppure il codice fiscale dell'ente.";
    } else if (!partitaIvaValida(c.codice_fiscale) && !codiceFiscaleValido(c.codice_fiscale)) {
      e.codice_fiscale = 'Il codice fiscale non è corretto.';
    }
  }

  if (!pieno(c.indirizzo)) e.indirizzo = OBBLIGATORIO;
  if (!pieno(c.comune)) e.comune = OBBLIGATORIO;
  if (italia) {
    if (!pieno(c.cap)) e.cap = OBBLIGATORIO;
    else if (!/^\d{5}$/.test(c.cap.trim())) e.cap = 'Il CAP è fatto di 5 cifre.';
    if (!pieno(c.provincia)) e.provincia = OBBLIGATORIO;
    else if (!/^[A-Za-z]{2}$/.test(c.provincia.trim())) e.provincia = 'La sigla di 2 lettere (es. RM).';
  }
  return e;
}

/** Nome da mostrare: "Cognome Nome" per le persone, denominazione per gli enti. */
export function nomeCliente(c: Pick<DatiCliente, 'tipo' | 'nome' | 'cognome' | 'denominazione'>): string {
  return c.tipo === 'ente'
    ? (c.denominazione ?? '').trim()
    : `${(c.cognome ?? '').trim()} ${(c.nome ?? '').trim()}`.trim();
}
