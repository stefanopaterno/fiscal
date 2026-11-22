'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { GestioneModalita } from '@/features/modalita/GestioneModalita';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/impostazioni/modalita/ — prova e produzione (FR-027..FR-030). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  indietro: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

export default function PaginaModalita() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <Collegamento href="/impostazioni/" indietro>
            Impostazioni
          </Collegamento>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'prova e produzione',
              testo:
                "All'inizio Fiscal è in prova: puoi sperimentare e cancellare tutto. Quando la partita IVA è aperta passi alla produzione e le fatture diventano vere.",
            }}
          >
            <Title1 as="h1">Prova e produzione</Title1>
          </ConAiuto>
          <GestioneModalita />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
