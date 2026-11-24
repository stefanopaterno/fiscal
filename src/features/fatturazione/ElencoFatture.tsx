'use client';

import { NomePaziente, useNomePaziente } from '@/features/consensi/nomi';
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
import { totaliFatture } from '@/engine/fattura/totali';
import {
  leggiClienti,
  leggiFatture,
  leggiIncassi,
  type Cliente,
  type Fattura,
  type Incasso,
} from '@/features/fatturazione/dati';
import { dataItaliana, ETICHETTA_STATO, titoloDocumento } from '@/features/fatturazione/DettaglioFattura';
import { SchedaIva } from '@/features/fatturazione/SchedaIva';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, Griglia, Scheda } from '@/ui/Moduli';

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
  totali: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
    gap: tokens.spacingVerticalM,
  },
  totale: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  destra: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 },
});

export function ElencoFatture() {
  const s = useStili();
  const nomePaziente = useNomePaziente();
  const router = useRouter();
  const [fatture, setFatture] = useState<Fattura[] | null>(null);
  const [clienti, setClienti] = useState<Map<string, Cliente>>(new Map());
  const [errore, setErrore] = useState(false);
  const [incassi, setIncassi] = useState<Incasso[]>([]);
  const [anno, setAnno] = useState('tutti');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [filtroTipo, setFiltroTipo] = useState('tutti');

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiFatture(), leggiClienti(), leggiIncassi()])
      .then(([f, c, i]) => {
        if (!vivo) return;
        setFatture(f);
        setIncassi(i);
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
  const incassatoPer = new Map<string, number>();
  for (const i of incassi) incassatoPer.set(i.fattura_id, (incassatoPer.get(i.fattura_id) ?? 0) + i.importo);
  const visibili = (fatture ?? []).filter(
    (f) =>
      (anno === 'tutti' || f.anno === Number(anno)) &&
      (!filtroCliente || f.cliente_id === filtroCliente) &&
      (filtroTipo === 'tutti' || f.tipo === filtroTipo) &&
      (filtroStato === 'tutti' ||
        (filtroStato === 'da_incassare'
          ? f.tipo === 'fattura' && f.stato === 'emessa' && (incassatoPer.get(f.id) ?? 0) < f.netto
          : f.stato === filtroStato)),
  );
  const totali = totaliFatture(visibili, incassi);
  const filtriAttivi =
    anno !== 'tutti' || filtroCliente !== '' || filtroStato !== 'tutti' || filtroTipo !== 'tutti';

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
      {fatture.length > 0 ? (
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
          <CampoScelta
            etichetta="Cliente"
            valore={filtroCliente}
            onChange={setFiltroCliente}
            opzioni={[
              { valore: '', etichetta: 'Tutti' },
              ...[...clienti.values()]
                .map((c) => ({ valore: c.id, etichetta: nomePaziente(c) }))
                .sort((a, b) => a.etichetta.localeCompare(b.etichetta, 'it')),
            ]}
            aiuto={{ argomento: 'filtro cliente', testo: 'Mostra solo le fatture di un cliente.' }}
          />
          <CampoScelta
            etichetta="Stato"
            valore={filtroStato}
            onChange={setFiltroStato}
            opzioni={[
              { valore: 'tutti', etichetta: 'Tutti' },
              { valore: 'da_incassare', etichetta: 'Da incassare' },
              { valore: 'emessa', etichetta: 'Emesse' },
              { valore: 'bozza', etichetta: 'Bozze' },
              { valore: 'annullata', etichetta: 'Annullate' },
            ]}
            aiuto={{
              argomento: 'filtro stato',
              testo: '«Da incassare»: fatture emesse che non ti hanno ancora pagato del tutto.',
            }}
          />
          <CampoScelta
            etichetta="Tipo"
            valore={filtroTipo}
            onChange={setFiltroTipo}
            opzioni={[
              { valore: 'tutti', etichetta: 'Tutti' },
              { valore: 'fattura', etichetta: 'Fatture' },
              { valore: 'nota_credito', etichetta: 'Note di credito' },
            ]}
            aiuto={{
              argomento: 'filtro tipo',
              testo: 'Le note di credito annullano una fattura: hanno un numero nella stessa sequenza.',
            }}
          />
        </Griglia>
      ) : null}
      {totali.documenti > 0 ? (
        <Scheda
          titolo={filtriAttivi ? 'Totali della selezione' : 'Totali'}
          aiuto={{
            argomento: 'totali',
            testo:
              'Emesso: il totale delle fatture, tolte le note di credito. Incassato: quanto hai già ricevuto. Da incassare: quanto ti devono ancora (al netto della ritenuta, che la versa il cliente per te).',
          }}
        >
          <div className={s.totali}>
            <span className={s.totale}>
              <Text size={200}>Emesso</Text>
              <Text weight="semibold" size={500}>
                <ImportoNascosto valore={formattaEuro(totali.emesso)} />
              </Text>
            </span>
            <span className={s.totale}>
              <Text size={200}>Incassato</Text>
              <Text weight="semibold" size={500}>
                <ImportoNascosto valore={formattaEuro(totali.incassato)} />
              </Text>
            </span>
            <span className={s.totale}>
              <Text size={200}>Da incassare</Text>
              <Text weight="semibold" size={500}>
                <ImportoNascosto valore={formattaEuro(totali.daIncassare)} />
              </Text>
            </span>
          </div>
        </Scheda>
      ) : null}
      {anni.length > 0 ? <SchedaIva anno={anno === 'tutti' ? anni[0]! : Number(anno)} /> : null}
      {fatture.length === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>Non hai ancora fatture. Crea la prima con «Nuova fattura».</MessageBarBody>
        </MessageBar>
      ) : visibili.length === 0 ? (
        <Text>Nessuna fattura con questi filtri.</Text>
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
                      <NomePaziente cliente={c} />
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
