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
import { useState, type FormEvent } from 'react';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { chiamaRecupero, fraseAccettabile } from './api';

/** Impostazione della frase di recupero (FR-023, T070). La frase non viene mai salvata in chiaro. */
const useStili = makeStyles({
  modulo: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  pulsante: { minHeight: '44px' },
  nota: { color: tokens.colorNeutralForeground3 },
});

export function ImpostaFrase({ onFatto, onSalta }: { onFatto: () => void; onSalta?: () => void }) {
  const s = useStili();
  const [frase, setFrase] = useState('');
  const [ripeti, setRipeti] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const valida = fraseAccettabile(frase);
  const uguali =
    frase.trim().toLowerCase().replace(/\s+/g, ' ') === ripeti.trim().toLowerCase().replace(/\s+/g, ' ');

  async function salva(evento: FormEvent) {
    evento.preventDefault();
    setErrore(null);
    setInvio(true);
    const r = await chiamaRecupero<{ impostata: boolean }>('recovery-phrase', { azione: 'imposta', frase });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.messaggio);
      return;
    }
    onFatto();
  }

  return (
    <form className={s.modulo} onSubmit={salva} noValidate>
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'frase di recupero',
          testo:
            "È l'ultima chiave di emergenza, per quando hai perso sia il telefono sia i codici. Non ti fa entrare subito: avvia un ripristino che parte dopo 48 ore, e ti avvisiamo via e-mail.",
          esempio: 'Una frase che ricordi solo tu, come «la nonna faceva le lasagne la domenica a pranzo».',
          perche:
            "L'attesa di 48 ore serve a proteggerti: se qualcuno scoprisse la frase, avresti il tempo di accorgertene ed entrare tu, e il ripristino si annullerebbe.",
        }}
      >
        <Text weight="semibold">Scegli una frase di recupero</Text>
      </ConAiuto>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      <Field
        label="Frase di recupero"
        required
        validationState={frase && !valida ? 'warning' : 'none'}
        validationMessage={
          frase && !valida ? 'Ancora troppo corta: almeno 6 parole o 24 caratteri.' : undefined
        }
      >
        <Input value={frase} onChange={(_, d) => setFrase(d.value)} size="large" autoComplete="off" />
      </Field>
      <Field
        label="Scrivila di nuovo"
        required
        validationState={ripeti && !uguali ? 'error' : 'none'}
        validationMessage={ripeti && !uguali ? 'Le due frasi sono diverse.' : undefined}
      >
        <Input value={ripeti} onChange={(_, d) => setRipeti(d.value)} size="large" autoComplete="off" />
      </Field>
      <Text size={200} className={s.nota}>
        Maiuscole e spazi in più non contano. Non usare frasi famose o che si trovano su internet.
      </Text>
      <Button
        type="submit"
        appearance="primary"
        size="large"
        className={s.pulsante}
        disabled={!valida || !uguali || invio}
      >
        {invio ? 'Salvataggio…' : 'Salva la frase'}
      </Button>
      {onSalta ? (
        <Button appearance="subtle" className={s.pulsante} onClick={onSalta}>
          Lo faccio dopo dalle impostazioni
        </Button>
      ) : null}
    </form>
  );
}
