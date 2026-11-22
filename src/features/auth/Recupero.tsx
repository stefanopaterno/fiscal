'use client';

import {
  Button,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { chiamaRecupero, type RichiestaRipristino } from '@/features/recupero/api';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';

/**
 * Recupero dell'accesso (T071, storia 4). Si arriva qui dopo la password (sessione aal1).
 * Due strade: un codice di recupero (subito) oppure la frase (dopo 48 ore, con avviso via e-mail).
 */
const useStili = makeStyles({
  blocco: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  codice: { fontFamily: tokens.fontFamilyMonospace, letterSpacing: '0.1em' },
  pulsante: { minHeight: '44px' },
  link: {
    color: tokens.colorBrandForegroundLink,
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

function tempoMancante(fino: string, adesso: number): string {
  const ms = new Date(fino).getTime() - adesso;
  if (ms <= 0) return 'adesso';
  const ore = Math.floor(ms / 3_600_000);
  const minuti = Math.floor((ms % 3_600_000) / 60_000);
  return ore > 0 ? `tra ${ore} ore e ${minuti} minuti` : `tra ${minuti} minuti`;
}

export function Recupero() {
  const s = useStili();
  const router = useRouter();
  const [scheda, setScheda] = useState<'codice' | 'frase'>('codice');
  const [richiesta, setRichiesta] = useState<RichiestaRipristino | null | undefined>(undefined);
  const [codice, setCodice] = useState('');
  const [frase, setFrase] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const [adesso, setAdesso] = useState(() => Date.now());

  useEffect(() => {
    let attivo = true;
    void chiamaRecupero<{ richiesta: RichiestaRipristino | null }>('recovery-phrase', {
      azione: 'stato',
    }).then((r) => {
      if (attivo) setRichiesta(r.ok ? r.dati.richiesta : null);
    });
    const timer = setInterval(() => setAdesso(Date.now()), 60_000); // aggiorna il conto alla rovescia
    return () => {
      attivo = false;
      clearInterval(timer);
    };
  }, []);

  async function dopoRimozioneFattore() {
    // Il secondo fattore perso è stato tolto: si configura subito quello nuovo.
    await getSupabase().auth.refreshSession();
    router.replace('/accesso/configura/');
  }

  async function usaCodice(evento: FormEvent) {
    evento.preventDefault();
    setErrore(null);
    setInvio(true);
    const r = await chiamaRecupero('recovery-code', { codice });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.messaggio);
      return;
    }
    await dopoRimozioneFattore();
  }

  async function avviaConFrase(evento: FormEvent) {
    evento.preventDefault();
    setErrore(null);
    setInvio(true);
    const r = await chiamaRecupero<{ richiesta: RichiestaRipristino }>('recovery-phrase', {
      azione: 'avvia',
      frase,
    });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.messaggio);
      return;
    }
    setFrase('');
    setRichiesta(r.dati.richiesta);
  }

  async function completa() {
    setErrore(null);
    setInvio(true);
    const r = await chiamaRecupero('recovery-phrase', { azione: 'completa' });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.messaggio);
      return;
    }
    await dopoRimozioneFattore();
  }

  async function annulla() {
    setInvio(true);
    await chiamaRecupero('recovery-phrase', { azione: 'annulla' });
    setInvio(false);
    setRichiesta(null);
  }

  if (richiesta === undefined) return <Spinner label="Un momento…" />;

  const messaggioErrore = errore ? (
    <MessageBar intent="error">
      <MessageBarBody>{errore}</MessageBarBody>
    </MessageBar>
  ) : null;

  if (richiesta) {
    const pronto = new Date(richiesta.esegui_dopo).getTime() <= adesso;
    return (
      <div className={s.blocco}>
        {messaggioErrore}
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Ripristino in corso</MessageBarTitle>
            {pronto
              ? "L'attesa è finita: puoi completare il ripristino e collegare un telefono nuovo."
              : `Potrai completarlo ${tempoMancante(richiesta.esegui_dopo, adesso)}. Ti abbiamo mandato un'e-mail di avviso.`}
          </MessageBarBody>
        </MessageBar>
        <Button
          appearance="primary"
          size="large"
          className={s.pulsante}
          disabled={!pronto || invio}
          onClick={() => void completa()}
        >
          Completa il ripristino
        </Button>
        <Button className={s.pulsante} disabled={invio} onClick={() => void annulla()}>
          Annulla il ripristino
        </Button>
        <Text size={200}>
          Se ritrovi il telefono, ti basta entrare con password e codice: il ripristino si annulla da solo.
        </Text>
      </div>
    );
  }

  return (
    <div className={s.blocco}>
      <TabList
        selectedValue={scheda}
        onTabSelect={(_, d) => {
          setScheda(d.value as 'codice' | 'frase');
          setErrore(null);
        }}
      >
        <Tab value="codice">Ho un codice di recupero</Tab>
        <Tab value="frase">Uso la frase</Tab>
      </TabList>
      {messaggioErrore}

      {scheda === 'codice' ? (
        <form className={s.blocco} onSubmit={usaCodice} noValidate>
          <ConAiuto
            aiuto={{
              argomento: 'codice di recupero',
              testo:
                'È uno dei 10 codici che hai conservato quando hai collegato il telefono (sul foglio o nel file scaricato). Va bene scritto anche in minuscolo o senza trattini.',
              esempio: 'K7QM-2HXP-ZDTA-4WRN',
            }}
          >
            <Field label="Codice di recupero" required>
              <Input
                input={{ className: s.codice, size: 7 }}
                value={codice}
                onChange={(_, d) => setCodice(d.value)}
                size="large"
                autoComplete="off"
              />
            </Field>
          </ConAiuto>
          <Button
            type="submit"
            appearance="primary"
            size="large"
            className={s.pulsante}
            disabled={invio || codice.length < 16}
          >
            {invio ? 'Controllo…' : 'Usa il codice'}
          </Button>
        </form>
      ) : (
        <form className={s.blocco} onSubmit={avviaConFrase} noValidate>
          <ConAiuto
            aiuto={{
              argomento: 'frase di recupero',
              testo:
                "È la frase che hai scelto per le emergenze. Non ti fa entrare subito: avvia un ripristino che si completa dopo 48 ore, e ti mandiamo un'e-mail di avviso.",
              perche:
                'Se qualcuno scoprisse la frase, avresti 48 ore per accorgertene: ti basta entrare con password e codice e il ripristino si annulla.',
            }}
          >
            <Field label="Frase di recupero" required>
              <Input value={frase} onChange={(_, d) => setFrase(d.value)} size="large" autoComplete="off" />
            </Field>
          </ConAiuto>
          <Button
            type="submit"
            appearance="primary"
            size="large"
            className={s.pulsante}
            disabled={invio || !frase}
          >
            {invio ? 'Controllo…' : 'Avvia il ripristino'}
          </Button>
        </form>
      )}

      <MessageBar intent="info" layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>Hai perso tutto?</MessageBarTitle>
          Se non hai più il telefono, né i codici, né la frase, l&apos;ultima strada è togliere il secondo
          fattore dal pannello di Supabase (Authentication → Users → il tuo utente), entrando con la verifica
          in due passaggi del tuo account Supabase. Poi colleghi un telefono nuovo.
        </MessageBarBody>
      </MessageBar>
      <Collegamento href="/">Torna indietro</Collegamento>
    </div>
  );
}
