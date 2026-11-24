'use client';

import { Button, makeStyles } from '@fluentui/react-components';
import { PersonLock24Regular, PersonAvailable24Regular } from '@fluentui/react-icons';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { nomeRiservato } from '@/engine/consensi/paziente';
import { nomeCliente } from '@/engine/validazioni/cliente';
import { useVerificaRecente } from '@/features/auth/useVerificaRecente';
import { verificaConDispositivo } from '@/features/lock/sbloccoRapido';
import { getSupabase } from '@/lib/supabase/client';
import { oggiIso } from '@/lib/oggi';
import { ImportoNascosto } from '@/ui/ImportoNascosto';

/**
 * Nomi dei pazienti riservati (specifica 005, FR-013, FR-018): in tutta l'app le persone compaiono con iniziali e
 * anno di nascita («M.R. 2008»); gli enti con la denominazione. Il pulsante con la persona mostra i nomi completi
 * per 20 secondi dopo Face ID, impronta o PIN (o, senza sblocco rapido, password e codice); cambiando pagina
 * tornano subito nascosti. La fattura stampata e i file per lo SDI e la Tessera Sanitaria restano con il nome
 * completo, perché è obbligatorio.
 */
export const SECONDI_NOMI = 20;

type Anagrafica = Parameters<typeof nomeRiservato>[0];
type Nomi = { visibili: boolean; mostra: () => void; nascondi: () => void; inVerifica: boolean };
const ContestoNomi = createContext<Nomi>({ visibili: false, mostra: () => {}, nascondi: () => {}, inVerifica: false });

export function NomiProvider({ children }: { children: ReactNode }) {
  // pagina su cui i nomi sono stati mostrati: cambiando pagina tornano nascosti da soli
  const [mostratiSu, setMostratiSu] = useState<string | null>(null);
  const [inVerifica, setInVerifica] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const percorso = usePathname();
  const visibili = mostratiSu !== null && mostratiSu === percorso;
  const { chiedi, finestra } = useVerificaRecente();

  const nascondi = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setMostratiSu(null);
  }, []);

  const mostra = useCallback(async () => {
    setInVerifica(true);
    try {
      const ok = (await verificaConDispositivo()) || (await chiedi());
      if (!ok) return;
      setMostratiSu(percorso);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMostratiSu(null), SECONDI_NOMI * 1000);
      // registro senza contenuti: solo che i nomi sono stati mostrati e quando
      void getSupabase().from('eventi_consensi').insert({ id: crypto.randomUUID(), azione: 'nome_mostrato' });
    } finally {
      setInVerifica(false);
    }
  }, [chiedi, percorso]);

  // chiudendo la schermata (app in background) i nomi tornano nascosti
  useEffect(() => {
    const via = () => document.visibilityState === 'hidden' && nascondi();
    document.addEventListener('visibilitychange', via);
    return () => document.removeEventListener('visibilitychange', via);
  }, [nascondi]);

  const valore = useMemo(() => ({ visibili, mostra: () => void mostra(), nascondi, inVerifica }), [visibili, mostra, nascondi, inVerifica]);
  return (
    <ContestoNomi.Provider value={valore}>
      {children}
      {finestra}
    </ContestoNomi.Provider>
  );
}

export const useNomi = () => useContext(ContestoNomi);

/** Il nome da mostrare, come testo (per menu a tendina ed etichette). */
export function useNomePaziente() {
  const { visibili } = useNomi();
  return useCallback(
    (c: Anagrafica) => (c.tipo === 'ente' || visibili ? nomeCliente(c) : nomeRiservato(c, oggiIso())),
    [visibili],
  );
}

/**
 * Il nome nella pagina. Persone: iniziali e anno (già non riconoscibili, quindi visibili anche con l'occhio
 * chiuso), nome completo solo dopo la verifica. Enti: denominazione, coperta dall'occhio chiuso.
 */
export function NomePaziente({ cliente, segnaposto = '••••' }: { cliente: Anagrafica | null | undefined; segnaposto?: string }) {
  const nome = useNomePaziente();
  if (cliente?.tipo === 'persona_fisica') return <span>{nome(cliente)}</span>;
  return <ImportoNascosto valore={cliente ? nome(cliente) : '—'} segnaposto={segnaposto} />;
}

const useStili = makeStyles({ pulsante: { minWidth: '44px', minHeight: '44px' } });

/** Pulsante nella barra in alto: mostra i nomi completi per pochi secondi dopo la verifica. */
export function PulsanteNomi() {
  const s = useStili();
  const { visibili, mostra, nascondi, inVerifica } = useNomi();
  return (
    <Button
      appearance="subtle"
      shape="circular"
      className={s.pulsante}
      icon={visibili ? <PersonAvailable24Regular /> : <PersonLock24Regular />}
      aria-label={visibili ? 'Nascondi i nomi dei pazienti' : 'Mostra i nomi dei pazienti'}
      title={visibili ? 'Nascondi i nomi' : `Mostra i nomi per ${SECONDI_NOMI} secondi`}
      aria-pressed={visibili}
      disabled={inVerifica}
      onClick={visibili ? nascondi : mostra}
    />
  );
}
