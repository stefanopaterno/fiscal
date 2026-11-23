'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { AnnoPartenza } from '@/features/dichiarazione/AnnoPartenza';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/dichiarazione/partenza/?anno= — dati dell'ultimo 730 (specifica 004). */
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

export default function PaginaPartenza() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <Collegamento href="/dichiarazione/" indietro>
            Dichiarazione
          </Collegamento>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'anno di partenza',
              testo:
                'I pochi dati del tuo ultimo 730 che servono per gli acconti del primo anno di partita IVA.',
            }}
          >
            <Title1 as="h1">Anno di partenza</Title1>
          </ConAiuto>
          <Suspense>
            <AnnoPartenza />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
