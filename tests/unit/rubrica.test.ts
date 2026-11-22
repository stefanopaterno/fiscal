import { describe, expect, it } from 'vitest';
import type { Cliente } from '@/features/fatturazione/dati';
import { iniziali, normalizza, rubrica } from '@/features/fatturazione/rubrica';

// Rubrica clienti: ordine, gruppi per lettera, ricerca senza accenti, filtro e riepilogo fatture.
const base: Omit<Cliente, 'id' | 'tipo' | 'nome' | 'cognome' | 'denominazione'> = {
  versione: 1,
  codice_fiscale: null,
  partita_iva: null,
  indirizzo: null,
  cap: null,
  comune: null,
  provincia: null,
  nazione: 'IT',
  pec: null,
  codice_destinatario: null,
  sostituto_imposta: false,
  opposizione_sts: false,
  pagato_da: null,
};
const persona = (id: string, nome: string, cognome: string, extra: Partial<Cliente> = {}): Cliente => ({
  ...base,
  id,
  tipo: 'persona_fisica',
  nome,
  cognome,
  denominazione: null,
  ...extra,
});
const ente = (id: string, denominazione: string): Cliente => ({
  ...base,
  id,
  tipo: 'ente',
  nome: null,
  cognome: null,
  denominazione,
});

const clienti = [
  persona('1', 'Luca', 'Bianchi', { comune: 'Milano' }),
  persona('2', 'Anna', 'Àlvaro'),
  persona('3', 'Marco', 'bassi'),
  ente('4', 'Centro Studi Psiche'),
];

describe('rubrica', () => {
  it('ordine per cognome, gruppi per lettera (accenti e minuscole compresi)', () => {
    const r = rubrica(clienti, [], '', 'tutti');
    expect(r.gruppi.map((g) => [g.lettera, g.voci.map((v) => v.nome)])).toEqual([
      ['A', ['Àlvaro Anna']],
      ['B', ['bassi Marco', 'Bianchi Luca']],
      ['C', ['Centro Studi Psiche']],
    ]);
    expect(r.trovati).toBe(4);
  });

  it('ricerca senza accenti, per nome e cognome in qualsiasi ordine e per comune', () => {
    expect(rubrica(clienti, [], 'alvaro', 'tutti').trovati).toBe(1);
    expect(rubrica(clienti, [], 'luca bia', 'tutti').trovati).toBe(1);
    expect(rubrica(clienti, [], 'milano', 'tutti').trovati).toBe(1);
  });

  it('filtro per tipo', () => {
    expect(rubrica(clienti, [], '', 'ente').trovati).toBe(1);
    expect(rubrica(clienti, [], '', 'persona_fisica').trovati).toBe(3);
  });

  it('conta le fatture emesse (non bozze né note di credito) e la più recente', () => {
    const r = rubrica(
      clienti,
      [
        { cliente_id: '1', tipo: 'fattura', stato: 'emessa', data: '2027-01-10' },
        { cliente_id: '1', tipo: 'fattura', stato: 'emessa', data: '2027-03-02' },
        { cliente_id: '1', tipo: 'fattura', stato: 'bozza', data: '2027-04-01' },
        { cliente_id: '1', tipo: 'nota_credito', stato: 'emessa', data: '2027-03-05' },
      ],
      'bianchi',
      'tutti',
    );
    expect(r.gruppi[0]!.voci[0]).toMatchObject({ fatture: 2, ultimaFattura: '2027-03-02', iniziali: 'LB' });
  });

  it('iniziali e normalizzazione', () => {
    expect(iniziali(clienti[3]!)).toBe('CS');
    expect(normalizza(' Così È ')).toBe('cosi e');
  });
});
