'use client';

import { useOcchio } from '@/features/lock/useOcchio';

/**
 * Un importo (o un nome) che rispetta l'occhio (T080, FR-011): con l'occhio chiuso mostra "••••".
 * Usare SEMPRE questo componente per importi e nomi di pazienti nell'interfaccia.
 */
export function ImportoNascosto({ valore, segnaposto = '•••• €' }: { valore: string; segnaposto?: string }) {
  const { nascosto } = useOcchio();
  return nascosto ? (
    <span aria-label="importo nascosto" data-nascosto="true">
      {segnaposto}
    </span>
  ) : (
    <span>{valore}</span>
  );
}
