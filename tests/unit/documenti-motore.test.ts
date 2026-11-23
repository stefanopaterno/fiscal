import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chiaveFattura, riconosciFileFattura } from '@/engine/documenti/fatture';
import { nomeFileSicuro, sembraClinico } from '@/engine/documenti/nomi';
import { estraiXmlDaP7m } from '@/engine/documenti/p7m';
import { crc32, leggiZip, scriviZip } from '@/engine/documenti/zip';
import { regoleDocumenti } from '@/engine/regole/documenti';

// T001 (010): casi A, B, C di quickstart.md e funzioni di supporto.
const xml = readFileSync('tests/fixtures/fattura.xml');
const p7m = readFileSync('tests/fixtures/fattura.xml.p7m');
const testo = (b: Uint8Array) => new TextDecoder().decode(b);

describe('estraiXmlDaP7m', () => {
  it("caso A: file firmato in DER → XML identico all'originale", () => {
    expect(testo(estraiXmlDaP7m(new Uint8Array(p7m)))).toBe(testo(xml));
  });

  it('caso B: lo stesso file in Base64 (anche con a capo)', () => {
    const b64 = p7m.toString('base64').replace(/(.{64})/g, '$1\r\n');
    expect(testo(estraiXmlDaP7m(new TextEncoder().encode(b64)))).toBe(testo(xml));
  });

  it('contenuto spezzato in più parti (OCTET STRING costruita, lunghezza indefinita)', () => {
    // SEQUENCE { OID signedData, [0] { SEQUENCE { INTEGER 1, SET {}, SEQUENCE { OID data, [0] { OCTET STRING costruita } } } } }
    const parte = (s: string) => [0x04, s.length, ...new TextEncoder().encode(s)];
    const contenuto = [0x24, 0x80, ...parte('<a>ciao'), ...parte(' mondo</a>'), 0x00, 0x00];
    const eContent = [0xa0, 0x80, ...contenuto, 0x00, 0x00];
    const oidData = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01];
    const encap = [0x30, 0x80, ...oidData, ...eContent, 0x00, 0x00];
    const signed = [0x30, 0x80, 0x02, 0x01, 0x01, 0x31, 0x00, ...encap, 0x00, 0x00];
    const oidSigned = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02];
    const tutto = [0x30, 0x80, ...oidSigned, 0xa0, 0x80, ...signed, 0x00, 0x00, 0x00, 0x00];
    expect(testo(estraiXmlDaP7m(new Uint8Array(tutto)))).toBe('<a>ciao mondo</a>');
  });

  it('file non valido: errore chiaro', () => {
    expect(() => estraiXmlDaP7m(new TextEncoder().encode('non sono un p7m'))).toThrow(/firmat[ao]/);
  });
});

describe('ZIP', () => {
  it('scrive e rilegge (metodo store), con CRC-32 corretto', async () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    const zip = scriviZip([
      { nome: 'a.xml', dati: new Uint8Array(xml) },
      { nome: 'cartella/b.txt', dati: new TextEncoder().encode('ciao') },
    ]);
    const letti = await leggiZip(zip);
    expect(letti.map((f) => f.nome)).toEqual(['a.xml', 'cartella/b.txt']);
    expect(testo(letti[1]!.dati)).toBe('ciao');
  });

  it('legge uno ZIP compresso (deflate)', async () => {
    // ZIP creato da uno strumento standard con un file "ciao.txt" compresso
    const deflate = await new Response(
      new Blob([new TextEncoder().encode('ciao ciao ciao ciao ciao ciao')])
        .stream()
        .pipeThrough(new CompressionStream('deflate-raw')),
    ).arrayBuffer();
    const zip = scriviZip([
      {
        nome: 'ciao.txt',
        dati: new TextEncoder().encode('ciao ciao ciao ciao ciao ciao'),
        compressi: new Uint8Array(deflate),
      },
    ]);
    const letti = await leggiZip(zip);
    expect(testo(letti[0]!.dati)).toBe('ciao ciao ciao ciao ciao ciao');
  });

  it('file che non è uno ZIP: errore chiaro', async () => {
    await expect(leggiZip(new TextEncoder().encode('niente zip'))).rejects.toThrow(/ZIP/);
  });
});

describe('fatture ricevute', () => {
  it('caso C: riconosce fatture e metadati dal contenuto, non dal nome', () => {
    expect(
      riconosciFileFattura(
        'x_metaDato.xml',
        '<?xml version="1.0"?><FileMetadati><IdentificativoSdI>1</IdentificativoSdI></FileMetadati>',
      ),
    ).toBe('metadati');
    expect(riconosciFileFattura('qualunque.xml', testo(xml))).toBe('fattura');
    expect(riconosciFileFattura('foto.jpg', '')).toBe('altro');
  });

  it('chiave per i duplicati: fornitore + numero + data', () => {
    expect(
      chiaveFattura({ partitaIva: '01234567890', codiceFiscale: null, numero: 'FP-7', data: '2027-03-15' }),
    ).toBe('01234567890|FP-7|2027-03-15');
    expect(
      chiaveFattura({ partitaIva: null, codiceFiscale: null, numero: 'FP-7', data: '2027-03-15' }),
    ).toBeNull();
  });
});

describe('nomi e dati clinici', () => {
  it('nome del file generato, senza il nome originale', () => {
    expect(
      nomeFileSicuro({
        tipo: 'fattura_ricevuta',
        data: '2027-03-15',
        emittente: 'Fornitore di Prova S.r.l.',
        estensione: 'xml.p7m',
      }),
    ).toBe('fattura-ricevuta-2027-03-15-fornitore-di-prova-s-r-l.xml.p7m');
    expect(nomeFileSicuro({ tipo: 'scontrino', data: null, emittente: null, estensione: 'jpg' })).toBe(
      'scontrino.jpg',
    );
  });

  it('parole che fanno pensare a dati clinici', () => {
    expect(sembraClinico('Referto con diagnosi')).toEqual(['referto', 'diagnosi']);
    expect(sembraClinico('Fattura software')).toEqual([]);
  });

  it('regole di conservazione con fonte e stato', () => {
    const r = regoleDocumenti(2027);
    expect(r.conservazione.fattura_ricevuta.valore.anni).toBe(10);
    expect(r.conservazione.fattura_ricevuta.valore.aNorma).toBe(true);
    for (const x of Object.values(r.conservazione)) expect(x.fonte.length).toBeGreaterThan(10);
  });
});
