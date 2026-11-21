'use client';

import {
  Badge,
  Button,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Add20Regular, ChevronRight20Regular, Search20Regular } from '@fluentui/react-icons';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { nomeCliente } from '@/engine/validazioni/cliente';
import { leggiClienti, type Cliente } from '@/features/fatturazione/dati';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ImportoNascosto } from '@/ui/ImportoNascosto';

/** Elenco di clienti e pazienti (T014, FR-017) con ricerca per nome o codice fiscale. */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  barra: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'flex-end' },
  cerca: { flexGrow: 1, minWidth: '200px' },
  pulsante: { minHeight: '44px' },
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
  etichette: { display: 'flex', gap: tokens.spacingHorizontalXS, flexWrap: 'wrap' },
});

export function ElencoClienti() {
  const s = useStili();
  const router = useRouter();
  const [clienti, setClienti] = useState<Cliente[] | null>(null);
  const [errore, setErrore] = useState(false);
  const [cerca, setCerca] = useState('');

  useEffect(() => {
    let vivo = true;
    leggiClienti()
      .then((c) => vivo && setClienti(c))
      .catch(() => vivo && setErrore(true));
    return () => {
      vivo = false;
    };
  }, []);

  const filtrati = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    const tutti = (clienti ?? []).map((c) => ({ c, nome: nomeCliente(c) }));
    tutti.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    if (!q) return tutti;
    return tutti.filter(
      ({ c, nome }) =>
        nome.toLowerCase().includes(q) ||
        (c.codice_fiscale ?? '').toLowerCase().includes(q) ||
        (c.partita_iva ?? '').includes(q),
    );
  }, [clienti, cerca]);

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
            aiuto={{
              argomento: 'cerca',
              testo: 'Scrivi una parte del nome, del cognome o del codice fiscale.',
            }}
          >
            <Input
              aria-label="Cerca un cliente"
              placeholder="Cerca per nome o codice fiscale"
              contentBefore={<Search20Regular />}
              value={cerca}
              onChange={(_, d) => setCerca(d.value)}
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
      ) : filtrati.length === 0 ? (
        <Text>Nessun cliente trovato.</Text>
      ) : (
        <ul className={s.elenco}>
          {filtrati.map(({ c, nome }) => (
            <li key={c.id}>
              <NextLink href={`/clienti/scheda/?id=${c.id}`} className={s.voce}>
                <span className={s.testo}>
                  <Text weight="semibold" className={s.nome}>
                    <ImportoNascosto valore={nome} segnaposto="••••" />
                  </Text>
                  <span className={s.etichette}>
                    <Badge appearance="tint" color={c.tipo === 'ente' ? 'brand' : 'informative'}>
                      {c.tipo === 'ente' ? 'Ente o azienda' : 'Persona'}
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
                  </span>
                </span>
                <ChevronRight20Regular aria-hidden="true" />
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
