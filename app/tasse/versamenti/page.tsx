'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import NextLink from 'next/link';
import { Suspense } from 'react';
import { Versamenti } from '@/features/tasse/Versamenti';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/tasse/versamenti/ — contributi ENPAP e imposte versate (T018). */
const useStili = makeStyles({
  colonna: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '860px',
    minWidth: 0,
  },
  indietro: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

export default function PaginaVersamenti() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <NextLink href="/tasse/" className={s.indietro}>
            ← Tasse
          </NextLink>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'versamenti',
              testo:
                'Quello che hai già pagato: contributi ENPAP e F24. Il calcolo li usa per deduzioni, acconti e saldo.',
            }}
          >
            <Title1 as="h1">Versamenti</Title1>
          </ConAiuto>
          <Suspense>
            <Versamenti />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
