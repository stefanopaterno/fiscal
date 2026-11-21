'use client';

import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Text,
  Title2,
  tokens,
} from '@fluentui/react-components';
import { LockClosed48Regular } from '@fluentui/react-icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { dimenticaSessioneBloccata, sblocca, valutaSbloccoRapido } from '@/features/lock/sbloccoRapido';
import type { EsitoSblocco } from '@/features/lock/regole';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Marchio } from '@/ui/Shell';

/**
 * /app/blocco/ — "Fiscal è bloccato" (T082, storia 5). Gli importi non sono visibili.
 * Sblocco rapido (Face ID / impronta / PIN) entro i giorni di accesso completo, altrimenti password e codice.
 * Pagina senza protezione: la sessione è chiusa nella cassaforte e non è sul dispositivo.
 */
const useStili = makeStyles({
  pagina: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  scheda: {
    width: '100%',
    maxWidth: '440px',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
    padding: tokens.spacingHorizontalXXL,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokens.spacingVerticalL,
    textAlign: 'center',
  },
  icona: { alignSelf: 'center', color: tokens.colorBrandForeground1 },
  pulsante: { minHeight: '48px' },
});

const SPIEGAZIONE: Record<Exclude<EsitoSblocco, { ok: true }>['motivo'], string> = {
  disattivato: 'Lo sblocco rapido non è attivo su questo dispositivo: entra con password e codice.',
  non_supportato: 'Questo dispositivo non permette lo sblocco rapido: entra con password e codice.',
  nuovo_dispositivo: 'Per sicurezza entra con password e codice a 6 cifre.',
  scaduto: "È passato troppo tempo dall'ultimo accesso con il codice: entra con password e codice.",
  troppi_rifiuti: 'Troppi tentativi con Face ID o impronta: entra con password e codice.',
};

export default function PaginaBlocco() {
  const s = useStili();
  const router = useRouter();
  const [esito, setEsito] = useState<EsitoSblocco | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  useEffect(() => {
    // Lettura dell'archivio del dispositivo: solo nel browser, dopo il primo disegno.
    const t = setTimeout(() => setEsito(valutaSbloccoRapido()), 0);
    return () => clearTimeout(t);
  }, []);

  function ritorno() {
    try {
      const r = sessionStorage.getItem('fiscal.ritorno');
      sessionStorage.removeItem('fiscal.ritorno');
      return r && !r.startsWith('/blocco') ? r : '/home/';
    } catch {
      return '/home/';
    }
  }

  async function sbloccaOra() {
    setInvio(true);
    setMessaggio(null);
    const r = await sblocca(getSupabase());
    setInvio(false);
    if (r.ok) {
      router.replace(ritorno());
      return;
    }
    if (r.definitivo) {
      setEsito({ ok: false, motivo: 'troppi_rifiuti' });
    } else {
      setMessaggio(
        `Non riconosciuto. Puoi riprovare ancora ${r.rifiutiRimasti} ${r.rifiutiRimasti === 1 ? 'volta' : 'volte'}.`,
      );
    }
  }

  function accessoCompleto() {
    dimenticaSessioneBloccata();
    router.replace('/accesso/');
  }

  return (
    <div className={s.pagina}>
      <Marchio />
      <section className={s.scheda} aria-labelledby="titolo-blocco">
        <LockClosed48Regular className={s.icona} aria-hidden="true" />
        <ConAiuto
          allineamento="centro"
          aiuto={{
            argomento: 'app bloccata',
            testo:
              "Fiscal si blocca da solo dopo qualche minuto che non lo usi, così nessuno può vedere i tuoi numeri se lasci il telefono o il computer acceso. Per riaprirlo usa il volto, l'impronta o il PIN del dispositivo.",
            perche:
              'Ogni tanto (e su un dispositivo nuovo) ti chiediamo comunque password e codice: è la verifica completa, quella che conta davvero.',
          }}
        >
          <Title2 as="h1" id="titolo-blocco">
            Fiscal è bloccato
          </Title2>
        </ConAiuto>
        <Text>Gli importi sono nascosti.</Text>
        {messaggio ? (
          <MessageBar intent="warning">
            <MessageBarBody>{messaggio}</MessageBarBody>
          </MessageBar>
        ) : null}
        {esito?.ok ? (
          <Button
            appearance="primary"
            size="large"
            className={s.pulsante}
            disabled={invio}
            onClick={() => void sbloccaOra()}
          >
            {invio ? 'Verifica in corso…' : 'Sblocca con Face ID o impronta'}
          </Button>
        ) : esito ? (
          <MessageBar intent="info">
            <MessageBarBody>{SPIEGAZIONE[esito.motivo]}</MessageBarBody>
          </MessageBar>
        ) : null}
        <Button
          appearance={esito?.ok ? 'secondary' : 'primary'}
          size="large"
          className={s.pulsante}
          onClick={accessoCompleto}
        >
          Accedi con password e codice
        </Button>
      </section>
    </div>
  );
}
