'use client';

import {
  Badge,
  Button,
  Checkbox,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { ArrowDownload20Regular, Copy20Regular, ShieldLock20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useState } from 'react';
import { formattaEuro } from '@/engine/importi';
import { SEZIONI, type CodiceSezione } from '@/engine/prospetto/contenuto';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoData, CampoScelta, CampoSiNo, CampoTesto, Collegamento, Griglia, Scheda } from '@/ui/Moduli';
import { annoCorrente, oggiIso } from '@/lib/oggi';
import {
  differenze,
  eliminaModello,
  genera,
  leggiModelli,
  leggiPacchetti,
  leggiRichieste,
  nuovoId,
  prepara,
  salva,
  spiegaErrore,
  type Modello,
  type PacchettoRiga,
  type Preparazione,
  type Richiesta,
} from './dati';

/**
 * Pacchetto per il commercialista (specifica 009): periodo e sezioni, controlli prima dell'invio, anteprima, file
 * ZIP cifrato con PDF ed Excel e password mostrata una sola volta, storico e richieste del commercialista.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  sezioni: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: `0 ${tokens.spacingHorizontalL}` },
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  voce: { display: 'flex', flexDirection: 'column', gap: '2px', padding: `${tokens.spacingVerticalS} 0`, borderBottom: `1px solid ${tokens.colorNeutralStroke3}` },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  nota: { color: tokens.colorNeutralForeground3 },
  password: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase500, letterSpacing: '0.05em', overflowWrap: 'anywhere' },
  pulsante: { minHeight: '44px' },
});

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const dataIt = (iso: string) => iso.split('-').reverse().join('/');
const fine = (a: number, m: number) => `${a}-${String(m).padStart(2, '0')}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`;
type TipoPeriodo = 'anno' | 'trimestre' | 'mese' | 'intervallo';

export function Pacchetto() {
  const s = useStili();
  const [anno, setAnno] = useState(annoCorrente());
  const [tipo, setTipo] = useState<TipoPeriodo>('anno');
  const [parte, setParte] = useState('1');
  const [da, setDa] = useState(`${annoCorrente()}-01-01`);
  const [a, setA] = useState(oggiIso());
  const [sezioni, setSezioni] = useState<Set<CodiceSezione>>(() => new Set(SEZIONI.map((x) => x.codice)));
  const [usaCodici, setUsaCodici] = useState(false);
  const [allegati, setAllegati] = useState(false);
  const [destinatario, setDestinatario] = useState('');
  const [prep, setPrep] = useState<Preparazione | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [copiata, setCopiata] = useState(false);
  const [storico, setStorico] = useState<{ pacchetti: PacchettoRiga[]; richieste: Richiesta[]; modelli: Modello[] } | null>(null);
  const [giro, setGiro] = useState(0);
  const ricarica = useCallback(() => setGiro((g) => g + 1), []);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiPacchetti(), leggiRichieste(), leggiModelli()])
      .then(([pacchetti, richieste, modelli]) => vivo && setStorico({ pacchetti, richieste, modelli }))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [giro]);

  const periodo = (): { da: string; a: string } => {
    if (tipo === 'anno') return { da: `${anno}-01-01`, a: `${anno}-12-31` };
    if (tipo === 'trimestre') {
      const t = Number(parte);
      return { da: `${anno}-${String((t - 1) * 3 + 1).padStart(2, '0')}-01`, a: fine(anno, t * 3) };
    }
    if (tipo === 'mese') return { da: `${anno}-${String(Number(parte)).padStart(2, '0')}-01`, a: fine(anno, Number(parte)) };
    return { da, a };
  };
  const p = periodo();
  const periodoOk = /^\d{4}-\d{2}-\d{2}$/.test(p.da) && /^\d{4}-\d{2}-\d{2}$/.test(p.a) && p.a >= p.da;

  async function controlla() {
    setInCorso(true);
    setErrore(null);
    setPassword(null);
    try {
      setPrep(await prepara({ ...p, sezioni: SEZIONI.map((x) => x.codice).filter((c) => sezioni.has(c)), usaCodici, allegati }));
    } catch (err) {
      setErrore(spiegaErrore(err));
    } finally {
      setInCorso(false);
    }
  }

  async function generaFile() {
    if (!prep) return;
    setInCorso(true);
    setErrore(null);
    try {
      const g = await genera(prep, destinatario);
      const url = URL.createObjectURL(new Blob([g.zip as BlobPart], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = g.nome;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      await salva('pacchetti', g.riga);
      setPassword(g.password);
      setCopiata(false);
      ricarica();
    } catch (err) {
      setErrore(spiegaErrore(err));
    } finally {
      setInCorso(false);
    }
  }

  async function copia() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiata(true);
    } catch {
      setCopiata(false);
    }
  }

  function applicaModello(id: string) {
    const m = storico?.modelli.find((x) => x.id === id);
    if (!m) return;
    setSezioni(new Set(m.sezioni));
    setUsaCodici(m.usa_codici);
    setAllegati(m.allegati);
    setPrep(null);
  }

  return (
    <div className={s.colonna}>
      <Text>
        Prepara un file da mandare al commercialista: un PDF da leggere e un Excel con un foglio per sezione, dentro uno ZIP protetto
        da password (AES-256). Contiene solo dati della contabilità: niente dati clinici, consensi o note.
      </Text>

      <Scheda titolo="Periodo e contenuto" aiuto={{ argomento: 'periodo', testo: 'Di solito l\'anno intero; per un controllo a metà anno un trimestre o un mese.' }}>
        <Griglia>
          <CampoScelta
            etichetta="Periodo"
            valore={tipo}
            onChange={(v) => {
              setTipo(v);
              setParte('1');
              setPrep(null);
            }}
            opzioni={[
              { valore: 'anno', etichetta: 'Anno' },
              { valore: 'trimestre', etichetta: 'Trimestre' },
              { valore: 'mese', etichetta: 'Mese' },
              { valore: 'intervallo', etichetta: 'Dal… al…' },
            ]}
            aiuto={{ argomento: 'tipo di periodo', testo: 'Il pacchetto contiene solo i dati di questo periodo.' }}
          />
          {tipo !== 'intervallo' ? (
            <CampoTesto
              etichetta="Anno"
              valore={String(anno)}
              onChange={(v) => {
                setAnno(Number(v) || anno);
                setPrep(null);
              }}
              inputMode="numeric"
              lunghezzaMax={4}
              aiuto={{ argomento: 'anno', testo: 'Per esempio 2027.' }}
            />
          ) : null}
          {tipo === 'trimestre' || tipo === 'mese' ? (
            <CampoScelta
              etichetta={tipo === 'trimestre' ? 'Trimestre' : 'Mese'}
              valore={parte}
              onChange={(v) => {
                setParte(v);
                setPrep(null);
              }}
              opzioni={(tipo === 'trimestre' ? ['primo', 'secondo', 'terzo', 'quarto'] : MESI).map((n, i) => ({ valore: String(i + 1), etichetta: n }))}
              aiuto={{ argomento: 'parte dell\'anno', testo: 'La parte dell\'anno da includere.' }}
            />
          ) : null}
          {tipo === 'intervallo' ? (
            <>
              <CampoData etichetta="Dal" valore={da} onChange={(v) => (setDa(v), setPrep(null))} aiuto={{ argomento: 'inizio', testo: 'Primo giorno incluso.' }} />
              <CampoData etichetta="Al" valore={a} onChange={(v) => (setA(v), setPrep(null))} aiuto={{ argomento: 'fine', testo: 'Ultimo giorno incluso.' }} />
            </>
          ) : null}
        </Griglia>
        {periodoOk ? <Text className={s.nota}>Dal {dataIt(p.da)} al {dataIt(p.a)}</Text> : <Text>Controlla le date del periodo.</Text>}

        {storico && storico.modelli.length > 0 ? (
          <div className={s.riga}>
            {storico.modelli.map((m) => (
              <span key={m.id} className={s.riga}>
                <Button className={s.pulsante} appearance="secondary" onClick={() => applicaModello(m.id)}>
                  {m.nome}
                </Button>
                <Button className={s.pulsante} appearance="subtle" aria-label={`Elimina il modello ${m.nome}`} onClick={() => void eliminaModello(m.id).then(ricarica)}>
                  ×
                </Button>
              </span>
            ))}
          </div>
        ) : null}
        <div className={s.sezioni}>
          {SEZIONI.map((x) => (
            <Checkbox
              key={x.codice}
              label={x.titolo}
              checked={sezioni.has(x.codice)}
              onChange={(_, d) => {
                setSezioni((v) => {
                  const n = new Set(v);
                  if (d.checked) n.add(x.codice);
                  else n.delete(x.codice);
                  return n;
                });
                setPrep(null);
              }}
            />
          ))}
        </div>
        <CampoSiNo
          etichetta="Usa i codici al posto dei nomi dei pazienti"
          valore={usaCodici}
          onChange={(v) => (setUsaCodici(v), setPrep(null))}
          aiuto={{
            argomento: 'codici',
            testo: 'Di norma i clienti compaiono come in fattura, perché il commercialista vede comunque le fatture. Con i codici i pazienti diventano «C-…», sempre lo stesso codice per la stessa persona.',
          }}
        />
        <CampoSiNo
          etichetta="Includi i documenti dell'archivio del periodo"
          valore={allegati}
          onChange={(v) => (setAllegati(v), setPrep(null))}
          aiuto={{ argomento: 'allegati', testo: 'CU, ricevute e fatture ricevute caricate in Documenti, con data nel periodo. Il file può diventare grande.' }}
        />
        <CampoTesto
          etichetta="Per (facoltativo)"
          valore={destinatario}
          onChange={setDestinatario}
          lunghezzaMax={80}
          aiuto={{ argomento: 'destinatario', testo: 'Il nome dello studio, per ritrovare il pacchetto nello storico.' }}
        />
        <div className={s.riga}>
          <Button className={s.pulsante} appearance="primary" disabled={inCorso || !periodoOk || sezioni.size === 0} onClick={() => void controlla()}>
            Controlla e prepara
          </Button>
          <SalvaModello sezioni={sezioni} usaCodici={usaCodici} allegati={allegati} onCambio={ricarica} />
        </div>
        {inCorso ? <Spinner size="tiny" label="Preparo…" /> : null}
        {errore ? (
          <MessageBar intent="error">
            <MessageBarBody>{errore}</MessageBarBody>
          </MessageBar>
        ) : null}
      </Scheda>

      {prep ? (
        <>
          <Scheda
            titolo={`Controlli (${prep.avvisi.length})`}
            aiuto={{ argomento: 'controlli', testo: 'Cosa manca o va sistemato prima di inviare. Puoi generare comunque: gli avvisi finiscono nel documento.' }}
          >
            {prep.avvisi.length === 0 ? <Text>Tutto a posto.</Text> : null}
            <ul className={s.elenco}>
              {prep.avvisi.map((x, i) => (
                <li key={i} className={s.voce}>
                  <Text>{x.testo}</Text>
                  {x.collegamento ? <Collegamento href={x.collegamento}>Sistema</Collegamento> : null}
                </li>
              ))}
            </ul>
          </Scheda>

          <Scheda titolo="Anteprima" aiuto={{ argomento: 'anteprima', testo: 'Le sezioni del pacchetto con il numero di righe e i totali, gli stessi del PDF e dell\'Excel.' }}>
            <ul className={s.elenco}>
              {prep.anteprima.map((x) => (
                <li key={x.codice} className={s.voce}>
                  <div className={s.riga}>
                    <Text weight="semibold">{x.titolo}</Text>
                    <Badge appearance="tint" color={x.righe.length ? 'brand' : 'subtle'}>
                      {x.righe.length ? `${x.righe.length} ${x.righe.length === 1 ? 'riga' : 'righe'}` : 'vuota'}
                    </Badge>
                  </div>
                  {x.totali ? (
                    <Text size={200} className={s.nota}>
                      {x.totali
                        .map((t, i) => (t == null ? null : { t, nome: x.colonne[i]!.titolo }))
                        .filter((v): v is { t: number; nome: string } => v != null)
                        .map((v) => (
                          <span key={v.nome}>
                            {v.nome} <ImportoNascosto valore={formattaEuro(v.t)} />{' · '}
                          </span>
                        ))}
                    </Text>
                  ) : null}
                </li>
              ))}
            </ul>
            {prep.documenti.length ? <Text>Allegati dall&apos;archivio: {prep.documenti.length}</Text> : null}
            <Button className={s.pulsante} appearance="primary" icon={<ArrowDownload20Regular />} disabled={inCorso} onClick={() => void generaFile()}>
              Genera il pacchetto protetto
            </Button>
          </Scheda>
        </>
      ) : null}

      {password ? (
        <MessageBar intent="warning" layout="multiline" icon={<ShieldLock20Regular />}>
          <MessageBarBody>
            <MessageBarTitle>Password del pacchetto: la vedi solo ora</MessageBarTitle>
            <div className={s.colonna}>
              <Text className={s.password} aria-label="Password del pacchetto">
                {password}
              </Text>
              <Text>
                Mandala al commercialista con un canale diverso dal file (per esempio a voce o con un messaggio se il file va per email). Fiscal
                non la conserva: se la perdi, genera un nuovo pacchetto. Il file si apre con 7-Zip, WinRAR, Keka o The Unarchiver.
              </Text>
              <div className={s.riga}>
                <Button className={s.pulsante} icon={<Copy20Regular />} onClick={() => void copia()}>
                  {copiata ? 'Copiata' : 'Copia la password'}
                </Button>
                <Button className={s.pulsante} appearance="primary" onClick={() => setPassword(null)}>
                  L&apos;ho salvata, nascondi
                </Button>
              </div>
              <Text size={200}>
                Se il commercialista ti dà una data per il prossimo invio, aggiungila nelle{' '}
                <Collegamento href="/dichiarazione/scadenze/" inLinea>
                  scadenze
                </Collegamento>
                .
              </Text>
            </div>
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {storico ? <Storico pacchetti={storico.pacchetti} richieste={storico.richieste} onCambio={ricarica} /> : null}
      <Text size={200} className={s.nota}>
        Il prospetto è un supporto: non sostituisce la consulenza del commercialista. Fiscal non crea link pubblici; il file lo invii tu.
      </Text>
    </div>
  );
}

function SalvaModello({ sezioni, usaCodici, allegati, onCambio }: { sezioni: Set<CodiceSezione>; usaCodici: boolean; allegati: boolean; onCambio: () => void }) {
  const s = useStili();
  const [aperto, setAperto] = useState(false);
  const [nome, setNome] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  if (!aperto)
    return (
      <Button className={s.pulsante} appearance="subtle" disabled={sezioni.size === 0} onClick={() => setAperto(true)}>
        Salva come modello
      </Button>
    );
  return (
    <span className={s.riga}>
      <CampoTesto etichetta="Nome del modello" valore={nome} onChange={setNome} lunghezzaMax={40} aiuto={{ argomento: 'modello', testo: 'Per esempio «Solo spese».' }} />
      <Button
        className={s.pulsante}
        disabled={!nome.trim()}
        onClick={() =>
          void salva('modelli_pacchetto', { id: nuovoId(), versione: 0, nome: nome.trim(), sezioni: [...sezioni], usa_codici: usaCodici, allegati })
            .then(() => {
              setAperto(false);
              setNome('');
              onCambio();
            })
            .catch((err) => setErrore(spiegaErrore(err)))
        }
      >
        Salva
      </Button>
      {errore ? <Text role="alert">{errore}</Text> : null}
    </span>
  );
}

function Storico({ pacchetti, richieste, onCambio }: { pacchetti: PacchettoRiga[]; richieste: Richiesta[]; onCambio: () => void }) {
  const s = useStili();
  const [testo, setTesto] = useState('');
  const nomeSezione = (c: string) => SEZIONI.find((x) => x.codice === c)?.titolo.toLowerCase() ?? c;
  async function aggiungi() {
    await salva('richieste_commercialista', { id: nuovoId(), versione: 0, data: oggiIso(), testo: testo.trim(), stato: 'aperta', chiusa_il: null, pacchetto_id: pacchetti[0]?.id ?? null });
    setTesto('');
    onCambio();
  }
  async function cambiaStato(r: Richiesta) {
    const chiusa = r.stato === 'aperta';
    await salva('richieste_commercialista', { ...r, stato: chiusa ? 'chiusa' : 'aperta', chiusa_il: chiusa ? oggiIso() : null });
    onCambio();
  }
  const aperte = richieste.filter((r) => r.stato === 'aperta');
  return (
    <>
      <Scheda titolo={`Richieste del commercialista (${aperte.length} aperte)`} aiuto={{ argomento: 'richieste', testo: 'Annota cosa ti chiede e chiudila quando l\'hai sistemata. Non scrivere dati dei pazienti.' }}>
        <CampoTesto
          etichetta="Nuova richiesta"
          valore={testo}
          onChange={setTesto}
          lunghezzaMax={300}
          segnaposto="es. manca la ricevuta ENPAP di ottobre"
          aiuto={{ argomento: 'nuova richiesta', testo: 'Solo la richiesta: niente nomi né dati dei pazienti.' }}
        />
        <Button className={s.pulsante} disabled={!testo.trim()} onClick={() => void aggiungi()}>
          Aggiungi
        </Button>
        <ul className={s.elenco}>
          {richieste.map((r) => (
            <li key={r.id} className={s.voce}>
              <div className={s.riga}>
                <Text>{r.testo}</Text>
                <Badge appearance="tint" color={r.stato === 'aperta' ? 'warning' : 'success'}>
                  {r.stato === 'aperta' ? 'aperta' : `chiusa il ${dataIt(r.chiusa_il!)}`}
                </Badge>
              </div>
              <Text size={200} className={s.nota}>
                {dataIt(r.data)}
              </Text>
              <Button className={s.pulsante} appearance="subtle" onClick={() => void cambiaStato(r)}>
                {r.stato === 'aperta' ? 'Chiudi' : 'Riapri'}
              </Button>
            </li>
          ))}
        </ul>
      </Scheda>
      <Scheda titolo="Pacchetti inviati" aiuto={{ argomento: 'storico', testo: 'Ogni pacchetto generato, con periodo e destinatario. Il file e la password non si conservano.' }}>
        {pacchetti.length === 0 ? <Text>Nessun pacchetto ancora.</Text> : null}
        <ul className={s.elenco}>
          {pacchetti.map((x, i) => {
            const prima = pacchetti.slice(i + 1).find((y) => y.periodo_da === x.periodo_da && y.periodo_a === x.periodo_a);
            const diff = prima ? differenze(x, prima) : [];
            return (
              <li key={x.id} className={s.voce}>
                <Text weight="semibold">
                  {new Date(x.creato_il).toLocaleDateString('it-IT')} · dal {dataIt(x.periodo_da)} al {dataIt(x.periodo_a)}
                  {x.destinatario ? ` · per ${x.destinatario}` : ''}
                </Text>
                <Text size={200} className={s.nota}>
                  {x.sezioni.length} sezioni · {x.avvisi} avvisi · {x.allegati} allegati{x.usa_codici ? ' · con codici' : ''}
                </Text>
                {prima ? (
                  <Text size={200}>
                    {diff.length ? `Rispetto al precedente sono cambiati: ${diff.map(nomeSezione).join(', ')}.` : 'Uguale al precedente dello stesso periodo.'}
                  </Text>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Scheda>
    </>
  );
}
