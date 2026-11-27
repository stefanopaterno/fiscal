'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { Scadenze } from '@/features/dichiarazione/Scadenze';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/dichiarazione/scadenze/ — calendario delle scadenze (specifica 004). */
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

export default function PaginaScadenze() {
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
              argomento: 'scadenze',
              testo:
                'Tutte le scadenze fiscali e previdenziali, quelle che ti riguardano in evidenza.',
            }}
          >
            <Title1 as="h1">Scadenze</Title1>
          </ConAiuto>
          <Collegamento href="/home/?guida=redditi-pf">Come si fa la dichiarazione dei redditi (guida)</Collegamento>
          <Suspense>
            <Scadenze />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
