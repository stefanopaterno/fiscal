'use client';

import { FormPassword } from '@/features/auth/FormPassword';
import { SchedaAccesso } from '@/features/auth/SchedaAccesso';
import { ProtectedPage } from '@/ui/ProtectedPage';

/** /app/accesso/ — primo passo: e-mail e password. */
export default function PaginaAccesso() {
  return (
    <ProtectedPage>
      <SchedaAccesso
        titolo="Accedi"
        sottotitolo="Dopo la password ti chiederemo il codice a 6 cifre del telefono."
      >
        <FormPassword />
      </SchedaAccesso>
    </ProtectedPage>
  );
}
