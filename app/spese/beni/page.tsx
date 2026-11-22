'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { MenuSpese } from '@/features/spese/comuni';
import { RegistroBeni } from '@/features/spese/RegistroBeni';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/spese/beni/ — registro dei beni (T009). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaBeni() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'beni durevoli',
              testo: 'Computer, arredi e attrezzature che usi per più anni.',
            }}
          >
            <Title1 as="h1">Beni durevoli</Title1>
          </ConAiuto>
          <MenuSpese />
          <Suspense>
            <RegistroBeni />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
