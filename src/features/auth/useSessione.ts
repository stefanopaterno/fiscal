'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';

/**
 * T035: uscita dall'app. Chiude la sessione su Supabase (che la cancella anche dal database)
 * e torna all'accesso. Quando esisterà la coda degli inserimenti senza rete (US3), qui verrà
 * svuotata e cancellata anche la sua chiave (FR-022).
 */
export function useEsci() {
  const router = useRouter();
  return useCallback(async () => {
    await getSupabase().auth.signOut({ scope: 'local' });
    router.replace('/accesso/');
  }, [router]);
}
