import type { NextConfig } from 'next';

/**
 * Fiscal: esportazione statica multipagina (costituzione, Stack tecnologico).
 * - Nessun server: ogni pagina diventa un file HTML in `out/`.
 * - L'app vive sotto `/app`: la radice del sito resta la pagina di cortesia (research D-12).
 */
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/app',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // Sempre definita ("0" di default) così la build pubblicata elimina il codice usato solo nei test
  // end-to-end (AgganciProve); `npm run build:e2e` la imposta a "1".
  env: { NEXT_PUBLIC_PROVE: process.env.NEXT_PUBLIC_PROVE === '1' ? '1' : '0' },
};

export default nextConfig;
