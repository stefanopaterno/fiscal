'use client';

import {
  createDOMRenderer,
  FluentProvider,
  makeStaticStyles,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
} from '@fluentui/react-components';
import { useServerInsertedHTML } from 'next/navigation';
import { OcchioProvider } from '@/features/lock/useOcchio';
import { salvaTema, temaSalvato, temi, type NomeTema } from '@/ui/tema';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

/**
 * Provider dell'interfaccia (T022, prova S5).
 * - Griffel (il motore di stili di Fluent UI 9) raccoglie gli stili durante l'esportazione statica
 *   e li scrive nell'HTML: la pagina si vede già formattata, senza "sfarfallio".
 * - Tema blu di Fluent, chiaro di partenza o scuro a scelta (pulsante in alto, src/ui/tema.ts).
 * - In produzione registra il service worker dell'app (solo file dell'app, mai dati).
 */
/**
 * Aree toccabili di almeno 44 px sugli schermi touch (principio VI): i campi e i menu di Fluent UI
 * sono più bassi per impostazione predefinita.
 */
const useStiliTouch = makeStaticStyles(`
/* I campi non escono mai dal loro contenitore (es. il codice a 6 cifre su iPhone). */
.fui-Input { box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; }
.fui-Input > input { min-width: 0; width: 100%; }
@media (pointer: coarse) {
  .fui-Input { min-height: 44px; }
  .fui-Input > input { min-height: 42px; }
  .fui-Select > select { min-height: 44px; }
  .fui-Checkbox, .fui-Switch, .fui-Tab { min-height: 44px; }
}
`);

function StiliTouch() {
  useStiliTouch();
  return null;
}

/** Tema in uso e cambio (pulsante luna/sole nella barra in alto). */
const ContestoTema = createContext<{ tema: NomeTema; cambia: (t: NomeTema) => void }>({
  tema: 'chiaro',
  cambia: () => undefined,
});
export const useTema = () => useContext(ContestoTema);

const EVENTO_TEMA = 'fiscal-tema';
function ascoltaTema(avvisa: () => void) {
  window.addEventListener(EVENTO_TEMA, avvisa);
  window.addEventListener('storage', avvisa); // cambio fatto in un'altra scheda
  return () => {
    window.removeEventListener(EVENTO_TEMA, avvisa);
    window.removeEventListener('storage', avvisa);
  };
}

export function Providers({ children }: { children: ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer());
  const stiliScritti = useRef(false);
  // chiaro di partenza (anche nella pagina esportata); poi la scelta salvata su questo dispositivo
  const tema = useSyncExternalStore(ascoltaTema, temaSalvato, () => 'chiaro' as NomeTema);

  useServerInsertedHTML(() => {
    if (stiliScritti.current) return null;
    stiliScritti.current = true;
    return <>{renderToStyleElements(renderer)}</>;
  });

  useEffect(() => {
    document.documentElement.style.colorScheme = tema === 'scuro' ? 'dark' : 'light';
  }, [tema]);

  const cambia = (t: NomeTema) => {
    salvaTema(t);
    window.dispatchEvent(new Event(EVENTO_TEMA));
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {
        // Senza service worker l'app funziona lo stesso (serve solo per l'installazione e l'avvio veloce).
      });
    }
  }, []);

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={temi[tema]} style={{ minHeight: '100vh' }}>
          <StiliTouch />
          <ContestoTema.Provider value={{ tema, cambia }}>
            <OcchioProvider>{children}</OcchioProvider>
          </ContestoTema.Provider>
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
