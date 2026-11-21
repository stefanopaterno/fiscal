'use client';

import { ConfiguraSecondoFattore } from '@/features/auth/ConfiguraSecondoFattore';
import { SchedaAccesso } from '@/features/auth/SchedaAccesso';
import { ProtectedPage } from '@/ui/ProtectedPage';

/** /app/accesso/configura/ — prima configurazione del secondo fattore. */
export default function PaginaConfigura() {
  return (
    <ProtectedPage>
      <SchedaAccesso
        passo="Prima configurazione"
        titolo="Collega il telefono"
        sottotitolo="Lo fai una volta sola: da qui in poi, per entrare, serviranno la password e il codice del telefono."
      >
        <ConfiguraSecondoFattore />
      </SchedaAccesso>
    </ProtectedPage>
  );
}
