'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { Pacchetto } from '@/features/prospetto/Pacchetto';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/dichiarazione/pacchetto/ — pacchetto protetto per il commercialista (specifica 009). */
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

export default function PaginaPacchetto() {
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
              argomento: 'pacchetto',
              testo:
                "Un file protetto da password con PDF ed Excel da mandare al commercialista, con i controlli prima dell'invio.",
            }}
          >
            <Title1 as="h1">Pacchetto per il commercialista</Title1>
          </ConAiuto>
          <Suspense>
            <Pacchetto />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
