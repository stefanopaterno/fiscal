'use client';

import { makeStyles, tokens } from '@fluentui/react-components';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SchedaDocumento } from '@/features/documenti/SchedaDocumento';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/documenti/scheda/?id= — un documento (specifica 010). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

function Contenuto() {
  const id = useSearchParams().get('id');
  return id ? <SchedaDocumento id={id} /> : null;
}

export default function PaginaSchedaDocumento() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <Collegamento href="/documenti/" indietro>
            Documenti
          </Collegamento>
          <Suspense>
            <Contenuto />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
