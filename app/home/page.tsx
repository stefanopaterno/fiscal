'use client';

import { BannerRipristinoAnnullato } from '@/features/auth/BannerRipristino';
import { Cruscotto } from '@/features/home/Cruscotto';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/**
 * /app/home/ — home protetta (T036): cruscotto con quanto mettere da parte per le tasse, numeri dell'anno,
 * azioni rapide e ultime fatture. Visibile solo con password e codice (aal2).
 */
export default function PaginaHome() {
  return (
    <ProtectedPage>
      <Shell navigazione>
        <BannerRipristinoAnnullato />
        <Cruscotto />
      </Shell>
    </ProtectedPage>
  );
}
