'use client';

import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { chiamaRecupero, type RispostaFunzione } from './api';
import { ImpostaFrase } from './ImpostaFrase';
import { MostraCodici } from './MostraCodici';

/**
 * Passi di recupero dopo la configurazione del secondo fattore (T070):
 * 1) codici di recupero (generati ora, o avviso che ce ne sono ancora); 2) frase, se non c'è già.
 */
type Fase =
  | { tipo: 'carico' }
  | { tipo: 'codici'; codici: string[] }
  | { tipo: 'codici_presenti'; residui: number }
  | { tipo: 'frase' }
  | { tipo: 'errore'; messaggio: string };

type RispostaCodici = RispostaFunzione<{ codici?: string[]; gia_presenti?: boolean; residui?: number }>;
const richiediCodici = (azione: 'genera' | 'rigenera'): Promise<RispostaCodici> =>
  chiamaRecupero('recovery-codes', { azione });

const useStili = makeStyles({
  blocco: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  pulsante: { minHeight: '44px' },
});

export function PassiRecupero({ onFine }: { onFine: () => void }) {
  const s = useStili();
  const [fase, setFase] = useState<Fase>({ tipo: 'carico' });

  const vaiAllaFrase = useCallback(async () => {
    const { data } = await getSupabase()
      .from('user_security')
      .select('frase_recupero_impostata_il')
      .maybeSingle();
    if (data?.frase_recupero_impostata_il) onFine();
    else setFase({ tipo: 'frase' });
  }, [onFine]);

  // La fase si aggiorna solo quando arriva la risposta (mai in modo sincrono dentro l'effetto).
  const applica = useCallback((r: RispostaCodici) => {
    if (!r.ok) setFase({ tipo: 'errore', messaggio: r.messaggio });
    else if (r.dati.codici) setFase({ tipo: 'codici', codici: r.dati.codici });
    else setFase({ tipo: 'codici_presenti', residui: r.dati.residui ?? 0 });
  }, []);

  const genera = (azione: 'genera' | 'rigenera') => {
    setFase({ tipo: 'carico' });
    void richiediCodici(azione).then(applica);
  };

  useEffect(() => {
    let attivo = true;
    void richiediCodici('genera').then((r) => {
      if (attivo) applica(r);
    });
    return () => {
      attivo = false;
    };
  }, [applica]);

  switch (fase.tipo) {
    case 'carico':
      return <Spinner label="Un momento…" />;
    case 'errore':
      return (
        <div className={s.blocco}>
          <MessageBar intent="error">
            <MessageBarBody>{fase.messaggio}</MessageBarBody>
          </MessageBar>
          <Button className={s.pulsante} onClick={() => void genera('genera')}>
            Riprova
          </Button>
          <Button appearance="subtle" className={s.pulsante} onClick={onFine}>
            Continua senza (sconsigliato)
          </Button>
        </div>
      );
    case 'codici':
      return <MostraCodici codici={fase.codici} onConfermato={() => void vaiAllaFrase()} />;
    case 'codici_presenti':
      return (
        <div className={s.blocco}>
          <Text weight="semibold">Codici di recupero</Text>
          <Text>
            Hai ancora {fase.residui} codici di recupero validi. Se non sai più dove sono, o temi che qualcuno
            li abbia visti, generane di nuovi: quelli vecchi smetteranno di funzionare.
          </Text>
          <Button
            appearance="primary"
            size="large"
            className={s.pulsante}
            onClick={() => void vaiAllaFrase()}
          >
            Continua
          </Button>
          <Button className={s.pulsante} onClick={() => void genera('rigenera')}>
            Generane di nuovi
          </Button>
        </div>
      );
    case 'frase':
      return <ImpostaFrase onFatto={onFine} onSalta={onFine} />;
  }
}
