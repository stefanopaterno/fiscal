'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { NuovaFattura } from '@/features/fatturazione/NuovaFattura';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/fatture/nuova/?id=&cliente= — nuova fattura o bozza da completare (T015, US2). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  indietro: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

function Contenuto() {
  const s = useStili();
  const p = useSearchParams();
  const id = p.get('id');
  return (
    <div className={s.colonna}>
      <Collegamento href="/fatture/" indietro>
        Fatture
      </Collegamento>
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'nuova fattura',
          testo:
            'Scegli il cliente, scrivi le prestazioni e il compenso: contributo ENPAP, IVA, bollo e ritenuta li calcola Fiscal. Puoi salvarla come bozza o emetterla subito.',
        }}
      >
        <Title1 as="h1">{id ? 'Bozza di fattura' : 'Nuova fattura'}</Title1>
      </ConAiuto>
      <NuovaFattura key={id ?? 'nuova'} id={id} clienteIniziale={p.get('cliente')} />
    </div>
  );
}

export default function PaginaNuovaFattura() {
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
