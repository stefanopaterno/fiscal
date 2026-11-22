'use client';

import {
  Button,
  makeStyles,
  mergeClasses,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useState, type ReactNode } from 'react';

/**
 * Aiuto contestuale "?" (T024, principio VI, specifica 011).
 * Un pulsante accanto a ogni sezione, numero o campo che apre un fumetto con una spiegazione
 * semplicissima, scritta per chi non è commercialista: cos'è, un esempio, perché serve, da dove viene.
 * Il fumetto si apre SOPRA la pagina (non sposta gli altri elementi) e si chiude toccando fuori,
 * con Esc o quando il pulsante perde il focus.
 */
const useStili = makeStyles({
  pulsante: {
    minWidth: '44px',
    minHeight: '44px',
    padding: 0,
    flexShrink: 0,
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
  fumetto: {
    maxWidth: 'min(340px, calc(100vw - 24px))',
    boxSizing: 'border-box',
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

/** Il pulsante "?" con il suo fumetto. */
export function BollaAiuto(props: ContenutoAiuto & { apertoAllInizio?: boolean }) {
  const s = useStili();
  const [aperto, setAperto] = useState(props.apertoAllInizio ?? false);
  return (
    <Popover
      open={aperto}
      onOpenChange={(_, d) => setAperto(d.open)}
      withArrow
      positioning={{
        position: 'above',
        align: 'end',
        fallbackPositions: ['below-end', 'before', 'after'],
        overflowBoundaryPadding: 12,
      }}
    >
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="transparent"
          className={s.pulsante}
          aria-label={`Aiuto: ${props.argomento}`}
          aria-expanded={aperto}
          onBlur={() => setAperto(false)}
        >
          <span className={s.cerchio} aria-hidden="true">
            ?
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverSurface className={s.fumetto} role="note" aria-label={`Spiegazione: ${props.argomento}`}>
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
      </PopoverSurface>
    </Popover>
  );
}

const useStiliConAiuto = makeStyles({
  riga: { display: 'flex', gap: tokens.spacingHorizontalXS, minWidth: 0 },
  fine: { alignItems: 'flex-end' },
  centro: { alignItems: 'center' },
  contenuto: { flexGrow: 1, minWidth: 0 },
});

/** Un elemento (campo, titolo, numero) con il suo "?" accanto. È il modo standard di mettere gli aiuti. */
export function ConAiuto(props: {
  aiuto: ContenutoAiuto;
  children: ReactNode;
  allineamento?: 'fine' | 'centro';
  apertoAllInizio?: boolean;
}) {
  const s = useStiliConAiuto();
  return (
    <div className={mergeClasses(s.riga, props.allineamento === 'centro' ? s.centro : s.fine)}>
      <div className={s.contenuto}>{props.children}</div>
      <BollaAiuto {...props.aiuto} apertoAllInizio={props.apertoAllInizio} />
    </div>
  );
}

/** Solo il "?" con il fumetto, da mettere dove serve. */
export function AiutoContestuale(props: ContenutoAiuto & { apertoAllInizio?: boolean }) {
  return <BollaAiuto {...props} />;
}
