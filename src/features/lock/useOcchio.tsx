'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Modalità "occhio" (T080, FR-011): nasconde importi e nomi a comando.
 * All'avvio è chiuso (importi nascosti); si richiude da solo quando l'app va in background.
 */
type Occhio = { nascosto: boolean; alterna: () => void; nascondi: () => void };

const ContestoOcchio = createContext<Occhio>({ nascosto: true, alterna: () => {}, nascondi: () => {} });

export function OcchioProvider({ children }: { children: ReactNode }) {
  const [nascosto, setNascosto] = useState(true);
  const alterna = useCallback(() => setNascosto((n) => !n), []);
  const nascondi = useCallback(() => setNascosto(true), []);
  const valore = useMemo(() => ({ nascosto, alterna, nascondi }), [nascosto, alterna, nascondi]);
  return <ContestoOcchio.Provider value={valore}>{children}</ContestoOcchio.Provider>;
}

export const useOcchio = () => useContext(ContestoOcchio);
