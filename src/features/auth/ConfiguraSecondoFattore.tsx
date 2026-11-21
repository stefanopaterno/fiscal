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
  tokens,
} from '@fluentui/react-components';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { messaggi } from '@/lib/messaggi';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { PassiRecupero } from '@/features/recupero/PassiRecupero';
import { messaggioErroreAccesso } from './errori';

/**
 * T034: prima configurazione del secondo fattore (dopo la password, quando non c'è ancora).
 * Mostra il QR per Google Authenticator e la chiave da scrivere a mano, poi verifica il primo codice.
 * I codici di recupero e la frase di recupero si aggiungono qui con la storia US4.
 */
type Configurazione = { factorId: string; qr: string; chiave: string };

const useStili = makeStyles({
  blocco: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  qr: {
    alignSelf: 'center',
    width: '200px',
    height: '200px',
    backgroundColor: '#FFFFFF',
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
  },
  chiave: {
    fontFamily: tokens.fontFamilyMonospace,
    wordBreak: 'break-all',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
  },
  campo: { flexGrow: 1 },
  codice: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeHero700,
    letterSpacing: '0.3em',
    textAlign: 'center',
  },
  pulsante: { minHeight: '44px' },
});

export function ConfiguraSecondoFattore() {
  const s = useStili();
  const router = useRouter();
  const [config, setConfig] = useState<Configurazione | null>(null);
  const [codice, setCodice] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const [collegato, setCollegato] = useState(false);
  const soloCifre = codice.replace(/\D/g, '');

  useEffect(() => {
    let attivo = true;
    void (async () => {
      const supabase = getSupabase();
      // Già entrato con il codice: qui non c'è niente da configurare.
      const livello = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (livello.data?.currentLevel === 'aal2') {
        router.replace('/home/');
        return;
      }
      // Se la pagina era già stata aperta, esiste un fattore non confermato: lo togliamo e ripartiamo.
      const elenco = await supabase.auth.mfa.listFactors();
      for (const f of elenco.data?.all ?? []) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Fiscal' });
      if (!attivo) return;
      if (error || !data) {
        setErrore(messaggi.generico.errore);
        return;
      }
      setConfig({ factorId: data.id, qr: data.totp.qr_code, chiave: data.totp.secret });
    })();
    return () => {
      attivo = false;
    };
  }, [router]);

  async function conferma(evento: FormEvent) {
    evento.preventDefault();
    if (!config) return;
    setErrore(null);
    setInvio(true);
    const { error } = await getSupabase().auth.mfa.challengeAndVerify({
      factorId: config.factorId,
      code: soloCifre,
    });
    setInvio(false);
    if (error) {
      setErrore(messaggioErroreAccesso(error));
      setCodice('');
      return;
    }
    setCollegato(true);
  }

  if (collegato) {
    // Telefono collegato: ora codici di recupero e frase (storia US4).
    return <PassiRecupero onFine={() => router.replace('/home/')} />;
  }

  if (!config) {
    return errore ? (
      <MessageBar intent="error">
        <MessageBarBody>{errore}</MessageBarBody>
      </MessageBar>
    ) : (
      <Spinner label={messaggi.generico.caricamento} />
    );
  }

  return (
    <form className={s.blocco} onSubmit={conferma} noValidate>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'QR e app di autenticazione',
          testo:
            "Google Authenticator è un'app gratuita per il telefono. Aprila, tocca «+», scegli «Scansiona un codice QR» e inquadra il quadrato qui sotto. Comparirà la voce «Fiscal» con un numero di 6 cifre.",
          esempio:
            'Se stai usando Fiscal proprio dal telefono e non puoi inquadrare, scegli «Inserisci una chiave di configurazione» e copia la chiave scritta sotto il QR.',
        }}
      >
        <Text weight="semibold">1. Inquadra il QR con Google Authenticator</Text>
      </ConAiuto>
      {/* Il QR arriva da Supabase come immagine SVG incorporata (data:): consentita dalla CSP img-src. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.qr} src={config.qr} alt="Codice QR da inquadrare con Google Authenticator" />
      <Text size={200}>Oppure scrivi a mano questa chiave:</Text>
      <Text className={s.chiave}>{config.chiave}</Text>
      <ConAiuto
        aiuto={{
          argomento: 'primo codice',
          testo:
            'Serve a controllare che il telefono e Fiscal siano collegati bene. Da qui in poi, a ogni accesso, ti chiederemo questo codice dopo la password.',
        }}
      >
        <Field label="2. Scrivi il codice a 6 cifre che vedi nell'app" required className={s.campo}>
          <Input
            input={{ className: s.codice }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={codice}
            onChange={(_, d) => setCodice(d.value)}
            size="large"
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
        {invio ? 'Controllo…' : 'Conferma e entra'}
      </Button>
    </form>
  );
}
