/**
 * PDF minimo e leggibile (specifica 009, research R-02): A4, Helvetica con codifica WinAnsi (accenti italiani e
 * simbolo €), titoli, paragrafi a capo automatico e tabelle con totale. Nessuna libreria: testo puro, sufficiente
 * per un prospetto. Larghezze dei caratteri dalle metriche standard di Helvetica.
 */
const LARGHEZZA = 595.28;
const ALTEZZA = 841.89;
const MARGINE = 42;

// Metriche Helvetica (unità /1000) per i caratteri ASCII stampabili 32–126
const W = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];
const larghezzaCar = (c: string, grassetto: boolean) => {
  const k = c.charCodeAt(0);
  const base = k >= 32 && k <= 126 ? W[k - 32]! : 556;
  return grassetto ? base * 1.06 : base;
};
export const larghezzaTesto = (t: string, corpo: number, grassetto = false) =>
  ([...t].reduce((s, c) => s + larghezzaCar(c, grassetto), 0) * corpo) / 1000;

/** Testo → byte WinAnsi tra parentesi, con escape. */
function winAnsi(t: string): string {
  let out = '';
  for (const c of t.normalize('NFC')) {
    const k = c.charCodeAt(0);
    let b: number;
    if (c === '€') b = 0x80;
    else if (c === '’' || c === '‘') b = 0x27;
    else if (c === '“' || c === '”' || c === '«' || c === '»') b = k === 0xab ? 0xab : k === 0xbb ? 0xbb : 0x22;
    else if (c === '–' || c === '—') b = 0x96;
    else if (c === '•') b = 0x95;
    else if (c === ' ' || c === ' ') b = 0x20;
    else if (k < 256) b = k;
    else b = 0x3f;
    const ch = String.fromCharCode(b);
    out += ch === '(' || ch === ')' || ch === '\\' ? `\\${ch}` : ch;
  }
  return out;
}

export type Colonna = { titolo: string; larghezza: number; destra?: boolean };

export class DocumentoPdf {
  private pagine: string[][] = [];
  private y = 0;
  private corrente: string[] = [];
  constructor(private intestazione: string) {
    this.nuovaPagina();
  }

  private nuovaPagina() {
    this.corrente = [];
    this.pagine.push(this.corrente);
    this.y = ALTEZZA - MARGINE;
    this.scrivi(this.intestazione, MARGINE, ALTEZZA - 24, 7.5, false, 0.45);
  }

  private spazio(h: number) {
    if (this.y - h < MARGINE + 20) this.nuovaPagina();
  }

  private scrivi(t: string, x: number, y: number, corpo: number, grassetto: boolean, grigio = 0) {
    this.corrente.push(`BT ${grigio} g /${grassetto ? 'F2' : 'F1'} ${corpo} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${winAnsi(t)}) Tj ET`);
  }

  private aCapo(t: string, corpo: number, larghezza: number, grassetto = false): string[] {
    const righe: string[] = [];
    let riga = '';
    for (const parola of t.split(/\s+/)) {
      const prova = riga ? `${riga} ${parola}` : parola;
      if (larghezzaTesto(prova, corpo, grassetto) > larghezza && riga) {
        righe.push(riga);
        riga = parola;
      } else riga = prova;
    }
    if (riga) righe.push(riga);
    return righe;
  }

  titolo(t: string, corpo = 18) {
    this.spazio(corpo + 14);
    this.y -= corpo + 4;
    this.scrivi(t, MARGINE, this.y, corpo, true);
    this.y -= 8;
  }

  paragrafo(t: string, corpo = 9.5, grigio = 0) {
    for (const r of this.aCapo(t, corpo, LARGHEZZA - 2 * MARGINE)) {
      this.spazio(corpo + 4);
      this.y -= corpo + 3.5;
      this.scrivi(r, MARGINE, this.y, corpo, false, grigio);
    }
    this.y -= 4;
  }

  /** Tabella con intestazione ripetuta a ogni pagina; testi troppo lunghi accorciati con «…». */
  tabella(colonne: Colonna[], righe: string[][], totale?: string[]) {
    const corpo = 8;
    const alt = corpo + 5;
    const totaleLarghezze = colonne.reduce((t, c) => t + c.larghezza, 0);
    const scala = (LARGHEZZA - 2 * MARGINE) / totaleLarghezze;
    const xs: number[] = [];
    let x = MARGINE;
    for (const c of colonne) {
      xs.push(x);
      x += c.larghezza * scala;
    }
    const cella = (testo: string, i: number, y: number, grassetto: boolean) => {
      const w = colonne[i]!.larghezza * scala - 6;
      let t = testo;
      while (t.length > 1 && larghezzaTesto(t, corpo, grassetto) > w) t = `${t.slice(0, -2)}…`;
      const tx = colonne[i]!.destra ? xs[i]! + colonne[i]!.larghezza * scala - 3 - larghezzaTesto(t, corpo, grassetto) : xs[i]! + 3;
      this.scrivi(t, tx, y, corpo, grassetto);
    };
    const intestazione = () => {
      this.spazio(alt * 2);
      this.y -= alt;
      colonne.forEach((c, i) => cella(c.titolo, i, this.y, true));
      this.corrente.push(`0.6 G 0.5 w ${MARGINE} ${(this.y - 3).toFixed(2)} m ${LARGHEZZA - MARGINE} ${(this.y - 3).toFixed(2)} l S`);
    };
    intestazione();
    for (const r of righe) {
      if (this.y - alt < MARGINE + 20) {
        this.nuovaPagina();
        intestazione();
      }
      this.y -= alt;
      r.forEach((v, i) => cella(v, i, this.y, false));
    }
    if (totale) {
      this.spazio(alt + 4);
      this.corrente.push(`0.3 G 0.7 w ${MARGINE} ${(this.y - 3).toFixed(2)} m ${LARGHEZZA - MARGINE} ${(this.y - 3).toFixed(2)} l S`);
      this.y -= alt + 1;
      totale.forEach((v, i) => cella(v, i, this.y, true));
    }
    this.y -= 10;
  }

  /** Byte del PDF (versione 1.4, oggetti in chiaro). */
  byte(): Uint8Array {
    const oggetti: string[] = [];
    const n = this.pagine.length;
    // 1 catalogo, 2 pagine, 3 F1, 4 F2, poi per ogni pagina: pagina + contenuto
    oggetti.push('<< /Type /Catalog /Pages 2 0 R >>');
    const kids = Array.from({ length: n }, (_, i) => `${5 + i * 2} 0 R`).join(' ');
    oggetti.push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
    oggetti.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    oggetti.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    this.pagine.forEach((righe, i) => {
      const contenuto = righe.join('\n') + `\nBT 0.45 g /F1 7.5 Tf ${LARGHEZZA - MARGINE - 40} 22 Td (Pag. ${i + 1}/${n}) Tj ET`;
      oggetti.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LARGHEZZA} ${ALTEZZA}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`,
      );
      oggetti.push(`<< /Length ${contenuto.length} >>\nstream\n${contenuto}\nendstream`);
    });
    let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
    const offset: number[] = [];
    oggetti.forEach((o, i) => {
      offset.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${oggetti.length + 1}\n0000000000 65535 f \n`;
    for (const o of offset) pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${oggetti.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    // ogni carattere è un byte (WinAnsi): niente UTF-8
    const out = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) out[i] = pdf.charCodeAt(i) & 0xff;
    return out;
  }
}
