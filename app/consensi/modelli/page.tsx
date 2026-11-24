'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { ModelliConsenso } from '@/features/consensi/ModelliConsenso';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/consensi/modelli/ — tipi di consenso e modelli dei testi (specifica 005). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaModelliConsenso() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <Collegamento href="/consensi/" indietro>
            Consensi
          </Collegamento>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'tipi e modelli',
              testo: 'I tuoi tipi di consenso e i tuoi testi, con versione e data. Fiscal non fornisce testi legali.',
            }}
          >
            <Title1 as="h1">Tipi e modelli</Title1>
          </ConAiuto>
          <ModelliConsenso />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
