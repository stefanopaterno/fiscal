'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { MenuSpese } from '@/features/spese/comuni';
import { OneriPersonali } from '@/features/spese/OneriPersonali';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/spese/oneri/ — oneri deducibili e detraibili (T012). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaOneri() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'spese personali',
              testo: 'Le spese tue che danno uno sconto sulle tasse, con quanto puoi ancora usare.',
            }}
          >
            <Title1 as="h1">Spese personali</Title1>
          </ConAiuto>
          <MenuSpese />
          <Suspense>
            <OneriPersonali />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
