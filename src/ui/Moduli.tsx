'use client';

import {
  Field,
  Input,
  type InputProps,
  Link,
  makeStyles,
  mergeClasses,
  Select,
  Switch,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components';
import {
  DatePicker,
  defaultDatePickerStrings,
  type CalendarStrings,
} from '@fluentui/react-datepicker-compat';
import { ArrowLeft16Regular } from '@fluentui/react-icons';
import { useRouter } from 'next/navigation';
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
  // i menu nativi si allargano quanto l'opzione più lunga: li teniamo dentro la colonna
  scelta: { width: '100%', minWidth: 0, maxWidth: '100%' },
  sceltaElemento: {
    width: '100%',
    minWidth: 0,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  campo: { minWidth: 0 },
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
    /** Numero massimo di caratteri, quando la lunghezza è fissata (es. 16 per il codice fiscale). */
    lunghezzaMax?: number;
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
            maxLength={props.lunghezzaMax}
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
              maxLength: props.lunghezzaMax,
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
  const s = useStili();
  return (
    <ConAiuto aiuto={props.aiuto}>
      <Field
        label={props.etichetta}
        required={props.obbligatorio}
        validationState={props.errore ? 'error' : 'none'}
        validationMessage={props.errore}
        hint={props.suggerimento}
      >
        <Select
          className={s.scelta}
          select={{ className: s.sceltaElemento }}
          value={props.valore}
          onChange={(_, d) => props.onChange(d.value as T)}
        >
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
    gap: tokens.spacingHorizontalXS,
    minHeight: '44px',
    // stile moderno: sottolineato solo al passaggio o con il focus, anche dentro un testo
    textDecorationLine: 'none',
    ':hover': { textDecorationLine: 'underline' },
    ':focus-visible': { textDecorationLine: 'underline' },
  },
  // dentro una frase: area toccabile di 44 px senza allargare la riga di testo
  inLinea: { marginTop: '-12px', marginBottom: '-12px', verticalAlign: 'middle' },
});

/** basePath di next.config: le pagine dell'app stanno sotto /app. */
const BASE = '/app';

/**
 * Collegamento interno con il Link di Fluent UI 9 (niente sottolineatura a riposo, solo al passaggio
 * o con il focus) e la navigazione veloce di Next.js. Area toccabile di 44 px; `inLinea` dentro un testo.
 * `indietro` aggiunge la freccia per tornare alla pagina sopra.
 */
export function Collegamento({
  href,
  children,
  indietro = false,
  inLinea = false,
}: {
  href: string;
  children: ReactNode;
  indietro?: boolean;
  inLinea?: boolean;
}) {
  const s = useStiliCollegamento();
  const router = useRouter();
  return (
    <Link
      href={`${BASE}${href}`}
      className={mergeClasses(s.collegamento, inLinea && s.inLinea)}
      onClick={(e) => {
        // Ctrl/Cmd/Maiusc + clic o tasto centrale: lascia fare al browser (nuova scheda)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        router.push(href);
      }}
    >
      {indietro ? <ArrowLeft16Regular aria-hidden="true" /> : null}
      {children}
    </Link>
  );
}

// --- Date -----------------------------------------------------------------

/** Calendario in italiano, settimana dal lunedì. */
const MESI = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const STRINGHE_CALENDARIO: CalendarStrings = {
  ...defaultDatePickerStrings,
  months: MESI.map((m) => m[0]!.toUpperCase() + m.slice(1)),
  shortMonths: MESI.map((m) => m.slice(0, 3)),
  days: GIORNI,
  shortDays: ['D', 'L', 'M', 'M', 'G', 'V', 'S'],
  goToToday: 'Oggi',
  prevMonthAriaLabel: 'Mese precedente',
  nextMonthAriaLabel: 'Mese successivo',
  prevYearAriaLabel: 'Anno precedente',
  nextYearAriaLabel: 'Anno successivo',
  closeButtonAriaLabel: 'Chiudi',
};

const due = (n: number) => String(n).padStart(2, '0');
/** "2027-01-10" ↔ Date locale (senza fuso orario, a mezzogiorno per evitare scarti). */
export function isoInData(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return d.getMonth() === Number(m[2]) - 1 ? d : undefined;
}
export const dataInIso = (d: Date) => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
const dataInTesto = (d?: Date) =>
  d ? `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()}` : '';
/** Accetta "10/01/2027", "10-1-27", "10.01.2027" e anche "2027-01-10". */
export function testoInData(t: string): Date | null {
  const s = t.trim();
  const iso = isoInData(s);
  if (iso) return iso;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (!m) return null;
  const anno = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(anno, Number(m[2]) - 1, Number(m[1]), 12);
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[1]) ? d : null;
}

/** Campo data con il calendario di Fluent in italiano; il valore è "aaaa-mm-gg" ('' se vuoto). */
export function CampoData(
  props: Comuni & { valore: string; onChange: (iso: string) => void; min?: string; max?: string },
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
        <DatePicker
          value={isoInData(props.valore) ?? null}
          onSelectDate={(d) => props.onChange(d ? dataInIso(d) : '')}
          formatDate={dataInTesto}
          parseDateFromString={(t) => testoInData(t)}
          allowTextInput
          firstDayOfWeek={1}
          strings={STRINGHE_CALENDARIO}
          placeholder="gg/mm/aaaa"
          minDate={props.min ? isoInData(props.min) : undefined}
          maxDate={props.max ? isoInData(props.max) : undefined}
          showGoToToday
          highlightSelectedMonth
        />
      </Field>
    </ConAiuto>
  );
}
