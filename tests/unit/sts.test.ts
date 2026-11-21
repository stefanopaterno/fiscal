import { describe, expect, it } from 'vitest';
import { csvSts, righeSts, type DocumentoSts } from '@/engine/adempimenti/sts';

// T021 (003, FR-014): righe e CSV per il Sistema Tessera Sanitaria.
const CF = 'RSSMRA80' + 'A01H501U';
const base: DocumentoSts = {
  numero: 1,
  anno: 2027,
  data: '2027-01-10',
  tipo: 'fattura',
  codiceFiscalePaziente: CF.toLowerCase(),
  totale: 8520,
  incassi: [{ data: '2027-01-10', tracciabile: true }],
};

describe('righeSts', () => {
  it('fattura incassata con carta: data di pagamento e tracciato', () => {
    expect(righeSts([base])[0]).toEqual({
      documento: '1/2027',
      dataDocumento: '2027-01-10',
      codiceFiscale: CF,
      importo: 8520,
      dataPagamento: '2027-01-10',
      tracciato: true,
      tipoSpesa: 'SP',
      tipoDocumento: 'Fattura',
    });
  });
  it('non incassata: niente data di pagamento; un pagamento in contanti rende non tracciato', () => {
    expect(righeSts([{ ...base, incassi: [] }])[0]).toMatchObject({ dataPagamento: null, tracciato: null });
    const misto = righeSts([
      {
        ...base,
        incassi: [
          { data: '2027-02-01', tracciabile: true },
          { data: '2027-01-20', tracciabile: false },
        ],
      },
    ])[0]!;
    expect(misto).toMatchObject({ dataPagamento: '2027-01-20', tracciato: false });
  });
  it('ordinate per anno e numero; la nota di credito è un rimborso', () => {
    const r = righeSts([{ ...base, numero: 3, tipo: 'nota_credito', data: '2027-03-01', incassi: [] }, base]);
    expect(r.map((x) => x.documento)).toEqual(['1/2027', '3/2027']);
    expect(r[1]).toMatchObject({ tipoDocumento: 'Rimborso (nota di credito)', dataPagamento: '2027-03-01' });
  });
});

describe('csvSts', () => {
  it('separatore ; e importi con la virgola', () => {
    const csv = csvSts(righeSts([base]));
    const [intestazione, riga] = csv.trim().split('\r\n');
    expect(intestazione).toBe(
      'Documento;Data documento;Codice fiscale paziente;Importo;Data pagamento;Pagamento tracciato;Tipo spesa;Tipo documento',
    );
    expect(riga).toBe(`1/2027;10/01/2027;${CF};85,20;10/01/2027;SI;SP;Fattura`);
  });
});
