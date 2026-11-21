import { describe, expect, it } from 'vitest';
import { controllaCliente, nomeCliente, type DatiCliente } from '@/engine/validazioni/cliente';

// T014 (003, FR-017): dati minimi per intestare una fattura (art. 21 DPR 633/72), nessun dato clinico.
const CF = 'RSSMRA80' + 'A01H501U';
const sede = { indirizzo: 'Via Roma 1', cap: '00100', comune: 'Roma', provincia: 'RM', nazione: 'IT' };
const paziente: DatiCliente = {
  tipo: 'persona_fisica',
  nome: 'Mario',
  cognome: 'Rossi',
  codice_fiscale: CF,
  ...sede,
};

describe('controllaCliente', () => {
  it('paziente completo: nessun errore', () => {
    expect(controllaCliente(paziente)).toEqual({});
  });

  it('paziente: nome, cognome, codice fiscale e indirizzo obbligatori', () => {
    expect(Object.keys(controllaCliente({ tipo: 'persona_fisica', nazione: 'IT' })).sort()).toEqual(
      ['cap', 'codice_fiscale', 'cognome', 'comune', 'indirizzo', 'nome', 'provincia'].sort(),
    );
  });

  it('codice fiscale del paziente controllato', () => {
    expect(controllaCliente({ ...paziente, codice_fiscale: 'RSSMRA80' + 'A01H501X' })).toHaveProperty(
      'codice_fiscale',
    );
  });

  it('ente: denominazione e partita IVA o codice fiscale numerico', () => {
    const ente: DatiCliente = {
      tipo: 'ente',
      denominazione: 'ASL Roma 1',
      partita_iva: '12345678903',
      ...sede,
    };
    expect(controllaCliente(ente)).toEqual({});
    expect(controllaCliente({ ...ente, partita_iva: '', codice_fiscale: '12345678903' })).toEqual({});
    expect(controllaCliente({ ...ente, partita_iva: '' })).toHaveProperty('partita_iva');
    expect(controllaCliente({ ...ente, partita_iva: '12345678901' })).toHaveProperty('partita_iva');
    expect(controllaCliente({ ...ente, denominazione: ' ' })).toHaveProperty('denominazione');
  });

  it('estero: CAP e provincia non richiesti', () => {
    expect(controllaCliente({ ...paziente, nazione: 'FR', cap: '', provincia: '' })).toEqual({});
  });
});

describe('nomeCliente', () => {
  it('cognome e nome per le persone, denominazione per gli enti', () => {
    expect(nomeCliente(paziente)).toBe('Rossi Mario');
    expect(nomeCliente({ tipo: 'ente', denominazione: 'ASL Roma 1' })).toBe('ASL Roma 1');
  });
});
