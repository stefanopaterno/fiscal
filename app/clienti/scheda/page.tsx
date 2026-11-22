'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SchedaCliente } from '@/features/fatturazione/SchedaCliente';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/clienti/scheda/?id= — nuovo cliente o modifica (T014). `ritorno`: pagina a cui tornare. */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  indietro: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

function Contenuto() {
  const s = useStili();
  const parametri = useSearchParams();
  const id = parametri.get('id');
  return (
    <div className={s.colonna}>
      <Collegamento href="/clienti/" indietro>
        Clienti
      </Collegamento>
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'scheda cliente',
          testo: 'I dati da scrivere in fattura. Se li cambi, le fatture già emesse restano come erano.',
        }}
      >
        <Title1 as="h1">{id ? 'Modifica cliente' : 'Nuovo cliente'}</Title1>
      </ConAiuto>
      <SchedaCliente key={id ?? 'nuovo'} id={id} ritorno={parametri.get('ritorno')} />
    </div>
  );
}

export default function PaginaSchedaCliente() {
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
