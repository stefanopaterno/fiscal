'use client';

import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { Collegamento } from '@/ui/Moduli';
import { controlliDiOggi } from './Novita';

/** Avviso in home (specifica 012): controlli delle novità o delle addizionali da fare. */
export function AvvisoNovita() {
  const [testo, setTesto] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    controlliDiOggi()
      .then(({ controlli, settimanale, parametri, importazioni }) => {
        if (!vivo) return;
        const daFare = importazioni.flatMap((i) => i.modifiche_programma).filter((m) => m.stato === 'aperta');
        const parti = [
          ...(settimanale.scaduto ? ['controllo settimanale delle novità'] : []),
          ...controlli.map((c) => c.titolo.charAt(0).toLowerCase() + c.titolo.slice(1)),
          ...(parametri.dovuto ? ['aggiornamento dei parametri fiscali'] : []),
          ...(daFare.length ? [`${new Set(daFare.map((m) => m.impronta)).size} novità da fare nel programma`] : []),
        ];
        setTesto(parti.length ? parti.join('; ') : null);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  if (!testo) return null;
  return (
    <MessageBar intent="info" layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>Da controllare</MessageBarTitle>
        {testo.charAt(0).toUpperCase() + testo.slice(1)}.{' '}
        <Collegamento href="/novita/" inLinea>
          Apri le novità
        </Collegamento>
      </MessageBarBody>
    </MessageBar>
  );
}
