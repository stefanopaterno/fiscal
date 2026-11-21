import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * Regole del progetto Fiscal.
 * Principio I della costituzione: il motore fiscale (src/engine) è TypeScript puro.
 * Non può importare interfaccia, framework, Supabase né accedere alla rete.
 */
const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'supabase/functions/**',
      'next-env.d.ts',
      'index.html',
    ],
  },
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*', 'react/*'], message: 'Il motore fiscale non usa React (principio I).' },
            { group: ['next', 'next/*'], message: 'Il motore fiscale non usa Next.js (principio I).' },
            { group: ['@supabase/*'], message: 'Il motore fiscale non accede al database (principio I).' },
            { group: ['@fluentui/*'], message: 'Il motore fiscale non usa l\'interfaccia (principio I).' },
            { group: ['@/ui/*', '@/features/*', '@/lib/supabase/*'], message: 'Il motore fiscale non dipende da UI o dati.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Il motore fiscale non usa la rete (principio I).' },
        { name: 'window', message: 'Il motore fiscale non usa il browser (principio I).' },
        { name: 'document', message: 'Il motore fiscale non usa il browser (principio I).' },
        { name: 'localStorage', message: 'Il motore fiscale non usa il browser (principio I).' },
      ],
    },
  },
];

export default config;
