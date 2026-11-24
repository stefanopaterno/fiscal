import { describe, expect, it } from 'vitest';
import { diciottoAnni, eta, nascitaDaCodiceFiscale, nomeRiservato } from '@/engine/consensi/paziente';
import { statoPaziente, type ConsensoPerStato, type RuoloFirmatario } from '@/engine/consensi/stato';

// Specifica 005: data di nascita dal codice fiscale, nome riservato e stato del consenso (SC-002).
const OGGI = '2027-03-15';

describe('codice fiscale e nome riservato', () => {
  it('ricava la data di nascita, anche per le donne e con omocodia', () => {
    expect(nascitaDaCodiceFiscale('RSSMRA10E12H501X', OGGI)).toEqual({ anno: 2010, mese: 5, giorno: 12 });
    expect(nascitaDaCodiceFiscale('VRDNNA85T52H501X', OGGI)).toEqual({ anno: 1985, mese: 12, giorno: 12 });
    // 1985 con omocodia sulle cifre dell'anno: 8→U, 5→R
    expect(nascitaDaCodiceFiscale('VRDNNAURT52H501X', OGGI)).toEqual({ anno: 1985, mese: 12, giorno: 12 });
    expect(nascitaDaCodiceFiscale('01234567890', OGGI)).toBeNull();
    expect(nascitaDaCodiceFiscale(null, OGGI)).toBeNull();
  });

  it('il secolo non porta nel futuro', () => {
    expect(nascitaDaCodiceFiscale('RSSMRA27A01H501X', OGGI)!.anno).toBe(2027);
    expect(nascitaDaCodiceFiscale('RSSMRA27D01H501X', OGGI)!.anno).toBe(1927); // aprile 2027 è nel futuro
  });

  it('età e 18 anni (anche il 29 febbraio)', () => {
    expect(eta({ anno: 2009, mese: 3, giorno: 16 }, OGGI)).toBe(17);
    expect(eta({ anno: 2009, mese: 3, giorno: 15 }, OGGI)).toBe(18);
    expect(diciottoAnni({ anno: 2008, mese: 2, giorno: 29 })).toBe('2026-03-01');
  });

  it('iniziali e anno per le persone, denominazione per gli enti', () => {
    expect(nomeRiservato({ tipo: 'persona_fisica', nome: 'mario', cognome: 'Rossi', denominazione: null, codice_fiscale: 'RSSMRA10E12H501X' }, OGGI)).toBe('M.R. 2010');
    expect(nomeRiservato({ tipo: 'persona_fisica', nome: 'Anna', cognome: 'Verdi', denominazione: null, codice_fiscale: null }, OGGI)).toBe('A.V.');
    expect(nomeRiservato({ tipo: 'ente', nome: null, cognome: null, denominazione: 'Scuola Rossi', codice_fiscale: null }, OGGI)).toBe('Scuola Rossi');
  });
});

const consenso = (data_firma: string, ruoli: RuoloFirmatario[], extra: Partial<ConsensoPerStato> = {}): ConsensoPerStato => ({
  id: `c-${data_firma}-${ruoli.join()}`,
  tipo_consenso_id: 'individuale',
  versione_testo: '1.0',
  data_firma,
  revocato_il: null,
  firmatari: ruoli.map((ruolo) => ({ ruolo })),
  ...extra,
});
const ADULTO = { anno: 1985, mese: 12, giorno: 12 };
const MINORE = { anno: 2012, mese: 5, giorno: 12 };
const stato = (consensi: ConsensoPerStato[], nascita = ADULTO, versioni: { tipo_consenso_id: string; versione_testo: string; in_vigore_dal: string }[] = []) =>
  statoPaziente({ consensi, nascita, versioni, oggi: OGGI });

describe('stato del consenso (SC-002)', () => {
  it('adulto: mancante, presente, firmato solo da un genitore', () => {
    expect(stato([]).stato).toBe('mancante');
    expect(stato([consenso('2027-01-10', ['paziente'])]).stato).toBe('presente');
    expect(stato([consenso('2027-01-10', ['genitore'])])).toMatchObject({ stato: 'incompleto', motivo: expect.stringMatching(/maggiorenne/) });
    expect(stato([consenso('2027-01-10', ['rappresentante_legale'])]).stato).toBe('presente');
  });

  it('minore: due genitori o il rappresentante legale', () => {
    expect(stato([consenso('2027-01-10', ['genitore'])], MINORE)).toMatchObject({ stato: 'incompleto', motivo: expect.stringMatching(/secondo genitore/) });
    expect(stato([consenso('2027-01-10', ['genitore', 'genitore'])], MINORE).stato).toBe('presente');
    expect(stato([consenso('2027-01-10', ['rappresentante_legale'])], MINORE).stato).toBe('presente');
    expect(stato([consenso('2027-01-10', ['paziente'])], MINORE).stato).toBe('incompleto');
  });

  it('revoca e nuovo consenso: conta l\'ultimo, lo storico resta', () => {
    const revocato = consenso('2026-06-01', ['paziente'], { revocato_il: '2026-12-01' });
    expect(stato([revocato]).stato).toBe('revocato');
    const r = stato([revocato, consenso('2027-02-01', ['paziente'])]);
    expect(r.stato).toBe('presente');
  });

  it('da rinnovare: 18 anni compiuti o nuova versione del testo', () => {
    const neoMaggiorenne = { anno: 2009, mese: 1, giorno: 10 };
    expect(stato([consenso('2025-01-10', ['genitore', 'genitore'])], neoMaggiorenne)).toMatchObject({ stato: 'da_rinnovare', motivo: expect.stringMatching(/18 anni/) });
    const v = [{ tipo_consenso_id: 'individuale', versione_testo: '2.0', in_vigore_dal: '2027-02-01' }];
    expect(stato([consenso('2027-01-10', ['paziente'])], ADULTO, v)).toMatchObject({ stato: 'da_rinnovare', motivo: expect.stringMatching(/2\.0/) });
    expect(stato([consenso('2027-02-10', ['paziente'], { versione_testo: '2.0' })], ADULTO, v).stato).toBe('presente');
  });

  it('più tipi: vince lo stato più grave; promemoria 18 anni e revisione a 12 mesi', () => {
    const r = stato([consenso('2027-01-10', ['paziente']), consenso('2027-01-10', ['genitore'], { tipo_consenso_id: 'coppia', id: 'x' })]);
    expect(r.stato).toBe('incompleto');
    expect(stato([], { anno: 2009, mese: 4, giorno: 20 }).diciottoVicini).toBe('2027-04-20');
    expect(stato([consenso('2026-01-10', ['paziente'])]).daRivedere).toBe(true);
  });
});
