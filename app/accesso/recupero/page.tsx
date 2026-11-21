'use client';

import { Recupero } from '@/features/auth/Recupero';
import { SchedaAccesso } from '@/features/auth/SchedaAccesso';
import { ProtectedPage } from '@/ui/ProtectedPage';

/** /app/accesso/recupero/ — rientro con un codice di recupero o con la frase (storia US4). */
export default function PaginaRecupero() {
  return (
    <ProtectedPage>
      <SchedaAccesso
        titolo="Recupero dell'accesso"
        sottotitolo="Hai perso il telefono con Google Authenticator? Rientra con un codice di recupero o con la frase."
      >
        <Recupero />
      </SchedaAccesso>
    </ProtectedPage>
  );
}
