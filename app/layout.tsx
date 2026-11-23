import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/ui/Providers';

export const metadata: Metadata = {
  title: { default: 'Fiscal', template: '%s · Fiscal' },
  description: 'Fiscal · SOARLYAI PROJECT. Uso personale.',
  applicationName: 'Fiscal',
  robots: { index: false, follow: false },
  manifest: '/app/manifest.webmanifest',
  icons: {
    icon: [{ url: '/app/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/app/icons/icon-192.png', sizes: '192x192' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0F6CBD' },
    { media: '(prefers-color-scheme: dark)', color: '#115EA3' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body style={{ margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
