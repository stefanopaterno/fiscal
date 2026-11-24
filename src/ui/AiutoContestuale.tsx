'use client';

import {
  Badge,
  Button,
  Link,
  makeStyles,
  mergeClasses,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useRef, useState, type ReactNode } from 'react';
import { trovaTermini, voce } from '@/engine/regole/glossario';
import { usePreferenzeAiuto } from '@/features/aiuto/preferenze';
import { useOcchio } from '@/features/lock/useOcchio';
import { annoCorrente } from '@/lib/oggi';

/**
 * Aiuto contestuale "?" (T024, principio VI, specifica 011).
 * Un pulsante accanto a ogni sezione, numero o campo che apre un fumetto con una spiegazione semplicissima.
 * Due livelli (FR-007): breve (spiegazione ed esempio) e «Dettagli» (perché, da dove viene il numero, passi del
 * calcolo, fonte e stato di verifica, avvertenza). I termini del glossario nel testo sono toccabili (FR-006).
 * Il fumetto si apre SOPRA la pagina (non sposta gli altri elementi) e si chiude toccando fuori, con Esc o
 * quando il focus esce dal pulsante e dal fumetto.
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
    maxHeight: 'min(70vh, 520px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground1,
  },
  termine: {
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    color: tokens.colorBrandForegroundLink,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textUnderlineOffset: '3px',
    cursor: 'pointer',
  },
  definizione: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  passi: { margin: 0, paddingLeft: tokens.spacingHorizontalXL },
  nota: { color: tokens.colorNeutralForeground3 },
  dettagli: { alignSelf: 'flex-start', minHeight: '32px' },
});

export type ContenutoAiuto = {
  /** Di cosa parla, per l'etichetta del pulsante (es. "netto reale"). */
  argomento: string;
  /** La spiegazione in parole semplici (livello breve). */
  testo: ReactNode;
  esempio?: ReactNode;
  /** Livello dettagliato. */
  perche?: ReactNode;
  daDove?: ReactNode;
  dettaglio?: ReactNode;
  /** «Da dove viene questo numero?»: i passaggi del calcolo, con i numeri (oscurati dall'occhio). */
  passi?: ReactNode[];
  /** Fonte normativa e stato di verifica della regola usata. */
  fonte?: string;
  daVerificare?: boolean;
};

/** Importi in euro con i centesimi (i numeri dell'utente): con l'occhio chiuso diventano «•••• €» (FR-012). */
const IMPORTO = /[−-]?\d{1,3}(?:\.\d{3})*,\d{2}\s?€/g;

/** Testo con i termini del glossario toccabili. */
function TestoConTermini({ testo, onTermine }: { testo: ReactNode; onTermine: (id: string) => void }) {
  const s = useStili();
  const { nascosto } = useOcchio();
  if (typeof testo !== 'string') return <>{testo}</>;
  const visibile = nascosto ? testo.replace(IMPORTO, '•••• €') : testo;
  return (
    <>
      {trovaTermini(visibile).map((p, i) =>
        p.id ? (
          <button key={i} type="button" className={s.termine} onClick={() => onTermine(p.id!)} aria-label={`Cosa vuol dire «${p.testo}»`}>
            {p.testo}
          </button>
        ) : (
          <span key={i}>{p.testo}</span>
        ),
      )}
    </>
  );
}

/** Il pulsante "?" con il suo fumetto. */
export function BollaAiuto(props: ContenutoAiuto & { apertoAllInizio?: boolean }) {
  const s = useStili();
  const [preferenze] = usePreferenzeAiuto();
  const [aperto, setAperto] = useState(props.apertoAllInizio ?? false);
  const [dettagli, setDettagli] = useState<boolean | null>(null);
  const [termine, setTermine] = useState<string | null>(null);
  const superficie = useRef<HTMLDivElement>(null);
  const haDettagli = Boolean(props.perche || props.daDove || props.dettaglio || props.passi?.length || props.fonte);
  const mostraDettagli = haDettagli && (dettagli ?? preferenze.livello === 'dettagliato');
  const v = termine ? voce(termine) : undefined;
  const esempioTermine = v ? v.esempio(annoCorrente()) : '';

  return (
    <Popover
      open={aperto}
      onOpenChange={(_, d) => {
        setAperto(d.open);
        if (!d.open) {
          setTermine(null);
          setDettagli(null);
        }
      }}
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
          onBlur={(e) => {
            // si chiude solo se il focus esce anche dal fumetto (toccare «Dettagli» o un termine lo lascia aperto)
            if (!superficie.current?.contains(e.relatedTarget as Node | null)) setAperto(false);
          }}
        >
          <span className={s.cerchio} aria-hidden="true">
            ?
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverSurface ref={superficie} className={s.fumetto} role="note" aria-label={`Spiegazione: ${props.argomento}`}>
        <Text weight="semibold">In parole semplici</Text>
        <Text>
          <TestoConTermini testo={props.testo} onTermine={setTermine} />
        </Text>
        {props.esempio ? (
          <Text>
            <Text weight="semibold">Esempio: </Text>
            {props.esempio}
          </Text>
        ) : null}
        {v ? (
          <div className={s.definizione} role="region" aria-label={`Glossario: ${v.termine}`}>
            <Text weight="semibold">{v.termine}</Text>
            <Text size={200}>{v.definizione}</Text>
            {esempioTermine ? <Text size={200}>Esempio: {esempioTermine}</Text> : null}
          </div>
        ) : null}
        {mostraDettagli ? (
          <>
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
            {props.passi?.length ? (
              <>
                <Text weight="semibold">Il calcolo, passo per passo</Text>
                <ol className={s.passi}>
                  {props.passi.map((p, i) => (
                    <li key={i}>
                      <Text size={200}>{p}</Text>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            {props.dettaglio ? <Text>{props.dettaglio}</Text> : null}
            {props.fonte ? (
              <Text size={200} className={s.nota}>
                Fonte: {props.fonte}{' '}
                {props.daVerificare ? (
                  <Badge appearance="tint" color="warning" size="small">
                    da verificare
                  </Badge>
                ) : null}
              </Text>
            ) : null}
            <Text size={200} className={s.nota}>
              È una spiegazione di supporto, non una consulenza fiscale.{' '}
              <Link href="/app/aiuto/" inline>
                Glossario e guide
              </Link>
            </Text>
          </>
        ) : null}
        {haDettagli ? (
          <Button appearance="subtle" size="small" className={s.dettagli} onClick={() => setDettagli(!mostraDettagli)}>
            {mostraDettagli ? 'Meno dettagli' : 'Dettagli'}
          </Button>
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
