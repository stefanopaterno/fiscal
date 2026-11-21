import { describe, expect, it } from 'vitest';
import { deveBloccare, puoSbloccareRapido, MAX_RIFIUTI_SBLOCCO } from '@/features/lock/regole';

// T076 (US5, FR-010, FR-019, FR-020): regole del blocco e dello sblocco rapido, con orologio simulato.
// Campi: data-model.md, user_security.blocco_minuti e user_security.accesso_completo_giorni.

const MINUTO = 60_000;
const GIORNO = 86_400_000;
const adesso = Date.UTC(2027, 2, 10, 12, 0, 0);

describe('deveBloccare', () => {
  it('non blocca prima del tempo impostato', () => {
    expect(deveBloccare({ ultimaAttivita: adesso - 4 * MINUTO, adesso, bloccoMinuti: 5 })).toBe(false);
  });
  it('blocca dopo i minuti di inattività impostati (valore iniziale 5)', () => {
    expect(deveBloccare({ ultimaAttivita: adesso - 5 * MINUTO, adesso, bloccoMinuti: 5 })).toBe(true);
  });
  it("rispetta un tempo diverso scelto dall'utente", () => {
    expect(deveBloccare({ ultimaAttivita: adesso - 9 * MINUTO, adesso, bloccoMinuti: 10 })).toBe(false);
    expect(deveBloccare({ ultimaAttivita: adesso - 10 * MINUTO, adesso, bloccoMinuti: 10 })).toBe(true);
  });
  it('valori fuori dai limiti (1–60) vengono riportati nei limiti', () => {
    expect(deveBloccare({ ultimaAttivita: adesso - 61 * MINUTO, adesso, bloccoMinuti: 999 })).toBe(true);
    expect(deveBloccare({ ultimaAttivita: adesso - 30_000, adesso, bloccoMinuti: 0 })).toBe(false);
  });
});

describe('puoSbloccareRapido', () => {
  const base = {
    attivo: true,
    prfDisponibile: true,
    sessioneCifrata: true,
    orarioUltimoCodice: (adesso - 3 * GIORNO) / 1000,
    accessoCompletoGiorni: 14,
    rifiuti: 0,
    adesso,
  };

  it('è possibile entro i giorni di accesso completo, sullo stesso dispositivo', () => {
    expect(puoSbloccareRapido(base)).toEqual({ ok: true });
  });
  it('non è possibile oltre i giorni di accesso completo (valore iniziale 14)', () => {
    expect(puoSbloccareRapido({ ...base, orarioUltimoCodice: (adesso - 15 * GIORNO) / 1000 })).toEqual({
      ok: false,
      motivo: 'scaduto',
    });
  });
  it('non è possibile se disattivato o se il dispositivo non lo supporta', () => {
    expect(puoSbloccareRapido({ ...base, attivo: false })).toEqual({ ok: false, motivo: 'disattivato' });
    expect(puoSbloccareRapido({ ...base, prfDisponibile: false })).toEqual({
      ok: false,
      motivo: 'non_supportato',
    });
  });
  it('non è possibile su un dispositivo nuovo (nessuna sessione cifrata qui)', () => {
    expect(puoSbloccareRapido({ ...base, sessioneCifrata: false })).toEqual({
      ok: false,
      motivo: 'nuovo_dispositivo',
    });
  });
  it(`dopo ${MAX_RIFIUTI_SBLOCCO} rifiuti di Face ID o impronta servono password e codice`, () => {
    expect(puoSbloccareRapido({ ...base, rifiuti: MAX_RIFIUTI_SBLOCCO - 1 }).ok).toBe(true);
    expect(puoSbloccareRapido({ ...base, rifiuti: MAX_RIFIUTI_SBLOCCO })).toEqual({
      ok: false,
      motivo: 'troppi_rifiuti',
    });
  });
  it("senza orario dell'ultimo codice non si sblocca", () => {
    expect(puoSbloccareRapido({ ...base, orarioUltimoCodice: undefined })).toEqual({
      ok: false,
      motivo: 'scaduto',
    });
  });
});
