'use client';

import {
  Button,
  Checkbox,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { ConAiuto } from '@/ui/AiutoContestuale';

/**
 * I codici di recupero, mostrati UNA sola volta (FR-008, T070). L'utente li copia, scarica o stampa
 * e conferma di averli conservati: solo allora si può proseguire.
 */
const useStili = makeStyles({
  blocco: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  griglia: {
    margin: 0,
    padding: tokens.spacingHorizontalL,
    listStyleType: 'none',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase400,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  pulsanti: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  pulsante: { minHeight: '44px' },
});

export function MostraCodici({ codici, onConfermato }: { codici: string[]; onConfermato: () => void }) {
  const s = useStili();
  const [conservati, setConservati] = useState(false);
  const [copiato, setCopiato] = useState(false);
  const [invio, setInvio] = useState(false);
  const testo = ['Fiscal · codici di recupero (ognuno vale una volta sola)', '', ...codici].join('\n');

  function scarica() {
    const url = URL.createObjectURL(new Blob([testo], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiscal-codici-di-recupero.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function conferma() {
    setInvio(true);
    await getSupabase().rpc('conferma_codici_conservati');
    setInvio(false);
    onConfermato();
  }

  return (
    <div className={s.blocco}>
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'codici di recupero',
          testo:
            'Sono 10 chiavi di emergenza. Se perdi il telefono con Google Authenticator, ne usi una al posto del codice a 6 cifre e colleghi un telefono nuovo. Ognuna vale una volta sola.',
          esempio:
            'Stampali e mettili con i documenti importanti, oppure scrivili su un foglio. Non tenerli solo sul telefono: se perdi il telefono perdi anche loro.',
        }}
      >
        <Text weight="semibold">Conserva i codici di recupero</Text>
      </ConAiuto>
      <MessageBar intent="warning">
        <MessageBarBody>
          Li vedi solo adesso. Fiscal non li conserva e non potrà mostrarteli di nuovo.
        </MessageBarBody>
      </MessageBar>
      <ol className={s.griglia} aria-label="Codici di recupero">
        {codici.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      <div className={s.pulsanti}>
        <Button
          className={s.pulsante}
          onClick={() => {
            void navigator.clipboard.writeText(testo).then(() => setCopiato(true));
          }}
        >
          {copiato ? 'Copiati' : 'Copia'}
        </Button>
        <Button className={s.pulsante} onClick={scarica}>
          Scarica file
        </Button>
        <Button className={s.pulsante} onClick={() => window.print()}>
          Stampa
        </Button>
      </div>
      <Checkbox
        checked={conservati}
        onChange={(_, d) => setConservati(d.checked === true)}
        label="Li ho conservati in un posto sicuro, fuori da questo telefono."
      />
      <Button
        appearance="primary"
        size="large"
        className={s.pulsante}
        disabled={!conservati || invio}
        onClick={() => void conferma()}
      >
        Continua
      </Button>
    </div>
  );
}
