'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { accodaEInvia, getCoda, sincronizza } from './istanza';

/**
 * SOLO nella build dei test end-to-end (`npm run build:e2e`, NEXT_PUBLIC_PROVE=1): espone la coda alla
 * pagina per provare inserimenti senza rete sulla tabella di prova `prove_sincronizzazione`.
 * Nella build pubblicata questo componente non fa nulla e il suo codice viene eliminato.
 */
declare global {
  interface Window {
    __fiscalProve?: {
      accoda: (testo: string) => Promise<string>;
      elenco: () => Promise<unknown[]>;
      leggi: () => Promise<unknown[]>;
      sincronizza: () => Promise<unknown>;
    };
  }
}

function AgganciProveAttivi() {
  useEffect(() => {
    window.__fiscalProve = {
      async accoda(testo) {
        const id = crypto.randomUUID();
        await accodaEInvia({
          id,
          tabella: 'prove_sincronizzazione',
          operazione: 'inserisci',
          payload: { testo },
        });
        return id;
      },
      elenco: () => getCoda().elenco(),
      async leggi() {
        const { data } = await getSupabase().from('prove_sincronizzazione').select('id, testo');
        return data ?? [];
      },
      sincronizza,
    };
    return () => {
      delete window.__fiscalProve;
    };
  }, []);
  return null;
}

const AgganciVuoti = () => null;

// Scelta fatta durante la build: senza NEXT_PUBLIC_PROVE=1 gli agganci non esistono nel codice pubblicato.
export const AgganciProve = process.env.NEXT_PUBLIC_PROVE === '1' ? AgganciProveAttivi : AgganciVuoti;
