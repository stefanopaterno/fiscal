'use client';

import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useModalita } from '@/features/modalita/useModalita';
import { Collegamento } from '@/ui/Moduli';

/** Fascia in cima alle pagine protette finché l'account è in prova (FR-028). */
export function FasciaProva() {
  const m = useModalita();
  if (!m?.in_prova) return null;
  return (
    <MessageBar intent="warning" layout="multiline" aria-label="Modalità prova">
      <MessageBarBody>
        <MessageBarTitle>Modalità prova</MessageBarTitle>
        Puoi provare tutto e cancellare: le fatture non hanno valore fiscale.{' '}
        <Collegamento inLinea href="/impostazioni/modalita/">
          Prova e produzione
        </Collegamento>
      </MessageBarBody>
    </MessageBar>
  );
}
