'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { verificaAncoraValida, verificaDiNuovo } from './verificaRecente';

/**
 * Finestra "Conferma che sei tu" (T086): password e codice a 6 cifre prima di un'operazione sensibile.
 * Uso: const { chiedi, finestra } = useVerificaRecente(); if (await chiedi()) { ...operazione... }
 */
const useStili = makeStyles({
  modulo: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  codice: { fontFamily: tokens.fontFamilyMonospace, letterSpacing: '0.3em', textAlign: 'center' },
});

export function useVerificaRecente() {
  const s = useStili();
  const [aperta, setAperta] = useState(false);
  const [password, setPassword] = useState('');
  const [codice, setCodice] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const risolvi = useRef<((ok: boolean) => void) | null>(null);

  const chiudi = (ok: boolean) => {
    setAperta(false);
    setPassword('');
    setCodice('');
    setErrore(null);
    risolvi.current?.(ok);
    risolvi.current = null;
  };

  const chiedi = useCallback(async (): Promise<boolean> => {
    if (await verificaAncoraValida()) return true;
    return new Promise<boolean>((r) => {
      risolvi.current = r;
      setAperta(true);
    });
  }, []);

  async function conferma(evento: FormEvent) {
    evento.preventDefault();
    setInvio(true);
    setErrore(null);
    const esito = await verificaDiNuovo(password, codice);
    setInvio(false);
    if (esito) {
      setErrore(esito);
      setCodice('');
      return;
    }
    chiudi(true);
  }

  const finestra = (
    <Dialog open={aperta} onOpenChange={(_, d) => (!d.open ? chiudi(false) : undefined)} modalType="alert">
      <DialogSurface>
        <form onSubmit={conferma} noValidate>
          <DialogBody>
            <DialogTitle>Conferma che sei tu</DialogTitle>
            <DialogContent className={s.modulo}>
              <Text>
                È un&apos;operazione importante: scrivi di nuovo la password e il codice a 6 cifre del
                telefono. Il volto o l&apos;impronta qui non bastano.
              </Text>
              {errore ? (
                <MessageBar intent="error">
                  <MessageBarBody>{errore}</MessageBarBody>
                </MessageBar>
              ) : null}
              <Field label="Password attuale" required>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(_, d) => setPassword(d.value)}
                />
              </Field>
              <Field label="Codice a 6 cifre" required>
                <Input
                  input={{ className: s.codice, size: 7 }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  value={codice}
                  onChange={(_, d) => setCodice(d.value)}
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => chiudi(false)}>Annulla</Button>
              <Button
                type="submit"
                appearance="primary"
                disabled={invio || !password || codice.replace(/\D/g, '').length !== 6}
              >
                {invio ? 'Controllo…' : 'Conferma'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );

  return { chiedi, finestra };
}
