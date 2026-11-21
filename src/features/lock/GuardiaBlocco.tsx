'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { deveBloccare } from './regole';
import { blocca } from './sbloccoRapido';
import { useOcchio } from './useOcchio';

/**
 * Guardia del blocco (T079, FR-010, storia 5):
 * - dopo `blocco_minuti` senza attività (valore iniziale 5) blocca l'app e va su /blocco/;
 * - quando l'app va in background chiude subito l'occhio (importi nascosti al ritorno).
 * Attiva solo sulle pagine con accesso completo.
 */
const EVENTI_ATTIVITA = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;

export function GuardiaBlocco() {
  const router = useRouter();
  const pagina = usePathname();
  const { nascondi } = useOcchio();
  const ultimaAttivita = useRef(0);
  const impostazioni = useRef({ bloccoMinuti: 5, accessoCompletoGiorni: 14 });
  const bloccando = useRef(false);

  useEffect(() => {
    let attivo = true;
    const supabase = getSupabase();
    ultimaAttivita.current = Date.now();

    void supabase
      .from('user_security')
      .select('blocco_minuti, accesso_completo_giorni')
      .maybeSingle()
      .then(({ data }) => {
        if (attivo && data) {
          impostazioni.current = {
            bloccoMinuti: data.blocco_minuti,
            accessoCompletoGiorni: data.accesso_completo_giorni,
          };
        }
      });

    const segnaAttivita = () => {
      ultimaAttivita.current = Date.now();
    };
    for (const e of EVENTI_ATTIVITA) window.addEventListener(e, segnaAttivita, { passive: true });

    const visibilita = () => {
      if (document.visibilityState === 'hidden') nascondi();
    };
    document.addEventListener('visibilitychange', visibilita);

    const controlla = setInterval(() => {
      if (bloccando.current) return;
      if (
        deveBloccare({
          ultimaAttivita: ultimaAttivita.current,
          adesso: Date.now(),
          bloccoMinuti: impostazioni.current.bloccoMinuti,
        })
      ) {
        bloccando.current = true;
        nascondi();
        try {
          sessionStorage.setItem('fiscal.ritorno', pagina);
        } catch {
          // niente da fare
        }
        void blocca(supabase, impostazioni.current.accessoCompletoGiorni).then(() =>
          router.replace('/blocco/'),
        );
      }
    }, 5_000);

    return () => {
      attivo = false;
      clearInterval(controlla);
      for (const e of EVENTI_ATTIVITA) window.removeEventListener(e, segnaAttivita);
      document.removeEventListener('visibilitychange', visibilita);
    };
  }, [nascondi, pagina, router]);

  return null;
}
