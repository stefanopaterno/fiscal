'use client';

import { Button, makeStyles, Text, tokens } from '@fluentui/react-components';
import { useId, useState, type ReactNode } from 'react';

/**
 * Aiuto contestuale "?" (T024, principio VI, specifica 011).
 * Un pulsante accanto a ogni sezione, numero o campo che apre una spiegazione semplicissima,
 * scritta per chi non è commercialista: cos'è, un esempio, perché serve, da dove viene il numero.
 */
const useStili = makeStyles({
  pulsante: {
    minWidth: '44px',
    minHeight: '44px',
    padding: 0,
  },
  cerchio: {
    width: '22px',
    height: '22px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1.5px solid ${tokens.colorBrandForeground1}`,
    color: tokens.colorBrandForeground1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase200,
  },
  pannello: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground1,
  },
});

export type ContenutoAiuto = {
  /** Di cosa parla, per l'etichetta del pulsante (es. "netto reale"). */
  argomento: string;
  /** La spiegazione in parole semplici. */
  testo: ReactNode;
  esempio?: ReactNode;
  perche?: ReactNode;
  daDove?: ReactNode;
};

/** Il pulsante "?" e il suo pannello. Il pannello va messo dove serve con `PannelloAiuto`. */
export function useAiuto(iniziale = false) {
  const [aperto, setAperto] = useState(iniziale);
  const id = useId();
  return { aperto, alterna: () => setAperto((a) => !a), idPannello: `aiuto-${id}` };
}

export function PulsanteAiuto(props: { argomento: string; aperto: boolean; alterna: () => void; idPannello: string }) {
  const s = useStili();
  return (
    <Button
      appearance="transparent"
      className={s.pulsante}
      aria-label={`Aiuto: ${props.argomento}`}
      aria-expanded={props.aperto}
      aria-controls={props.idPannello}
      onClick={props.alterna}
    >
      <span className={s.cerchio} aria-hidden="true">
        ?
      </span>
    </Button>
  );
}

export function PannelloAiuto(props: ContenutoAiuto & { aperto: boolean; idPannello: string }) {
  const s = useStili();
  if (!props.aperto) return null;
  return (
    <div id={props.idPannello} role="note" className={s.pannello}>
      <Text weight="semibold">In parole semplici</Text>
      <Text>{props.testo}</Text>
      {props.esempio ? (
        <Text>
          <Text weight="semibold">Esempio: </Text>
          {props.esempio}
        </Text>
      ) : null}
      {props.perche ? (
        <Text>
          <Text weight="semibold">Perché te lo chiediamo: </Text>
          {props.perche}
        </Text>
      ) : null}
      {props.daDove ? (
        <Text>
          <Text weight="semibold">Da dove viene questo numero: </Text>
          {props.daDove}
        </Text>
      ) : null}
    </div>
  );
}

/** Versione compatta: pulsante e pannello insieme, uno sotto l'altro. */
export function AiutoContestuale(props: ContenutoAiuto & { apertoAllInizio?: boolean }) {
  const { aperto, alterna, idPannello } = useAiuto(props.apertoAllInizio);
  return (
    <>
      <PulsanteAiuto argomento={props.argomento} aperto={aperto} alterna={alterna} idPannello={idPannello} />
      <PannelloAiuto {...props} aperto={aperto} idPannello={idPannello} />
    </>
  );
}
