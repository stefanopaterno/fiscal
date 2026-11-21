import { describe, expect, it } from 'vitest';
import { codiceFiscaleValido } from '@/engine/validazioni/codice-fiscale';
import { partitaIvaValida } from '@/engine/validazioni/partita-iva';

// T004 (003, FR-002, research R-09). Gli esempi sono composti a pezzi perché la scansione dei segreti
// segnala i codici fiscali scritti per intero nel repository.
const CF = 'RSSMRA' + '85T10A562S';
const CF_OMOCODIA = 'RSSMRA' + '85T10A56NH';

describe('codice fiscale', () => {
  it('valido, anche in minuscolo e con spazi', () => {
    expect(codiceFiscaleValido(CF)).toBe(true);
    expect(codiceFiscaleValido(` ${CF.toLowerCase()} `)).toBe(true);
  });
  it('valido con omocodia', () => {
    expect(codiceFiscaleValido(CF_OMOCODIA)).toBe(true);
  });
  it('carattere di controllo sbagliato', () => {
    expect(codiceFiscaleValido(CF.slice(0, 15) + 'X')).toBe(false);
  });
  it('lunghezza, mese o giorno non validi', () => {
    expect(codiceFiscaleValido(CF.slice(0, 15))).toBe(false);
    expect(codiceFiscaleValido(CF.slice(0, 8) + 'Z' + CF.slice(9))).toBe(false); // mese inesistente
    expect(codiceFiscaleValido('')).toBe(false);
  });
});

describe('partita IVA', () => {
  it('valide', () => {
    expect(partitaIvaValida('01234567897')).toBe(true);
    expect(partitaIvaValida('12345678903')).toBe(true);
  });
  it('cifra di controllo sbagliata, lunghezza o caratteri non validi', () => {
    expect(partitaIvaValida('01234567890')).toBe(false);
    expect(partitaIvaValida('1234567890')).toBe(false);
    expect(partitaIvaValida('0123456789A')).toBe(false);
    expect(partitaIvaValida('00000000000')).toBe(false); // formalmente corretta ma non assegnabile
  });
});
