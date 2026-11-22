'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { Strategia } from '@/features/tasse/Strategia';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/tasse/strategia/?anno= — piani di versamento a confronto (T021). */
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

export default function PaginaStrategia() {
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
              argomento: 'strategia dei versamenti',
              testo:
                'Le stesse tasse si possono pagare in momenti diversi: qui confronti i modi permessi dalla legge per evitare un mese troppo pesante.',
            }}
          >
            <Title1 as="h1">Strategia dei versamenti</Title1>
          </ConAiuto>
          <Suspense>
            <Strategia />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
