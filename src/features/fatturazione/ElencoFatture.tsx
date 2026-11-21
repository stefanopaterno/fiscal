'use client';

import {
  Badge,
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Add20Regular, ChevronRight20Regular } from '@fluentui/react-icons';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { formattaEuro } from '@/engine/importi';
import { nomeCliente } from '@/engine/validazioni/cliente';
import { leggiClienti, leggiFatture, type Cliente, type Fattura } from '@/features/fatturazione/dati';
import { dataItaliana, ETICHETTA_STATO, titoloDocumento } from '@/features/fatturazione/DettaglioFattura';
import { SchedaIva } from '@/features/fatturazione/SchedaIva';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, Griglia } from '@/ui/Moduli';

/** Elenco delle fatture per anno, con stato e totale (T015; filtri e totali completi in T022). */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  elenco: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    overflow: 'hidden',
  },
  voce: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minHeight: '56px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  testo: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 },
  nome: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  destra: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 },
});

export function ElencoFatture() {
  const s = useStili();
  const router = useRouter();
  const [fatture, setFatture] = useState<Fattura[] | null>(null);
  const [clienti, setClienti] = useState<Map<string, Cliente>>(new Map());
  const [errore, setErrore] = useState(false);
  const [anno, setAnno] = useState('tutti');

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiFatture(), leggiClienti()])
      .then(([f, c]) => {
        if (!vivo) return;
        setFatture(f);
        setClienti(new Map(c.map((x) => [x.id, x])));
      })
      .catch(() => vivo && setErrore(true));
    return () => {
      vivo = false;
    };
  }, []);

  const anni = useMemo(
    () => [...new Set((fatture ?? []).map((f) => f.anno))].sort((a, b) => b - a),
    [fatture],
  );
  const visibili = (fatture ?? []).filter((f) => anno === 'tutti' || f.anno === Number(anno));

  if (errore)
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          Non riesco a leggere le fatture. Controlla la connessione e ricarica la pagina.
        </MessageBarBody>
      </MessageBar>
    );
  if (!fatture) return <Spinner label="Un momento…" />;

  return (
    <div className={s.colonna}>
      <Button
        appearance="primary"
        className={s.pulsante}
        icon={<Add20Regular />}
        onClick={() => router.push('/fatture/nuova/')}
      >
        Nuova fattura
      </Button>
      {anni.length > 1 ? (
        <Griglia>
          <CampoScelta
            etichetta="Anno"
            valore={anno}
            onChange={setAnno}
            opzioni={[
              { valore: 'tutti', etichetta: 'Tutti' },
              ...anni.map((a) => ({ valore: String(a), etichetta: String(a) })),
            ]}
            aiuto={{ argomento: 'anno', testo: 'La numerazione delle fatture riparte da 1 ogni anno.' }}
          />
        </Griglia>
      ) : null}
      {anni.length > 0 ? <SchedaIva anno={anno === 'tutti' ? anni[0]! : Number(anno)} /> : null}
      {fatture.length === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>Non hai ancora fatture. Crea la prima con «Nuova fattura».</MessageBarBody>
        </MessageBar>
      ) : (
        <ul className={s.elenco}>
          {visibili.map((f) => {
            const c = (f.fotografia?.cliente as Cliente | undefined) ?? clienti.get(f.cliente_id);
            return (
              <li key={f.id}>
                <NextLink
                  href={f.stato === 'bozza' ? `/fatture/nuova/?id=${f.id}` : `/fatture/dettaglio/?id=${f.id}`}
                  className={s.voce}
                >
                  <span className={s.testo}>
                    <Text weight="semibold">{titoloDocumento(f)}</Text>
                    <Text size={200} className={s.nome}>
                      {dataItaliana(f.data)} ·{' '}
                      <ImportoNascosto valore={c ? nomeCliente(c) : '—'} segnaposto="••••" />
                    </Text>
                  </span>
                  <span className={s.destra}>
                    <Text weight="semibold">
                      <ImportoNascosto
                        valore={`${f.tipo === 'nota_credito' ? '− ' : ''}${formattaEuro(f.totale)}`}
                      />
                    </Text>
                    <Badge
                      appearance="tint"
                      color={
                        f.stato === 'emessa' ? 'success' : f.stato === 'bozza' ? 'informative' : 'danger'
                      }
                    >
                      {ETICHETTA_STATO[f.stato]}
                    </Badge>
                  </span>
                  <ChevronRight20Regular aria-hidden="true" />
                </NextLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
