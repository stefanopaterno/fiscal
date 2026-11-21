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
};

export default nextConfig;
