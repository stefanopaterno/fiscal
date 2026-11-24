'use client';

import { Badge, Button, makeStyles, MessageBar, MessageBarBody, Spinner, Text, tokens } from '@fluentui/react-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { oggiIso } from '@/lib/oggi';
import { CampoData, CampoScelta, CampoTesto, Griglia, Scheda } from '@/ui/Moduli';
import { apriFile, caricaModello, leggiQuadro, salvaTipo, type Quadro, type TipoConsenso } from './dati';

/**
 * Tipi di consenso e modelli (specifica 005, US4, FR-002, FR-008, FR-009): i tipi li crea l'utente, i testi sono
 * i suoi (PDF) con versione e data di entrata in vigore. Fiscal non fornisce testi legali. Per ogni versione
 * nuova mostra quanti pazienti hanno firmato una versione precedente.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  elenco: { listStyle: 'none', margin: 0, padding: 0 },
  voce: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalM} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  nota: { color: tokens.colorNeutralForeground3 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  nascosto: { display: 'none' },
});

export function ModelliConsenso() {
  const s = useStili();
  const [quadro, setQuadro] = useState<Quadro | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);

  const ricarica = useCallback(
    () => leggiQuadro().then(setQuadro, () => setErrore('Non riesco a leggere i dati: controlla la connessione e riprova.')),
    [],
  );
  useEffect(() => {
    void ricarica();
  }, [ricarica]);

  if (!quadro && !errore) return <Spinner label="Carico…" />;
  const dopo = async (m: string) => {
    setEsito(m);
    setErrore(null);
    await ricarica();
  };

  return (
    <div className={s.colonna}>
      {errore ? <MessageBar intent="error"><MessageBarBody>{errore}</MessageBarBody></MessageBar> : null}
      {esito ? <MessageBar intent="success"><MessageBarBody>{esito}</MessageBarBody></MessageBar> : null}
      {quadro ? (
        <>
          <Tipi tipi={quadro.tipi} dopo={dopo} errore={setErrore} />
          <Modelli quadro={quadro} dopo={dopo} errore={setErrore} />
        </>
      ) : null}
    </div>
  );
}

function Tipi(props: { tipi: TipoConsenso[]; dopo: (m: string) => Promise<void>; errore: (m: string) => void }) {
  const s = useStili();
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  return (
    <Scheda
      titolo="Tipi di consenso"
      aiuto={{
        argomento: 'tipi di consenso',
        testo: 'Li decidi tu: per esempio «Percorso individuale», «Percorso di coppia», «Teleconsulto». Un tipo non si cancella: si archivia.',
      }}
    >
      {!props.tipi.length ? <Text>Nessun tipo ancora.</Text> : null}
      <ul className={s.elenco}>
        {props.tipi.map((t) => (
          <li key={t.id} className={s.voce}>
            <div className={s.riga}>
              <Text weight="semibold">{t.nome}</Text>
              {t.archiviato ? <Badge appearance="tint" color="subtle">archiviato</Badge> : null}
            </div>
            {t.descrizione ? <Text size={200} className={s.nota}>{t.descrizione}</Text> : null}
            <Button
              size="small"
              className={s.pulsante}
              onClick={() =>
                void salvaTipo({ ...t, descrizione: t.descrizione ?? '', archiviato: !t.archiviato })
                  .then(() => props.dopo(t.archiviato ? 'Tipo di nuovo in uso.' : 'Tipo archiviato.'))
                  .catch(() => props.errore('Non sono riuscito a salvare: riprova.'))
              }
            >
              {t.archiviato ? 'Rimetti in uso' : 'Archivia'}
            </Button>
          </li>
        ))}
      </ul>
      <Griglia>
        <CampoTesto etichetta="Nome del tipo" valore={nome} onChange={setNome} lunghezzaMax={80} aiuto={{ argomento: 'nome del tipo', testo: 'Un nome breve che riconosci subito.' }} />
        <CampoTesto
          etichetta="Descrizione (facoltativa)"
          valore={descrizione}
          onChange={setDescrizione}
          lunghezzaMax={200}
          aiuto={{ argomento: 'descrizione', testo: 'A cosa serve questo consenso, senza dati di pazienti.' }}
        />
      </Griglia>
      <Button
        appearance="primary"
        className={s.pulsante}
        disabled={!nome.trim()}
        onClick={() =>
          void salvaTipo({ nome, descrizione })
            .then(() => {
              setNome('');
              setDescrizione('');
              return props.dopo('Tipo di consenso aggiunto.');
            })
            .catch((e: Error) => props.errore(/doppione/.test(e.message) ? 'Esiste già un tipo con questo nome.' : 'Non sono riuscito a salvare: riprova.'))
        }
      >
        Aggiungi il tipo
      </Button>
    </Scheda>
  );
}

function Modelli(props: { quadro: Quadro; dopo: (m: string) => Promise<void>; errore: (m: string) => void }) {
  const s = useStili();
  const { quadro } = props;
  const tipi = quadro.tipi.filter((t) => !t.archiviato);
  const [genere, setGenere] = useState<'consenso' | 'informativa'>('consenso');
  const [tipo, setTipo] = useState(tipi[0]?.id ?? '');
  const [titolo, setTitolo] = useState('');
  const [versione, setVersione] = useState('');
  const [dal, setDal] = useState(oggiIso());
  const [file, setFile] = useState<File | null>(null);
  const [invio, setInvio] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // pazienti che hanno firmato una versione precedente (FR-008), per il consenso più recente di ogni tipo
  const precedenti = (tipoId: string, versioneTesto: string, inVigore: string) =>
    new Set(
      quadro.consensi
        .filter((c) => c.tipo_consenso_id === tipoId && !c.revocato_il && c.versione_testo !== versioneTesto && c.data_firma < inVigore)
        .filter((c) => !quadro.consensi.some((d) => d.cliente_id === c.cliente_id && d.tipo_consenso_id === tipoId && d.versione_testo === versioneTesto))
        .map((c) => c.cliente_id),
    ).size;
  const valido = titolo.trim() && versione.trim() && dal && (genere === 'informativa' || tipo);

  return (
    <Scheda
      titolo="Modelli: i tuoi testi"
      aiuto={{
        argomento: 'modelli',
        testo: 'Carica il PDF del tuo consenso o della tua informativa con un numero di versione e la data da cui vale. Fiscal non scrive né controlla testi legali.',
        dettaglio: 'Quando carichi una versione nuova, i pazienti con la versione precedente diventano «da rinnovare».',
      }}
    >
      {!quadro.modelli.length ? <Text>Nessun modello caricato.</Text> : null}
      <ul className={s.elenco}>
        {quadro.modelli.map((m) => {
          const vecchi = m.genere === 'consenso' && m.tipo_consenso_id ? precedenti(m.tipo_consenso_id, m.versione_testo, m.in_vigore_dal) : 0;
          return (
            <li key={m.id} className={s.voce}>
              <div className={s.riga}>
                <Text weight="semibold">{m.titolo}</Text>
                <Badge appearance="tint">{m.genere === 'consenso' ? (quadro.tipi.find((t) => t.id === m.tipo_consenso_id)?.nome ?? 'consenso') : 'informativa'}</Badge>
              </div>
              <Text size={200}>
                Versione {m.versione_testo} · in vigore dal {dataItaliana(m.in_vigore_dal)}
              </Text>
              {vecchi ? <Text size={200}>{vecchi === 1 ? '1 paziente ha' : `${vecchi} pazienti hanno`} firmato una versione precedente.</Text> : null}
              {m.file_percorso ? (
                <Button size="small" className={s.pulsante} onClick={() => void apriFile(m.file_percorso!, m.file_nome ?? 'modello.pdf').catch(() => props.errore('Non riesco a scaricare il file.'))}>
                  Scarica il PDF
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Text weight="semibold">Carica un modello</Text>
      <Griglia>
        <CampoScelta
          etichetta="Che cos'è"
          valore={genere}
          onChange={setGenere}
          opzioni={[
            { valore: 'consenso', etichetta: 'Consenso informato' },
            { valore: 'informativa', etichetta: 'Informativa privacy' },
          ]}
          aiuto={{ argomento: 'genere', testo: 'Il testo del consenso o l\'informativa sul trattamento dei dati.' }}
        />
        {genere === 'consenso' ? (
          <CampoScelta
            etichetta="Tipo di consenso"
            valore={tipo}
            onChange={setTipo}
            opzioni={[{ valore: '', etichetta: 'Scegli…' }, ...tipi.map((t) => ({ valore: t.id, etichetta: t.nome }))]}
            aiuto={{ argomento: 'tipo', testo: 'Per quale tipo di consenso vale questo testo.' }}
          />
        ) : null}
        <CampoTesto etichetta="Titolo" valore={titolo} onChange={setTitolo} lunghezzaMax={120} aiuto={{ argomento: 'titolo', testo: 'Come lo chiami tu.' }} />
        <CampoTesto etichetta="Versione" valore={versione} onChange={setVersione} lunghezzaMax={20} segnaposto="es. 2.0" aiuto={{ argomento: 'versione', testo: 'Il numero di versione scritto sul testo.' }} />
        <CampoData etichetta="In vigore dal" valore={dal} onChange={setDal} aiuto={{ argomento: 'in vigore dal', testo: 'Da quando usi questa versione.' }} />
      </Griglia>
      <div className={s.riga}>
        <input ref={input} type="file" accept="application/pdf" className={s.nascosto} aria-label="PDF del modello" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button className={s.pulsante} onClick={() => input.current?.click()}>{file ? 'Cambia PDF' : 'Scegli il PDF'}</Button>
        {file ? <Text size={200}>PDF scelto ({Math.ceil(file.size / 1024)} kB)</Text> : <Text size={200} className={s.nota}>Facoltativo</Text>}
      </div>
      <Button
        appearance="primary"
        className={s.pulsante}
        disabled={!valido || invio}
        onClick={async () => {
          setInvio(true);
          try {
            await caricaModello({ genere, tipo_consenso_id: genere === 'consenso' ? tipo : null, titolo, versione_testo: versione, in_vigore_dal: dal, file });
            setTitolo('');
            setVersione('');
            setFile(null);
            await props.dopo('Modello caricato.');
          } catch (e) {
            props.errore(/doppione/.test((e as Error).message) ? 'Questa versione esiste già.' : 'Non sono riuscito a caricare il modello: riprova.');
          } finally {
            setInvio(false);
          }
        }}
      >
        {invio ? 'Carico…' : 'Carica il modello'}
      </Button>
    </Scheda>
  );
}
