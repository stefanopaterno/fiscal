'use client';

import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { ArrowUndo20Regular, Delete20Regular, Document20Regular, Link20Regular } from '@fluentui/react-icons';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { sembraClinico } from '@/engine/documenti/nomi';
import { formattaEuro } from '@/engine/importi';
import { regoleDocumenti, type TipoDocumento } from '@/engine/regole/documenti';
import { dataItaliana, titoloDocumento } from '@/features/fatturazione/DettaglioFattura';
import { leggiFatture, spiegaErrore, type Fattura } from '@/features/fatturazione/dati';
import { categorieAttive, regoleOVicine } from '@/features/spese/comuni';
import { leggiImpostazioniSpese, leggiSpese, type Spesa } from '@/features/spese/dati';
import { CampoEuro } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoData, CampoScelta, CampoSiNo, CampoTesto, Collegamento, Griglia, Scheda } from '@/ui/Moduli';
import {
  aggiornaDocumento,
  apriFile,
  cestina,
  collega,
  creaSpesaDaFattura,
  eliminaDefinitivo,
  leggiCollegamenti,
  leggiDocumento,
  leggiVersioni,
  ripristina,
  scollega,
  sostituisciFile,
  type Collegamento as Legame,
  type Documento,
  type Versione,
} from './dati';
import { ETICHETTA_TIPO } from './etichette';

/** Scheda di un documento (US1, US3, US4, US6): file, dati, collegamenti, versioni, cestino, spesa. */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
  pulsante: { minHeight: '44px' },
  nascosto: { display: 'none' },
  riga: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minHeight: '44px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  testo: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
});

type Contesto = { spese: Spesa[]; fatture: Fattura[]; categorie: { valore: string; etichetta: string }[] };

