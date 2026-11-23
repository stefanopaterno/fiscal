'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Tour } from '@/features/tour/Tour';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/tour/ — tour guidato di Fiscal (dal pulsante della mappa accanto all'occhio). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaTour() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'tour',
              testo:
                'Un giro guidato di tutte le sezioni: cosa fanno, cosa provare e la logica fiscale in una riga.',
            }}
          >
            <Title1 as="h1">Tour di Fiscal</Title1>
          </ConAiuto>
          <Tour />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
