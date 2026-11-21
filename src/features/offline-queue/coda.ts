import type { Archivio, Inviatore, NuovaVoce, VoceCoda } from './tipi';

/**
 * Coda degli inserimenti senza rete (T052-T053, FR-014, FR-021, FR-022).
 * - Un dato esce dalla coda SOLO dopo la conferma del database: nessuna perdita.
 * - Invio idempotente grazie all'id generato sul dispositivo: nessun duplicato.
 * - Parte solo con accesso completo (aal2): da bloccato o con sessione scaduta aspetta.
 * - Modifiche su una versione cambiata altrove → "in conflitto": decide l'utente.
 */
export function creaCoda(archivio: Archivio, inviatore: Inviatore, accessoCompleto: () => Promise<boolean>) {
  let inCorso: Promise<{ inviate: number; conflitti: VoceCoda[] }> | null = null;

  async function svuota() {
    if (!(await accessoCompleto())) return { inviate: 0, conflitti: [] as VoceCoda[] };
    let inviate = 0;
    const conflitti: VoceCoda[] = [];
    for (const voce of await archivio.tutte()) {
      if (voce.stato !== 'in_attesa') continue;
      const r = await inviatore.invia(voce);
      if (r.esito === 'ok') {
        await archivio.cancella(voce.id);
        inviate++;
      } else if (r.esito === 'conflitto') {
        const inConflitto: VoceCoda = {
          ...voce,
          stato: 'in_conflitto',
          versioneServer: r.versioneServer,
          datiServer: r.datiServer,
        };
        await archivio.salva(inConflitto);
        conflitti.push(inConflitto);
      } else {
        await archivio.salva({ ...voce, tentativi: voce.tentativi + 1 });
        if (r.esito === 'rete') break; // senza rete inutile provare le altre
      }
    }
    return { inviate, conflitti };
  }

  return {
    async accoda(nuova: NuovaVoce): Promise<void> {
      await archivio.salva({
        ...nuova,
        creataIl: new Date().toISOString(),
        stato: 'in_attesa',
        tentativi: 0,
      });
    },

    /** Invia tutto ciò che è in attesa (una sola esecuzione alla volta). */
    svuotaVersoServer() {
      inCorso ??= svuota().finally(() => {
        inCorso = null;
      });
      return inCorso;
    },

    /** "mia": riapplica la modifica sopra la versione del server. "server": scarta la modifica locale. */
    async risolviConflitto(id: string, scelta: 'mia' | 'server'): Promise<void> {
      const voce = (await archivio.tutte()).find((v) => v.id === id);
      if (!voce) return;
      if (scelta === 'server') {
        await archivio.cancella(id);
        return;
      }
      await archivio.salva({
        ...voce,
        stato: 'in_attesa',
        versioneBase: voce.versioneServer,
        versioneServer: undefined,
        datiServer: undefined,
      });
    },

    elenco: () => archivio.tutte(),

    /** "Esci": la coda e la sua chiave vengono cancellate (FR-022). */
    pulisci: () => archivio.svuota(),
  };
}

export type Coda = ReturnType<typeof creaCoda>;
