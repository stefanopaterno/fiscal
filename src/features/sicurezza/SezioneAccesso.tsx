'use client';

import {
  Button,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  Title3,
  tokens,
} from '@fluentui/react-components';
import { useState, type FormEvent } from 'react';
import { useVerificaRecente } from '@/features/auth/useVerificaRecente';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';

/**
 * Sezione "Accesso" (T087, FR-013): cambio password e sostituzione del telefono (secondo fattore).
 * Entrambe richiedono la verifica recente. Il secondo fattore si SOSTITUISCE, non si disattiva mai.
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
  riga: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  modulo: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  pulsante: { minHeight: '44px' },
  qr: { alignSelf: 'center', width: '200px', height: '200px', backgroundColor: '#FFFFFF', padding: '8px' },
  chiave: {
    fontFamily: tokens.fontFamilyMonospace,
    wordBreak: 'break-all',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: tokens.spacingHorizontalM,
  },
  codice: { fontFamily: tokens.fontFamilyMonospace, letterSpacing: '0.3em', textAlign: 'center' },
});

type Messaggio = { tipo: 'success' | 'error'; testo: string } | null;

export function SezioneAccesso() {
  const s = useStili();
  const { chiedi, finestra } = useVerificaRecente();
  const [messaggio, setMessaggio] = useState<Messaggio>(null);
  const [cambioPassword, setCambioPassword] = useState(false);
  const [nuova, setNuova] = useState('');
  const [ripeti, setRipeti] = useState('');
  const [nuovoTelefono, setNuovoTelefono] = useState<{ id: string; qr: string; chiave: string } | null>(null);
  const [codice, setCodice] = useState('');
  const [invio, setInvio] = useState(false);

  async function iniziaCambioPassword() {
    setMessaggio(null);
    if (await chiedi()) setCambioPassword(true);
  }

  async function salvaPassword(evento: FormEvent) {
    evento.preventDefault();
    setInvio(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password: nuova });
    if (!error) await supabase.auth.signOut({ scope: 'others' });
    setInvio(false);
    if (error) {
      setMessaggio({
        tipo: 'error',
        testo:
          'La nuova password non va bene: almeno 12 caratteri, con maiuscole, minuscole, numeri e simboli.',
      });
      return;
    }
    setCambioPassword(false);
    setNuova('');
    setRipeti('');
    setMessaggio({
      tipo: 'success',
      testo: 'Password cambiata. Sugli altri dispositivi servirà la nuova password.',
    });
  }

  async function iniziaSostituzione() {
    setMessaggio(null);
    if (!(await chiedi())) return;
    setInvio(true);
    const supabase = getSupabase();
    // Il limite è un solo telefono collegato: si toglie il vecchio e si collega subito il nuovo.
    const elenco = await supabase.auth.mfa.listFactors();
    for (const f of elenco.data?.all ?? []) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Fiscal' });
    setInvio(false);
    if (error || !data) {
      setMessaggio({
        tipo: 'error',
        testo: 'Non è stato possibile preparare il nuovo collegamento. Riprova.',
      });
      return;
    }
    setNuovoTelefono({ id: data.id, qr: data.totp.qr_code, chiave: data.totp.secret });
  }

  async function confermaNuovoTelefono(evento: FormEvent) {
    evento.preventDefault();
    if (!nuovoTelefono) return;
    setInvio(true);
    const { error } = await getSupabase().auth.mfa.challengeAndVerify({
      factorId: nuovoTelefono.id,
      code: codice.replace(/\D/g, ''),
    });
    setInvio(false);
    if (error) {
      setMessaggio({ tipo: 'error', testo: 'Il codice non è giusto. Riprova con quello che vedi adesso.' });
      setCodice('');
      return;
    }
    setNuovoTelefono(null);
    setCodice('');
    setMessaggio({ tipo: 'success', testo: 'Nuovo telefono collegato. Il vecchio non funziona più.' });
  }

  const nuovaValida = nuova.length >= 12;

  return (
    <section className={s.sezione} aria-labelledby="titolo-accesso">
      {finestra}
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'accesso',
          testo:
            'Qui cambi la password e, se cambi telefono, colleghi quello nuovo a Fiscal. Per sicurezza ti chiediamo prima password e codice.',
        }}
      >
        <Title3 as="h2" id="titolo-accesso">
          Accesso
        </Title3>
      </ConAiuto>
      {messaggio ? (
        <MessageBar intent={messaggio.tipo}>
          <MessageBarBody>{messaggio.testo}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div className={s.riga}>
        <Text>Password</Text>
        <Button className={s.pulsante} disabled={invio} onClick={() => void iniziaCambioPassword()}>
          Cambia password
        </Button>
      </div>
      {cambioPassword ? (
        <form className={s.modulo} onSubmit={salvaPassword} noValidate>
          <ConAiuto
            aiuto={{
              argomento: 'nuova password',
              testo:
                'Almeno 12 caratteri con maiuscole, minuscole, numeri e simboli. Un trucco: una frase con un numero e un segno, come «Lasagne-della-nonna-1987!».',
            }}
          >
            <Field
              label="Nuova password"
              required
              validationState={nuova && !nuovaValida ? 'warning' : 'none'}
              validationMessage={nuova && !nuovaValida ? 'Almeno 12 caratteri.' : undefined}
            >
              <Input
                type="password"
                autoComplete="new-password"
                value={nuova}
                onChange={(_, d) => setNuova(d.value)}
              />
            </Field>
          </ConAiuto>
          <Field
            label="Scrivila di nuovo"
            required
            validationState={ripeti && ripeti !== nuova ? 'error' : 'none'}
            validationMessage={ripeti && ripeti !== nuova ? 'Le due password sono diverse.' : undefined}
          >
            <Input
              type="password"
              autoComplete="new-password"
              value={ripeti}
              onChange={(_, d) => setRipeti(d.value)}
            />
          </Field>
          <Button
            type="submit"
            appearance="primary"
            className={s.pulsante}
            disabled={invio || !nuovaValida || ripeti !== nuova}
          >
            Salva la nuova password
          </Button>
        </form>
      ) : null}

      <div className={s.riga}>
        <Text>Telefono collegato (Google Authenticator)</Text>
        <Button className={s.pulsante} disabled={invio} onClick={() => void iniziaSostituzione()}>
          Sostituisci il telefono
        </Button>
      </div>
      {invio && !nuovoTelefono && !cambioPassword ? <Spinner size="small" /> : null}
      {nuovoTelefono ? (
        <form className={s.modulo} onSubmit={confermaNuovoTelefono} noValidate>
          <MessageBar intent="warning">
            <MessageBarBody>
              Il vecchio telefono è già scollegato: completa adesso il collegamento del nuovo.
            </MessageBarBody>
          </MessageBar>
          <Text weight="semibold">Inquadra il QR con Google Authenticator sul nuovo telefono</Text>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.qr} src={nuovoTelefono.qr} alt="Codice QR per il nuovo telefono" />
          <Text size={200}>Oppure scrivi a mano questa chiave:</Text>
          <Text className={s.chiave}>{nuovoTelefono.chiave}</Text>
          <Field label="Codice a 6 cifre del nuovo telefono" required>
            <Input
              input={{ className: s.codice }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={codice}
              onChange={(_, d) => setCodice(d.value)}
            />
          </Field>
          <Button
            type="submit"
            appearance="primary"
            className={s.pulsante}
            disabled={invio || codice.replace(/\D/g, '').length !== 6}
          >
            Collega il nuovo telefono
          </Button>
        </form>
      ) : null}
    </section>
  );
}
