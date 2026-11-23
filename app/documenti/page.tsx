'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { Archivio } from '@/features/documenti/Archivio';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/documenti/ — archivio dei documenti e fatture ricevute (specifica 010). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
});

export default function PaginaDocumenti() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'documenti',
              testo:
                'Il tuo archivio privato: fatture ricevute, scontrini, polizze, CU. Puoi collegare ogni documento alla spesa o alla fattura a cui si riferisce.',
            }}
          >
            <Title1 as="h1">Documenti</Title1>
          </ConAiuto>
          <Archivio />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
