'use client';

import { Spinner } from '@fluentui/react-components';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { destinazione, getStatoAccesso } from '@/lib/supabase/aal';
import { getSupabase } from '@/lib/supabase/client';
import { Shell } from '@/ui/Shell';

/**
 * Smistamento (T027): senza sessione va all'accesso, con accesso completo alla home,
 * a metà strada alla pagina giusta (codice o configurazione del secondo fattore).
 */
export default function Smistamento() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const stato = await getStatoAccesso(getSupabase());
      router.replace(destinazione(stato, '/') ?? '/home/');
    })();
  }, [router]);

  return (
    <Shell>
      <Spinner label="Un momento…" />
    </Shell>
  );
}
