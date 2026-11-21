import { openDB, type IDBPDatabase } from 'idb';
import type { Archivio, VoceCoda } from './tipi';

/**
 * Archivio della coda nel browser (T052, research D-11): IndexedDB con ogni voce cifrata AES-GCM.
 * La chiave è un CryptoKey NON esportabile conservato in IndexedDB: chi copia i file del browser non
 * legge le voci. Limite onesto: non protegge da codice eseguito dentro la pagina.
 */
const NOME_DB = 'fiscal-coda';
type Registrata = { id: string; iv: Uint8Array<ArrayBuffer>; cifrato: ArrayBuffer };

let db: Promise<IDBPDatabase> | null = null;
const apri = () =>
  (db ??= openDB(NOME_DB, 1, {
    upgrade(d) {
      d.createObjectStore('voci', { keyPath: 'id' });
      d.createObjectStore('chiavi');
    },
  }));

async function chiave(): Promise<CryptoKey> {
  const d = await apri();
  const esistente = (await d.get('chiavi', 'coda')) as CryptoKey | undefined;
  if (esistente) return esistente;
  const nuova = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  await d.put('chiavi', nuova, 'coda');
  return nuova;
}

export function archivioIndexedDb(): Archivio {
  return {
    async tutte() {
      const d = await apri();
      const k = await chiave();
      const righe = (await d.getAll('voci')) as Registrata[];
      const voci: VoceCoda[] = [];
      for (const r of righe) {
        try {
          const chiaro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: r.iv }, k, r.cifrato);
          voci.push(JSON.parse(new TextDecoder().decode(chiaro)) as VoceCoda);
        } catch {
          await d.delete('voci', r.id); // voce illeggibile (chiave cambiata): non recuperabile
        }
      }
      return voci.sort((a, b) => a.creataIl.localeCompare(b.creataIl));
    },
    async salva(voce) {
      const d = await apri();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const cifrato = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        await chiave(),
        new TextEncoder().encode(JSON.stringify(voce)),
      );
      await d.put('voci', { id: voce.id, iv, cifrato } satisfies Registrata);
    },
    async cancella(id) {
      await (await apri()).delete('voci', id);
    },
    async svuota() {
      const d = await apri();
      await d.clear('voci');
      await d.delete('chiavi', 'coda'); // anche la chiave: al prossimo uso se ne crea una nuova
    },
  };
}
