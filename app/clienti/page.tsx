'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { ElencoClienti } from '@/features/fatturazione/ElencoClienti';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/clienti/ — clienti e pazienti (T014, FR-017). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, maxWidth: '860px' },
});

export default function PaginaClienti() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'clienti',
              testo:
                'Le persone e gli enti a cui fai fattura. Qui ci sono solo i dati che vanno in fattura: niente note o informazioni sulle sedute.',
            }}
          >
            <Title1 as="h1">Clienti</Title1>
          </ConAiuto>
          <ElencoClienti />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
