/**
 * Riepilogo dei dati della fattura elettronica (specifica 003, FR-015, research R-08): testo da copiare
 * nel programma di fatturazione elettronica (per esempio quello gratuito dell'Agenzia delle Entrate).
 * Solo per fatture a enti e aziende: ai pazienti persone fisiche non si fa (dati sanitari).
 * Il file XML conforme al tracciato è fuori da questa versione.
 */
export type DatiFatturaElettronica = {
  tipo: 'fattura' | 'nota_credito';
  numero: number;
  anno: number;
  data: string;
  professionista: {
    nome?: string;
    cognome?: string;
    codice_fiscale?: string;
    partita_iva?: string;
    indirizzo?: string;
    cap?: string;
    comune?: string;
    provincia?: string;
  };
  cliente: {
    denominazione?: string | null;
    partita_iva?: string | null;
    codice_fiscale?: string | null;
    indirizzo?: string | null;
    cap?: string | null;
    comune?: string | null;
    provincia?: string | null;
    nazione?: string | null;
    pec?: string | null;
    codice_destinatario?: string | null;
  };
  righe: {
    descrizione: string;
    quantita: number;
    compenso: number;
    natura: 'esente_sanitaria' | 'imponibile';
  }[];
  totaleIntegrativo: number;
  aliquotaIntegrativo: number | null;
  imponibileIva: number;
  iva: number;
  importoEsente: number;
  bollo: number;
  ritenuta: number;
  totale: number;
  netto: number;
  fatturaStornata?: { numero: number; anno: number; data: string };
};

const euro = (c: number) => (c / 100).toFixed(2);
const data = (iso: string) => iso;

export function riepilogoFatturaElettronica(f: DatiFatturaElettronica): string {
  const p = f.professionista;
  const c = f.cliente;
  const righe: string[] = [];
  righe.push(`Tipo documento: ${f.tipo === 'nota_credito' ? 'TD04 (nota di credito)' : 'TD01 (fattura)'}`);
  righe.push(`Numero: ${f.numero}/${f.anno} — Data: ${data(f.data)}`);
  if (f.fatturaStornata)
    righe.push(
      `Fattura collegata: ${f.fatturaStornata.numero}/${f.fatturaStornata.anno} del ${f.fatturaStornata.data}`,
    );
  righe.push('');
  righe.push('CEDENTE / PRESTATORE');
  righe.push(`${p.nome ?? ''} ${p.cognome ?? ''}`.trim());
  righe.push(`Partita IVA: IT${p.partita_iva ?? ''} — Codice fiscale: ${p.codice_fiscale ?? ''}`);
  righe.push(`Sede: ${p.indirizzo ?? ''}, ${p.cap ?? ''} ${p.comune ?? ''} (${p.provincia ?? ''}) IT`);
  righe.push('Regime fiscale: RF01 (ordinario)');
  righe.push('');
  righe.push('CESSIONARIO / COMMITTENTE');
  righe.push(c.denominazione ?? '');
  if (c.partita_iva) righe.push(`Partita IVA: ${c.nazione ?? 'IT'}${c.partita_iva}`);
  if (c.codice_fiscale) righe.push(`Codice fiscale: ${c.codice_fiscale}`);
  righe.push(
    `Sede: ${c.indirizzo ?? ''}, ${c.cap ?? ''} ${c.comune ?? ''}${c.provincia ? ` (${c.provincia})` : ''} ${c.nazione ?? 'IT'}`,
  );
  righe.push(
    `Recapito: ${c.codice_destinatario ? `codice destinatario ${c.codice_destinatario}` : c.pec ? `PEC ${c.pec}` : 'codice destinatario 0000000 (nessun recapito indicato)'}`,
  );
  righe.push('');
  righe.push('RIGHE');
  f.righe.forEach((r, i) =>
    righe.push(
      `${i + 1}. ${r.descrizione} — quantità ${r.quantita} — prezzo ${euro(r.compenso)} — ` +
        (r.natura === 'imponibile' ? 'IVA 22%' : 'IVA 0% natura N4 (esente art. 10 n. 18 DPR 633/72)'),
    ),
  );
  righe.push('');
  righe.push('CASSA PREVIDENZIALE');
  righe.push(
    `ENPAP${f.aliquotaIntegrativo !== null ? ` aliquota ${(f.aliquotaIntegrativo * 100).toFixed(2)}%` : ''} — importo contributo ${euro(f.totaleIntegrativo)} — ` +
      (f.imponibileIva > 0 && f.importoEsente === 0
        ? 'IVA 22% sul contributo'
        : 'contributo con la stessa natura delle righe (N4 se esenti)'),
  );
  righe.push('');
  righe.push('RIEPILOGO');
  if (f.importoEsente > 0) righe.push(`Esente N4: imponibile ${euro(f.importoEsente)}, imposta 0.00`);
  if (f.imponibileIva > 0) righe.push(`IVA 22%: imponibile ${euro(f.imponibileIva)}, imposta ${euro(f.iva)}`);
  if (f.bollo > 0) righe.push(`Bollo virtuale: SI — importo ${euro(f.bollo)}`);
  if (f.ritenuta > 0)
    righe.push(`Ritenuta: RT01 (persone fisiche) — aliquota 20% — importo ${euro(f.ritenuta)} — causale A`);
  righe.push(`Totale documento: ${euro(f.totale)}`);
  if (f.ritenuta > 0) righe.push(`Netto a pagare: ${euro(f.netto)}`);
  return righe.join('\n');
}
