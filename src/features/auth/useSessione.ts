'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { getCoda } from '@/features/offline-queue/istanza';
import { dimenticaRegistro } from '@/features/parametri/ProviderParametri';
import { getSupabase } from '@/lib/supabase/client';

/**
 * T035: uscita dall'app. Chiude la sessione su Supabase (che la cancella anche dal database)
 * e torna all'accesso. Svuota anche la coda degli inserimenti senza rete e cancella la sua chiave (FR-022).
 */
export function useEsci() {
  const router = useRouter();
  return useCallback(async () => {
    await getCoda().pulisci(); // FR-022: la coda e la sua chiave non restano sul dispositivo
    dimenticaRegistro(); // specifica 014: niente copia del registro dei parametri dopo l'uscita
    await getSupabase().auth.signOut({ scope: 'local' });
    router.replace('/accesso/');
  }, [router]);
}
