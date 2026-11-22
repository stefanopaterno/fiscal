'use client';

import { makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { euroInCentesimi, formattaEuro } from '@/engine/importi';
import { anniConRegoleIrpef } from '@/engine/regole/irpef';
import { BollaAiuto, ConAiuto, type ContenutoAiuto } from '@/ui/AiutoContestuale';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, CampoTesto } from '@/ui/Moduli';

/** Mattoni delle pagine Tasse (specifica 001): ogni numero con il suo "?" e rispetto dell'occhio. */

/** Anno scelto dalla query (?anno=), altrimenti l'anno corrente se ha regole, altrimenti l'ultimo. */
export function useAnno(): [number, (a: number) => void] {
  const p = useSearchParams();
  const router = useRouter();
  const anni = anniConRegoleIrpef();
  const daQuery = Number(p.get('anno'));
  const corrente = new Date().getFullYear();
  const anno = anni.includes(daQuery) ? daQuery : anni.includes(corrente) ? corrente : anni.at(-1)!;
  return [anno, (a: number) => router.replace(`?anno=${a}`)];
}

export function SceltaAnno({ anno, onChange }: { anno: number; onChange: (a: number) => void }) {
  return (
    <CampoScelta
      etichetta="Anno d'imposta"
      valore={String(anno)}
      onChange={(v) => onChange(Number(v))}
      opzioni={anniConRegoleIrpef().map((a) => ({ valore: String(a), etichetta: String(a) }))}
      aiuto={{
        argomento: "anno d'imposta",
        testo:
          "L'anno dei redditi. Le tasse di quest'anno si pagano a giugno e novembre dell'anno dopo, con la dichiarazione.",
      }}
    />
  );
}

/** "38.000,00": come si legge un importo in italiano (il campo accetta anche "38000"). */
const importoConMigliaia = (c: number) =>
  new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: 'always',
  }).format(c / 100);

/** Campo in euro: l'utente scrive "1.234,56", il valore è in centesimi. */
export function CampoEuro(props: {
  etichetta: string;
  aiuto: ContenutoAiuto;
  valore: number | null;
  onChange: (centesimi: number | null) => void;
  facoltativo?: boolean;
  negativo?: boolean;
  suggerimento?: string;
}) {
  const [testo, setTesto] = useState(props.valore == null ? '' : importoConMigliaia(props.valore));
  const negativo = props.negativo && testo.trim().startsWith('-');
  const pulito = negativo ? testo.trim().slice(1) : testo;
  const c = euroInCentesimi(pulito);
  const errore = testo.trim() !== '' && c === null ? 'Scrivi un importo, per esempio 1.234,56' : undefined;
  return (
    <CampoTesto
      etichetta={props.etichetta}
      aiuto={props.aiuto}
      valore={testo}
      inputMode="decimal"
      lunghezzaMax={13}
      errore={errore}
      suggerimento={props.suggerimento ?? (props.facoltativo ? 'Facoltativo' : undefined)}
      onChange={(v) => {
        setTesto(v);
        const neg = props.negativo && v.trim().startsWith('-');
        const x = euroInCentesimi(neg ? v.trim().slice(1) : v);
        if (v.trim() === '') props.onChange(props.facoltativo ? null : 0);
        else if (x !== null) props.onChange(neg ? -x : x);
      }}
    />
  );
}

/** "1,23" → 0.0123 (percentuale scritta dall'utente); null se non valida. */
export function percentualeDaTesto(testo: string): number | null {
  const t = testo.trim().replace('%', '').replace(',', '.');
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return null;
  return Math.round(Number(t) * 10_000) / 1_000_000;
}

export const percentualeInTestoModulo = (x: number) =>
  (Math.round(x * 1_000_000) / 10_000).toString().replace('.', ',');

const useStili = makeStyles({
  kpi: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
    gap: tokens.spacingVerticalM,
  },
  carta: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  evidenza: { backgroundColor: tokens.colorBrandBackground2 },
  valore: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase600,
  },
  voci: { display: 'flex', flexDirection: 'column' },
  voce: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    minHeight: '44px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  totale: { fontWeight: tokens.fontWeightSemibold },
  importo: { flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  etichetta: { minWidth: 0 },
  sinistra: { display: 'flex', alignItems: 'center', minWidth: 0 },
  blocco: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, paddingBottom: '2px' },
});

export function GrigliaKpi({ children }: { children: ReactNode }) {
  return <div className={useStili().kpi}>{children}</div>;
}

export function Kpi(props: {
  etichetta: string;
  valore: string;
  nascondi?: boolean;
  nota?: string;
  aiuto: ContenutoAiuto;
  evidenza?: boolean;
}) {
  const s = useStili();
  return (
    <div className={mergeClasses(s.carta, props.evidenza && s.evidenza)}>
      <ConAiuto allineamento="centro" aiuto={props.aiuto}>
        <Text size={200}>{props.etichetta}</Text>
      </ConAiuto>
      <span className={s.valore}>
        {props.nascondi === false ? props.valore : <ImportoNascosto valore={props.valore} />}
      </span>
      {props.nota ? <Text size={200}>{props.nota}</Text> : null}
    </div>
  );
}

export function Voci({ children }: { children: ReactNode }) {
  return <div className={useStili().voci}>{children}</div>;
}

/** Una riga "etichetta ? — importo"; la spiegazione si apre in un fumetto sopra la pagina. */
export function Voce(props: {
  etichetta: string;
  centesimi: number;
  spiegazione?: string;
  regola?: string;
  totale?: boolean;
  segno?: '+' | '−';
}) {
  const s = useStili();
  const testo = `${props.segno ? `${props.segno} ` : ''}${formattaEuro(props.centesimi)}`;
  return (
    <div className={s.voce}>
      <div className={s.sinistra}>
        <Text className={mergeClasses(s.etichetta, props.totale && s.totale)}>{props.etichetta}</Text>
        {props.spiegazione ? (
          <BollaAiuto
            argomento={props.etichetta.toLowerCase()}
            testo={props.spiegazione}
            daDove={props.regola}
          />
        ) : null}
      </div>
      <Text className={mergeClasses(s.importo, props.totale && s.totale)}>
        <ImportoNascosto valore={testo} />
      </Text>
    </div>
  );
}
