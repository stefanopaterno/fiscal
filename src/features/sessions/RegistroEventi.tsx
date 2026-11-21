'use client';

import { makeStyles, Text, Title3, tokens } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';

/**
 * Registro di sicurezza (T088): gli ultimi eventi dell'account, senza contenuti (data-model.md, security_events.tipo).
 */
const DESCRIZIONI: Record<string, { testo: string; attenzione?: boolean }> = {
  login_ok: { testo: 'Accesso' },
  sessione_chiusa: { testo: 'Sessione chiusa' },
  mfa_configurato: { testo: 'Telefono collegato' },
  password_cambiata: { testo: 'Password cambiata' },
  sblocco_rapido_attivato: { testo: 'Sblocco rapido attivato' },
  sblocco_rapido_disattivato: { testo: 'Sblocco rapido disattivato' },
  codici_generati: { testo: 'Codici di recupero creati' },
  codici_rigenerati: { testo: 'Codici di recupero rinnovati' },
  codice_recupero_usato: { testo: 'Usato un codice di recupero', attenzione: true },
  codice_recupero_errato: { testo: 'Codice di recupero sbagliato', attenzione: true },
  frase_avviata: { testo: 'Ripristino avviato con la frase', attenzione: true },
  frase_annullata: { testo: 'Ripristino annullato' },
  frase_completata: { testo: 'Ripristino completato con la frase', attenzione: true },
  frase_errata: { testo: 'Frase di recupero sbagliata', attenzione: true },
};

type Evento = { id: string; tipo: string; avvenuto_il: string; dispositivo: string | null };

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
  elenco: { margin: 0, padding: 0, listStyleType: 'none' },
  riga: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} 0`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  attenzione: { color: tokens.colorPaletteDarkOrangeForeground1, fontWeight: tokens.fontWeightSemibold },
  secondario: { color: tokens.colorNeutralForeground3 },
});

export function RegistroEventi() {
  const s = useStili();
  const [eventi, setEventi] = useState<Evento[] | null>(null);

  useEffect(() => {
    let vivo = true;
    void getSupabase()
      .from('security_events')
      .select('id, tipo, avvenuto_il, dispositivo')
      .order('avvenuto_il', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (vivo) setEventi((data ?? []) as Evento[]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <section className={s.sezione} aria-labelledby="titolo-registro">
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'registro di sicurezza',
          testo:
            'È il diario degli ultimi movimenti sul tuo account: accessi, telefono collegato, codici usati. Se vedi qualcosa in arancione che non hai fatto tu, cambia subito password e frase di recupero.',
        }}
      >
        <Title3 as="h2" id="titolo-registro">
          Registro di sicurezza
        </Title3>
      </ConAiuto>
      {eventi === null ? null : eventi.length === 0 ? (
        <Text>Nessun evento ancora.</Text>
      ) : (
        <ul className={s.elenco} aria-label="Ultimi eventi di sicurezza">
          {eventi.map((e) => {
            const d = DESCRIZIONI[e.tipo] ?? { testo: e.tipo };
            return (
              <li key={e.id} className={s.riga}>
                <Text className={d.attenzione ? s.attenzione : undefined}>{d.testo}</Text>
                <Text size={200} className={s.secondario}>
                  {new Date(e.avvenuto_il).toLocaleString('it-IT', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                  {e.dispositivo ? ` · ${e.dispositivo}` : ''}
                </Text>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
