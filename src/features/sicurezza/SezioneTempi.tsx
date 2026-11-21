'use client';

import {
  Field,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Select,
  Title3,
  tokens,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';

/**
 * Tempi di blocco e di accesso completo (T087, FR-010), nei limiti di data-model.md:
 * user_security.blocco_minuti (1–60) e user_security.accesso_completo_giorni (1–30).
 */
const OPZIONI_BLOCCO = [1, 5, 10, 15, 30, 60];
const OPZIONI_GIORNI = [1, 7, 14, 30];

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
});

export function SezioneTempi() {
  const s = useStili();
  const [blocco, setBlocco] = useState<number | null>(null);
  const [giorni, setGiorni] = useState<number | null>(null);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    let vivo = true;
    void getSupabase()
      .from('user_security')
      .select('blocco_minuti, accesso_completo_giorni')
      .maybeSingle()
      .then(({ data }) => {
        if (vivo && data) {
          setBlocco(data.blocco_minuti);
          setGiorni(data.accesso_completo_giorni);
        }
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function salva(campo: 'blocco_minuti' | 'accesso_completo_giorni', valore: number) {
    setSalvato(false);
    const { error } = await getSupabase()
      .from('user_security')
      .update({ [campo]: valore })
      .not('owner_id', 'is', null);
    if (!error) setSalvato(true);
  }

  return (
    <section className={s.sezione} aria-labelledby="titolo-tempi">
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'tempi di blocco',
          testo:
            "«Blocca dopo»: quanti minuti senza toccare niente prima che Fiscal si blocchi. «Password e codice ogni»: dopo quanti giorni lo sblocco con il volto o l'impronta non basta più e ti chiediamo di nuovo tutto.",
          esempio: 'Più corti = più sicuro ma più scomodo. I valori consigliati sono 5 minuti e 14 giorni.',
        }}
      >
        <Title3 as="h2" id="titolo-tempi">
          Blocco automatico
        </Title3>
      </ConAiuto>
      {salvato ? (
        <MessageBar intent="success">
          <MessageBarBody>Salvato. Vale dal prossimo accesso.</MessageBarBody>
        </MessageBar>
      ) : null}
      <Field label="Blocca dopo">
        <Select
          value={blocco === null ? '' : String(blocco)}
          disabled={blocco === null}
          onChange={(_, d) => {
            setBlocco(Number(d.value));
            void salva('blocco_minuti', Number(d.value));
          }}
        >
          {OPZIONI_BLOCCO.map((m) => (
            <option key={m} value={m}>
              {m === 1 ? '1 minuto' : `${m} minuti`}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Password e codice ogni">
        <Select
          value={giorni === null ? '' : String(giorni)}
          disabled={giorni === null}
          onChange={(_, d) => {
            setGiorni(Number(d.value));
            void salva('accesso_completo_giorni', Number(d.value));
          }}
        >
          {OPZIONI_GIORNI.map((g) => (
            <option key={g} value={g}>
              {g === 1 ? '1 giorno' : `${g} giorni`}
            </option>
          ))}
        </Select>
      </Field>
    </section>
  );
}
