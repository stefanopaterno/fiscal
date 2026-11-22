'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { ElencoFatture } from '@/features/fatturazione/ElencoFatture';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/fatture/ — elenco delle fatture (T015, T022). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
});

export default function PaginaFatture() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'fatture',
              testo:
                'Tutte le tue fatture e note di credito. Le bozze non hanno numero: lo prendono quando le emetti, in ordine, ripartendo da 1 ogni anno.',
            }}
          >
            <Title1 as="h1">Fatture</Title1>
          </ConAiuto>
          <ElencoFatture />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
