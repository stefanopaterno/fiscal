'use client';

import { makeStyles, Tab, TabList, Title1, tokens } from '@fluentui/react-components';
import { useState } from 'react';
import { Importa } from '@/features/parametri/Importa';
import { ParametriInUso } from '@/features/parametri/ParametriInUso';
import { PreparaRichiesta } from '@/features/parametri/PreparaRichiesta';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/impostazioni/parametri/ — parametri fiscali aggiornabili da file (specifica 014). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  schede: { overflowX: 'auto' },
});

type Scheda = 'uso' | 'prepara' | 'importa';

export default function PaginaParametri() {
  const s = useStili();
  const [scheda, setScheda] = useState<Scheda>('uso');
  const [aggiornamento, setAggiornamento] = useState(0);
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
              argomento: 'parametri fiscali',
              testo:
                'Aliquote, soglie, scadenze e codici che Fiscal usa nei calcoli. Quando cambiano: prepari la richiesta, la dai a Claude, importi la risposta e approvi. Lo storico non cambia.',
            }}
          >
            <Title1 as="h1">Parametri fiscali</Title1>
          </ConAiuto>
          <TabList className={s.schede} selectedValue={scheda} onTabSelect={(_, d) => setScheda(d.value as Scheda)}>
            <Tab value="uso">In uso</Tab>
            <Tab value="prepara">Prepara richiesta</Tab>
            <Tab value="importa">Importa</Tab>
          </TabList>
          {scheda === 'uso' ? <ParametriInUso aggiornamento={aggiornamento} /> : null}
          {scheda === 'prepara' ? <PreparaRichiesta /> : null}
          {scheda === 'importa' ? <Importa onApprovato={() => setAggiornamento((x) => x + 1)} /> : null}
        </div>
      </Shell>
    </ProtectedPage>
  );
}
