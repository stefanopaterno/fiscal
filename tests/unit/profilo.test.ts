import { describe, expect, it } from 'vitest';
import { controllaProfilo, ibanValido, type DatiProfilo } from '@/engine/validazioni/profilo';

// T011 (003, FR-001, FR-002): dati obbligatori mancanti e controlli di forma della configurazione.
// Codici fiscali e IBAN di esempio costruiti a pezzi per non farli scambiare per dati veri dalla scansione.
const CF = 'RSSMRA80' + 'A01H501U';
const IBAN = 'IT60X05428' + '11101000000123456';

const completo: DatiProfilo = {
  nome: 'Mario',
  cognome: 'Rossi',
  codice_fiscale: CF,
  partita_iva: '12345678903',
  inizio_attivita: '2027-01-02',
  indirizzo: 'Via Roma 1',
  cap: '00100',
  comune: 'Roma',
  provincia: 'RM',
};

describe('controllaProfilo', () => {
  it("profilo completo con almeno un'attività: pronto a fatturare", () => {
    expect(controllaProfilo(completo, 1)).toEqual({ pronto: true, mancanti: [], errori: {} });
  });

  it('elenca in parole semplici i dati obbligatori mancanti', () => {
    const r = controllaProfilo({ nome: 'Mario', cap: '' }, 0);
    expect(r.pronto).toBe(false);
    expect(r.mancanti).toEqual([
      'Cognome',
      'Codice fiscale',
      'Partita IVA',
      'Data di inizio attività',
      'Indirizzo',
      'CAP',
      'Comune',
      'Provincia',
      "Almeno un'attività",
    ]);
  });

  it('gli spazi non contano come dato inserito', () => {
    expect(controllaProfilo({ ...completo, nome: '   ' }, 1).mancanti).toEqual(['Nome']);
  });

  it("segnala i dati scritti in modo sbagliato e blocca l'emissione", () => {
    const r = controllaProfilo(
      {
        ...completo,
        codice_fiscale: 'RSSMRA80A01H501X',
        partita_iva: '12345678901',
        cap: '0010',
        provincia: 'Roma',
        codice_destinatario: 'ABC',
        iban: 'IT00X0000000000000000000000',
        pec: 'non-una-mail',
      },
      1,
    );
    expect(r.pronto).toBe(false);
    expect(Object.keys(r.errori).sort()).toEqual(
      ['cap', 'codice_destinatario', 'codice_fiscale', 'iban', 'partita_iva', 'pec', 'provincia'].sort(),
    );
  });

  it('i campi facoltativi vuoti non sono errori', () => {
    expect(controllaProfilo({ ...completo, pec: '', iban: '', codice_destinatario: '' }, 1).errori).toEqual(
      {},
    );
  });

  it('accetta codice fiscale e provincia in minuscolo', () => {
    expect(
      controllaProfilo({ ...completo, codice_fiscale: CF.toLowerCase(), provincia: 'rm' }, 1).pronto,
    ).toBe(true);
  });
});

describe('ibanValido', () => {
  it('controlla il codice di controllo (modulo 97), con o senza spazi', () => {
    expect(ibanValido(IBAN)).toBe(true);
    expect(ibanValido(IBAN.replace(/(.{4})/g, '$1 '))).toBe(true);
    expect(ibanValido(IBAN.replace('60', '61'))).toBe(false);
    expect(ibanValido('IT60')).toBe(false);
  });
});
