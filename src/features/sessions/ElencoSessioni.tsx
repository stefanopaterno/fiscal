'use client';

import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  Title3,
  tokens,
} from '@fluentui/react-components';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { etichettaDispositivo } from './etichetta';

/**
 * Dispositivi connessi (T055, FR-007): elenco delle sessioni con "Chiudi" per quelle degli altri dispositivi.
 * La sessione di questo dispositivo si chiude con "Esci".
 */
type Sessione = {
  id: string;
  creata_il: string;
  ultimo_uso: string | null;
  browser: string | null;
  corrente: boolean;
};

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
  elenco: { margin: 0, padding: 0, listStyleType: 'none', display: 'flex', flexDirection: 'column' },
  riga: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} 0`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  dettagli: { display: 'flex', flexDirection: 'column' },
  corrente: { color: tokens.colorPaletteGreenForeground1 },
  pulsante: { minHeight: '44px' },
});

const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

async function leggiSessioni(): Promise<Sessione[] | null> {
  const { data: righe, error } = await getSupabase().rpc('mie_sessioni');
  return error ? null : ((righe ?? []) as Sessione[]);
}

export function ElencoSessioni() {
  const s = useStili();
  const [sessioni, setSessioni] = useState<Sessione[] | null | undefined>(undefined);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const ricarica = useCallback(() => void leggiSessioni().then(setSessioni), []);

  useEffect(() => {
    let vivo = true;
    void leggiSessioni().then((r) => {
      if (vivo) setSessioni(r);
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function chiudi(id: string) {
    const { data: chiusa } = await getSupabase().rpc('chiudi_mia_sessione', { p_id: id });
    setMessaggio(
      chiusa
        ? 'Sessione chiusa. Su quel dispositivo serviranno di nuovo password e codice (entro 15 minuti al massimo).'
        : 'Non è stato possibile chiudere la sessione.',
    );
    ricarica();
  }

  return (
    <section className={s.sezione} aria-labelledby="titolo-sessioni">
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'dispositivi connessi',
          testo:
            'Sono i telefoni e i computer da cui sei entrato in Fiscal. Se ne vedi uno che non riconosci, chiudilo: da lì serviranno di nuovo password e codice.',
          esempio: 'Hai usato Fiscal dal computer di un amico? Chiudi quella sessione da qui.',
        }}
      >
        <Title3 as="h2" id="titolo-sessioni">
          Dispositivi connessi
        </Title3>
      </ConAiuto>
      {messaggio ? (
        <MessageBar intent="info">
          <MessageBarBody>{messaggio}</MessageBarBody>
        </MessageBar>
      ) : null}
      {sessioni === undefined ? (
        <Spinner size="small" label="Un momento…" />
      ) : sessioni === null ? (
        <Text>Non riesco a leggere l&apos;elenco adesso. Riprova tra poco.</Text>
      ) : (
        <ul className={s.elenco} aria-label="Sessioni attive">
          {sessioni.map((sess) => (
            <li key={sess.id} className={s.riga}>
              <div className={s.dettagli}>
                <Text weight="semibold">{etichettaDispositivo(sess.browser)}</Text>
                {sess.corrente ? (
                  <Text size={200} className={s.corrente}>
                    Questo dispositivo
                  </Text>
                ) : (
                  <Text size={200}>Ultimo uso: {data(sess.ultimo_uso ?? sess.creata_il)}</Text>
                )}
              </div>
              {sess.corrente ? null : (
                <Button className={s.pulsante} onClick={() => void chiudi(sess.id)}>
                  Chiudi
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
