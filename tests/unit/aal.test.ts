import { describe, expect, it } from 'vitest';
import { destinazione, statoDaLivelli, type StatoAccesso } from '@/lib/supabase/aal';

// Macchina a stati dell'accesso: contracts/app-routes-and-lock.md (sezione "Macchina a stati").
// I livelli vengono da Supabase Auth: currentLevel = livello della sessione, nextLevel = livello
// raggiungibile (aal2 solo se l'utente ha un secondo fattore verificato).

describe('statoDaLivelli', () => {
  it('senza sessione è anonimo', () => {
    expect(statoDaLivelli({ sessione: false })).toBe('anonimo');
  });

  it('password giusta e secondo fattore configurato: manca il codice (aal1)', () => {
    expect(statoDaLivelli({ sessione: true, currentLevel: 'aal1', nextLevel: 'aal2' })).toBe('aal1');
  });

  it('password giusta ma nessun secondo fattore: va configurato', () => {
    expect(statoDaLivelli({ sessione: true, currentLevel: 'aal1', nextLevel: 'aal1' })).toBe('aal1_senza_fattore');
  });

  it('password e codice: accesso completo (aal2)', () => {
    expect(statoDaLivelli({ sessione: true, currentLevel: 'aal2', nextLevel: 'aal2' })).toBe('aal2');
  });

  it('livelli mancanti o sconosciuti non danno mai accesso completo', () => {
    expect(statoDaLivelli({ sessione: true })).toBe('aal1_senza_fattore');
    expect(statoDaLivelli({ sessione: true, currentLevel: null, nextLevel: null })).toBe('aal1_senza_fattore');
  });
});

describe('destinazione', () => {
  const casi: Array<[StatoAccesso, string, string | null]> = [
    ['anonimo', '/home/', '/accesso/'],
    ['anonimo', '/accesso/', null],
    ['aal1', '/home/', '/accesso/secondo-fattore/'],
    ['aal1', '/accesso/secondo-fattore/', null],
    ['aal1', '/accesso/recupero/', null],
    ['aal1_senza_fattore', '/home/', '/accesso/configura/'],
    ['aal1_senza_fattore', '/accesso/configura/', null],
    ['aal1_senza_fattore', '/accesso/recupero/', null],
    ['aal2', '/accesso/', '/home/'],
    ['aal2', '/home/', null],
    ['aal2', '/impostazioni/sicurezza/', null],
  ];

  it.each(casi)('stato %s sulla pagina %s → %s', (stato, pagina, attesa) => {
    expect(destinazione(stato, pagina)).toBe(attesa);
  });

  it('una pagina protetta non è mai raggiungibile senza aal2', () => {
    for (const stato of ['anonimo', 'aal1', 'aal1_senza_fattore'] as const) {
      expect(destinazione(stato, '/home/')).not.toBeNull();
      expect(destinazione(stato, '/impostazioni/sicurezza/')).not.toBeNull();
    }
  });
});