export function SchedaDocumento({ id }: { id: string }) {
  const s = useStili();
  const router = useRouter();
  const [doc, setDoc] = useState<Documento | null>(null);
  const [legami, setLegami] = useState<Legame[]>([]);
  const [versioni, setVersioni] = useState<Versione[]>([]);
  const [ctx, setCtx] = useState<Contesto>({ spese: [], fatture: [], categorie: [] });
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [categoria, setCategoria] = useState('software');
  const [voce, setVoce] = useState<'spesa' | 'fattura'>('spesa');
  const [voceId, setVoceId] = useState('');
  const [originale, setOriginale] = useState(false);
  const [confermaElimina, setConfermaElimina] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);

  const ricarica = () =>
    Promise.all([
      leggiDocumento(id),
      leggiCollegamenti(),
      leggiVersioni(id),
      leggiSpese(),
      leggiFatture(),
      leggiImpostazioniSpese(),
    ])
      .then(([d, c, v, spese, fatture, imp]) => {
        setDoc(d);
        setLegami(c.filter((x) => x.documento_id === id));
        setVersioni(v);
        const regole = regoleOVicine(d?.anno ?? new Date().getFullYear());
        setCtx({
          spese,
          fatture: fatture.filter((f) => f.stato !== 'bozza'),
          categorie: categorieAttive(regole, imp?.categorie_attive ?? []).map((c) => ({
            valore: c.codice,
            etichetta: c.nome,
          })),
        });
      })
      .catch(() =>
        setEsito({ ok: false, testo: 'Non riesco a leggere il documento. Controlla la connessione.' }),
      );

  useEffect(() => {
    void ricarica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!doc) return esito ? <Text>{esito.testo}</Text> : <Spinner label="Un momento…" />;
  const d = doc;
  const conservazione = regoleDocumenti(d.anno).conservazione[d.tipo];
  const clinico = sembraClinico(`${d.descrizione ?? ''}`);
  const cambia =
    <K extends keyof Documento>(k: K) =>
    (v: Documento[K]) =>
      setDoc((x) => (x ? { ...x, [k]: v } : x));

  async function esegui(azione: () => Promise<unknown>, ok: string) {
    try {
      await azione();
      setEsito({ ok: true, testo: ok });
      await ricarica();
    } catch (e) {
      setEsito({ ok: false, testo: spiegaErrore(e) });
    }
  }

  async function apri(percorso: string) {
    const url = await apriFile(percorso);
    if (url) window.open(url, '_blank', 'noopener');
    else setEsito({ ok: false, testo: 'Non riesco ad aprire il file.' });
  }

  const nomeVoce = (l: Legame) => {
    if (l.voce === 'spesa') {
      const x = ctx.spese.find((y) => y.id === l.voce_id);
      return x ? `Spesa del ${dataItaliana(x.data)}${x.fornitore ? ` · ${x.fornitore}` : ''}` : 'Spesa';
    }
    if (l.voce === 'fattura') {
      const x = ctx.fatture.find((y) => y.id === l.voce_id);
      return x ? titoloDocumento(x) : 'Fattura';
    }
    return l.voce;
  };
  const scelte =
    voce === 'spesa'
      ? ctx.spese.map((x) => ({
          valore: x.id,
          etichetta: `${dataItaliana(x.data)} · ${x.fornitore ?? x.categoria} · ${formattaEuro(x.importo)}`,
        }))
      : ctx.fatture.map((x) => ({
          valore: x.id,
          etichetta: `${titoloDocumento(x)} · ${dataItaliana(x.data)}`,
        }));

  return (
    <div className={s.colonna}>
      <Scheda
        titolo={d.emittente ?? ETICHETTA_TIPO[d.tipo]}
        aiuto={{
          argomento: 'documento',
          testo: conservazione.valore.spiegazione,
          daDove: conservazione.fonte,
        }}
        azioni={
          <div className={s.azioni}>
            <Button
              appearance="primary"
              className={s.pulsante}
              icon={<Document20Regular />}
              onClick={() => void apri(d.file_percorso)}
            >
              Apri il file
            </Button>
            <Text size={200}>
              {d.file_nome} · {Math.ceil(d.file_dimensione / 1024)} KB
            </Text>
          </div>
        }
      >
        <Text>
          {ETICHETTA_TIPO[d.tipo]}
          {d.data ? ` del ${dataItaliana(d.data)}` : ''}
          {d.importo != null ? (
            <>
              {' · '}
              <ImportoNascosto valore={formattaEuro(d.importo)} />
            </>
          ) : null}
        </Text>
        {conservazione.valore.aNorma ? (
          <MessageBar intent="info" layout="multiline">
            <MessageBarBody>
              <MessageBarTitle>Da conservare a norma</MessageBarTitle>
              {conservazione.valore.spiegazione}
            </MessageBarBody>
          </MessageBar>
        ) : null}
        {d.eliminato_il ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              È nel cestino: puoi ripristinarlo entro 30 giorni dall&apos;eliminazione.
            </MessageBarBody>
          </MessageBar>
        ) : null}
      </Scheda>

      {d.tipo === 'fattura_ricevuta' && d.stato === 'da_classificare' && !d.eliminato_il ? (
        <Scheda
          titolo="È una spesa dell'attività?"
          aiuto={{
            argomento: 'classificare la fattura',
            testo:
              "Se è una spesa per il lavoro, scegli la categoria: creo la spesa con fornitore, data e importo della fattura, già con il giustificativo. Se è una spesa personale o non c'entra con l'attività, segnala.",
          }}
          azioni={
            <div className={s.azioni}>
              <Button
                appearance="primary"
                className={s.pulsante}
                onClick={() =>
                  void esegui(
                    () => creaSpesaDaFattura(d, categoria),
                    'Spesa creata e collegata alla fattura.',
                  )
                }
              >
                Crea la spesa
              </Button>
              <Button
                className={s.pulsante}
                onClick={() =>
                  void esegui(
                    () => aggiornaDocumento(d.id, { stato: 'archiviato', non_spesa: true }),
                    "Segnata come non spesa dell'attività.",
                  )
                }
              >
                Non è una spesa dell&apos;attività
              </Button>
            </div>
          }
        >
          {d.fattura ? (
            <Text>
              {d.fattura.fornitore} · n. {d.fattura.numero} del{' '}
              {d.fattura.data ? dataItaliana(d.fattura.data) : '—'} · totale{' '}
              <ImportoNascosto valore={formattaEuro(d.fattura.totale ?? 0)} />
              {d.fattura.iva ? (
                <>
                  {' '}
                  (IVA <ImportoNascosto valore={formattaEuro(d.fattura.iva)} />, con le sedute esenti è un
                  costo)
                </>
              ) : null}
            </Text>
          ) : null}
          <CampoScelta
            etichetta="Categoria della spesa"
            valore={categoria}
            onChange={setCategoria}
            opzioni={ctx.categorie}
            aiuto={{ argomento: 'categoria', testo: 'Decide quanto della spesa puoi dedurre.' }}
          />
        </Scheda>
      ) : null}

      <Scheda
        titolo="Dati"
        aiuto={{ argomento: 'dati del documento', testo: 'Servono a ritrovarlo. Niente dati dei pazienti.' }}
      >
        <Griglia>
          <CampoScelta
            etichetta="Tipo"
            valore={d.tipo}
            onChange={(v) => cambia('tipo')(v as TipoDocumento)}
            opzioni={(Object.keys(ETICHETTA_TIPO) as TipoDocumento[]).map((t) => ({
              valore: t,
              etichetta: ETICHETTA_TIPO[t],
            }))}
            aiuto={{ argomento: 'tipo', testo: 'Decide anche quanto va conservato.' }}
          />
          <CampoData
            etichetta="Data"
            valore={d.data ?? ''}
            onChange={(v) => cambia('data')(v || null)}
            aiuto={{ argomento: 'data', testo: 'La data del documento.' }}
          />
          <CampoTesto
            etichetta="Chi l'ha emesso"
            lunghezzaMax={120}
            valore={d.emittente ?? ''}
            onChange={(v) => cambia('emittente')(v || null)}
            aiuto={{ argomento: 'emittente', testo: 'Fornitore, negozio, ente.' }}
          />
          <CampoEuro
            etichetta="Importo"
            facoltativo
            valore={d.importo}
            onChange={cambia('importo')}
            aiuto={{ argomento: 'importo', testo: 'Se ha un importo.' }}
          />
          <CampoTesto
            etichetta="Descrizione"
            lunghezzaMax={200}
            valore={d.descrizione ?? ''}
            onChange={(v) => cambia('descrizione')(v || null)}
            aiuto={{ argomento: 'descrizione', testo: 'Due parole per ritrovarlo.' }}
          />
          <CampoData
            etichetta="Scade il"
            valore={d.scadenza ?? ''}
            onChange={(v) => cambia('scadenza')(v || null)}
            suggerimento="Facoltativo"
            aiuto={{ argomento: 'scadenza', testo: 'Per polizze e certificati: ti avviso un mese prima.' }}
          />
        </Griglia>
        {clinico.length ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              Sembrano dati clinici ({clinico.join(', ')}): non vanno in questo archivio.
            </MessageBarBody>
          </MessageBar>
        ) : null}
        <Button
          className={s.pulsante}
          onClick={() =>
            void esegui(
              () =>
                aggiornaDocumento(d.id, {
                  tipo: d.tipo,
                  data: d.data,
                  anno: d.data ? Number(d.data.slice(0, 4)) : d.anno,
                  emittente: d.emittente,
                  importo: d.importo,
                  descrizione: d.descrizione,
                  scadenza: d.scadenza,
                }),
              'Salvato.',
            )
          }
        >
          Salva i dati
        </Button>
      </Scheda>

      <Scheda
        titolo="Collegato a"
        aiuto={{
          argomento: 'collegamenti',
          testo:
            'Collega il documento alla spesa o alla fattura a cui si riferisce: una spesa con il documento collegato ha il suo giustificativo.',
        }}
      >
        {legami.length === 0 ? <Text>Non è collegato a niente.</Text> : null}
        {legami.map((l) => (
          <div key={l.id} className={s.riga}>
            <span className={s.testo}>
              <Text>{nomeVoce(l)}</Text>
            </span>
            {l.voce === 'spesa' ? (
              <Collegamento href={`/spese/scheda/?id=${l.voce_id}`}>Apri</Collegamento>
            ) : null}
            <Button
              appearance="subtle"
              className={s.pulsante}
              onClick={() => void esegui(() => scollega(l), 'Scollegato.')}
            >
              Scollega
            </Button>
          </div>
        ))}
        <Griglia>
          <CampoScelta
            etichetta="Collega a"
            valore={voce}
            onChange={(v) => {
              setVoce(v);
              setVoceId('');
            }}
            opzioni={[
              { valore: 'spesa', etichetta: 'Una spesa' },
              { valore: 'fattura', etichetta: 'Una mia fattura' },
            ]}
            aiuto={{ argomento: 'tipo di voce', testo: 'A cosa si riferisce il documento.' }}
          />
          <CampoScelta
            etichetta="Quale"
            valore={voceId}
            onChange={setVoceId}
            opzioni={[{ valore: '', etichetta: 'Scegli…' }, ...scelte]}
            aiuto={{ argomento: 'voce', testo: 'Le più recenti in alto.' }}
          />
        </Griglia>
        <Button
          className={s.pulsante}
          icon={<Link20Regular />}
          disabled={!voceId}
          onClick={() => void esegui(() => collega(d.id, voce, voceId), 'Collegato.')}
        >
          Collega
        </Button>
      </Scheda>

      <Scheda
        titolo="Versioni del file"
        aiuto={{
          argomento: 'versioni',
          testo: 'Se sostituisci il file, quello vecchio resta qui: non si perde niente.',
        }}
      >
        {versioni.length === 0 ? <Text>Nessuna versione precedente.</Text> : null}
        {versioni.map((v) => (
          <div key={v.id} className={s.riga}>
            <span className={s.testo}>
              <Text>
                Versione {v.versione_file}, sostituita il {dataItaliana(v.sostituito_il.slice(0, 10))}
              </Text>
            </span>
            <Button appearance="subtle" className={s.pulsante} onClick={() => void apri(v.file_percorso)}>
              Apri
            </Button>
          </div>
        ))}
        <CampoSiNo
          etichetta="Conserva la foto originale"
          valore={originale}
          onChange={setOriginale}
          aiuto={{
            argomento: 'foto originale',
            testo: 'Altrimenti le foto vengono ridotte mantenendo il testo leggibile.',
          }}
        />
        <Button className={s.pulsante} onClick={() => inputFile.current?.click()}>
          Sostituisci il file
        </Button>
        <input
          ref={inputFile}
          type="file"
          accept="application/pdf,image/*,.xml,.p7m"
          className={s.nascosto}
          aria-label="Nuovo file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
              void esegui(
                () => sostituisciFile(d, f, originale),
                'File sostituito; il precedente è tra le versioni.',
              );
          }}
        />
      </Scheda>

      {esito ? (
        <MessageBar intent={esito.ok ? 'success' : 'error'}>
          <MessageBarBody>{esito.testo}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div className={s.azioni}>
        {d.eliminato_il ? (
          <>
            <Button
              className={s.pulsante}
              icon={<ArrowUndo20Regular />}
              onClick={() => void esegui(() => ripristina(d.id), 'Ripristinato.')}
            >
              Ripristina
            </Button>
            {confermaElimina ? (
              <Button
                appearance="primary"
                className={s.pulsante}
                icon={<Delete20Regular />}
                onClick={() =>
                  void eliminaDefinitivo(d)
                    .then(() => router.push('/documenti/'))
                    .catch((e: unknown) => setEsito({ ok: false, testo: spiegaErrore(e) }))
                }
              >
                Sì, elimina per sempre
              </Button>
            ) : (
              <Button
                className={s.pulsante}
                icon={<Delete20Regular />}
                onClick={() => setConfermaElimina(true)}
              >
                Elimina per sempre
              </Button>
            )}
          </>
        ) : confermaElimina ? (
          <>
            <Text>
              {conservazione.valore.anni
                ? `Attenzione: questo tipo di documento va conservato per ${conservazione.valore.anni} anni. `
                : ''}
              Va nel cestino per 30 giorni.
            </Text>
            <Button
              appearance="primary"
              className={s.pulsante}
              onClick={() => void esegui(() => cestina(d.id), 'Spostato nel cestino.')}
            >
              Sposta nel cestino
            </Button>
            <Button className={s.pulsante} onClick={() => setConfermaElimina(false)}>
              Annulla
            </Button>
          </>
        ) : (
          <Button className={s.pulsante} icon={<Delete20Regular />} onClick={() => setConfermaElimina(true)}>
            Elimina
          </Button>
        )}
      </div>
    </div>
  );
}
