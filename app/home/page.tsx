'use client';

import { Button, makeStyles, Text, Title1, tokens } from '@fluentui/react-components';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { BannerRipristinoAnnullato } from '@/features/auth/BannerRipristino';
import { useEsci } from '@/features/auth/useSessione';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/**
 * /app/home/ — home protetta (T036). Scorciatoie verso fatture (003) e tasse (001); il netto reale
 * arriva con le prossime specifiche (spese, accantonamento). Visibile solo con password e codice (aal2).
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  esci: { alignSelf: 'flex-start', minHeight: '44px' },
  scorciatoie: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
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
  const router = useRouter();
  return (
    <ProtectedPage>
      <Shell navigazione>
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
          <BannerRipristinoAnnullato />
          <Text>
            Da qui prepari ed emetti le fatture, tieni l&apos;elenco dei pazienti e i dati per il Sistema
            Tessera Sanitaria. In Tasse vedi quanto pagherai sul totale dei tuoi redditi e quanto mettere da
            parte per giugno e novembre.
          </Text>
          <div className={s.scorciatoie}>
            <Button appearance="primary" className={s.esci} onClick={() => router.push('/fatture/nuova/')}>
              Nuova fattura
            </Button>
            <Button className={s.esci} onClick={() => router.push('/clienti/scheda/')}>
              Nuovo cliente
            </Button>
            <Button className={s.esci} onClick={() => router.push('/tasse/')}>
              Le mie tasse
            </Button>
            <NextLink href="/impostazioni/attivita/" className={s.link}>
              Configura la partita IVA
            </NextLink>
          </div>
          <Button className={s.esci} onClick={() => void esci()}>
            Esci
          </Button>
        </div>
      </Shell>
    </ProtectedPage>
  );
}
