'use client';

import {
  Avatar,
  Badge,
  Button,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Add20Regular, DocumentAdd20Regular, Search20Regular } from '@fluentui/react-icons';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { leggiClienti, leggiFatture, type Cliente, type Fattura } from '@/features/fatturazione/dati';
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { useOcchio } from '@/features/lock/useOcchio';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { rubrica, type FiltroTipo, type VoceRubrica } from './rubrica';

/**
 * Rubrica di clienti e pazienti (T014, FR-017): ordine per cognome, gruppi per lettera, ricerca senza
 * accenti, filtro per tipo, numero di fatture e scorciatoia per fatturare. Nomi e codici rispettano
 * l'occhio. Su PC i gruppi si dispongono in colonne e riempiono lo spazio.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  barra: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
  cerca: { flexGrow: 1, flexBasis: '260px', minWidth: 0 },
  campoCerca: { width: '100%', minHeight: '44px' },
  pulsante: { minHeight: '44px' },
  filtri: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
  },
  scheda: { minHeight: '44px' },
  gruppi: {
    columnWidth: '380px',
    columnGap: tokens.spacingHorizontalL,
  },
  gruppo: {
    breakInside: 'avoid',
    marginBottom: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    overflow: 'hidden',
  },
  lettera: {
    display: 'block',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  elenco: { listStyle: 'none', margin: 0, padding: 0 },
  riga: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ':last-child': { borderBottom: 'none' },
  },
  voce: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexGrow: 1,
    minWidth: 0,
    minHeight: '64px',
    padding: `${tokens.spacingVerticalS} 0 ${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  testo: { display: 'flex', flexDirection: 'column', gap: '2px', flexGrow: 1, minWidth: 0 },
  nome: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  dettagli: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
    alignItems: 'center',
    color: tokens.colorNeutralForeground3,
  },
  fattura: { minWidth: '44px', minHeight: '44px', marginRight: tokens.spacingHorizontalS, flexShrink: 0 },
});

export function ElencoClienti() {
  const s = useStili();
  const router = useRouter();
  const [clienti, setClienti] = useState<Cliente[] | null>(null);
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [errore, setErrore] = useState(false);
  const [cerca, setCerca] = useState('');
  const [tipo, setTipo] = useState<FiltroTipo>('tutti');

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiClienti(), leggiFatture().catch(() => [] as Fattura[])])
      .then(([c, f]) => {
        if (!vivo) return;
        setClienti(c);
        setFatture(f);
      })
      .catch(() => vivo && setErrore(true));
    return () => {
      vivo = false;
    };
  }, []);

  const { gruppi, trovati } = useMemo(
    () => rubrica(clienti ?? [], fatture, cerca, tipo),
    [clienti, fatture, cerca, tipo],
  );
  const conta = (t: FiltroTipo) => (clienti ?? []).filter((c) => t === 'tutti' || c.tipo === t).length;

  if (errore)
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          Non riesco a leggere i clienti. Controlla la connessione e ricarica la pagina.
        </MessageBarBody>
      </MessageBar>
    );
  if (!clienti) return <Spinner label="Un momento…" />;

  return (
    <div className={s.colonna}>
      <div className={s.barra}>
        <div className={s.cerca}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'cerca',
              testo:
                'Scrivi una parte del nome, del cognome, del codice fiscale o del comune. Accenti e maiuscole non contano.',
            }}
          >
            <Input
              className={s.campoCerca}
              aria-label="Cerca un cliente"
              placeholder="Cerca per nome, codice fiscale o comune"
              contentBefore={<Search20Regular />}
              value={cerca}
              onChange={(_, d) => setCerca(d.value)}
              type="search"
            />
          </ConAiuto>
        </div>
        <Button
          appearance="primary"
          className={s.pulsante}
          icon={<Add20Regular />}
          onClick={() => router.push('/clienti/scheda/')}
        >
          Nuovo cliente
        </Button>
      </div>

      {clienti.length === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>
            Non hai ancora clienti. Aggiungi il primo paziente: servono solo i dati da scrivere in fattura.
          </MessageBarBody>
        </MessageBar>
      ) : (
        <>
          <div className={s.filtri}>
            <TabList
              selectedValue={tipo}
              onTabSelect={(_, d) => setTipo(d.value as FiltroTipo)}
              aria-label="Mostra"
            >
              <Tab value="tutti" className={s.scheda}>
                Tutti ({conta('tutti')})
              </Tab>
              <Tab value="persona_fisica" className={s.scheda}>
                Persone ({conta('persona_fisica')})
              </Tab>
              <Tab value="ente" className={s.scheda}>
                Enti ({conta('ente')})
              </Tab>
            </TabList>
            {cerca.trim() ? (
              <Text size={200}>{trovati === 1 ? '1 risultato' : `${trovati} risultati`}</Text>
            ) : null}
          </div>
          {trovati === 0 ? (
            <Text>Nessun cliente trovato.</Text>
          ) : (
            <div className={s.gruppi}>
              {gruppi.map((g) => (
                <section key={g.lettera} className={s.gruppo} aria-label={`Lettera ${g.lettera}`}>
                  <span className={s.lettera} aria-hidden="true">
                    {g.lettera}
                  </span>
                  <ul className={s.elenco}>
                    {g.voci.map((v) => (
                      <RigaCliente key={v.cliente.id} voce={v} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RigaCliente({ voce: v }: { voce: VoceRubrica }) {
  const s = useStili();
  const router = useRouter();
  const { nascosto } = useOcchio();
  const c = v.cliente;
  return (
    <li className={s.riga}>
      <NextLink href={`/clienti/scheda/?id=${c.id}`} className={s.voce}>
        <Avatar
          size={40}
          color="colorful"
          idForColor={c.id}
          initials={nascosto ? undefined : v.iniziali}
          aria-hidden="true"
        />
        <span className={s.testo}>
          <Text weight="semibold" className={s.nome}>
            <ImportoNascosto valore={v.nome} segnaposto="••••" />
          </Text>
          <span className={s.dettagli}>
            <Badge appearance="tint" color={c.tipo === 'ente' ? 'brand' : 'informative'}>
              {c.tipo === 'ente' ? 'Ente' : 'Persona'}
            </Badge>
            {c.sostituto_imposta ? (
              <Badge appearance="tint" color="warning">
                Ritenuta
              </Badge>
            ) : null}
            {c.opposizione_sts ? (
              <Badge appearance="tint" color="subtle">
                No Tessera Sanitaria
              </Badge>
            ) : null}
            <Text size={200}>
              {v.fatture === 0
                ? 'nessuna fattura'
                : `${v.fatture} ${v.fatture === 1 ? 'fattura' : 'fatture'} · ultima ${dataItaliana(v.ultimaFattura!)}`}
            </Text>
          </span>
        </span>
      </NextLink>
      <Button
        appearance="subtle"
        className={s.fattura}
        icon={<DocumentAdd20Regular />}
        aria-label="Nuova fattura per questo cliente"
        title="Nuova fattura"
        onClick={() => router.push(`/fatture/nuova/?cliente=${c.id}`)}
      />
    </li>
  );
}
