'use client';

import { Button, makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';
import { Eye24Regular, EyeOff24Regular } from '@fluentui/react-icons';
import { useOcchio } from '@/features/lock/useOcchio';
import { FasciaProva } from '@/features/modalita/FasciaProva';
import { StatoCoda } from '@/features/offline-queue/StatoCoda';
import { LARGHEZZA_PC, Navigazione } from '@/ui/Navigazione';
import type { ReactNode } from 'react';

/**
 * Struttura comune delle pagine (T022, principio VI).
 * Mobile-first: nessuno scroll orizzontale dai 360 px, aree toccabili di almeno 44 px.
 * Le pagine protette mostrano la navigazione: barra laterale su PC, barra in basso sul telefono.
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
  barra: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: tokens.spacingHorizontalL,
  },
  occhio: { minWidth: '44px', minHeight: '44px' },
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
  logoSuBlu: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorBrandForeground1,
  },
  // nei pannelli il marchio si allinea al bordo del testo sotto (nessun margine proprio)
  testataAllineata: { padding: 0 },
  marchio: { display: 'flex', flexDirection: 'column' },
  corpo: {
    flexGrow: 1,
    display: 'flex',
    minWidth: 0,
  },
  // spazio per la barra in basso del telefono (56 px + margine dello schermo)
  conBarraInBasso: {
    paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
    [`@media (min-width: ${LARGHEZZA_PC}px)`]: { paddingBottom: 0 },
  },
  fascia: { marginBottom: tokens.spacingVerticalL },
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

/**
 * Logo e nome. `suSfondoBlu`: riquadro bianco con la F blu e nessun margine, per allinearsi al testo
 * del pannello blu. Le classi si uniscono con mergeClasses (con una stringa vince una regola a caso).
 */
export function Marchio({ suSfondoBlu = false }: { suSfondoBlu?: boolean }) {
  const s = useStili();
  return (
    <div className={mergeClasses(s.testata, suSfondoBlu && s.testataAllineata)}>
      <div className={mergeClasses(s.logo, suSfondoBlu && s.logoSuBlu)} aria-hidden="true">
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

/** Pulsante dell'occhio (FR-011): mostra o nasconde importi e nomi in tutta l'app. */
export function PulsanteOcchio() {
  const s = useStili();
  const { nascosto, alterna } = useOcchio();
  return (
    <Button
      appearance="subtle"
      shape="circular"
      className={s.occhio}
      icon={nascosto ? <EyeOff24Regular /> : <Eye24Regular />}
      aria-label={nascosto ? 'Mostra gli importi' : 'Nascondi gli importi'}
      aria-pressed={!nascosto}
      onClick={alterna}
    />
  );
}

export function Shell({ children, navigazione = false }: { children: ReactNode; navigazione?: boolean }) {
  const s = useStili();
  return (
    <div className={s.pagina}>
      <div className={s.barra}>
        <Marchio />
        <PulsanteOcchio />
      </div>
      <div className={navigazione ? mergeClasses(s.corpo, s.conBarraInBasso) : s.corpo}>
        {navigazione ? <Navigazione /> : null}
        <main className={s.contenuto}>
          <StatoCoda />
          {navigazione ? (
            <div className={s.fascia}>
              <FasciaProva />
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
