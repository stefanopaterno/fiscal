'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { StampaFattura } from '@/features/fatturazione/StampaFattura';
import { ProtectedPage } from '@/ui/ProtectedPage';

/** /app/fatture/stampa/?id= — documento A4 da stampare o salvare in PDF (T016, FR-016). */
function Contenuto() {
  const id = useSearchParams().get('id');
  return id ? <StampaFattura id={id} /> : null;
}

export default function PaginaStampaFattura() {
  return (
    <ProtectedPage>
      <Suspense>
        <Contenuto />
      </Suspense>
    </ProtectedPage>
  );
}
