import { scriviZip } from '../documenti/zip';

/**
 * File Excel minimo (specifica 009, research R-03): Office Open XML (.xlsx) con un foglio per sezione, testi in
 * linea, importi in euro come numeri con il formato «#,##0.00» e date come testo gg/mm/aaaa. Si apre con Excel,
 * Numbers, LibreOffice e Fogli Google.
 */
export type ValoreCella = string | { euro: number } | null;
export type Foglio = { nome: string; righe: ValoreCella[][] };

const xml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colonna = (i: number) => {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
/** Nomi di foglio validi per Excel: massimo 31 caratteri, senza []:*?/\ */
export const nomeFoglio = (n: string) => n.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);

function foglioXml(f: Foglio): string {
  const righe = f.righe
    .map((r, i) => {
      const celle = r
        .map((v, j) => {
          const ref = `${colonna(j)}${i + 1}`;
          if (v == null || v === '') return '';
          if (typeof v === 'string') return `<c r="${ref}" t="inlineStr"${i === 0 ? ' s="2"' : ''}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
          return `<c r="${ref}" s="1"><v>${(v.euro / 100).toFixed(2)}</v></c>`;
        })
        .join('');
      return `<row r="${i + 1}">${celle}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${righe}</sheetData></worksheet>`;
}

export function scriviXlsx(fogli: Foglio[]): Uint8Array {
  const enc = new TextEncoder();
  const nomi = fogli.map((f, i) => {
    let n = nomeFoglio(f.nome);
    if (fogli.slice(0, i).some((g) => nomeFoglio(g.nome) === n)) n = `${n.slice(0, 28)} ${i + 1}`;
    return n;
  });
  const file: { nome: string; dati: Uint8Array }[] = [
    {
      nome: '[Content_Types].xml',
      dati: enc.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${fogli
          .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
          .join('')}</Types>`,
      ),
    },
    {
      nome: '_rels/.rels',
      dati: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      ),
    },
    {
      nome: 'xl/workbook.xml',
      dati: enc.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nomi
          .map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
          .join('')}</sheets></workbook>`,
      ),
    },
    {
      nome: 'xl/_rels/workbook.xml.rels',
      dati: enc.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fogli
          .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
          .join('')}<Relationship Id="rId${fogli.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      ),
    },
    {
      nome: 'xl/styles.xml',
      dati: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf numFmtId="4" applyNumberFormat="1"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>',
      ),
    },
    ...fogli.map((f, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, dati: enc.encode(foglioXml(f)) })),
  ];
  return scriviZip(file);
}
