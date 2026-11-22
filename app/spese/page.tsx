'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { MenuSpese } from '@/features/spese/comuni';
import { ElencoSpese } from '@/features/spese/ElencoSpese';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/spese/ — spese professionali dell'anno (T009). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaSpese() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'spese',
              testo:
                "Le spese per il lavoro abbassano il reddito della partita IVA e quindi le tasse. Registra ogni spesa con la data in cui l'hai pagata.",
            }}
          >
            <Title1 as="h1">Spese</Title1>
          </ConAiuto>
          <MenuSpese />
          <Suspense>
            <ElencoSpese />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
