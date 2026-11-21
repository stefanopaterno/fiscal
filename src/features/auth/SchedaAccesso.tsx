'use client';

import { makeStyles, Text, Title2, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { Marchio } from '@/ui/Shell';

/**
 * Impaginazione comune delle pagine di accesso (dal mockup):
 * sul telefono una colonna; sul PC un pannello blu a sinistra con cosa fa l'app e la scheda a destra.
 */
const useStili = makeStyles({
  pagina: {
    minHeight: '100vh',
    display: 'flex',
    flexWrap: 'wrap',
    backgroundColor: tokens.colorNeutralBackground2,
    overflowX: 'hidden',
  },
  pannello: {
    display: 'none',
    '@media (min-width: 900px)': {
      display: 'flex',
      flex: '1 1 420px',
      flexDirection: 'column',
      gap: tokens.spacingVerticalXL,
      boxSizing: 'border-box',
      padding: '56px',
      backgroundColor: tokens.colorBrandBackground,
      color: tokens.colorNeutralForegroundOnBrand,
    },
  },
  elenco: {
    margin: 0,
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  colonna: {
    flex: '1 1 360px',
    minWidth: 0,
    boxSizing: 'border-box',
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalL}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalL,
  },
  scheda: {
    width: '100%',
    maxWidth: '420px',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
    padding: tokens.spacingHorizontalXXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  marchioTelefono: {
    width: '100%',
    maxWidth: '420px',
    '@media (min-width: 900px)': { display: 'none' },
  },
  intestazione: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  passo: { color: tokens.colorBrandForeground1 },
  nota: { maxWidth: '420px', textAlign: 'center', color: tokens.colorNeutralForeground3 },
});

export function SchedaAccesso(props: {
  passo?: string;
  titolo: string;
  sottotitolo?: ReactNode;
  children: ReactNode;
}) {
  const s = useStili();
  return (
    <div className={s.pagina}>
      <aside className={s.pannello}>
        <Marchio suSfondoBlu />
        <Text as="h1" size={800} weight="semibold">
          La tua contabilità da psicologo, insieme alla busta paga.
        </Text>
        <ul className={s.elenco}>
          <li>
            <Text size={400}>Il netto reale: quanto puoi spendere davvero</Text>
          </li>
          <li>
            <Text size={400}>Quanto mettere da parte per tasse ed ENPAP a ogni incasso</Text>
          </li>
          <li>
            <Text size={400}>Le scadenze di giugno e novembre, senza sorprese</Text>
          </li>
        </ul>
      </aside>
      <main className={s.colonna}>
        <div className={s.marchioTelefono}>
          <Marchio />
        </div>
        <section className={s.scheda}>
          <div className={s.intestazione}>
            {props.passo ? (
              <Text size={200} weight="semibold" className={s.passo}>
                {props.passo}
              </Text>
            ) : null}
            <Title2 as="h2">{props.titolo}</Title2>
            {props.sottotitolo ? <Text>{props.sottotitolo}</Text> : null}
          </div>
          {props.children}
        </section>
        <Text size={200} className={s.nota}>
          Uso personale. I risultati di Fiscal sono stime e non sostituiscono il commercialista.
        </Text>
      </main>
    </div>
  );
}
