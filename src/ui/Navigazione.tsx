'use client';

import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import {
  DocumentText24Filled,
  DocumentText24Regular,
  Home24Filled,
  Home24Regular,
  People24Filled,
  People24Regular,
  Settings24Filled,
  Settings24Regular,
} from '@fluentui/react-icons';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

/**
 * Navigazione delle pagine protette (T001 della 003, come nel mockup):
 * barra laterale da 900 px in su, barra in basso sul telefono.
 * Si aggiunge una voce solo quando la sua pagina esiste.
 */
type Voce = { href: string; etichetta: string; icona: ReactElement; iconaAttiva: ReactElement };

export const VOCI: Voce[] = [
  { href: '/home/', etichetta: 'Home', icona: <Home24Regular />, iconaAttiva: <Home24Filled /> },
  {
    href: '/fatture/',
    etichetta: 'Fatture',
    icona: <DocumentText24Regular />,
    iconaAttiva: <DocumentText24Filled />,
  },
  { href: '/clienti/', etichetta: 'Clienti', icona: <People24Regular />, iconaAttiva: <People24Filled /> },
  {
    href: '/impostazioni/',
    etichetta: 'Impostazioni',
    icona: <Settings24Regular />,
    iconaAttiva: <Settings24Filled />,
  },
];

export const LARGHEZZA_PC = 900;
const PC = `@media (min-width: ${LARGHEZZA_PC}px)`;

const useStili = makeStyles({
  barra: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    display: 'flex',
    justifyContent: 'space-around',
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingBottom: 'env(safe-area-inset-bottom)',
    [PC]: {
      position: 'sticky',
      top: 0,
      bottom: 'auto',
      alignSelf: 'flex-start',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      gap: tokens.spacingVerticalXS,
      width: '220px',
      flexShrink: 0,
      borderTop: 'none',
      backgroundColor: 'transparent',
      padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    },
  },
  voce: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: '56px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    fontSize: tokens.fontSizeBase200,
    borderRadius: tokens.borderRadiusMedium,
    ':hover': { color: tokens.colorBrandForeground1 },
    [PC]: {
      flexGrow: 0,
      flexBasis: 'auto',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: tokens.spacingHorizontalM,
      minHeight: '44px',
      padding: `0 ${tokens.spacingHorizontalM}`,
      fontSize: tokens.fontSizeBase300,
      ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
    },
  },
  attiva: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    [PC]: { backgroundColor: tokens.colorBrandBackground2 },
  },
});

/** Vero se il percorso appartiene alla voce (es. /fatture/nuova/ → Fatture). */
export function voceAttiva(percorso: string, href: string): boolean {
  const p = percorso.endsWith('/') ? percorso : `${percorso}/`;
  return p === href || p.startsWith(href);
}

export function Navigazione() {
  const s = useStili();
  const percorso = usePathname() ?? '';
  return (
    <nav className={s.barra} aria-label="Sezioni di Fiscal">
      {VOCI.map((v) => {
        const attiva = voceAttiva(percorso, v.href);
        return (
          <NextLink
            key={v.href}
            href={v.href}
            className={mergeClasses(s.voce, attiva && s.attiva)}
            aria-current={attiva ? 'page' : undefined}
          >
            <span aria-hidden="true">{attiva ? v.iconaAttiva : v.icona}</span>
            {v.etichetta}
          </NextLink>
        );
      })}
    </nav>
  );
}
