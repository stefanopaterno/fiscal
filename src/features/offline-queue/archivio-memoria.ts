import type { Archivio, VoceCoda } from './tipi';

/** Archivio in memoria: per i test e quando l'archivio del browser non è disponibile. */
export function archivioInMemoria(): Archivio {
  const voci = new Map<string, VoceCoda>();
  return {
    async tutte() {
      return [...voci.values()].sort((a, b) => a.creataIl.localeCompare(b.creataIl));
    },
    async salva(voce) {
      voci.set(voce.id, structuredClone(voce));
    },
    async cancella(id) {
      voci.delete(id);
    },
    async svuota() {
      voci.clear();
    },
  };
}
