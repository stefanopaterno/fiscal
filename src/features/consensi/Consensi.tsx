'use client';

import {
  Badge,
  Button,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { ETICHETTE_STATO, type StatoConsenso } from '@/engine/consensi/stato';
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { oggiIso } from '@/lib/oggi';
import { CampoScelta, Collegamento, Scheda } from '@/ui/Moduli';
import { leggiDpa, leggiQuadro, segnaDpa, type Quadro } from './dati';
import { NomePaziente } from './nomi';

/**
 * Consensi informati (specifica 005, US1, US5, SC-007): pazienti per stato del consenso, con il promemoria
 * sull'accordo per il trattamento dei dati (DPA) finché non è segnato come firmato.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  contatori: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  voce: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} 0`,
    minHeight: '44px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    color: 'inherit',
    textDecorationLine: 'none',
    minWidth: 0,
  },
  testo: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  nota: { color: tokens.colorNeutralForeground3 },
  riga: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalL, alignItems: 'center' },
});

export const COLORE_STATO: Record<StatoConsenso, 'danger' | 'warning' | 'success' | 'informative' | 'severe'> = {
  mancante: 'danger',
  revocato: 'severe',
  incompleto: 'warning',
  da_rinnovare: 'informative',
  presente: 'success',
};

type Filtro = 'da_sistemare' | 'tutti' | StatoConsenso;

export function AvvisoDpa() {
  const [dpa, setDpa] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    leggiDpa().then(setDpa, () => setDpa(undefined));
  }, []);
  if (dpa !== null) return null;
  return (
    <MessageBar intent="warning" layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>Accordo sul trattamento dei dati</MessageBarTitle>
        Copie firmate e consensi sono dati sanitari: firma il DPA con Supabase dalla sua dashboard (Organization → Legal
        Documents). I dati stanno già in Unione Europea (Francoforte). Ricorda anche l&apos;informativa ai pazienti.
      </MessageBarBody>
      <MessageBarActions>
        <Button
          onClick={async () => {
            await segnaDpa(oggiIso());
            setDpa(oggiIso());
          }}
        >
          L&apos;ho firmato
        </Button>
      </MessageBarActions>
    </MessageBar>
  );
}

export function Consensi() {
  const s = useStili();
  const [quadro, setQuadro] = useState<Quadro | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('da_sistemare');

  useEffect(() => {
    leggiQuadro().then(setQuadro, () => setErrore('Non riesco a leggere i consensi: controlla la connessione e riprova.'));
  }, []);

  if (errore) return <MessageBar intent="error"><MessageBarBody>{errore}</MessageBarBody></MessageBar>;
  if (!quadro) return <Spinner label="Carico i consensi…" />;

  const conta = (st: StatoConsenso) => quadro.pazienti.filter((p) => quadro.stati.get(p.id)?.stato === st).length;
  const visibili = quadro.pazienti.filter((p) => {
    const st = quadro.stati.get(p.id)!.stato;
    return filtro === 'tutti' || (filtro === 'da_sistemare' ? st !== 'presente' : st === filtro);
  });
  const diciotto = quadro.pazienti.filter((p) => quadro.stati.get(p.id)?.diciottoVicini);

  return (
    <div className={s.colonna}>
      <AvvisoDpa />
      {!quadro.tipi.length ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            Prima crea i tuoi tipi di consenso (per esempio «Percorso individuale», «Teleconsulto») e carica i tuoi testi:
            Fiscal non propone testi legali. <Collegamento href="/consensi/modelli/" inLinea>Tipi e modelli</Collegamento>
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <Scheda
        titolo="Pazienti e consensi"
        aiuto={{
          argomento: 'stato del consenso',
          testo:
            'Per ogni paziente: presente, mancante, incompleto (manca una firma), revocato o da rinnovare (nuova versione del testo o compiuti 18 anni). Il consenso non scade.',
          perche:
            'Il Codice deontologico chiede il consenso informato prima di iniziare; per i minori quello di entrambi i genitori o di chi ne ha la responsabilità legale.',
          fonte: 'Codice deontologico degli psicologi, artt. 24 e 31 (da verificare con l\'Ordine)',
          daVerificare: true,
        }}
        azioni={<Collegamento href="/consensi/modelli/">Tipi di consenso e modelli</Collegamento>}
      >
        <div className={s.contatori}>
          {(['mancante', 'incompleto', 'revocato', 'da_rinnovare', 'presente'] as StatoConsenso[]).map((st) => (
            <Badge key={st} appearance="tint" color={COLORE_STATO[st]} size="large">
              {ETICHETTE_STATO[st]}: {conta(st)}
            </Badge>
          ))}
        </div>
        <CampoScelta<Filtro>
          etichetta="Mostra"
          valore={filtro}
          onChange={setFiltro}
          opzioni={[
            { valore: 'da_sistemare', etichetta: 'Da sistemare' },
            { valore: 'tutti', etichetta: 'Tutti i pazienti' },
            ...(['mancante', 'incompleto', 'revocato', 'da_rinnovare', 'presente'] as StatoConsenso[]).map((st) => ({ valore: st, etichetta: ETICHETTE_STATO[st] })),
          ]}
          aiuto={{ argomento: 'filtro', testo: '«Da sistemare» mostra tutti i pazienti con un consenso che non è a posto.' }}
        />
        {!quadro.pazienti.length ? (
          <Text>
            Nessun paziente in rubrica. <Collegamento href="/clienti/scheda/" inLinea>Aggiungi un paziente</Collegamento>
          </Text>
        ) : !visibili.length ? (
          <Text>{filtro === 'da_sistemare' ? 'Tutti i consensi sono a posto.' : 'Nessun paziente in questo stato.'}</Text>
        ) : (
          <ul className={s.elenco} aria-label="Pazienti">
            {visibili.map((p) => {
              const e = quadro.stati.get(p.id)!;
              return (
                <li key={p.id}>
                  <NextLink href={`/consensi/paziente/?id=${p.id}`} className={s.voce}>
                    <span className={s.testo}>
                      <Text weight="semibold">
                        <NomePaziente cliente={p} />
                      </Text>
                      <Text size={200} className={s.nota}>
                        {e.motivo}
                      </Text>
                    </span>
                    <Badge appearance="tint" color={COLORE_STATO[e.stato]}>
                      {ETICHETTE_STATO[e.stato]}
                    </Badge>
                  </NextLink>
                </li>
              );
            })}
          </ul>
        )}
      </Scheda>

      {diciotto.length ? (
        <Scheda titolo="Diventano maggiorenni" aiuto={{ argomento: 'maggiorenni', testo: 'Compiuti 18 anni serve un nuovo consenso firmato dalla persona stessa.' }}>
          <ul className={s.elenco}>
            {diciotto.map((p) => (
              <li key={p.id} className={s.voce}>
                <NomePaziente cliente={p} />
                <Text>il {dataItaliana(quadro.stati.get(p.id)!.diciottoVicini!)}</Text>
              </li>
            ))}
          </ul>
        </Scheda>
      ) : null}
    </div>
  );
}
