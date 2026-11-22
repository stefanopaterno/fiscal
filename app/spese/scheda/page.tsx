'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SchedaSpesa } from '@/features/spese/SchedaSpesa';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/spese/scheda/?id= — una spesa (T009, T017). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

function Contenuto() {
  const p = useSearchParams();
  const id = p.get('id');
  return <SchedaSpesa id={id} />;
}

export default function PaginaSchedaSpesa() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <Collegamento href="/spese/" indietro>
            Spese
          </Collegamento>
          <ConAiuto
            allineamento="centro"
            aiuto={{ argomento: 'spesa', testo: 'Compila la spesa: Fiscal ti dice quanto puoi dedurre.' }}
          >
            <Title1 as="h1">Spesa</Title1>
          </ConAiuto>
          <Suspense>
            <Contenuto />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
