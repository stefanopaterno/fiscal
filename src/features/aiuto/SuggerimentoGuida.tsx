'use client';

import { Button, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { Collegamento } from '@/ui/Moduli';
import { GUIDE } from './guide';
import { useAvanzamentoGuide, usePreferenzeAiuto } from './preferenze';

/**
 * Suggerimento automatico in home (specifica 011, FR-010): propone la prima guida non completata finché i
 * suggerimenti sono attivi; «Non mostrare più» li spegne, l'aiuto resta disponibile a richiesta.
 */
export function SuggerimentoGuida() {
  const [preferenze, imposta] = usePreferenzeAiuto();
  const [avanzamento] = useAvanzamentoGuide();
  const prossima = GUIDE.find((g) => (avanzamento[g.id] ?? 0) < g.passi.length);
  if (!preferenze.automatici || !prossima) return null;
  const iniziata = (avanzamento[prossima.id] ?? 0) > 0;
  return (
    <MessageBar intent="info" layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>{iniziata ? 'Riprendi la guida' : 'Prima volta?'}</MessageBarTitle>
        {prossima.perche}{' '}
        <Collegamento href={`/aiuto/guida/?id=${prossima.id}`} inLinea>
          {prossima.titolo}
        </Collegamento>
      </MessageBarBody>
      <MessageBarActions>
        <Button appearance="transparent" style={{ minHeight: '44px' }} onClick={() => imposta({ automatici: false })}>
          Non mostrare più
        </Button>
      </MessageBarActions>
    </MessageBar>
  );
}
