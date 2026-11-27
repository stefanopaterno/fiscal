'use client';

import { makeStyles, Skeleton, SkeletonItem, tokens } from '@fluentui/react-components';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { GuardiaBlocco } from '@/features/lock/GuardiaBlocco';
import { AgganciProve } from '@/features/offline-queue/AgganciProve';
import { useRegistroParametri } from '@/features/parametri/ProviderParametri';
import { destinazione, getStatoAccesso } from '@/lib/supabase/aal';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Protezione di una pagina (T023).
 * Finché non è verificata una sessione con secondo fattore (aal2) mostra solo uno scheletro:
 * l'HTML esportato non contiene mai dati. Senza aal2 reindirizza alla pagina di accesso giusta.
 * La protezione vera resta nel database (regole per riga che richiedono aal2).
 */
const useStili = makeStyles({
  scheletro: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
  },
});

export function ProtectedPage({ children }: { children: ReactNode }) {
  const s = useStili();
  const router = useRouter();
  const pagina = usePathname();
  const [consentito, setConsentito] = useState(false);
  const [completo, setCompleto] = useState(false);
  // specifica 014: i parametri approvati dall'utente entrano nel motore prima di mostrare i calcoli.
  // Solo all'apertura: se la pagina è già visibile (es. configurazione del secondo fattore che passa ad aal2)
  // non si smonta, il registro si carica in sottofondo e la pagina si ridisegna quando è pronto.
  const parametriPronti = useRegistroParametri(consentito && completo);
  const [attendiParametri, setAttendiParametri] = useState(false);

  useEffect(() => {
    let attivo = true;
    const supabase = getSupabase();
    let primaVolta = true;
    const controlla = async () => {
      const stato = await getStatoAccesso(supabase);
      if (!attivo) return;
      const dove = destinazione(stato, pagina);
      setCompleto(stato === 'aal2');
      if (dove) {
        setConsentito(false);
        router.replace(dove);
      } else {
        // si aspetta il registro solo se la pagina si apre già con accesso completo
        if (primaVolta) setAttendiParametri(stato === 'aal2');
        primaVolta = false;
        setConsentito(true);
      }
    };
    void controlla();
    const { data } = supabase.auth.onAuthStateChange(() => void controlla());
    return () => {
      attivo = false;
      data.subscription.unsubscribe();
    };
  }, [pagina, router]);

  if (!consentito || (attendiParametri && !parametriPronti)) {
    return (
      <Skeleton aria-label="Caricamento" className={s.scheletro}>
        <SkeletonItem size={32} />
        <SkeletonItem size={96} />
        <SkeletonItem size={64} />
      </Skeleton>
    );
  }
  // Con accesso completo la guardia blocca l'app dopo l'inattività (storia US5).
  return (
    <>
      {children}
      {completo ? <GuardiaBlocco /> : null}
      {completo ? <AgganciProve /> : null}
    </>
  );
}
