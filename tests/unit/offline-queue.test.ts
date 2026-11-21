import { describe, expect, it } from 'vitest';
import { creaCoda } from '@/features/offline-queue/coda';
import { archivioInMemoria } from '@/features/offline-queue/archivio-memoria';
import type { EsitoInvio, Inviatore, VoceCoda } from '@/features/offline-queue/tipi';

// T049 (US3, FR-021, FR-022): coda degli inserimenti senza rete, con server finto.

type Riga = { id: string; versione: number; testo: string };

function serverFinto() {
  const righe = new Map<string, Riga>();
  let rete = true;
  const inviatore: Inviatore = {
    async invia(voce: VoceCoda): Promise<EsitoInvio> {
      if (!rete) return { esito: 'rete' };
      const dati = voce.payload as Riga;
      if (voce.operazione === 'inserisci') {
        if (!righe.has(voce.id)) righe.set(voce.id, { ...dati, id: voce.id, versione: 1 });
        return { esito: 'ok' }; // inserimento idempotente: "on conflict (id) do nothing"
      }
      const attuale = righe.get(voce.id);
      if (!attuale || attuale.versione !== voce.versioneBase) {
        return { esito: 'conflitto', versioneServer: attuale?.versione ?? 0, datiServer: attuale };
      }
      righe.set(voce.id, { ...attuale, ...dati, versione: attuale.versione + 1 });
      return { esito: 'ok' };
    },
  };
  return { righe, inviatore, rete: (acceso: boolean) => (rete = acceso) };
}

const nuovaCoda = (completa = true) => {
  const server = serverFinto();
  const archivio = archivioInMemoria();
  let sessione = completa;
  const coda = creaCoda(archivio, server.inviatore, async () => sessione);
  return { server, archivio, coda, sessione: (v: boolean) => (sessione = v) };
};

describe('coda degli inserimenti senza rete', () => {
  it('senza rete il dato resta "in attesa di invio"; al ritorno della rete parte', async () => {
    const { server, coda } = nuovaCoda();
    server.rete(false);
    await coda.accoda({ id: 'a1', tabella: 'prove', operazione: 'inserisci', payload: { testo: 'ciao' } });
    const primo = await coda.svuotaVersoServer();
    expect(primo.inviate).toBe(0);
    expect((await coda.elenco()).map((v) => v.stato)).toEqual(['in_attesa']);

    server.rete(true);
    const secondo = await coda.svuotaVersoServer();
    expect(secondo.inviate).toBe(1);
    expect(server.righe.get('a1')?.testo).toBe('ciao');
  });

  it('invio idempotente: lo stesso dato inviato due volte crea una sola riga', async () => {
    const { server, coda } = nuovaCoda();
    await coda.accoda({ id: 'a2', tabella: 'prove', operazione: 'inserisci', payload: { testo: 'uno' } });
    await coda.svuotaVersoServer();
    await coda.accoda({ id: 'a2', tabella: 'prove', operazione: 'inserisci', payload: { testo: 'uno' } });
    await coda.svuotaVersoServer();
    expect(server.righe.size).toBe(1);
  });

  it("dopo l'invio la coda è vuota: sul dispositivo non resta copia dei dati", async () => {
    const { coda, archivio } = nuovaCoda();
    await coda.accoda({ id: 'a3', tabella: 'prove', operazione: 'inserisci', payload: { testo: 'x' } });
    await coda.svuotaVersoServer();
    expect(await archivio.tutte()).toHaveLength(0);
  });

  it('una modifica su una versione cambiata altrove va "in conflitto" e l\'utente sceglie', async () => {
    const { server, coda } = nuovaCoda();
    server.righe.set('r1', { id: 'r1', versione: 3, testo: 'dal PC' });
    await coda.accoda({
      id: 'r1',
      tabella: 'prove',
      operazione: 'modifica',
      versioneBase: 2,
      payload: { testo: 'dal telefono' },
    });
    const esito = await coda.svuotaVersoServer();
    expect(esito.conflitti).toHaveLength(1);
    expect((await coda.elenco())[0]?.stato).toBe('in_conflitto');

    // L'utente sceglie la sua versione: si riapplica sopra quella del server
    await coda.risolviConflitto('r1', 'mia');
    await coda.svuotaVersoServer();
    expect(server.righe.get('r1')).toMatchObject({ testo: 'dal telefono', versione: 4 });
    expect(await coda.elenco()).toHaveLength(0);
  });

  it('scegliendo la versione del server la modifica locale si scarta', async () => {
    const { server, coda } = nuovaCoda();
    server.righe.set('r2', { id: 'r2', versione: 5, testo: 'server' });
    await coda.accoda({
      id: 'r2',
      tabella: 'prove',
      operazione: 'modifica',
      versioneBase: 4,
      payload: { testo: 'mia' },
    });
    await coda.svuotaVersoServer();
    await coda.risolviConflitto('r2', 'server');
    expect(await coda.elenco()).toHaveLength(0);
    expect(server.righe.get('r2')?.testo).toBe('server');
  });

  it('senza accesso completo (bloccato o sessione scaduta) la coda aspetta e non perde nulla', async () => {
    const { server, coda, sessione } = nuovaCoda(false);
    await coda.accoda({ id: 'a4', tabella: 'prove', operazione: 'inserisci', payload: { testo: 'attesa' } });
    expect((await coda.svuotaVersoServer()).inviate).toBe(0);
    expect(await coda.elenco()).toHaveLength(1);
    sessione(true);
    expect((await coda.svuotaVersoServer()).inviate).toBe(1);
    expect(server.righe.has('a4')).toBe(true);
  });

  it('"Esci" cancella la coda (FR-022)', async () => {
    const { coda } = nuovaCoda(false);
    await coda.accoda({ id: 'a5', tabella: 'prove', operazione: 'inserisci', payload: { testo: 'x' } });
    await coda.pulisci();
    expect(await coda.elenco()).toHaveLength(0);
  });
});
