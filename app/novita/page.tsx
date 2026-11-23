'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Novita } from '@/features/novita/Novita';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/novita/ — novità normative e controlli (specifica 012). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaNovita() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'novità',
              testo:
                'Cosa è cambiato nelle regole fiscali che usa Fiscal, i controlli da fare e le regole ancora da confermare.',
            }}
          >
            <Title1 as="h1">Novità</Title1>
          </ConAiuto>
          <Novita />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
