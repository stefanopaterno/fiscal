import { describe, expect, it } from 'vitest';
import { verificaChiavePubblica } from '@/lib/supabase/chiave';

// FR-005: nel codice pubblicato può stare solo la chiave pubblica. Con una chiave segreta
// l'app deve rifiutarsi di partire.

const jwt = (role: string) =>
  ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'firma'].join('.');

describe('verificaChiavePubblica', () => {
  it('accetta la chiave publishable', () => {
    expect(() => verificaChiavePubblica('sb_publishable_abcdefghij1234')).not.toThrow();
  });

  it('accetta la vecchia chiave anon (JWT con ruolo anon)', () => {
    expect(() => verificaChiavePubblica(jwt('anon'))).not.toThrow();
  });

  it('rifiuta la chiave segreta sb_secret_', () => {
    expect(() => verificaChiavePubblica('sb_secret_abcdefghij1234')).toThrow(/segreta/);
  });

  it('rifiuta un JWT con ruolo service_role', () => {
    expect(() => verificaChiavePubblica(jwt('service_role'))).toThrow(/segreta/);
  });

  it('rifiuta una chiave vuota', () => {
    expect(() => verificaChiavePubblica('')).toThrow(/manca/);
  });
});
