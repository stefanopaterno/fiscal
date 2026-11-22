'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { MenuSpese } from '@/features/spese/comuni';
import { Consigli } from '@/features/spese/Consigli';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/spese/consigli/ — consigli, simulatore e ufficio (T015, T018). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaConsigli() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'come abbassare le tasse',
              testo: "Le azioni che riducono di più le tasse di quest'anno, con quanto ti costano davvero.",
            }}
          >
            <Title1 as="h1">Come abbassare le tasse</Title1>
          </ConAiuto>
          <MenuSpese />
          <Suspense>
            <Consigli />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
