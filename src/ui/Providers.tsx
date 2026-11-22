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
import { temaChiaro, temaScuro } from '@/ui/tema';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Provider dell'interfaccia (T022, prova S5).
 * - Griffel (il motore di stili di Fluent UI 9) raccoglie gli stili durante l'esportazione statica
 *   e li scrive nell'HTML: la pagina si vede già formattata, senza "sfarfallio".
 * - Tema "Grafite e ottone" (src/ui/tema.ts), chiaro o scuro secondo l'impostazione del dispositivo.
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

export function Providers({ children }: { children: ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer());
  const stiliScritti = useRef(false);
  const [scuro, setScuro] = useState(false);

  useServerInsertedHTML(() => {
    if (stiliScritti.current) return null;
    stiliScritti.current = true;
    return <>{renderToStyleElements(renderer)}</>;
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const aggiorna = () => setScuro(media.matches);
    aggiorna();
    media.addEventListener('change', aggiorna);
    return () => media.removeEventListener('change', aggiorna);
  }, []);

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
        <FluentProvider theme={scuro ? temaScuro : temaChiaro} style={{ minHeight: '100vh' }}>
          <StiliTouch />
          <OcchioProvider>{children}</OcchioProvider>
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
