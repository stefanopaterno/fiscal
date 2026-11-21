'use client';

import {
  Button,
  Checkbox,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  tokens,
} from '@fluentui/react-components';
import { useState } from 'react';

/**
 * Avviso prima di un'esportazione o di un backup NON cifrato (T091, FR-018).
 * Da usare in ogni funzione che scarica dati senza protezione (es. foglio di calcolo in chiaro):
 * l'esportazione parte solo dopo che l'utente ha confermato di aver capito il rischio.
 */
const useStili = makeStyles({
  blocco: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  pulsanti: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  pulsante: { minHeight: '44px' },
});

export function AvvisoExportInChiaro(props: {
  /** Cosa si sta per scaricare, in parole semplici (es. "le fatture del 2027 in un foglio Excel"). */
  cosa: string;
  onConferma: () => void;
  onAnnulla: () => void;
}) {
  const s = useStili();
  const [capito, setCapito] = useState(false);
  return (
    <div className={s.blocco} role="alertdialog" aria-label="Esportazione senza protezione">
      <MessageBar intent="warning" layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>Il file non sarà protetto da password</MessageBarTitle>
          Stai per scaricare {props.cosa} in chiaro: chiunque apra il file (o trovi il telefono o il computer
          sbloccato) può leggerlo, compresi eventuali nomi dei pazienti. Se puoi, scegli l&apos;esportazione
          protetta. Se lo scarichi così, non mandarlo per e-mail o messaggi e cancellalo quando non serve più.
        </MessageBarBody>
      </MessageBar>
      <Checkbox
        checked={capito}
        onChange={(_, d) => setCapito(d.checked === true)}
        label="Ho capito: il file non è protetto e ne sono responsabile."
      />
      <div className={s.pulsanti}>
        <Button appearance="primary" className={s.pulsante} disabled={!capito} onClick={props.onConferma}>
          Scarica comunque
        </Button>
        <Button className={s.pulsante} onClick={props.onAnnulla}>
          Annulla
        </Button>
      </div>
    </div>
  );
}
