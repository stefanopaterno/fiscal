/**
 * Cassaforte dello sblocco rapido (research D-08, FR-019, FR-020).
 *
 * - All'attivazione: dal segreto PRF (che il dispositivo rilascia solo dopo Face ID / impronta / PIN)
 *   si ricava una chiave AES; si crea una coppia di chiavi RSA e si conserva la privata SOLO cifrata.
 * - Al blocco: la sessione si chiude con la chiave PUBBLICA (non serve Face ID per bloccare).
 * - Allo sblocco: Face ID → segreto PRF → chiave AES → chiave privata → sessione.
 * Senza il dispositivo e la sua verifica dell'utente la sessione chiusa è inutilizzabile.
 */

export type Cassaforte = {
  pubblica: JsonWebKey;
  privataCifrata: string;
  iv: string;
};

export type Busta = { chiaveAvvolta: string; iv: string; cifrato: string };

const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))));
const daB64 = (testo: string) => Uint8Array.from(atob(testo), (c) => c.charCodeAt(0));

async function chiaveDaSegreto(segretoPrf: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', segretoPrf, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('fiscal-sblocco-rapido-v1'),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

const RSA = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

export async function creaCassaforte(segretoPrf: ArrayBuffer): Promise<Cassaforte> {
  const chiaveAes = await chiaveDaSegreto(segretoPrf);
  const coppia = (await crypto.subtle.generateKey(RSA, true, ['encrypt', 'decrypt'])) as CryptoKeyPair;
  const privata = await crypto.subtle.exportKey('pkcs8', coppia.privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const privataCifrata = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chiaveAes, privata);
  return {
    pubblica: await crypto.subtle.exportKey('jwk', coppia.publicKey),
    privataCifrata: b64(privataCifrata),
    iv: b64(iv),
  };
}

/** Chiude i dati con la sola chiave pubblica (cifratura ibrida RSA-OAEP + AES-GCM). */
export async function chiudiInCassaforte(pubblica: JsonWebKey, dati: string): Promise<Busta> {
  const chiavePubblica = await crypto.subtle.importKey('jwk', pubblica, RSA, false, ['encrypt']);
  const chiaveDati = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrato = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    chiaveDati,
    new TextEncoder().encode(dati),
  );
  const grezza = await crypto.subtle.exportKey('raw', chiaveDati);
  const chiaveAvvolta = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, chiavePubblica, grezza);
  return { chiaveAvvolta: b64(chiaveAvvolta), iv: b64(iv), cifrato: b64(cifrato) };
}

/** Riapre la busta: richiede il segreto PRF giusto (cioè Face ID / impronta su questo dispositivo). */
export async function apriCassaforte(
  segretoPrf: ArrayBuffer,
  cassaforte: Cassaforte,
  busta: Busta,
): Promise<string> {
  const chiaveAes = await chiaveDaSegreto(segretoPrf);
  const privata = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: daB64(cassaforte.iv) },
    chiaveAes,
    daB64(cassaforte.privataCifrata),
  );
  const chiavePrivata = await crypto.subtle.importKey('pkcs8', privata, RSA, false, ['decrypt']);
  const grezza = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, chiavePrivata, daB64(busta.chiaveAvvolta));
  const chiaveDati = await crypto.subtle.importKey('raw', grezza, 'AES-GCM', false, ['decrypt']);
  const dati = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: daB64(busta.iv) },
    chiaveDati,
    daB64(busta.cifrato),
  );
  return new TextDecoder().decode(dati);
}
