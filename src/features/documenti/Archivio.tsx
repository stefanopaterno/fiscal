'use client';

import {
  Badge,
  Button,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  ArrowUpload20Regular,
  DocumentArrowDown20Regular,
  Search20Regular,
} from '@fluentui/react-icons';
import NextLink from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { scriviZip } from '@/engine/documenti/zip';
import { formattaEuro } from '@/engine/importi';
import { regoleDocumenti, type TipoDocumento } from '@/engine/regole/documenti';
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { oggiIso } from '@/lib/oggi';
import { AvvisoExportInChiaro } from '@/ui/AvvisoExportInChiaro';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta } from '@/ui/Moduli';
import {
  giorniAllaPulizia,
  importaFatture,
  leggiCollegamenti,
  leggiDocumenti,
  puliziaCestino,
  scaricaFile,
  type Collegamento,
  type Documento,
  type EsitoImportazione,
} from './dati';
import { CaricaDocumento } from './CaricaDocumento';
import { ETICHETTA_TIPO } from './etichette';

/**
 * Archivio dei documenti (specifica 010, US1–US6): ricerca e filtri, da classificare, non collegati,
 * scadenze, cestino; carica un documento o importa le fatture ricevute (XML, P7M, ZIP); esporta.
 */

type Vista = 'tutti' | 'da_classificare' | 'non_collegati' | 'scadenze' | 'cestino';

const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  pulsante: { minHeight: '44px' },
  nascosto: { display: 'none' },
  filtri: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
    gap: tokens.spacingHorizontalM,
    alignItems: 'end',
  },
  cerca: { minHeight: '44px', width: '100%' },
  schede: { overflowX: 'auto', minWidth: 0 },
  scheda: { minHeight: '44px', flexShrink: 0 },
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
    textDecorationLine: 'none',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  testo: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 },
  troncato: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  destra: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 },
});

const GIORNI_AVVISO_SCADENZA = 30;

