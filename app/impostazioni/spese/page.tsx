'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { ImpostazioniSpese } from '@/features/spese/ImpostazioniSpese';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/impostazioni/spese/ — impostazioni delle spese (T019). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaImpostazioniSpese() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <Collegamento href="/impostazioni/" indietro>
            Impostazioni
          </Collegamento>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'spese e consigli',
              testo: "Studio fisico, figli a carico e regole pratiche per l'ufficio.",
            }}
          >
            <Title1 as="h1">Spese e consigli</Title1>
          </ConAiuto>
          <Suspense>
            <ImpostazioniSpese />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
