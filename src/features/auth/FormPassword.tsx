'use client';

import {
  Button,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  tokens,
} from '@fluentui/react-components';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { messaggioErroreAccesso } from './errori';

/** T032: accesso con e-mail e password (primo passo). */
const useStili = makeStyles({
  modulo: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  campo: { flexGrow: 1 },
  pulsante: { minHeight: '44px' },
  link: {
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: tokens.colorBrandForegroundLink,
    fontSize: tokens.fontSizeBase300,
    ':hover': { color: tokens.colorBrandForegroundLinkHover },
  },
});

export function FormPassword() {
  const s = useStili();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  async function accedi(evento: FormEvent) {
    evento.preventDefault();
    setErrore(null);
    setInvio(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setInvio(false);
    if (error) {
      setErrore(messaggioErroreAccesso(error));
      return;
    }
    // Il passo successivo (codice o prima configurazione) lo decide lo stato dell'accesso.
    router.replace('/');
  }

  return (
    <form className={s.modulo} onSubmit={accedi} noValidate>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      <ConAiuto
        aiuto={{
          argomento: 'e-mail',
          testo:
            "L'indirizzo e-mail con cui hai creato il tuo account Fiscal. È solo per entrare: Fiscal non ti manda pubblicità.",
        }}
      >
        <Field label="E-mail" required className={s.campo}>
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(_, d) => setEmail(d.value)}
            size="large"
          />
        </Field>
      </ConAiuto>
      <ConAiuto
        aiuto={{
          argomento: 'password',
          testo:
            'La password che hai scelto per Fiscal. Da sola non basta: subito dopo ti chiediamo anche il codice a 6 cifre del telefono.',
          perche:
            'I tuoi dati sono soldi e pazienti: servono due chiavi diverse per aprirli, come il bancomat (carta e PIN).',
        }}
      >
        <Field label="Password" required className={s.campo}>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(_, d) => setPassword(d.value)}
            size="large"
          />
        </Field>
      </ConAiuto>
      <Button
        type="submit"
        appearance="primary"
        size="large"
        className={s.pulsante}
        disabled={invio || !email || !password}
      >
        {invio ? 'Controllo…' : 'Accedi'}
      </Button>
      <NextLink href="/accesso/recupero/" className={s.link}>
        Ho perso il telefono con l&apos;app di autenticazione
      </NextLink>
    </form>
  );
}
