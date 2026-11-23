'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { Previsione } from '@/features/previsione/Previsione';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/tasse/previsione/?anno= — previsione mensile delle tasse (specifica 006). */
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

export default function PaginaPrevisione() {
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
              argomento: 'previsione',
              testo:
                'Quante tasse pagherai per quest\'anno, aggiornato man mano che incassi, e quando usciranno i soldi.',
            }}
          >
            <Title1 as="h1">Previsione</Title1>
          </ConAiuto>
          <Suspense>
            <Previsione />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