export function Archivio() {
  const s = useStili();
  const [documenti, setDocumenti] = useState<Documento[] | null>(null);
  const [collegamenti, setCollegamenti] = useState<Collegamento[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('tutti');
  const [cerca, setCerca] = useState('');
  const [anno, setAnno] = useState('tutti');
  const [tipo, setTipo] = useState('tutti');
  const [importando, setImportando] = useState(false);
  const [esito, setEsito] = useState<EsitoImportazione | null>(null);
  const [caricare, setCaricare] = useState<File[] | null>(null);
  const [esporta, setEsporta] = useState(false);
  const inputImporta = useRef<HTMLInputElement>(null);
  const inputCarica = useRef<HTMLInputElement>(null);

  const ricarica = () =>
    Promise.all([leggiDocumenti(), leggiCollegamenti()])
      .then(async ([d, c]) => {
        const tolti = await puliziaCestino(d).catch(() => 0);
        setDocumenti(tolti ? await leggiDocumenti() : d);
        setCollegamenti(c);
      })
      .catch(() => setErrore("Non riesco a leggere l'archivio. Controlla la connessione e ricarica."));

  useEffect(() => {
    void ricarica();
  }, []);

  const oggi = oggiIso();
  const limiteScadenza = new Date(Date.parse(oggi) + GIORNI_AVVISO_SCADENZA * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const collegati = useMemo(() => new Set(collegamenti.map((c) => c.documento_id)), [collegamenti]);
  const attivi = (documenti ?? []).filter((d) => !d.eliminato_il);
  const conta = {
    da_classificare: attivi.filter((d) => d.stato === 'da_classificare').length,
    non_collegati: attivi.filter((d) => !collegati.has(d.id) && !d.non_spesa).length,
    scadenze: attivi.filter((d) => d.scadenza && d.scadenza <= limiteScadenza).length,
    cestino: (documenti ?? []).filter((d) => d.eliminato_il).length,
  };
  const anni = [...new Set(attivi.map((d) => d.anno))].sort((a, b) => b - a);
  const q = cerca.trim().toLowerCase();
  const visibili = (documenti ?? []).filter((d) => {
    if (vista === 'cestino') return !!d.eliminato_il;
    if (d.eliminato_il) return false;
    if (vista === 'da_classificare' && d.stato !== 'da_classificare') return false;
    if (vista === 'non_collegati' && (collegati.has(d.id) || d.non_spesa)) return false;
    if (vista === 'scadenze' && !(d.scadenza && d.scadenza <= limiteScadenza)) return false;
    if (anno !== 'tutti' && d.anno !== Number(anno)) return false;
    if (tipo !== 'tutti' && d.tipo !== tipo) return false;
    if (
      q &&
      ![d.emittente, d.descrizione, ETICHETTA_TIPO[d.tipo], d.fattura?.numero].some((x) =>
        x?.toLowerCase().includes(q),
      )
    )
      return false;
    return true;
  });

  async function importa(file: FileList | null) {
    if (!file?.length) return;
    setImportando(true);
    setEsito(null);
    try {
      setEsito(await importaFatture([...file]));
      await ricarica();
      setVista('da_classificare');
    } catch {
      setErrore('Importazione non riuscita. Controlla la connessione e riprova.');
    } finally {
      setImportando(false);
      if (inputImporta.current) inputImporta.current.value = '';
    }
  }

  async function esportaZip() {
    setEsporta(false);
    const file: { nome: string; dati: Uint8Array }[] = [];
    const righe = [['File', 'Tipo', 'Data', 'Emittente', 'Importo', 'Descrizione']];
    for (const d of visibili) {
      file.push({ nome: d.file_nome, dati: await scaricaFile(d.file_percorso) });
      righe.push([
        d.file_nome,
        ETICHETTA_TIPO[d.tipo],
        d.data ?? '',
        d.emittente ?? '',
        d.importo != null ? (d.importo / 100).toFixed(2).replace('.', ',') : '',
        d.descrizione ?? '',
      ]);
    }
    const csv = '﻿' + righe.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
    file.push({ nome: 'indice.csv', dati: new TextEncoder().encode(csv) });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([scriviZip(file) as BlobPart], { type: 'application/zip' }));
    a.download = `documenti-${anno === 'tutti' ? 'tutti' : anno}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (errore && !documenti) return <Text>{errore}</Text>;
  if (!documenti) return <Spinner label="Carico l'archivio…" />;

  return (
    <div className={s.colonna}>
      <div className={s.azioni}>
        <Button
          appearance="primary"
          className={s.pulsante}
          icon={<ArrowUpload20Regular />}
          onClick={() => inputCarica.current?.click()}
        >
          Carica documento
        </Button>
        <input
          ref={inputCarica}
          type="file"
          multiple
          accept="application/pdf,image/*,.xml,.p7m"
          className={s.nascosto}
          aria-label="File da caricare"
          onChange={(e) => e.target.files?.length && setCaricare([...e.target.files])}
        />
        <ConAiuto
          allineamento="centro"
          aiuto={{
            argomento: 'importa fatture ricevute',
            testo:
              'Le fatture che ricevi dai fornitori le trovi nel portale "Fatture e Corrispettivi" dell\'Agenzia delle Entrate: puoi scaricarle una per una o tutte insieme (download massivo, fino a 3 mesi per volta, pronto in circa un giorno). Carica qui i file XML, P7M o lo ZIP: Fiscal le legge, salta i doppioni e te le propone come spese da confermare.',
            daDove: 'Portale Fatture e Corrispettivi → Consultazione → Fatture elettroniche ricevute.',
          }}
        >
          <Button
            className={s.pulsante}
            icon={<DocumentArrowDown20Regular />}
            disabled={importando}
            onClick={() => inputImporta.current?.click()}
          >
            {importando ? 'Importo…' : 'Importa fatture ricevute'}
          </Button>
        </ConAiuto>
        <input
          ref={inputImporta}
          type="file"
          multiple
          accept=".zip,.xml,.p7m,application/zip,text/xml"
          className={s.nascosto}
          aria-label="Fatture ricevute da importare"
          onChange={(e) => void importa(e.target.files)}
        />
      </div>

      {caricare ? (
        <CaricaDocumento
          file={caricare}
          onFatto={async () => {
            setCaricare(null);
            await ricarica();
          }}
          onAnnulla={() => setCaricare(null)}
        />
      ) : null}

      {esito ? (
        <MessageBar intent={esito.scartate.length ? 'warning' : 'success'} layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Importazione finita</MessageBarTitle>
            {esito.importate} {esito.importate === 1 ? 'fattura importata' : 'fatture importate'}, {esito.gia}{' '}
            già presenti
            {esito.metadati ? `, ${esito.metadati} file di metadati ignorati` : ''}
            {esito.scartate.length ? `, ${esito.scartate.length} scartate:` : '.'}
            {esito.scartate.map((x) => (
              <div key={x.nome}>
                {x.nome}: {x.motivo}
              </div>
            ))}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <MessageBar intent="info" layout="multiline">
        <MessageBarBody>
          Questo archivio è una copia comoda, non la conservazione a norma: per le fatture elettroniche attiva
          il servizio gratuito dell&apos;Agenzia delle Entrate in &quot;Fatture e Corrispettivi&quot;.
        </MessageBarBody>
      </MessageBar>

      <div className={s.schede}>
        <TabList
          selectedValue={vista}
          onTabSelect={(_, d) => setVista(d.value as Vista)}
          aria-label="Viste dell'archivio"
        >
          <Tab value="tutti" className={s.scheda}>
            Tutti ({attivi.length})
          </Tab>
          <Tab value="da_classificare" className={s.scheda}>
            Da classificare ({conta.da_classificare})
          </Tab>
          <Tab value="non_collegati" className={s.scheda}>
            Non collegati ({conta.non_collegati})
          </Tab>
          <Tab value="scadenze" className={s.scheda}>
            In scadenza ({conta.scadenze})
          </Tab>
          <Tab value="cestino" className={s.scheda}>
            Cestino ({conta.cestino})
          </Tab>
        </TabList>
      </div>

      <div className={s.filtri}>
        <Input
          className={s.cerca}
          type="search"
          aria-label="Cerca nei documenti"
          placeholder="Cerca per emittente, numero, descrizione"
          contentBefore={<Search20Regular />}
          value={cerca}
          onChange={(_, d) => setCerca(d.value)}
        />
        <CampoScelta
          etichetta="Anno"
          valore={anno}
          onChange={setAnno}
          opzioni={[
            { valore: 'tutti', etichetta: 'Tutti gli anni' },
            ...anni.map((a) => ({ valore: String(a), etichetta: String(a) })),
          ]}
          aiuto={{ argomento: 'anno', testo: "L'anno a cui si riferisce il documento." }}
        />
        <CampoScelta
          etichetta="Tipo"
          valore={tipo}
          onChange={setTipo}
          opzioni={[
            { valore: 'tutti', etichetta: 'Tutti i tipi' },
            ...(Object.keys(ETICHETTA_TIPO) as TipoDocumento[]).map((t) => ({
              valore: t,
              etichetta: ETICHETTA_TIPO[t],
            })),
          ]}
          aiuto={{ argomento: 'tipo di documento', testo: 'Fattura ricevuta, scontrino, polizza, CU…' }}
        />
      </div>

      {visibili.length === 0 ? (
        <Text>
          {vista === 'cestino'
            ? 'Il cestino è vuoto.'
            : documenti.length === 0
              ? 'Ancora nessun documento. Carica scontrini, fatture, polizze o importa le fatture ricevute.'
              : 'Nessun documento con questi filtri.'}
        </Text>
      ) : (
        <ul className={s.elenco}>
          {visibili.map((d) => {
            const conservazione = regoleDocumenti(d.anno).conservazione[d.tipo].valore;
            return (
              <li key={d.id}>
                <NextLink href={`/documenti/scheda/?id=${d.id}`} className={s.voce}>
                  <span className={s.testo}>
                    <Text weight="semibold" className={s.troncato}>
                      <ImportoNascosto valore={d.emittente ?? ETICHETTA_TIPO[d.tipo]} segnaposto="••••" />
                    </Text>
                    <Text size={200} className={s.troncato}>
                      {ETICHETTA_TIPO[d.tipo]}
                      {d.data ? ` · ${dataItaliana(d.data)}` : ''}
                      {d.fattura?.numero ? ` · n. ${d.fattura.numero}` : ''}
                    </Text>
                  </span>
                  <span className={s.destra}>
                    {d.importo != null ? (
                      <Text weight="semibold">
                        <ImportoNascosto valore={formattaEuro(d.importo)} />
                      </Text>
                    ) : null}
                    {d.eliminato_il ? (
                      <Badge appearance="tint" color="danger">
                        Si elimina tra {giorniAllaPulizia(d.eliminato_il)} giorni
                      </Badge>
                    ) : d.stato === 'da_classificare' ? (
                      <Badge appearance="tint" color="warning">
                        Da classificare
                      </Badge>
                    ) : d.scadenza && d.scadenza <= limiteScadenza ? (
                      <Badge appearance="tint" color={d.scadenza < oggi ? 'danger' : 'warning'}>
                        {d.scadenza < oggi ? 'Scaduto' : 'Scade'} il {dataItaliana(d.scadenza)}
                      </Badge>
                    ) : conservazione.aNorma ? (
                      <Badge appearance="tint" color="informative">
                        Da conservare a norma
                      </Badge>
                    ) : null}
                  </span>
                </NextLink>
              </li>
            );
          })}
        </ul>
      )}

      {visibili.length > 0 && vista !== 'cestino' ? (
        esporta ? (
          <AvvisoExportInChiaro
            cosa={`${visibili.length} documenti con il loro indice in un file ZIP`}
            onConferma={() => void esportaZip()}
            onAnnulla={() => setEsporta(false)}
          />
        ) : (
          <Button className={s.pulsante} icon={<ArrowDownload20Regular />} onClick={() => setEsporta(true)}>
            Esporta quelli visibili (ZIP con indice)
          </Button>
        )
      ) : null}
    </div>
  );
}
