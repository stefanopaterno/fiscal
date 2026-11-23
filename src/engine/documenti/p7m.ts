/**
 * Estrazione dell'XML da una fattura firmata `.p7m` (CAdES: CMS SignedData in DER, a volte in Base64)
 * (specifica 010, research R-02). Legge l'ASN.1 fino a encapContentInfo.eContent e ricompone l'OCTET STRING,
 * anche costruita o a lunghezza indefinita (BER). La firma NON viene verificata: l'originale si archivia com'è.
 */
type Nodo = { tag: number; costruito: boolean; inizio: number; fine: number; figli: Nodo[] };

export class ErroreP7m extends Error {}

const errore = () =>
  new ErroreP7m(
    'Il file non sembra una fattura firmata (.p7m) leggibile: prova a scaricarla di nuovo come XML.',
  );

function leggiNodo(b: Uint8Array, pos: number, limite: number): Nodo {
  if (pos + 2 > limite) throw errore();
  const tag = b[pos]!;
  const costruito = (tag & 0x20) !== 0;
  let p = pos + 1;
  if ((tag & 0x1f) === 0x1f) while (p < limite && b[p++]! & 0x80); // tag a più byte (non usato nei p7m)
  let lunghezza = b[p++]!;
  let indefinita = false;
  if (lunghezza === 0x80) indefinita = true;
  else if (lunghezza & 0x80) {
    const n = lunghezza & 0x7f;
    if (n > 4) throw errore();
    lunghezza = 0;
    for (let i = 0; i < n; i++) lunghezza = lunghezza * 256 + b[p++]!;
  }
  const inizio = p;
  const figli: Nodo[] = [];
  if (indefinita) {
    if (!costruito) throw errore();
    while (p < limite && !(b[p] === 0 && b[p + 1] === 0)) {
      const f = leggiNodo(b, p, limite);
      figli.push(f);
      p = f.fine;
    }
    return { tag, costruito, inizio, fine: p + 2, figli };
  }
  const fine = inizio + lunghezza;
  if (fine > limite) throw errore();
  if (costruito) {
    while (p < fine) {
      const f = leggiNodo(b, p, fine);
      figli.push(f);
      p = f.fine;
    }
  }
  return { tag, costruito, inizio, fine, figli };
}

/** Contenuto di un OCTET STRING primitivo o costruito (parti concatenate). */
function ottetti(b: Uint8Array, n: Nodo): Uint8Array {
  if (!n.costruito) return b.slice(n.inizio, n.fine);
  const parti = n.figli.map((f) => ottetti(b, f));
  const out = new Uint8Array(parti.reduce((t, x) => t + x.length, 0));
  let i = 0;
  for (const x of parti) {
    out.set(x, i);
    i += x.length;
  }
  return out;
}

/** Il file è testo Base64 (spazi e a capo ammessi)? */
function daBase64(b: Uint8Array): Uint8Array | null {
  const t = new TextDecoder('latin1').decode(b).replace(/\s+/g, '');
  if (t.length < 16 || !/^[A-Za-z0-9+/]+=*$/.test(t)) return null;
  try {
    const bin = atob(t);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function estraiXmlDaP7m(byte: Uint8Array): Uint8Array {
  const der = byte[0] === 0x30 ? byte : daBase64(byte);
  if (!der || der[0] !== 0x30) throw errore();
  // ContentInfo ::= SEQUENCE { contentType OID, [0] EXPLICIT SignedData }
  const contentInfo = leggiNodo(der, 0, der.length);
  const esplicito = contentInfo.figli.find((f) => f.tag === 0xa0);
  const signedData = esplicito?.figli[0];
  // SignedData ::= SEQUENCE { version, digestAlgorithms SET, encapContentInfo SEQUENCE, ... }
  const encap = signedData?.figli.find((f, i) => i > 0 && f.tag === 0x30);
  const eContent = encap?.figli.find((f) => f.tag === 0xa0);
  const stringa = eContent?.figli[0];
  if (!stringa || (stringa.tag & 0x1f) !== 0x04) throw errore();
  const dati = ottetti(der, stringa);
  if (dati.length === 0) throw errore();
  return dati;
}
