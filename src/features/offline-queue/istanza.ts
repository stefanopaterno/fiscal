import { getStatoAccesso } from '@/lib/supabase/aal';
import { getSupabase } from '@/lib/supabase/client';
import { archivioIndexedDb } from './archivio-indexeddb';
import { archivioInMemoria } from './archivio-memoria';
import { creaCoda, type Coda } from './coda';
import { inviatoreSupabase } from './inviatore-supabase';
import type { VoceCoda } from './tipi';

/**
 * La coda dell'app (una sola per pagina) e gli avvisi per l'interfaccia.
 * Le maschere di inserimento delle prossime funzioni (fatture, spese…) useranno `getCoda().accoda(...)`.
 */
let coda: Coda | null = null;
const ascoltatori = new Set<(voci: VoceCoda[]) => void>();

export function getCoda(): Coda {
  if (!coda) {
    const archivio = typeof indexedDB !== 'undefined' ? archivioIndexedDb() : archivioInMemoria();
    const supabase = getSupabase();
    coda = creaCoda(
      archivio,
      inviatoreSupabase(supabase),
      async () => (await getStatoAccesso(supabase)) === 'aal2',
    );
  }
  return coda;
}

export async function avvisaCambiamenti() {
  const voci = await getCoda().elenco();
  for (const a of ascoltatori) a(voci);
}

export function ascoltaCoda(a: (voci: VoceCoda[]) => void): () => void {
  ascoltatori.add(a);
  void avvisaCambiamenti();
  return () => ascoltatori.delete(a);
}

/** Inserisce nella coda e prova subito a inviare (se c'è rete e accesso completo). */
export async function accodaEInvia(voce: Parameters<Coda['accoda']>[0]) {
  await getCoda().accoda(voce);
  await avvisaCambiamenti();
  await sincronizza();
}

export async function sincronizza() {
  const r = await getCoda().svuotaVersoServer();
  await avvisaCambiamenti();
  return r;
}
