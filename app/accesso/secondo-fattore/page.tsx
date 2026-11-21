'use client';

import { BannerRipristinoInCorso } from '@/features/auth/BannerRipristino';
import { FormCodice } from '@/features/auth/FormCodice';
import { SchedaAccesso } from '@/features/auth/SchedaAccesso';
import { ProtectedPage } from '@/ui/ProtectedPage';

/** /app/accesso/secondo-fattore/ — secondo passo: il codice a 6 cifre. */
export default function PaginaSecondoFattore() {
  return (
    <ProtectedPage>
      <SchedaAccesso
        passo="Passo 2 di 2"
        titolo="Codice di verifica"
        sottotitolo="Apri Google Authenticator e scrivi il codice a 6 cifre che vedi sotto «Fiscal»."
      >
        <BannerRipristinoInCorso />
        <FormCodice />
      </SchedaAccesso>
    </ProtectedPage>
  );
}
