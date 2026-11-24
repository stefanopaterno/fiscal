'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Consensi } from '@/features/consensi/Consensi';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/consensi/ — consensi informati dei pazienti (specifica 005). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaConsensi() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'consensi',
              testo:
                'Il consenso informato di ogni paziente: chi ha firmato, quando, quale versione del testo. Solo dati amministrativi, mai dati clinici.',
              dettaglio:
                'I nomi dei pazienti compaiono come iniziali e anno di nascita: tocca la persona in alto per vederli per qualche secondo.',
            }}
          >
            <Title1 as="h1">Consensi</Title1>
          </ConAiuto>
          <Consensi />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
