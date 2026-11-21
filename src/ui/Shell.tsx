'use client';

import { makeStyles, Text, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

/**
 * Struttura comune delle pagine (T022, principio VI).
 * Mobile-first: nessuno scroll orizzontale dai 360 px, aree toccabili di almeno 44 px.
 * La navigazione delle pagine interne (barra laterale su PC, barra in basso sul telefono)
 * arriva con le prime pagine protette.
 */
const useStili = makeStyles({
  pagina: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
  },
  testata: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
  },
  logo: {
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase500,
    flexShrink: 0,
  },
  marchio: { display: 'flex', flexDirection: 'column' },
  contenuto: {
    flexGrow: 1,
    width: '100%',
    maxWidth: '1100px',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxSizing: 'border-box',
    padding: `0 ${tokens.spacingHorizontalL} ${tokens.spacingVerticalXXL}`,
    minWidth: 0,
  },
});

export function Marchio() {
  const s = useStili();
  return (
    <div className={s.testata}>
      <div className={s.logo} aria-hidden="true">
        F
      </div>
      <div className={s.marchio}>
        <Text weight="semibold" size={400}>
          Fiscal
        </Text>
        <Text size={200}>Soarlyai Project</Text>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const s = useStili();
  return (
    <div className={s.pagina}>
      <Marchio />
      <main className={s.contenuto}>{children}</main>
    </div>
  );
}
