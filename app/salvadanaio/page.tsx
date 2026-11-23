'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Accantonamento } from '@/features/accantonamento/Accantonamento';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/salvadanaio/ — accantonamento consigliato (specifica 007, T008). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaSalvadanaio() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'salvadanaio',
              testo:
                'Quanto mettere da parte a ogni incasso per pagare tasse e contributi senza sorprese, e se quello che hai messo da parte basta per le prossime scadenze.',
            }}
          >
            <Title1 as="h1">Salvadanaio</Title1>
          </ConAiuto>
          <Accantonamento />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
