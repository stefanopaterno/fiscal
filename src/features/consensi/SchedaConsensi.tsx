'use client';

import {
  Badge,
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  Title2,
  tokens,
} from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { eta, nascitaDaCodiceFiscale } from '@/engine/consensi/paziente';
import { completezza, ETICHETTE_STATO, type RuoloFirmatario } from '@/engine/consensi/stato';
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { oggiIso } from '@/lib/oggi';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { CampoData, CampoScelta, CampoTesto, Collegamento, Griglia, Scheda } from '@/ui/Moduli';
import { AvvisoDpa, COLORE_STATO } from './Consensi';
import {
  aggiungiFirmatario,
  allegaCopia,
  apriFile,
  controllaMotivazione,
  esportaPaziente,
  ETICHETTE_MODALITA,
  ETICHETTE_RUOLO,
  leggiEventi,
  leggiQuadro,
  registraConsenso,
  revocaConsenso,
  type ConsensoConFirme,
  type Evento,
  type Modalita,
  type Quadro,
} from './dati';
import { NomePaziente } from './nomi';

/**
 * Scheda dei consensi di un paziente (specifica 005, US1–US3): stato, registrazione di un consenso con i
 * firmatari e la copia firmata facoltativa, storico che non si cancella, revoca, firmatari aggiunti dopo,
 * registro delle modifiche e richiesta di accesso del paziente.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  testata: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalM },
  consenso: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalM} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    minWidth: 0,
  },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  firmatario: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  nota: { color: tokens.colorNeutralForeground3 },
  pulsante: { minHeight: '44px' },
  nascosto: { display: 'none' },
  elenco: { listStyle: 'none', margin: 0, padding: 0 },
});

type BozzaFirmatario = { nome: string; ruolo: RuoloFirmatario; data_firma: string };

const messaggio = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  if (/consenso_solo_pazienti/.test(m)) return 'I consensi si registrano solo per i pazienti (persone fisiche).';
  if (/revoca_immutabile/.test(m)) return 'Una revoca non si annulla: registra un nuovo consenso.';
  if (/troppo_grande|10 MB/.test(m)) return 'Il file supera 10 MB: prova con una foto più piccola o un PDF.';
  if (/data_firma|23514/.test(m)) return 'Controlla le date: la firma non può essere dopo oggi e la revoca non prima della firma.';
  return 'Qualcosa non è andato: controlla la connessione e riprova.';
};

const AZIONI: Record<string, string> = {
  creato: 'Consenso registrato',
  modificato: 'Firmatario aggiunto',
  revocato: 'Revoca registrata',
  allegato: 'Copia firmata allegata',
  esportato: 'Dati esportati per il paziente',
  nome_mostrato: 'Nomi mostrati',
  modello_caricato: 'Modello caricato',
};

export function SchedaConsensi() {
  const s = useStili();
  const id = useSearchParams().get('id') ?? '';
  const [quadro, setQuadro] = useState<Quadro | null>(null);
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);

  const ricarica = useCallback(
    () =>
      leggiQuadro()
        .then(async (q) => {
          setQuadro(q);
          setEventi(await leggiEventi(id, q.consensi.filter((c) => c.cliente_id === id).map((c) => c.id)));
        })
        .catch(() => setErrore('Non riesco a leggere i consensi: controlla la connessione e riprova.')),
    [id],
  );
  useEffect(() => {
    void ricarica();
  }, [ricarica]);

  if (errore) return <MessageBar intent="error"><MessageBarBody>{errore}</MessageBarBody></MessageBar>;
  if (!quadro) return <Spinner label="Carico i consensi…" />;
  const paziente = quadro.pazienti.find((p) => p.id === id);
  if (!paziente)
    return (
      <Text>
        Paziente non trovato. <Collegamento href="/consensi/" inLinea>Torna ai consensi</Collegamento>
      </Text>
    );
  const stato = quadro.stati.get(id)!;
  const consensi = quadro.consensi.filter((c) => c.cliente_id === id);
  const oggi = oggiIso();
  const nascita = nascitaDaCodiceFiscale(paziente.codice_fiscale, oggi);
  const nomeTipo = (t: string) => quadro.tipi.find((x) => x.id === t)?.nome ?? 'Tipo eliminato';

  return (
    <div className={s.colonna}>
      <div className={s.testata}>
        <Title2 as="h2">
          <NomePaziente cliente={paziente} />
        </Title2>
        <Badge appearance="filled" color={COLORE_STATO[stato.stato]} size="large">
          {ETICHETTE_STATO[stato.stato]}
        </Badge>
      </div>
      <Text>{stato.motivo}</Text>
      {!nascita ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            Senza codice fiscale valido Fiscal non sa se il paziente è minorenne: lo tratta come maggiorenne.{' '}
            <Collegamento href={`/clienti/scheda/?id=${paziente.id}`} inLinea>Completa l&apos;anagrafica</Collegamento>
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {stato.diciottoVicini ? (
        <MessageBar intent="info">
          <MessageBarBody>Compie 18 anni il {dataItaliana(stato.diciottoVicini)}: da quel giorno serve un consenso firmato da lui o da lei.</MessageBarBody>
        </MessageBar>
      ) : null}
      {stato.daRivedere ? (
        <MessageBar intent="info">
          <MessageBarBody>Un consenso è stato firmato più di 12 mesi fa: se vuoi, rivedi con il paziente che sia ancora attuale (non scade).</MessageBarBody>
        </MessageBar>
      ) : null}
      {esito ? <MessageBar intent="success"><MessageBarBody>{esito}</MessageBarBody></MessageBar> : null}

      <AvvisoDpa />
      <NuovoConsenso
        quadro={quadro}
        pazienteId={paziente.id}
        minore={nascita ? eta(nascita, oggi) < 18 : false}
        nascita={nascita}
        dopo={async (m) => {
          setEsito(m);
          await ricarica();
        }}
      />

      <Scheda
        titolo={`Storico (${consensi.length})`}
        aiuto={{
          argomento: 'storico dei consensi',
          testo: 'Tutti i consensi del paziente, anche revocati o sostituiti: non si cancellano mai, così resta la prova di cosa era stato accettato e quando.',
        }}
      >
        {!consensi.length ? <Text>Nessun consenso registrato.</Text> : null}
        <ul className={s.elenco}>
          {consensi.map((c) => (
            <VoceConsenso key={c.id} c={c} nomeTipo={nomeTipo(c.tipo_consenso_id)} nascita={nascita} dopo={async (m) => {
              setEsito(m);
              await ricarica();
            }} />
          ))}
        </ul>
      </Scheda>

      <Scheda
        titolo="Registro delle modifiche"
        aiuto={{ argomento: 'registro', testo: 'Chi ha fatto cosa e quando su questi consensi, senza contenuti.' }}
      >
        {!eventi.length ? <Text>Nessuna modifica registrata.</Text> : null}
        <ul className={s.elenco}>
          {eventi.map((e) => (
            <li key={e.id}>
              <Text size={200}>
                {new Date(e.avvenuto_il).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} · {AZIONI[e.azione] ?? e.azione}
              </Text>
            </li>
          ))}
        </ul>
      </Scheda>

      <Scheda
        titolo="Richieste del paziente"
        aiuto={{
          argomento: 'richieste del paziente',
          testo: 'Se il paziente chiede i suoi dati, scarica il file con anagrafica, consensi e fatture. Dentro c\'è anche cosa va conservato per legge e cosa si può cancellare.',
          fonte: 'GDPR, artt. 15 e 17',
        }}
      >
        <Button
          className={s.pulsante}
          onClick={async () => {
            try {
              await esportaPaziente(paziente, consensi, quadro.tipi);
              setEsito('File scaricato: contiene i dati del paziente in chiaro, consegnalo solo a lui.');
            } catch (e) {
              setErrore(messaggio(e));
            }
          }}
        >
          Scarica i dati del paziente
        </Button>
        <Text size={200} className={s.nota}>
          Fiscal non cancella nulla in automatico: un paziente con consensi resta in rubrica.
        </Text>
      </Scheda>
    </div>
  );
}

function CampoFile(props: { file: File | null; onChange: (f: File | null) => void }) {
  const s = useStili();
  const input = useRef<HTMLInputElement>(null);
  return (
    <ConAiuto
      aiuto={{
        argomento: 'copia firmata',
        testo: 'Facoltativa: la foto o il PDF del consenso firmato, o l\'e-mail di accettazione. Fiscal la salva con un nome suo, nel tuo archivio privato.',
      }}
    >
      <div className={s.riga}>
        <input
          ref={input}
          type="file"
          accept="application/pdf,image/*,.eml"
          className={s.nascosto}
          aria-label="Copia firmata"
          onChange={(e) => props.onChange(e.target.files?.[0] ?? null)}
        />
        <Button className={s.pulsante} onClick={() => input.current?.click()}>
          {props.file ? 'Cambia file' : 'Allega la copia firmata'}
        </Button>
        {props.file ? (
          <>
            <Text size={200}>File scelto ({Math.ceil(props.file.size / 1024)} kB)</Text>
            <Button appearance="subtle" icon={<Delete20Regular />} aria-label="Togli il file" onClick={() => props.onChange(null)} />
          </>
        ) : null}
      </div>
    </ConAiuto>
  );
}

function NuovoConsenso(props: {
  quadro: Quadro;
  pazienteId: string;
  minore: boolean;
  nascita: ReturnType<typeof nascitaDaCodiceFiscale>;
  dopo: (m: string) => Promise<void>;
}) {
  const s = useStili();
  const tipi = props.quadro.tipi.filter((t) => !t.archiviato);
  const [tipo, setTipo] = useState(tipi[0]?.id ?? '');
  const modelli = props.quadro.modelli.filter((m) => m.genere === 'consenso' && m.tipo_consenso_id === tipo);
  const [modello, setModello] = useState('');
  const [versione, setVersione] = useState('');
  const [dataFirma, setDataFirma] = useState(oggiIso());
  const [modalita, setModalita] = useState<Modalita>('carta');
  const [motivazione, setMotivazione] = useState('');
  const [firmatari, setFirmatari] = useState<BozzaFirmatario[]>([
    { nome: '', ruolo: props.minore ? 'genitore' : 'paziente', data_firma: '' },
  ]);
  const [file, setFile] = useState<File | null>(null);
  const [mostraErrori, setMostraErrori] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  if (!tipi.length)
    return (
      <Scheda titolo="Registra un consenso" aiuto={{ argomento: 'registrare un consenso', testo: 'Serve almeno un tipo di consenso.' }}>
        <Text>
          Prima crea un tipo di consenso. <Collegamento href="/consensi/modelli/" inLinea>Tipi e modelli</Collegamento>
        </Text>
      </Scheda>
    );

  const versioneUsata = modello ? (modelli.find((m) => m.id === modello)?.versione_testo ?? '') : versione;
  const erroreMotivazione = motivazione ? controllaMotivazione(motivazione) : null;
  const firme = completezza({ firmatari, data_firma: dataFirma || oggiIso() }, props.nascita);
  const errori = {
    tipo: !tipo ? 'Scegli il tipo.' : undefined,
    versione: !versioneUsata.trim() ? 'Indica la versione del testo firmato.' : undefined,
    data: !dataFirma ? 'Indica la data della firma.' : dataFirma > oggiIso() ? 'La firma non può essere nel futuro.' : undefined,
    firmatari: firmatari.some((f) => !f.nome.trim() && f.ruolo !== 'paziente') ? 'Scrivi il nome di ogni firmatario.' : undefined,
  };
  const valido = !Object.values(errori).some(Boolean) && !erroreMotivazione;
  const aggiorna = (i: number, f: Partial<BozzaFirmatario>) => setFirmatari(firmatari.map((x, j) => (j === i ? { ...x, ...f } : x)));

  async function salva() {
    setMostraErrori(true);
    if (!valido) return;
    setInvio(true);
    setErrore(null);
    try {
      const paziente = props.quadro.pazienti.find((p) => p.id === props.pazienteId)!;
      await registraConsenso({
        cliente_id: props.pazienteId,
        tipo_consenso_id: tipo,
        modello_id: modello || null,
        versione_testo: versioneUsata,
        data_firma: dataFirma,
        modalita,
        motivazione,
        // il paziente senza nome scritto: si usa quello dell'anagrafica (non lo mostriamo a schermo)
        firmatari: firmatari.map((f) => ({
          nome: f.nome.trim() || `${paziente.nome ?? ''} ${paziente.cognome ?? ''}`.trim(),
          ruolo: f.ruolo,
          data_firma: f.data_firma || dataFirma,
        })),
        file,
      });
      setMotivazione('');
      setFile(null);
      setFirmatari([{ nome: '', ruolo: props.minore ? 'genitore' : 'paziente', data_firma: '' }]);
      setMostraErrori(false);
      await props.dopo('Consenso registrato.');
    } catch (e) {
      setErrore(messaggio(e));
    } finally {
      setInvio(false);
    }
  }

  return (
    <Scheda
      titolo="Registra un consenso"
      aiuto={{
        argomento: 'registrare un consenso',
        testo: 'Tipo, versione del testo firmato, data della firma, come l\'hai raccolto e chi ha firmato. La copia firmata è facoltativa.',
        dettaglio: 'Per un minore firmano entrambi i genitori oppure il rappresentante legale unico (genitore unico esercente la responsabilità, tutore, amministratore di sostegno).',
      }}
    >
      <Griglia>
        <CampoScelta
          etichetta="Tipo di consenso"
          obbligatorio
          valore={tipo}
          onChange={(v) => {
            setTipo(v);
            setModello('');
          }}
          errore={mostraErrori ? errori.tipo : undefined}
          opzioni={tipi.map((t) => ({ valore: t.id, etichetta: t.nome }))}
          aiuto={{ argomento: 'tipo di consenso', testo: 'I tipi li crei tu in «Tipi e modelli» (per esempio percorso individuale, di coppia, teleconsulto).' }}
        />
        {modelli.length ? (
          <CampoScelta
            etichetta="Versione del testo firmato"
            obbligatorio
            valore={modello}
            onChange={setModello}
            errore={mostraErrori && !modello && !versione ? errori.versione : undefined}
            opzioni={[
              { valore: '', etichetta: 'Altra (scrivo io)' },
              ...modelli.map((m) => ({ valore: m.id, etichetta: `${m.versione_testo} · dal ${dataItaliana(m.in_vigore_dal)}` })),
            ]}
            aiuto={{ argomento: 'versione', testo: 'La versione del tuo modello che il paziente ha firmato: così sai sempre quale testo ha accettato.' }}
          />
        ) : null}
        {!modello ? (
          <CampoTesto
            etichetta="Versione (scritta)"
            obbligatorio
            valore={versione}
            onChange={setVersione}
            lunghezzaMax={20}
            segnaposto="es. 1.0 o 2027-01"
            errore={mostraErrori ? errori.versione : undefined}
            aiuto={{ argomento: 'versione scritta', testo: 'Se non hai caricato il modello, scrivi la versione riportata sul foglio firmato.' }}
          />
        ) : null}
        <CampoData
          etichetta="Data della firma"
          obbligatorio
          valore={dataFirma}
          onChange={setDataFirma}
          max={oggiIso()}
          errore={mostraErrori ? errori.data : undefined}
          aiuto={{ argomento: 'data della firma', testo: 'Quando è stato firmato, anche se lo registri adesso o è di prima dell\'attività.' }}
        />
        <CampoScelta
          etichetta="Come l'hai raccolto"
          valore={modalita}
          onChange={setModalita}
          opzioni={(Object.keys(ETICHETTE_MODALITA) as Modalita[]).map((m) => ({ valore: m, etichetta: ETICHETTE_MODALITA[m] }))}
          aiuto={{ argomento: 'modalità', testo: 'Firma su carta, e-mail con cui il paziente accetta il testo, o altro.' }}
        />
      </Griglia>

      <Text weight="semibold">Chi ha firmato</Text>
      {firmatari.map((f, i) => (
        <div key={i} className={s.firmatario}>
          <Griglia>
            <CampoScelta<RuoloFirmatario>
              etichetta="Ruolo"
              valore={f.ruolo}
              onChange={(v) => aggiorna(i, { ruolo: v })}
              opzioni={(Object.keys(ETICHETTE_RUOLO) as RuoloFirmatario[]).map((r) => ({ valore: r, etichetta: ETICHETTE_RUOLO[r] }))}
              aiuto={{ argomento: 'ruolo', testo: 'Rappresentante legale: chi da solo ha la responsabilità legale (genitore unico esercente, tutore, amministratore di sostegno).' }}
            />
            <CampoTesto
              etichetta="Nome e cognome"
              valore={f.nome}
              onChange={(v) => aggiorna(i, { nome: v })}
              lunghezzaMax={120}
              segnaposto={f.ruolo === 'paziente' ? 'Vuoto: il nome del paziente' : undefined}
              aiuto={{ argomento: 'nome del firmatario', testo: 'Per il paziente puoi lasciarlo vuoto: Fiscal usa il nome della rubrica.' }}
            />
          </Griglia>
          {firmatari.length > 1 ? (
            <Button appearance="subtle" icon={<Delete20Regular />} onClick={() => setFirmatari(firmatari.filter((_, j) => j !== i))}>
              Togli
            </Button>
          ) : null}
        </div>
      ))}
      {mostraErrori && errori.firmatari ? <Text className={s.nota}>{errori.firmatari}</Text> : null}
      <div className={s.riga}>
        <Button
          className={s.pulsante}
          icon={<Add20Regular />}
          onClick={() => setFirmatari([...firmatari, { nome: '', ruolo: props.minore ? 'genitore' : 'rappresentante_legale', data_firma: '' }])}
        >
          Aggiungi firmatario
        </Button>
        <Badge appearance="tint" color={firme.completo ? 'success' : 'warning'}>
          {firme.completo ? 'Firme complete' : 'Firme incomplete'}
        </Badge>
      </div>
      {!firme.completo ? <Text size={200} className={s.nota}>{firme.motivo} Puoi salvarlo lo stesso e completarlo dopo.</Text> : null}

      <CampoTesto
        etichetta="Motivo amministrativo (facoltativo)"
        valore={motivazione}
        onChange={setMotivazione}
        lunghezzaMax={200}
        errore={erroreMotivazione ?? undefined}
        segnaposto="es. firma raccolta in seconda seduta"
        aiuto={{ argomento: 'motivo amministrativo', testo: 'Solo motivi amministrativi, mai dati clinici: niente diagnosi, motivi dell\'invio o contenuti delle sedute.' }}
      />
      <CampoFile file={file} onChange={setFile} />
      {errore ? <MessageBar intent="error"><MessageBarBody>{errore}</MessageBarBody></MessageBar> : null}
      <Button appearance="primary" className={s.pulsante} disabled={invio} onClick={() => void salva()}>
        {invio ? 'Salvo…' : 'Registra il consenso'}
      </Button>
    </Scheda>
  );
}

function VoceConsenso(props: { c: ConsensoConFirme; nomeTipo: string; nascita: ReturnType<typeof nascitaDaCodiceFiscale>; dopo: (m: string) => Promise<void> }) {
  const s = useStili();
  const { c } = props;
  const [azione, setAzione] = useState<'revoca' | 'firmatario' | null>(null);
  const [data, setData] = useState(oggiIso());
  const [testo, setTesto] = useState('');
  const [ruolo, setRuolo] = useState<RuoloFirmatario>('genitore');
  const [errore, setErrore] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const firme = completezza(c, props.nascita);

  const esegui = async (f: () => Promise<void>, m: string) => {
    setErrore(null);
    try {
      await f();
      setAzione(null);
      setTesto('');
      await props.dopo(m);
    } catch (e) {
      setErrore(messaggio(e));
    }
  };

  return (
    <li className={s.consenso}>
      <div className={s.riga}>
        <Text weight="semibold">{props.nomeTipo}</Text>
        <Text size={200}>versione {c.versione_testo}</Text>
        {c.revocato_il ? (
          <Badge appearance="tint" color="severe">revocato il {dataItaliana(c.revocato_il)}</Badge>
        ) : (
          <Badge appearance="tint" color={firme.completo ? 'success' : 'warning'}>{firme.completo ? 'firme complete' : 'firme incomplete'}</Badge>
        )}
      </div>
      <Text size={200}>
        Firmato il {dataItaliana(c.data_firma)} · registrato il {dataItaliana(c.registrato_il)} · {ETICHETTE_MODALITA[c.modalita]}
      </Text>
      <Text size={200}>
        Firmatari: {c.firmatari.length ? c.firmatari.map((f) => `${ETICHETTE_RUOLO[f.ruolo]} (${dataItaliana(f.data_firma)})`).join(', ') : 'nessuno'}
      </Text>
      {c.motivazione ? <Text size={200} className={s.nota}>Motivo: {c.motivazione}</Text> : null}
      {c.motivazione_revoca ? <Text size={200} className={s.nota}>Motivo della revoca: {c.motivazione_revoca}</Text> : null}
      <div className={s.riga}>
        {c.file_percorso ? (
          <Button size="small" onClick={() => void apriFile(c.file_percorso!, c.file_nome ?? 'consenso').catch((e) => setErrore(messaggio(e)))}>
            Scarica la copia firmata
          </Button>
        ) : (
          <>
            <input
              ref={input}
              type="file"
              accept="application/pdf,image/*,.eml"
              className={s.nascosto}
              aria-label="Copia firmata da allegare"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void esegui(() => allegaCopia(c, f), 'Copia firmata allegata.');
              }}
            />
            <Button size="small" onClick={() => input.current?.click()}>Allega la copia</Button>
          </>
        )}
        {!c.revocato_il ? (
          <>
            <Button size="small" onClick={() => setAzione(azione === 'firmatario' ? null : 'firmatario')}>Aggiungi firmatario</Button>
            <Button size="small" onClick={() => setAzione(azione === 'revoca' ? null : 'revoca')}>Revoca</Button>
          </>
        ) : null}
      </div>
      {azione === 'revoca' ? (
        <div className={s.firmatario}>
          <Text>La revoca vale per il futuro: le fatture già emesse restano valide e il consenso resta nello storico.</Text>
          <CampoData etichetta="Data della revoca" valore={data} onChange={setData} min={c.data_firma} max={oggiIso()} aiuto={{ argomento: 'data della revoca', testo: 'Il giorno in cui il paziente ha revocato il consenso.' }} />
          <CampoTesto
            etichetta="Motivo amministrativo (facoltativo)"
            valore={testo}
            onChange={setTesto}
            lunghezzaMax={200}
            errore={testo ? (controllaMotivazione(testo) ?? undefined) : undefined}
            aiuto={{ argomento: 'motivo della revoca', testo: 'Solo il motivo amministrativo (es. «revoca scritta via e-mail»), mai dati clinici.' }}
          />
          <Button appearance="primary" className={s.pulsante} disabled={!data || Boolean(testo && controllaMotivazione(testo))} onClick={() => void esegui(() => revocaConsenso(c, data, testo), 'Revoca registrata.')}>
            Registra la revoca
          </Button>
        </div>
      ) : null}
      {azione === 'firmatario' ? (
        <div className={s.firmatario}>
          <Griglia>
            <CampoScelta<RuoloFirmatario>
              etichetta="Ruolo"
              valore={ruolo}
              onChange={setRuolo}
              opzioni={(Object.keys(ETICHETTE_RUOLO) as RuoloFirmatario[]).map((r) => ({ valore: r, etichetta: ETICHETTE_RUOLO[r] }))}
              aiuto={{ argomento: 'ruolo', testo: 'Per esempio il secondo genitore che firma dopo.' }}
            />
            <CampoTesto etichetta="Nome e cognome" valore={testo} onChange={setTesto} lunghezzaMax={120} aiuto={{ argomento: 'nome', testo: 'Chi ha firmato.' }} />
            <CampoData etichetta="Data della firma" valore={data} onChange={setData} min={c.data_firma} max={oggiIso()} aiuto={{ argomento: 'data', testo: 'Quando ha firmato.' }} />
          </Griglia>
          <Button appearance="primary" className={s.pulsante} disabled={!testo.trim() || !data} onClick={() => void esegui(() => aggiungiFirmatario(c, { nome: testo, ruolo, data_firma: data }), 'Firmatario aggiunto.')}>
            Aggiungi
          </Button>
        </div>
      ) : null}
      {errore ? <MessageBar intent="error"><MessageBarBody>{errore}</MessageBarBody></MessageBar> : null}
    </li>
  );
}
