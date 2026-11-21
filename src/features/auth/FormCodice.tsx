'use client';

import {
  Button,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Text,
  tokens,
} from '@fluentui/react-components';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { messaggi } from '@/lib/messaggi';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { messaggioErroreAccesso } from './errori';

/** T033: secondo passo, il codice a 6 cifre dell'app di autenticazione (mfa.challengeAndVerify). */
const useStili = makeStyles({
  modulo: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  campo: { flexGrow: 1 },
  codice: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeHero700,
    letterSpacing: '0.3em',
    textAlign: 'center',
  },
  pulsante: { minHeight: '44px' },
  link: {
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorBrandForegroundLink,
    fontSize: tokens.fontSizeBase300,
  },
  nota: { color: tokens.colorNeutralForeground3 },
});

export function FormCodice() {
  const s = useStili();
  const router = useRouter();
  const [codice, setCodice] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const soloCifre = codice.replace(/\D/g, '');

  async function verifica(evento: FormEvent) {
    evento.preventDefault();
    setErrore(null);
    setInvio(true);
    const supabase = getSupabase();
    const fattori = await supabase.auth.mfa.listFactors();
    const fattore = fattori.data?.totp[0];
    if (!fattore) {
      setInvio(false);
      router.replace('/');
      return;
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fattore.id, code: soloCifre });
    setInvio(false);
    if (error) {
      setErrore(messaggioErroreAccesso(error));
      setCodice('');
      return;
    }
    router.replace('/home/');
  }

  return (
    <form className={s.modulo} onSubmit={verifica} noValidate>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      <ConAiuto
        aiuto={{
          argomento: 'codice a 6 cifre',
          testo:
            "Apri Google Authenticator sul telefono e cerca la voce «Fiscal»: lì c'è un numero di 6 cifre che cambia ogni 30 secondi. Scrivi quello che vedi adesso.",
          perche:
            'La password da sola non basta: se qualcuno la scoprisse, senza il tuo telefono non potrebbe comunque entrare.',
        }}
      >
        <Field label="Codice a 6 cifre" required className={s.campo} hint="Il codice cambia ogni 30 secondi.">
          <Input
            input={{ className: s.codice }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={codice}
            onChange={(_, d) => setCodice(d.value)}
            size="large"
            autoFocus
          />
        </Field>
      </ConAiuto>
      <Button
        type="submit"
        appearance="primary"
        size="large"
        className={s.pulsante}
        disabled={invio || soloCifre.length !== 6}
      >
        {invio ? 'Controllo…' : 'Verifica ed entra'}
      </Button>
      <NextLink href="/accesso/recupero/" className={s.link}>
        Usa un codice di recupero
      </NextLink>
      <Text size={200} className={s.nota}>
        {messaggi.accesso.orologioSbagliato}
      </Text>
    </form>
  );
}
