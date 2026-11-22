'use client';

import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { useModalita } from '@/features/modalita/useModalita';
import { dataProva, EVENTO_DATA_PROVA, impostaDataProva } from '@/lib/oggi';
import { Collegamento } from '@/ui/Moduli';

/**
 * Fascia in cima alle pagine protette finché l'account è in prova (FR-028), con la data di prova se c'è.
 * In produzione cancella un'eventuale data di prova rimasta su questo dispositivo.
 */
export function FasciaProva() {
  const m = useModalita();
  const [data, setData] = useState<string | null>(null);
  useEffect(() => {
    const leggi = () => setData(dataProva());
    leggi();
    window.addEventListener(EVENTO_DATA_PROVA, leggi);
    return () => window.removeEventListener(EVENTO_DATA_PROVA, leggi);
  }, []);
  useEffect(() => {
    if (m && !m.in_prova && dataProva()) impostaDataProva(null);
  }, [m]);
  if (!m?.in_prova) return null;
  return (
    <MessageBar intent="warning" layout="multiline" aria-label="Modalità prova">
      <MessageBarBody>
        <MessageBarTitle>Modalità prova</MessageBarTitle>
        {data
          ? `Stai provando come se oggi fosse il ${data.split('-').reverse().join('/')}: le fatture non hanno valore fiscale. `
          : 'Puoi provare tutto e cancellare: le fatture non hanno valore fiscale. '}
        <Collegamento inLinea href="/impostazioni/modalita/">
          Prova e produzione
        </Collegamento>
      </MessageBarBody>
    </MessageBar>
  );
}
