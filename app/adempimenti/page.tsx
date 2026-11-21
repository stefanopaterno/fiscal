'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Adempimenti } from '@/features/fatturazione/Adempimenti';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/adempimenti/ — Sistema Tessera Sanitaria e fattura elettronica (T021, US5). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, maxWidth: '860px' },
});

export default function PaginaAdempimenti() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'adempimenti',
              testo:
                'Le comunicazioni da fare dopo aver emesso le fatture. Fiscal prepara i dati, ma non li invia: lo fai tu dai portali ufficiali, o il commercialista.',
            }}
          >
            <Title1 as="h1">Adempimenti</Title1>
          </ConAiuto>
          <Adempimenti />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
