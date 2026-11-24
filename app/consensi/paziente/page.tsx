'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Suspense } from 'react';
import { SchedaConsensi } from '@/features/consensi/SchedaConsensi';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/consensi/paziente/?id= — consensi di un paziente (specifica 005). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaConsensiPaziente() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <Collegamento href="/consensi/" indietro>
            Consensi
          </Collegamento>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'consensi del paziente',
              testo: 'Stato attuale, registrazione di un nuovo consenso, storico, revoca e richieste del paziente.',
            }}
          >
            <Title1 as="h1">Consensi del paziente</Title1>
          </ConAiuto>
          <Suspense>
            <SchedaConsensi />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
