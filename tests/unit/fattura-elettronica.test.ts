import { describe, expect, it } from 'vitest';
import { riepilogoFatturaElettronica } from '@/engine/adempimenti/fattura-elettronica';

// T021 (003, FR-015): riepilogo per la fattura elettronica a un ente sostituto d'imposta (caso 3).
describe('riepilogoFatturaElettronica', () => {
  const testo = riepilogoFatturaElettronica({
    tipo: 'fattura',
    numero: 4,
    anno: 2027,
    data: '2027-02-01',
    professionista: { nome: 'Mario', cognome: 'Rossi', partita_iva: '12345678903' },
    cliente: { denominazione: 'ASL Roma 1', partita_iva: '12345678903', codice_destinatario: 'ABC1234' },
    righe: [
      {
        descrizione: 'Prestazione professionale psicologica',
        quantita: 1,
        compenso: 100000,
        natura: 'esente_sanitaria',
      },
    ],
    totaleIntegrativo: 4000,
    aliquotaIntegrativo: 0.04,
    imponibileIva: 0,
    iva: 0,
    importoEsente: 104000,
    bollo: 200,
    ritenuta: 20000,
    totale: 104200,
    netto: 84200,
  });
  it('contiene tipo, natura N4, bollo virtuale, ritenuta RT01 e totali', () => {
    expect(testo).toContain('TD01');
    expect(testo).toContain('natura N4');
    expect(testo).toContain('RF01');
    expect(testo).toContain('Bollo virtuale: SI — importo 2.00');
    expect(testo).toContain('RT01');
    expect(testo).toContain('Totale documento: 1042.00');
    expect(testo).toContain('Netto a pagare: 842.00');
    expect(testo).toContain('codice destinatario ABC1234');
  });
});
