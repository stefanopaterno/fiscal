'use client';

import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { messaggi } from '@/lib/messaggi';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ascoltaCoda, avvisaCambiamenti, getCoda, sincronizza } from './istanza';
import type { VoceCoda } from './tipi';

/**
 * Stato della coda (T054): "in attesa di invio" e "da controllare" (conflitti) con le due versioni.
 * Montato nelle pagine con accesso completo; avvia l'invio all'apertura, al ritorno della rete e ogni 30 secondi.
 */
const useStili = makeStyles({
  blocco: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  confronto: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacingHorizontalM,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-word',
  },
});

export function StatoCoda() {
  const s = useStili();
  const [voci, setVoci] = useState<VoceCoda[]>([]);

  useEffect(() => {
    const smetti = ascoltaCoda(setVoci);
    void sincronizza();
    const online = () => void sincronizza();
    window.addEventListener('online', online);
    const periodico = setInterval(() => void sincronizza(), 30_000);
    return () => {
      smetti();
      window.removeEventListener('online', online);
      clearInterval(periodico);
    };
  }, []);

  const inAttesa = voci.filter((v) => v.stato === 'in_attesa');
  const conflitti = voci.filter((v) => v.stato === 'in_conflitto');
  if (voci.length === 0) return null;

  async function scegli(id: string, scelta: 'mia' | 'server') {
    await getCoda().risolviConflitto(id, scelta);
    await avvisaCambiamenti();
    await sincronizza();
  }

  return (
    <div className={s.blocco} role="status">
      {inAttesa.length > 0 ? (
        <ConAiuto
          aiuto={{
            argomento: 'dati in attesa di invio',
            testo:
              'Hai inserito dei dati quando la connessione mancava (o eri bloccato). Sono salvati, protetti, su questo dispositivo e partono da soli appena torna la rete. Non premere "Esci" finché non risultano inviati: uscendo vengono cancellati.',
          }}
        >
          <MessageBar intent="warning">
            <MessageBarBody>
              {inAttesa.length} {inAttesa.length === 1 ? 'dato' : 'dati'}{' '}
              {messaggi.rete.inAttesa.toLowerCase()}
            </MessageBarBody>
          </MessageBar>
        </ConAiuto>
      ) : null}
      {conflitti.map((v) => (
        <MessageBar key={v.id} intent="error" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Da controllare</MessageBarTitle>
            {messaggi.rete.inConflitto}
            <div className={s.confronto}>
              <div>
                <Text weight="semibold">La tua versione</Text>
                <pre>{JSON.stringify(v.payload, null, 1)}</pre>
              </div>
              <div>
                <Text weight="semibold">Quella già salvata</Text>
                <pre>{JSON.stringify(v.datiServer, null, 1)}</pre>
              </div>
            </div>
          </MessageBarBody>
          <MessageBarActions>
            <Button onClick={() => void scegli(v.id, 'mia')}>Tieni la mia</Button>
            <Button onClick={() => void scegli(v.id, 'server')}>Tieni quella salvata</Button>
          </MessageBarActions>
        </MessageBar>
      ))}
    </div>
  );
}
