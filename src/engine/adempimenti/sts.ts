/**
 * Preparazione dei dati per il Sistema Tessera Sanitaria (specifica 003, FR-014, research R-08).
 * Solo preparazione: l'invio si fa dal portale STS. Fiscal non trasmette nulla.
 * Una riga per documento (fattura o nota di credito) a paziente persona fisica non opposto.
 * Da verificare con il commercialista: se l'importo da comunicare comprende il bollo addebitato
 * (qui sì: è il totale pagato dal paziente) e come il portale chiede di indicare i rimborsi.
 */
export type DocumentoSts = {
  numero: number;
  anno: number;
  data: string; // AAAA-MM-GG
  tipo: 'fattura' | 'nota_credito';
  codiceFiscalePaziente: string;
  totale: number; // centesimi
  incassi: { data: string; tracciabile: boolean }[];
};

export type RigaSts = {
  documento: string;
  dataDocumento: string;
  codiceFiscale: string;
  importo: number;
  dataPagamento: string | null;
  tracciato: boolean | null;
  tipoSpesa: 'SP';
  tipoDocumento: 'Fattura' | 'Rimborso (nota di credito)';
};

export function righeSts(documenti: DocumentoSts[]): RigaSts[] {
  return [...documenti]
    .sort((a, b) => a.anno - b.anno || a.numero - b.numero)
    .map((d) => {
      const primo = [...d.incassi].sort((a, b) => a.data.localeCompare(b.data))[0];
      return {
        documento: `${d.numero}/${d.anno}`,
        dataDocumento: d.data,
        codiceFiscale: d.codiceFiscalePaziente.toUpperCase(),
        importo: d.totale,
        dataPagamento: d.tipo === 'nota_credito' ? d.data : (primo?.data ?? null),
        // tracciato solo se tutti i pagamenti sono tracciabili
        tracciato: d.incassi.length === 0 ? null : d.incassi.every((i) => i.tracciabile),
        tipoSpesa: 'SP',
        tipoDocumento: d.tipo === 'nota_credito' ? 'Rimborso (nota di credito)' : 'Fattura',
      };
    });
}

const data = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');
const euro = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const campo = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV con separatore ";" e virgola decimale (si apre bene in Excel e Numbers in italiano). */
export function csvSts(righe: RigaSts[]): string {
  const intestazione = [
    'Documento',
    'Data documento',
    'Codice fiscale paziente',
    'Importo',
    'Data pagamento',
    'Pagamento tracciato',
    'Tipo spesa',
    'Tipo documento',
  ];
  const corpo = righe.map((r) =>
    [
      r.documento,
      data(r.dataDocumento),
      r.codiceFiscale,
      euro(r.importo),
      data(r.dataPagamento),
      r.tracciato === null ? '' : r.tracciato ? 'SI' : 'NO',
      r.tipoSpesa,
      r.tipoDocumento,
    ]
      .map(campo)
      .join(';'),
  );
  return [intestazione.join(';'), ...corpo].join('\r\n') + '\r\n';
}
