'use client';

import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Text,
  Title3,
  tokens,
} from '@fluentui/react-components';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useVerificaRecente } from '@/features/auth/useVerificaRecente';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { chiamaRecupero } from './api';
import { ImpostaFrase } from './ImpostaFrase';
import { MostraCodici } from './MostraCodici';

/**
 * Sezione "Recupero dell'accesso" nelle impostazioni di sicurezza (storia US4):
 * quanti codici restano, generarne di nuovi, impostare o cambiare la frase.
 * Serve anche a chi ha collegato il telefono prima che esistesse il recupero.
 */
async function leggiStato(): Promise<{ residui: number; frase: boolean }> {
  const supabase = getSupabase();
  const [r, f] = await Promise.all([
    supabase.rpc('codici_recupero_residui'),
    supabase.from('user_security').select('frase_recupero_impostata_il').maybeSingle(),
  ]);
  return {
    residui: typeof r.data === 'number' ? r.data : 0,
    frase: Boolean(f.data?.frase_recupero_impostata_il),
  };
}

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
  pulsante: { minHeight: '44px' },
});

export function SezioneRecupero() {
  const s = useStili();
  const { chiedi, finestra } = useVerificaRecente();
  const [residui, setResidui] = useState<number | null>(null);
  const [fraseImpostata, setFraseImpostata] = useState<boolean | null>(null);
  const [codiciNuovi, setCodiciNuovi] = useState<string[] | null>(null);
  const [modificaFrase, setModificaFrase] = useState(false);
  const [messaggio, setMessaggio] = useState<{ tipo: 'success' | 'error'; testo: string } | null>(null);

  const applica = useCallback((stato: { residui: number; frase: boolean }) => {
    setResidui(stato.residui);
    setFraseImpostata(stato.frase);
  }, []);
  const carica = useCallback(() => void leggiStato().then(applica), [applica]);

  useEffect(() => {
    let attivo = true;
    void leggiStato().then((stato) => {
      if (attivo) applica(stato);
    });
    return () => {
      attivo = false;
    };
  }, [applica]);

  async function generaCodici() {
    setMessaggio(null);
    // Nuovi codici al posto di quelli esistenti: operazione sensibile, serve la verifica recente.
    if (residui && !(await chiedi())) return;
    const r = await chiamaRecupero<{ codici?: string[] }>('recovery-codes', {
      azione: residui ? 'rigenera' : 'genera',
    });
    if (!r.ok) {
      setMessaggio({
        tipo: 'error',
        testo:
          r.errore === 'verifica_recente'
            ? 'La conferma è scaduta: riprova e scrivi di nuovo password e codice.'
            : r.messaggio,
      });
      return;
    }
    if (r.dati.codici) setCodiciNuovi(r.dati.codici);
  }

  if (codiciNuovi) {
    return (
      <section className={s.sezione}>
        <MostraCodici
          codici={codiciNuovi}
          onConfermato={() => {
            setCodiciNuovi(null);
            setMessaggio({ tipo: 'success', testo: 'Nuovi codici pronti: quelli vecchi non valgono più.' });
            carica();
          }}
        />
      </section>
    );
  }

  return (
    <section className={s.sezione} aria-labelledby="titolo-recupero">
      {finestra}
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: "recupero dell'accesso",
          testo:
            'Sono le tue chiavi di emergenza se perdi il telefono: i codici di recupero (si usano subito, una volta ciascuno) e la frase di recupero (avvia un ripristino che si completa dopo 48 ore).',
        }}
      >
        <Title3 as="h2" id="titolo-recupero">
          Recupero dell&apos;accesso
        </Title3>
      </ConAiuto>
      {messaggio ? (
        <MessageBar intent={messaggio.tipo}>
          <MessageBarBody>{messaggio.testo}</MessageBarBody>
        </MessageBar>
      ) : null}
      {residui === 0 ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            Non hai codici di recupero: se perdessi il telefono non potresti rientrare. Generali adesso.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <div className={s.riga}>
        <Text>
          Codici di recupero: <strong>{residui ?? '…'}</strong> su 10 ancora validi
        </Text>
        <Button className={s.pulsante} onClick={() => void generaCodici()}>
          {residui ? 'Generane di nuovi' : 'Genera i codici'}
        </Button>
      </div>
      <div className={s.riga}>
        <Text>
          Frase di recupero: {fraseImpostata === null ? '…' : fraseImpostata ? 'impostata' : 'non impostata'}
        </Text>
        <Button
          className={s.pulsante}
          onClick={() => {
            // Cambiare una frase già impostata richiede la verifica recente.
            void (async () => {
              if (!fraseImpostata || (await chiedi())) setModificaFrase(true);
            })();
          }}
        >
          {fraseImpostata ? 'Cambia la frase' : 'Imposta la frase'}
        </Button>
      </div>
      {modificaFrase ? (
        <ImpostaFrase
          onFatto={() => {
            setModificaFrase(false);
            setMessaggio({ tipo: 'success', testo: 'Frase di recupero salvata.' });
            carica();
          }}
          onSalta={() => setModificaFrase(false)}
        />
      ) : null}
    </section>
  );
}
