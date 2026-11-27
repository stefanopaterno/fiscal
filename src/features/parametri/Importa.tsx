'use client';

import {
  Badge,
  Button,
  Checkbox,
  Link,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import { DocumentArrowUp20Regular } from '@fluentui/react-icons';
import { useRef, useState } from 'react';
import { formattaEuro } from '@/engine/importi';
import { calcolaImpatti, preparaApprovazione, valoreInUso } from '@/engine/parametri/anteprima';
import { registroAttivo } from '@/engine/parametri/attivi';
import { parametro } from '@/engine/parametri/catalogo';
import { leggiFile, LIMITE_FILE } from '@/engine/parametri/leggi-file';
import { mostraValore } from '@/engine/parametri/mostra';
import type { EsitoVoce, FileAggiornamento, GruppoEsito } from '@/engine/parametri/tipi';
import { validaFile } from '@/engine/parametri/valida';
import { nuovoId, spiegaErrore } from '@/features/fatturazione/dati';
import { componiAnno, leggiGrezziAnno, type GrezziAnno } from '@/features/tasse/dati';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { Scheda } from '@/ui/Moduli';
import { approvaParametri, leggiAddizionali, leggiAmbito, leggiAnniChiusi } from './dati';
import { ricaricaRegistro } from './ProviderParametri';

/**
 * Scheda «Importa» (specifica 014, US2 e US3): incolla o carica il file di Claude, controlla ogni voce, mostra
 * prima → dopo e impatto, approva tutto o voce per voce. Il contenuto del file si mostra sempre come testo.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  riga: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalM, alignItems: 'center' },
  testo: { width: '100%', minHeight: '160px', fontFamily: tokens.fontFamilyMonospace },
  pulsante: { minHeight: '44px' },
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  voce: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  nota: { color: tokens.colorNeutralForeground3 },
  avviso: { color: tokens.colorPaletteMarigoldForeground2 },
  nascosto: { display: 'none' },
});

const GRUPPI: { gruppo: GruppoEsito; titolo: string; aiuto: string }[] = [
  { gruppo: 'cambia', titolo: 'Cambiano', aiuto: 'Valori diversi da quelli in uso: si applicano solo se li approvi.' },
  { gruppo: 'conferma', titolo: 'Confermati', aiuto: 'Stesso valore già in uso; approvando ne registri la fonte (e passa a «verificata» se la fonte è ufficiale).' },
  { gruppo: 'bloccata', titolo: 'Bloccati (anno chiuso)', aiuto: 'Gli anni chiusi non cambiano: servirebbe una norma retroattiva e riaprire l\'anno dalla Dichiarazione.' },
  { gruppo: 'scartata', titolo: 'Scartati', aiuto: 'Voci che non hanno superato i controlli: il motivo è accanto a ciascuna.' },
];

type Stato =
  | { fase: 'vuoto' }
  | { fase: 'controllo' }
  | { fase: 'anteprima'; file: FileAggiornamento; esiti: EsitoVoce[]; bozze: Record<string, number> }
  | { fase: 'fatto'; righe: number; modifiche: number };

const dataIt = (d: string) => d.split('-').reverse().join('/');

export function Importa({ onApprovato }: { onApprovato?: () => void }) {
  const s = useStili();
  const [testo, setTesto] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [stato, setStato] = useState<Stato>({ fase: 'vuoto' });
  const [scelte, setScelte] = useState<Set<number>>(new Set());
  const [confermaAnomale, setConfermaAnomale] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function controlla(contenuto: string) {
    setErrore(null);
    const l = leggiFile(contenuto);
    if (!l.ok) {
      setErrore(l.motivo);
      setStato({ fase: 'vuoto' });
      return;
    }
    setStato({ fase: 'controllo' });
    try {
      const file = l.file;
      const anni = [...new Set(file.anni)];
      const [anniChiusi, addizionali, grezzi] = await Promise.all([
        leggiAnniChiusi(),
        leggiAddizionali(anni),
        Promise.all(anni.map((a) => leggiGrezziAnno(a).catch(() => null))),
      ]);
      const perAnno = new Map<number, GrezziAnno | null>(anni.map((a, i) => [a, grezzi[i] ?? null]));
      const ambito = leggiAmbito();
      const esiti = validaFile(file, {
        anniChiusi,
        ambito: ambito ?? undefined,
        dominiExtra: ambito?.siti ?? [],
        registro: registroAttivo(),
        inUso: (p, c) => valoreInUso(p, c, addizionali),
      });
      const fatture = [...perAnno.values()].flatMap((g) => g?.fatture ?? []).filter((f) => f.stato === 'emessa' && f.tipo === 'fattura');
      const fatturaTipo = fatture.length ? Math.round(fatture.reduce((t, f) => t + f.totale_compensi, 0) / fatture.length) : undefined;
      const conImpatti = calcolaImpatti(esiti, {
        fatturaTipo,
        inputAnno: (a) => {
          const g = perAnno.get(a);
          if (!g || g.cu.length === 0) return null;
          return { ...componiAnno(a, g).input, addizionali: addizionali[a] ?? componiAnno(a, g).input.addizionali };
        },
      });
      // bozze con data dalla decorrenza in poi (per i parametri per data)
      const bozzeTutte = [...perAnno.values()].flatMap((g) => g?.fatture ?? []).filter((f) => f.stato === 'bozza');
      const bozze: Record<string, number> = {};
      for (const e of conImpatti) if (e.dal) bozze[e.dal] = bozzeTutte.filter((f) => f.data >= e.dal!).length;
      setScelte(new Set(conImpatti.filter((e) => e.gruppo === 'cambia' || e.gruppo === 'conferma').map((e) => e.indice)));
      setConfermaAnomale(false);
      setStato({ fase: 'anteprima', file, esiti: conImpatti, bozze });
    } catch (e) {
      setErrore(spiegaErrore(e));
      setStato({ fase: 'vuoto' });
    }
  }

  async function caricaFile(f: File | undefined) {
    if (!f) return;
    if (f.size > LIMITE_FILE) {
      setErrore('Il file è troppo grande (oltre 256 KB).');
      return;
    }
    const t = await f.text();
    setTesto(t);
    await controlla(t);
  }

  async function approva() {
    if (stato.fase !== 'anteprima') return;
    setSalvo(true);
    setErrore(null);
    try {
      const a = preparaApprovazione(stato.file, stato.esiti, scelte, nuovoId);
      if (a.righe.length === 0 && a.importazione.modifiche_programma.length === 0) {
        setErrore('Non hai scelto nessuna voce.');
        return;
      }
      const n = await approvaParametri(a);
      await ricaricaRegistro();
      setStato({ fase: 'fatto', righe: n, modifiche: a.importazione.modifiche_programma.length });
      setTesto('');
      onApprovato?.();
    } catch (e) {
      setErrore(spiegaErrore(e));
    } finally {
      setSalvo(false);
    }
  }

  const anomaleScelte = stato.fase === 'anteprima' && stato.esiti.some((e) => e.anomala && scelte.has(e.indice));

  return (
    <div className={s.colonna}>
      <Scheda
        titolo="Incolla la risposta di Claude"
        aiuto={{
          argomento: 'importa',
          testo: 'Incolla tutta la risposta (anche con il testo intorno) o carica il file. Niente cambia finché non approvi.',
        }}
      >
        <Textarea
          className={s.testo}
          value={testo}
          onChange={(_, d) => setTesto(d.value)}
          resize="vertical"
          placeholder={'```json\n{ "versione_schema": 1, … }\n```'}
          aria-label="Risposta di Claude"
        />
        <div className={s.riga}>
          <Button appearance="primary" className={s.pulsante} disabled={!testo.trim() || stato.fase === 'controllo'} onClick={() => void controlla(testo)}>
            Controlla
          </Button>
          <Button className={s.pulsante} icon={<DocumentArrowUp20Regular />} onClick={() => input.current?.click()}>
            Carica un file
          </Button>
          <input
            ref={input}
            className={s.nascosto}
            type="file"
            accept=".json,.md,.txt,application/json,text/plain,text/markdown"
            onChange={(e) => void caricaFile(e.target.files?.[0])}
          />
          {stato.fase === 'controllo' ? <Spinner size="small" label="Controllo le voci e calcolo l'impatto…" /> : null}
        </div>
        {errore ? (
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>{errore}</MessageBarBody>
          </MessageBar>
        ) : null}
        {stato.fase === 'fatto' ? (
          <MessageBar intent="success" layout="multiline">
            <MessageBarBody>
              <MessageBarTitle>Fatto</MessageBarTitle>
              {stato.righe} {stato.righe === 1 ? 'voce approvata' : 'voci approvate'}
              {stato.modifiche ? `; ${stato.modifiche} novità da fare nel programma in «Novità»` : ''}. I calcoli usano già i nuovi valori.
            </MessageBarBody>
          </MessageBar>
        ) : null}
      </Scheda>

      {stato.fase === 'anteprima' ? (
        <>
          <MessageBar intent="info" layout="multiline">
            <MessageBarBody>
              Ricerca del {dataIt(stato.file.data_ricerca)} per {stato.file.anni.join(', ')}
              {stato.file.ambito ? ` (${stato.file.ambito.comune}, ${stato.file.ambito.regione})` : ''}.
              {stato.file.fonti_controllate?.some((f) => !f.raggiunta)
                ? ` Fonti non raggiunte: ${stato.file.fonti_controllate.filter((f) => !f.raggiunta).map((f) => f.nome).join(', ')}.`
                : ''}
            </MessageBarBody>
          </MessageBar>

          {GRUPPI.map((g) => {
            const voci = stato.esiti.filter((e) => e.gruppo === g.gruppo);
            if (!voci.length) return null;
            const approvabile = g.gruppo === 'cambia' || g.gruppo === 'conferma';
            return (
              <Scheda key={g.gruppo} titolo={`${g.titolo} (${voci.length})`} aiuto={{ argomento: g.titolo.toLowerCase(), testo: g.aiuto }}>
                <ul className={s.elenco}>
                  {voci.map((e) => (
                    <VoceAnteprima
                      key={e.indice}
                      e={e}
                      bozze={e.dal ? stato.bozze[e.dal] : undefined}
                      scelta={approvabile ? scelte.has(e.indice) : undefined}
                      onScelta={(v) =>
                        setScelte((x) => {
                          const n = new Set(x);
                          if (v) n.add(e.indice);
                          else n.delete(e.indice);
                          return n;
                        })
                      }
                    />
                  ))}
                </ul>
              </Scheda>
            );
          })}

          {stato.file.modifiche_programma.length ? (
            <Scheda
              titolo={`Da fare nel programma (${stato.file.modifiche_programma.length})`}
              aiuto={{
                argomento: 'modifiche al programma',
                testo: 'Novità che non sono un semplice valore: le trovi poi in «Novità» e vanno fatte con un aggiornamento di Fiscal. Non cambiano i calcoli.',
              }}
            >
              <ul className={s.elenco}>
                {stato.file.modifiche_programma.map((m) => (
                  <li key={`${m.titolo}|${m.fonte.url}`} className={s.voce}>
                    <Text weight="semibold">{m.titolo}</Text>
                    <Text>{m.descrizione}</Text>
                    {m.dal ? <Text size={200}>Da quando: {dataIt(m.dal)}</Text> : null}
                    <Fonte titolo={m.fonte.titolo} url={m.fonte.url} />
                  </li>
                ))}
              </ul>
            </Scheda>
          ) : null}

          <div className={s.colonna}>
            {anomaleScelte ? (
              <Checkbox
                checked={confermaAnomale}
                onChange={(_, d) => setConfermaAnomale(!!d.checked)}
                label="Ho controllato le variazioni molto forti e le fonti: sono giuste."
              />
            ) : null}
            <div className={s.riga}>
              <Button
                appearance="primary"
                className={s.pulsante}
                disabled={salvo || (anomaleScelte && !confermaAnomale) || (scelte.size === 0 && stato.file.modifiche_programma.length === 0)}
                onClick={() => void approva()}
              >
                {salvo ? 'Salvo…' : `Approva ${scelte.size} ${scelte.size === 1 ? 'voce' : 'voci'}`}
              </Button>
              <Button className={s.pulsante} onClick={() => setStato({ fase: 'vuoto' })}>
                Annulla
              </Button>
            </div>
            <Text size={200} className={s.nota}>
              Le fatture già emesse e gli anni chiusi non cambiano. Ogni aggiornamento si può annullare da «In uso».
            </Text>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Fonte({ titolo, url }: { titolo: string; url: string }) {
  // Solo collegamenti https (il file è già controllato); testo sempre come testo
  const sicuro = /^https:\/\//.test(url);
  return sicuro ? (
    <Link href={url} target="_blank" rel="noopener noreferrer">
      Fonte: {titolo}
    </Link>
  ) : (
    <Text size={200}>Fonte: {titolo}</Text>
  );
}

function VoceAnteprima({
  e,
  bozze,
  scelta,
  onScelta,
}: {
  e: EsitoVoce;
  bozze?: number;
  scelta?: boolean;
  onScelta: (v: boolean) => void;
}) {
  const s = useStili();
  const p = parametro(e.chiave);
  const decorrenza = e.dal ? `dal ${dataIt(e.dal)}` : e.anno ? `anno ${e.anno}` : '';
  return (
    <li className={s.voce}>
      <div className={s.riga}>
        {scelta !== undefined ? (
          <Checkbox checked={scelta} onChange={(_, d) => onScelta(!!d.checked)} label={<Text weight="semibold">{e.nome}</Text>} />
        ) : (
          <Text weight="semibold">{e.nome}</Text>
        )}
        {decorrenza ? <Badge appearance="outline">{decorrenza}</Badge> : null}
        {e.statoFinale ? (
          <Badge appearance="tint" color={e.statoFinale === 'verificata' ? 'success' : 'warning'}>
            {e.statoFinale === 'verificata' ? 'verificata' : 'da verificare'}
          </Badge>
        ) : null}
        {e.anomala ? (
          <Badge appearance="tint" color="danger">
            controlla bene
          </Badge>
        ) : null}
      </div>
      {p && (e.gruppo === 'cambia' || e.gruppo === 'conferma' || e.gruppo === 'bloccata') ? (
        <Text>
          {e.gruppo === 'conferma' ? mostraValore(p, e.dopo) : `${mostraValore(p, e.prima)} → ${mostraValore(p, e.dopo)}`}
        </Text>
      ) : null}
      {typeof e.impatto === 'number' ? (
        <Text>
          Tasse e contributi del {e.anno ?? e.dal?.slice(0, 4)}:{' '}
          {e.impatto === 0 ? (
            'per te non cambia nulla'
          ) : (
            <>
              <ImportoNascosto valore={formattaEuro(Math.abs(e.impatto))} /> {e.impatto > 0 ? 'in più' : 'in meno'}
            </>
          )}
        </Text>
      ) : e.impattoTesto ? (
        <Text>{e.impattoTesto}</Text>
      ) : null}
      {bozze ? <Text size={200}>{bozze} {bozze === 1 ? 'bozza' : 'bozze'} con data da quel giorno useranno il nuovo valore.</Text> : null}
      {e.nota ? <Text size={200}>{e.nota}</Text> : null}
      {e.motivi.map((m) => (
        <Text key={m} size={200} className={e.gruppo === 'scartata' || e.gruppo === 'bloccata' || e.anomala ? s.avviso : s.nota}>
          {m}
        </Text>
      ))}
      {e.fonte ? <Fonte titolo={`${e.fonte.titolo}${e.fonte.riferimento ? `, ${e.fonte.riferimento}` : ''} (${dataIt(e.fonte.data_atto)})`} url={e.fonte.url} /> : null}
    </li>
  );
}
