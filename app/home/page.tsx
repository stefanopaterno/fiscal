'use client';

import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Text,
  Title1,
  tokens,
} from '@fluentui/react-components';
import NextLink from 'next/link';
import { useEsci } from '@/features/auth/useSessione';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/**
 * /app/home/ — home protetta (T036). Per ora un segnaposto: i numeri arrivano con le prossime
 * specifiche (fatture, motore IRPEF, spese). Visibile solo con password e codice (aal2).
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, maxWidth: '720px' },
  esci: { alignSelf: 'flex-start', minHeight: '44px' },
  link: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

export default function PaginaHome() {
  const s = useStili();
  const esci = useEsci();
  return (
    <ProtectedPage>
      <Shell>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'home',
              testo:
                "Qui vedrai a colpo d'occhio quanto puoi spendere davvero, quanto mettere da parte per tasse ed ENPAP e le prossime scadenze.",
            }}
          >
            <Title1 as="h1">Home</Title1>
          </ConAiuto>
          <MessageBar intent="success">
            <MessageBarBody>
              Sei entrato con password e codice: l&apos;accesso protetto funziona.
            </MessageBarBody>
          </MessageBar>
          <Text>
            Questa è la prima versione di Fiscal: per ora c&apos;è solo l&apos;accesso sicuro. Fatture, spese,
            netto reale e scadenze arriveranno nei prossimi aggiornamenti.
          </Text>
          <NextLink href="/impostazioni/sicurezza/" className={s.link}>
            Impostazioni di sicurezza
          </NextLink>
          <Button className={s.esci} onClick={() => void esci()}>
            Esci
          </Button>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
