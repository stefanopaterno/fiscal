'use client';

import { makeStyles, tokens } from '@fluentui/react-components';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { DettaglioFattura } from '@/features/fatturazione/DettaglioFattura';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/fatture/dettaglio/?id= — dettaglio, incassi e nota di credito (T016, T018). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, maxWidth: '860px' },
});

function Contenuto() {
  const s = useStili();
  const p = useSearchParams();
  const id = p.get('id');
  return (
    <div className={s.colonna}>
      {id ? <DettaglioFattura key={id} id={id} appenaEmessa={p.get('emessa') === '1'} /> : null}
    </div>
  );
}

export default function PaginaDettaglioFattura() {
  return (
    <ProtectedPage>
      <Shell navigazione>
        <Suspense>
          <Contenuto />
        </Suspense>
      </Shell>
    </ProtectedPage>
  );
}
