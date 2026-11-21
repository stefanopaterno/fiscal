'use client';

import { MessageBar, MessageBarBody, Text } from '@fluentui/react-components';
import NextLink from 'next/link';
import { SchedaAccesso } from '@/features/auth/SchedaAccesso';
import { ProtectedPage } from '@/ui/ProtectedPage';

/**
 * /app/accesso/recupero/ — segnaposto. Il recupero con codici e frase arriva con la storia US4.
 * Fino ad allora l'unica via è il ripristino da amministratore sul pannello Supabase.
 */
export default function PaginaRecupero() {
  return (
    <ProtectedPage>
      <SchedaAccesso titolo="Recupero dell'accesso">
        <MessageBar intent="info">
          <MessageBarBody>
            Il recupero con i codici di emergenza arriva con il prossimo aggiornamento di Fiscal.
          </MessageBarBody>
        </MessageBar>
        <Text>
          Per ora, se hai perso il telefono con Google Authenticator, l&apos;unico modo per rientrare è
          togliere il secondo fattore dal pannello di Supabase (Authentication → Users → il tuo utente),
          entrando con la verifica in due passaggi del tuo account Supabase.
        </Text>
        <NextLink href="/">Torna all&apos;accesso</NextLink>
      </SchedaAccesso>
    </ProtectedPage>
  );
}
