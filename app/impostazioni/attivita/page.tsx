'use client';

import { makeStyles, Title1, tokens } from '@fluentui/react-components';
import { ConfigurazioneAttivita } from '@/features/fatturazione/ConfigurazioneAttivita';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/impostazioni/attivita/ — configurazione della partita IVA e delle attività (T011-T012, US1). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  indietro: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

export default function PaginaAttivita() {
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
              argomento: 'partita IVA e attività',
              testo:
                'Qui inserisci una volta sola i dati che servono su ogni fattura. Puoi cambiarli quando vuoi: le fatture già emesse restano come erano.',
            }}
          >
            <Title1 as="h1">Partita IVA e attività</Title1>
          </ConAiuto>
          <ConfigurazioneAttivita />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
