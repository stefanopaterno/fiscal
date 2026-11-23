'use client';

import { Button, makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';
import {
  Eye24Regular,
  EyeOff24Regular,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
  Map24Regular,
} from '@fluentui/react-icons';
import { useRouter } from 'next/navigation';
import { useOcchio } from '@/features/lock/useOcchio';
import { FasciaProva } from '@/features/modalita/FasciaProva';
import { StatoCoda } from '@/features/offline-queue/StatoCoda';
import { Logo } from '@/ui/Logo';
import { useTema } from '@/ui/Providers';
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
  comandi: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  testata: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
  },
  // nei pannelli il marchio si allinea al bordo del testo sotto (nessun margine proprio)
  testataAllineata: { padding: 0 },
  marchio: { display: 'flex', flexDirection: 'column' },
  // maiuscolo spaziato, come una firma sotto il nome
  progetto: { letterSpacing: '0.08em', fontWeight: tokens.fontWeightSemibold },
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
    // liquido: occupa tutto lo spazio accanto alla navigazione, senza colonna centrata
    width: '100%',
    boxSizing: 'border-box',
    padding: `0 ${tokens.spacingHorizontalL} ${tokens.spacingVerticalXXL}`,
    [`@media (min-width: ${LARGHEZZA_PC}px)`]: {
      padding: `0 ${tokens.spacingHorizontalXXXL} ${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXL}`,
    },
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
      <Logo dimensione={36} chiaro={suSfondoBlu} />
      <div className={s.marchio}>
        <Text weight="semibold" size={400}>
          Fiscal
        </Text>
        <Text size={100} className={s.progetto}>
          SOARLYAI PROJECT
        </Text>
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

/** Pulsante del tour: apre la pagina con il giro guidato di Fiscal. */
export function PulsanteTour() {
  const s = useStili();
  const router = useRouter();
  return (
    <Button
      appearance="subtle"
      shape="circular"
      className={s.occhio}
      icon={<Map24Regular />}
      aria-label="Tour di Fiscal"
      title="Tour di Fiscal"
      onClick={() => router.push('/tour/')}
    />
  );
}

/** Pulsante del tema: passa da chiaro (predefinito) a scuro e viceversa; la scelta resta sul dispositivo. */
export function PulsanteTema() {
  const s = useStili();
  const { tema, cambia } = useTema();
  const scuro = tema === 'scuro';
  return (
    <Button
      appearance="subtle"
      shape="circular"
      className={s.occhio}
      icon={scuro ? <WeatherSunny24Regular /> : <WeatherMoon24Regular />}
      aria-label={scuro ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      title={scuro ? 'Tema chiaro' : 'Tema scuro'}
      onClick={() => cambia(scuro ? 'chiaro' : 'scuro')}
    />
  );
}

export function Shell({ children, navigazione = false }: { children: ReactNode; navigazione?: boolean }) {
  const s = useStili();
  return (
    <div className={s.pagina}>
      <div className={s.barra}>
        <Marchio />
        <div className={s.comandi}>
          {navigazione ? <PulsanteTour /> : null}
          <PulsanteTema />
          <PulsanteOcchio />
        </div>
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
