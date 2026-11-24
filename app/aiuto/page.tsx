'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Aiuto } from '@/features/aiuto/Aiuto';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/aiuto/ — guide passo passo, glossario e preferenze dell'aiuto (specifica 011). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaAiuto() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'aiuto',
              testo:
                'Cerca una parola, segui una guida passo passo o leggi il glossario. Ogni «?» nelle pagine spiega il campo o il numero accanto.',
            }}
          >
            <Title1 as="h1">Aiuto</Title1>
          </ConAiuto>
          <Aiuto />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
