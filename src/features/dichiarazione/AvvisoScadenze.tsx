'use client';

import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import type { VoceCalendario } from '@/engine/scadenze/calendario';
import { Collegamento } from '@/ui/Moduli';
import { scadenzeInArrivo } from './dati';
import { anticipoScelto } from './Scadenze';

/** Promemoria in home (specifica 004, FR-010): scadenze che ti riguardano entro l'anticipo, e quelle scadute. */
export function AvvisoScadenze() {
  const [voci, setVoci] = useState<VoceCalendario[]>([]);
  useEffect(() => {
    let vivo = true;
    scadenzeInArrivo(anticipoScelto())
      .then((v) => vivo && setVoci(v))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  if (voci.length === 0) return null;
  const scadute = voci.filter((v) => v.stato === 'scaduta');
  const testo = voci
    .slice(0, 3)
    .map((v) => `${v.titolo} (${v.stato === 'scaduta' ? 'scaduta' : v.giorni === 0 ? 'oggi' : `tra ${v.giorni} ${v.giorni === 1 ? 'giorno' : 'giorni'}`})`)
    .join('; ');
  return (
    <MessageBar intent={scadute.length > 0 ? 'warning' : 'info'} layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>{scadute.length > 0 ? 'Scadenze da sistemare' : 'Scadenze in arrivo'}</MessageBarTitle>
        {testo}
        {voci.length > 3 ? ` e altre ${voci.length - 3}` : ''}.{' '}
        <Collegamento href="/dichiarazione/scadenze/" inLinea>
          Apri le scadenze
        </Collegamento>
      </MessageBarBody>
    </MessageBar>
  );
}
