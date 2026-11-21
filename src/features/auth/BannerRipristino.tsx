'use client';

import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { chiamaRecupero, type RichiestaRipristino } from '@/features/recupero/api';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Avvisi sul ripristino (T072, storia 4 scenario 5):
 * - sulla pagina del codice (solo password): "c'è un ripristino in corso; se non sei stato tu, scrivi il codice";
 * - nella home (accesso completo): "abbiamo annullato un ripristino perché sei entrato con il codice".
 */
export function BannerRipristinoInCorso() {
  const [richiesta, setRichiesta] = useState<RichiestaRipristino | null>(null);
  useEffect(() => {
    void chiamaRecupero<{ richiesta: RichiestaRipristino | null }>('recovery-phrase', {
      azione: 'stato',
    }).then((r) => {
      if (r.ok) setRichiesta(r.dati.richiesta);
    });
  }, []);
  if (!richiesta) return null;
  return (
    <MessageBar intent="error" layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>È in corso un ripristino del tuo accesso</MessageBarTitle>È stato avviato con la
        frase di recupero. Se non sei stato tu, scrivi qui il codice a 6 cifre: il ripristino si annulla
        subito. Poi cambia la frase dalle impostazioni di sicurezza.
      </MessageBarBody>
    </MessageBar>
  );
}

export function BannerRipristinoAnnullato() {
  const [annullato, setAnnullato] = useState(false);
  useEffect(() => {
    const settimanaFa = new Date(Date.now() - 7 * 86_400_000).toISOString();
    void getSupabase()
      .from('recovery_requests')
      .select('id')
      .eq('motivo_chiusura', 'accesso_valido')
      .gte('chiusa_il', settimanaFa)
      .limit(1)
      .then(({ data }) => setAnnullato((data ?? []).length > 0));
  }, []);
  if (!annullato) return null;
  return (
    <MessageBar intent="warning" layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>Abbiamo annullato un ripristino del tuo accesso</MessageBarTitle>
        Negli ultimi giorni qualcuno ha usato la tua frase di recupero. Visto che sei entrato con il codice,
        il ripristino è stato annullato. Se non eri tu, cambia subito la frase dalle impostazioni di
        sicurezza.
      </MessageBarBody>
    </MessageBar>
  );
}
