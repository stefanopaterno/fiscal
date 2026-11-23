'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { Dichiarazione } from '@/features/dichiarazione/Dichiarazione';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/dichiarazione/?anno= — checklist, esito e chiusura dell'anno (specifica 004). */
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

export default function PaginaDichiarazione() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'dichiarazione',
              testo:
                "Con la partita IVA si usa il Modello Redditi: qui vedi cosa serve, cosa manca e com'è l'esito dell'anno.",
            }}
          >
            <Title1 as="h1">Dichiarazione</Title1>
          </ConAiuto>
          <Suspense>
            <Dichiarazione />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
