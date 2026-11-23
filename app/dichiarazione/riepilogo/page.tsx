'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { Riepilogo } from '@/features/dichiarazione/Riepilogo';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/dichiarazione/riepilogo/?anno= — riepilogo per il commercialista (specifica 004). */
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

export default function PaginaRiepilogo() {
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
              argomento: 'riepilogo',
              testo:
                "I dati dell'anno ordinati come i quadri del Modello Redditi, da stampare o salvare in PDF.",
            }}
          >
            <Title1 as="h1">Riepilogo per il commercialista</Title1>
          </ConAiuto>
          <Suspense>
            <Riepilogo />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
