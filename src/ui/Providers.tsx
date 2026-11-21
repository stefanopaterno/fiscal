'use client';

import {
  createDOMRenderer,
  FluentProvider,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components';
import { useServerInsertedHTML } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Provider dell'interfaccia (T022, prova S5).
 * - Griffel (il motore di stili di Fluent UI 9) raccoglie gli stili durante l'esportazione statica
 *   e li scrive nell'HTML: la pagina si vede già formattata, senza "sfarfallio".
 * - Tema chiaro o scuro secondo l'impostazione del dispositivo.
 * - In produzione registra il service worker dell'app (solo file dell'app, mai dati).
 */
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
        <FluentProvider theme={scuro ? webDarkTheme : webLightTheme} style={{ minHeight: '100vh' }}>
          {children}
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  );
}
