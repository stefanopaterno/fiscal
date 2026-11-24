'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { GuidaPassoPasso } from '@/features/aiuto/GuidaPassoPasso';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/aiuto/guida/?id= — guida passo passo (specifica 011). */
const useStili = makeStyles({
  colonna: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    minWidth: 0,
  },
  indietro: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

export default function PaginaGuida() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <Collegamento href="/aiuto/" indietro>
            Aiuto
          </Collegamento>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'guida',
              testo:
                'Un passo alla volta: fai quello che dice, controlla, poi tocca «Fatto, avanti».',
            }}
          >
            <Title1 as="h1">Guida passo passo</Title1>
          </ConAiuto>
          <Suspense>
            <GuidaPassoPasso />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
