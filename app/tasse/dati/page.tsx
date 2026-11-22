'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import NextLink from 'next/link';
import { Suspense } from 'react';
import { DatiAnno } from '@/features/tasse/DatiAnno';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/tasse/dati/?anno= — CU, dati della partita IVA e addizionali (T010). */
const useStili = makeStyles({
  colonna: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '860px',
    minWidth: 0,
  },
  indietro: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

export default function PaginaDatiTasse() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <NextLink href="/tasse/" className={s.indietro}>
            ← Tasse
          </NextLink>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: "dati dell'anno",
              testo:
                'I numeri che servono al calcolo: la Certificazione Unica, le spese della partita IVA e le aliquote del tuo comune e della tua regione.',
            }}
          >
            <Title1 as="h1">Dati dell&apos;anno</Title1>
          </ConAiuto>
          <Suspense>
            <DatiAnno />
          </Suspense>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
