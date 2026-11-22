'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { QuadroAnno } from '@/features/tasse/QuadroAnno';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/tasse/ — quadro delle imposte dell'anno e simulatore (T011, T014, T017). */
const useStili = makeStyles({
  colonna: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '860px',
    minWidth: 0,
  },
});

export default function PaginaTasse() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'tasse',
              testo:
                'Quanto pagherai di tasse sul totale dei tuoi redditi (stipendio più partita IVA), cosa versare a giugno e novembre e quanto mettere da parte. Sono stime: la dichiarazione la fa il commercialista.',
            }}
          >
            <Title1 as="h1">Tasse</Title1>
          </ConAiuto>
          <Suspense>
            <QuadroAnno />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
