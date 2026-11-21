'use client';

import {
  Field,
  Input,
  makeStyles,
  Select,
  Switch,
  Textarea,
  Title3,
  tokens,
  type InputProps,
} from '@fluentui/react-components';
import NextLink from 'next/link';
import { useId, type ReactNode } from 'react';
import { ConAiuto, type ContenutoAiuto } from '@/ui/AiutoContestuale';

/**
 * Mattoni dei moduli di Fiscal (specifica 003): ogni scheda e ogni campo hanno il loro "?"
 * (principio VI, "a prova di non commercialista").
 */
const useStili = makeStyles({
  scheda: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    padding: tokens.spacingHorizontalXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    '@media (max-width: 480px)': { padding: tokens.spacingHorizontalL },
  },
  griglia: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
  },
});

export function Scheda(props: {
  titolo: string;
  aiuto: ContenutoAiuto;
  children: ReactNode;
  azioni?: ReactNode;
}) {
  const s = useStili();
  const id = useId();
  return (
    <section className={s.scheda} aria-labelledby={id}>
      <ConAiuto allineamento="centro" aiuto={props.aiuto}>
        <Title3 as="h2" id={id}>
          {props.titolo}
        </Title3>
      </ConAiuto>
      {props.children}
      {props.azioni}
    </section>
  );
}

/** Campi affiancati su PC, uno sotto l'altro sul telefono. */
export function Griglia({ children }: { children: ReactNode }) {
  const s = useStili();
  return <div className={s.griglia}>{children}</div>;
}

type Comuni = {
  etichetta: string;
  aiuto: ContenutoAiuto;
  obbligatorio?: boolean;
  errore?: string;
  suggerimento?: string;
};

export function CampoTesto(
  props: Comuni & {
    valore: string;
    onChange: (v: string) => void;
    tipo?: InputProps['type'];
    inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel';
    maiuscolo?: boolean;
    segnaposto?: string;
    autoComplete?: string;
    multilinea?: boolean;
  },
) {
  return (
    <ConAiuto aiuto={props.aiuto}>
      <Field
        label={props.etichetta}
        required={props.obbligatorio}
        validationState={props.errore ? 'error' : 'none'}
        validationMessage={props.errore}
        hint={props.suggerimento}
      >
        {props.multilinea ? (
          <Textarea
            value={props.valore}
            placeholder={props.segnaposto}
            onChange={(_, d) => props.onChange(d.value)}
            resize="vertical"
          />
        ) : (
          <Input
            type={props.tipo ?? 'text'}
            value={props.valore}
            placeholder={props.segnaposto}
            autoComplete={props.autoComplete ?? 'off'}
            input={{
              inputMode: props.inputMode,
              autoCapitalize: props.maiuscolo ? 'characters' : undefined,
              spellCheck: false,
            }}
            onChange={(_, d) => props.onChange(props.maiuscolo ? d.value.toUpperCase() : d.value)}
          />
        )}
      </Field>
    </ConAiuto>
  );
}

export function CampoScelta<T extends string>(
  props: Comuni & { valore: T; onChange: (v: T) => void; opzioni: { valore: T; etichetta: string }[] },
) {
  return (
    <ConAiuto aiuto={props.aiuto}>
      <Field
        label={props.etichetta}
        required={props.obbligatorio}
        validationState={props.errore ? 'error' : 'none'}
        validationMessage={props.errore}
        hint={props.suggerimento}
      >
        <Select value={props.valore} onChange={(_, d) => props.onChange(d.value as T)}>
          {props.opzioni.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.etichetta}
            </option>
          ))}
        </Select>
      </Field>
    </ConAiuto>
  );
}

export function CampoSiNo(
  props: Omit<Comuni, 'obbligatorio' | 'errore'> & { valore: boolean; onChange: (v: boolean) => void },
) {
  return (
    <ConAiuto allineamento="centro" aiuto={props.aiuto}>
      <Field hint={props.suggerimento}>
        <Switch
          label={props.etichetta}
          checked={props.valore}
          onChange={(_, d) => props.onChange(d.checked)}
        />
      </Field>
    </ConAiuto>
  );
}

const useStiliCollegamento = makeStyles({
  collegamento: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    color: tokens.colorBrandForegroundLink,
  },
});

/** Collegamento con area toccabile di 44 px (anche dentro i messaggi). */
export function Collegamento({ href, children }: { href: string; children: ReactNode }) {
  const s = useStiliCollegamento();
  return (
    <NextLink href={href} className={s.collegamento}>
      {children}
    </NextLink>
  );
}
