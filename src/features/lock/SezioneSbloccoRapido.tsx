'use client';

import {
  makeStyles,
  MessageBar,
  MessageBarBody,
  Switch,
  Text,
  Title3,
  tokens,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';
import {
  attivaSbloccoRapido,
  disattivaSbloccoRapido,
  dispositivoCompatibile,
  sbloccoRapidoAttivoQui,
} from './sbloccoRapido';

/**
 * Interruttore "sblocco rapido" su questo dispositivo (T083, FR-020: disattivabile in ogni momento).
 * Aggiorna anche user_security.sblocco_rapido_attivo (data-model.md), che il registro di sicurezza annota.
 */
const useStili = makeStyles({
  sezione: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    padding: tokens.spacingHorizontalXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
});

export function SezioneSbloccoRapido() {
  const s = useStili();
  const [attivo, setAttivo] = useState(false);
  const [compatibile, setCompatibile] = useState<boolean | null>(null);
  const [messaggio, setMessaggio] = useState<{ tipo: 'success' | 'error' | 'info'; testo: string } | null>(
    null,
  );
  const [invio, setInvio] = useState(false);

  useEffect(() => {
    let vivo = true;
    void dispositivoCompatibile().then((c) => {
      if (!vivo) return;
      setCompatibile(c);
      setAttivo(sbloccoRapidoAttivoQui());
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function cambia(acceso: boolean) {
    setInvio(true);
    setMessaggio(null);
    const supabase = getSupabase();
    if (acceso) {
      try {
        await attivaSbloccoRapido();
        await supabase
          .from('user_security')
          .update({ sblocco_rapido_attivo: true })
          .not('owner_id', 'is', null);
        setAttivo(true);
        setMessaggio({ tipo: 'success', testo: 'Sblocco rapido attivo su questo dispositivo.' });
      } catch (e) {
        disattivaSbloccoRapido();
        setMessaggio({
          tipo: 'error',
          testo:
            e instanceof Error && e.message === 'non_supportato'
              ? 'Questo dispositivo o browser non supporta lo sblocco rapido sicuro. Continuerai a entrare con password e codice.'
              : 'Attivazione annullata o non riuscita.',
        });
      }
    } else {
      disattivaSbloccoRapido();
      await supabase
        .from('user_security')
        .update({ sblocco_rapido_attivo: false })
        .not('owner_id', 'is', null);
      setAttivo(false);
      setMessaggio({ tipo: 'info', testo: 'Sblocco rapido disattivato su questo dispositivo.' });
    }
    setInvio(false);
  }

  return (
    <section className={s.sezione} aria-labelledby="titolo-sblocco">
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'sblocco rapido',
          testo:
            "Quando Fiscal si blocca per inattività, puoi riaprirlo con il volto, l'impronta o il PIN del dispositivo invece di scrivere password e codice.",
          esempio: 'Sul telefono: Face ID. Sul Mac: Touch ID. Su Windows: Windows Hello.',
          perche:
            "Vale solo su questo dispositivo e solo per un periodo limitato (14 giorni dall'ultimo accesso con il codice). Poi ti chiediamo di nuovo password e codice.",
        }}
      >
        <Title3 as="h2" id="titolo-sblocco">
          Sblocco rapido
        </Title3>
      </ConAiuto>
      {messaggio ? (
        <MessageBar intent={messaggio.tipo}>
          <MessageBarBody>{messaggio.testo}</MessageBarBody>
        </MessageBar>
      ) : null}
      {compatibile === false ? (
        <Text>Questo dispositivo non ha Face ID, impronta o PIN utilizzabili dal browser.</Text>
      ) : (
        <Switch
          checked={attivo}
          disabled={invio || compatibile === null}
          label="Sblocco rapido su questo dispositivo"
          onChange={(_, d) => void cambia(d.checked)}
        />
      )}
    </section>
  );
}
