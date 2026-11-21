'use client';

import {
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Title1,
  Title3,
  tokens,
} from '@fluentui/react-components';
import NextLink from 'next/link';
import { SezioneSbloccoRapido } from '@/features/lock/SezioneSbloccoRapido';
import { ElencoSessioni } from '@/features/sessions/ElencoSessioni';
import { RegistroEventi } from '@/features/sessions/RegistroEventi';
import { SezioneAccesso } from '@/features/sicurezza/SezioneAccesso';
import { SezioneTempi } from '@/features/sicurezza/SezioneTempi';
import { SezioneRecupero } from '@/features/recupero/SezioneRecupero';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/**
 * /app/impostazioni/sicurezza/ — impostazioni di sicurezza.
 * Per ora contiene la dichiarazione "Dove sono i tuoi dati" (T046, FR-016). Sessioni (US3),
 * codici e frase di recupero (US4), blocco e sblocco rapido (US5), password (US6) arrivano dopo.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, maxWidth: '760px' },
  sezione: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    padding: tokens.spacingHorizontalXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  elenco: {
    margin: 0,
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  indietro: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

export default function PaginaSicurezza() {
  const s = useStili();
  return (
    <ProtectedPage>
      <Shell>
        <div className={s.colonna}>
          <NextLink href="/home/" className={s.indietro}>
            ← Home
          </NextLink>
          <Title1 as="h1">Sicurezza</Title1>

          <section className={s.sezione} aria-labelledby="dove-dati">
            <ConAiuto
              allineamento="centro"
              aiuto={{
                argomento: 'dove sono i tuoi dati',
                testo:
                  'I tuoi dati non stanno su questo telefono o computer: stanno in un archivio online (Supabase) che è solo tuo. Per aprirlo servono la password e il codice del telefono.',
                esempio:
                  "È come una cassetta di sicurezza in banca: tu hai le chiavi, ma la banca che gestisce il caveau potrebbe tecnicamente aprirla. Per questo proteggiamo anche l'account di Supabase.",
              }}
            >
              <Title3 as="h2" id="dove-dati">
                Dove sono i tuoi dati
              </Title3>
            </ConAiuto>
            <ul className={s.elenco}>
              <li>
                <Text>
                  Sono nel tuo database Supabase, protetti da password, codice a 6 cifre e regole che fanno
                  vedere ogni riga solo a te.
                </Text>
              </li>
              <li>
                <Text>
                  Nessun altro servizio li riceve, e il sito pubblico contiene solo il programma, mai i dati.
                </Text>
              </li>
            </ul>
            <MessageBar intent="warning" layout="multiline">
              <MessageBarBody>
                <MessageBarTitle>Sono conservati in chiaro</MessageBarTitle>
                Chi ha accesso come amministratore al progetto Supabase può leggerli. Per questo tieni attiva
                la verifica in due passaggi anche sul tuo account Supabase e non aggiungere altre persone al
                progetto.
              </MessageBarBody>
            </MessageBar>
          </section>

          <SezioneAccesso />

          <SezioneRecupero />

          <SezioneTempi />

          <SezioneSbloccoRapido />

          <ElencoSessioni />

          <RegistroEventi />
        </div>
      </Shell>
    </ProtectedPage>
  );
}
