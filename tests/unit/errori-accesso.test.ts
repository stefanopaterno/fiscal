import { describe, expect, it } from 'vitest';
import { messaggioErroreAccesso } from '@/features/auth/errori';
import { messaggi } from '@/lib/messaggi';

describe('messaggioErroreAccesso', () => {
  it("credenziali errate: messaggio generico che non rivela se l'e-mail esiste", () => {
    expect(messaggioErroreAccesso({ status: 400, code: 'invalid_credentials' })).toBe(
      messaggi.accesso.credenzialiErrate,
    );
    expect(messaggi.accesso.credenzialiErrate).not.toMatch(/non esiste|non registrat/i);
  });

  it('troppi tentativi (429): invita ad aspettare', () => {
    expect(messaggioErroreAccesso({ status: 429 })).toBe(messaggi.accesso.troppiTentativi);
  });

  it('codice a 6 cifre sbagliato', () => {
    expect(messaggioErroreAccesso({ status: 422, code: 'mfa_verification_failed' })).toBe(
      messaggi.accesso.codiceErrato,
    );
  });

  it('errore sconosciuto: messaggio generico', () => {
    expect(messaggioErroreAccesso({ status: 500 })).toBe(messaggi.generico.errore);
    expect(messaggioErroreAccesso(null)).toBe(messaggi.generico.errore);
  });
});
