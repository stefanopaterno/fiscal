'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { Versamenti } from '@/features/tasse/Versamenti';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/tasse/versamenti/ — contributi ENPAP e imposte versate (T018). */
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

export default function PaginaVersamenti() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <Collegamento href="/tasse/" indietro>
            Tasse
          </Collegamento>
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
