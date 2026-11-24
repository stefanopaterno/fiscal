'use client';

import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import { CampoSiNo, CampoTesto, Collegamento, Griglia, Scheda } from '@/ui/Moduli';
import { CampoEuro, percentualeDaTesto, percentualeInTestoModulo, SceltaAnno, useAnno } from './componenti';
import {
  elimina,
  leggiAliquote,
  leggiCu,
  leggiDatiAnno,
  leggiDichiarazione,
  nuovaCu,
  nuoveAliquote,
  nuoviDatiAnno,
  nuovoId,
  salva,
  spiegaErrore,
  type AliquoteRiga,
  type Cu,
  type DatiAnno as RigaDatiAnno,
} from './dati';

/**
 * Dati dell'anno per il motore IRPEF (T010; data-model.md certificazioni_uniche.*, dati_anno.*,
 * aliquote_addizionali.*). Ogni campo dice in quale punto della CU trovarlo.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
  pulsante: { minHeight: '44px' },
  scelta: { maxWidth: '240px' },
  campi: {
    border: 'none',
    margin: 0,
    padding: 0,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  scaglione: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 44px',
    gap: tokens.spacingHorizontalS,
    alignItems: 'end',
  },
});

type EsitoSalva = { tipo: 'ok' | 'coda' | 'errore'; testo: string } | null;

function Esito({ esito }: { esito: EsitoSalva }) {
  if (!esito) return null;
  return (
    <MessageBar intent={esito.tipo === 'errore' ? 'error' : esito.tipo === 'coda' ? 'warning' : 'success'}>
      <MessageBarBody>{esito.testo}</MessageBarBody>
    </MessageBar>
  );
}

async function salvaConEsito<T extends { id: string; versione: number }>(
  tabella: string,
  riga: T,
): Promise<{ esito: EsitoSalva; versione: number }> {
  try {
    const r = await salva(tabella, riga as T & Record<string, unknown>);
    return {
      versione: r.versione,
      esito: r.inviata
        ? { tipo: 'ok', testo: 'Salvato.' }
        : { tipo: 'coda', testo: 'Salvato su questo dispositivo: lo invio appena torna la connessione.' },
    };
  } catch (e) {
    return { versione: riga.versione, esito: { tipo: 'errore', testo: spiegaErrore(e) } };
  }
}

export function DatiAnno() {
  const [anno, setAnno] = useAnno();
  return <DatiAnnoPerAnno key={anno} anno={anno} setAnno={setAnno} />;
}

function DatiAnnoPerAnno({ anno, setAnno }: { anno: number; setAnno: (a: number) => void }) {
  const s = useStili();
  const [cu, setCu] = useState<Cu[] | null>(null);
  const [dati, setDati] = useState<RigaDatiAnno | null>(null);
  const [aliquote, setAliquote] = useState<AliquoteRiga | null>(null);
  const [errore, setErrore] = useState(false);
  const [chiusoIl, setChiusoIl] = useState<string | null>(null);
  const [copiate, setCopiate] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      leggiCu(anno),
      leggiDatiAnno(anno),
      leggiAliquote(anno),
      leggiDichiarazione(anno).catch(() => null),
      leggiAliquote(anno - 1).catch(() => null),
      leggiDatiAnno(anno - 1).catch(() => null),
    ])
      .then(([c, d, a, dich, aPrima, dPrima]) => {
        if (!vivo) return;
        setChiusoIl(dich?.chiuso_il ?? null);
        setCu(c.length > 0 ? c : [nuovaCu(anno, nuovoId())]);
        // dati stabili (FR-006): proposti dall'anno prima, da confermare salvando
        setDati(d ?? { ...nuoviDatiAnno(anno, nuovoId()), soggetto_isa: dPrima?.soggetto_isa ?? false });
        if (a) setAliquote(a);
        else if (aPrima) {
          setAliquote({ ...aPrima, id: nuovoId(), versione: 0, anno, verificate: false });
          setCopiate(true);
        } else setAliquote(nuoveAliquote(anno, nuovoId()));
      })
      .catch(() => vivo && setErrore(true));
    return () => {
      vivo = false;
    };
  }, [anno]);

  return (
    <div className={s.colonna}>
      <div className={s.scelta}>
        <SceltaAnno anno={anno} onChange={setAnno} />
      </div>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>Non riesco a leggere i dati. Controlla la connessione e ricarica.</MessageBarBody>
        </MessageBar>
      ) : null}
      {!cu || !dati || !aliquote ? (
        errore ? null : (
          <Spinner label="Carico i dati…" />
        )
      ) : (
        <fieldset className={s.campi} disabled={chiusoIl !== null}>
          {chiusoIl ? (
            <MessageBar intent="warning" layout="multiline">
              <MessageBarBody>
                L&apos;anno {anno} è chiuso dal {chiusoIl.split('-').reverse().join('/')}: i dati si leggono ma non si
                modificano. Per correggerli riapri l&apos;anno dalla{' '}
                <Collegamento href="/dichiarazione/" inLinea>
                  Dichiarazione
                </Collegamento>
                .
              </MessageBarBody>
            </MessageBar>
          ) : null}
          {copiate && !chiusoIl ? (
            <MessageBar intent="info" layout="multiline">
              <MessageBarBody>
                Ho proposto le aliquote delle addizionali del {anno - 1}: controllale per il {anno} e salvale. Restano
                «provvisorie» finché non le segni verificate.
              </MessageBarBody>
            </MessageBar>
          ) : null}
          {cu.map((c, i) => (
            <SchedaCu
              key={c.id}
              iniziale={c}
              numero={cu.length > 1 ? i + 1 : null}
              onElimina={() => setCu((x) => (x ?? []).filter((y) => y.id !== c.id))}
            />
          ))}
          <Button
            className={s.pulsante}
            icon={<Add20Regular />}
            onClick={() => setCu((x) => [...(x ?? []), nuovaCu(anno, nuovoId())])}
          >
            Aggiungi un&apos;altra CU (secondo datore di lavoro)
          </Button>
          <SchedaDati key={`d${dati.id}`} iniziale={dati} />
          <SchedaAliquote key={`a${aliquote.id}`} iniziale={aliquote} />
        </fieldset>
      )}
    </div>
  );
}

function SchedaCu({
  iniziale,
  numero,
  onElimina,
}: {
  iniziale: Cu;
  numero: number | null;
  onElimina: () => void;
}) {
  const s = useStili();
  const [cu, setCu] = useState(iniziale);
  const [esito, setEsito] = useState<EsitoSalva>(null);
  const [salvando, setSalvando] = useState(false);
  const cambia =
    <K extends keyof Cu>(k: K) =>
    (v: Cu[K]) =>
      setCu((x) => ({ ...x, [k]: v }));
  const giorniValidi = Number.isInteger(cu.giorni_lavoro) && cu.giorni_lavoro >= 1 && cu.giorni_lavoro <= 365;

  async function salvaCu() {
    if (!giorniValidi) return setEsito({ tipo: 'errore', testo: 'I giorni di lavoro vanno da 1 a 365.' });
    setSalvando(true);
    const r = await salvaConEsito('certificazioni_uniche', cu);
    setCu((x) => ({ ...x, versione: r.versione }));
    setEsito(r.esito);
    setSalvando(false);
  }

  async function eliminaCu() {
    if (cu.versione === 0) return onElimina();
    try {
      await elimina('certificazioni_uniche', cu.id);
      onElimina();
    } catch (e) {
      setEsito({ tipo: 'errore', testo: spiegaErrore(e) });
    }
  }

  return (
    <Scheda
      titolo={`Certificazione Unica ${cu.anno}${numero ? ` (${numero})` : ''}`}
      aiuto={{
        argomento: 'certificazione unica',
        testo: `La CU è il riepilogo che il datore di lavoro ti dà a marzo dell'anno dopo. Copia i numeri dei punti indicati in ogni campo. Se nel ${cu.anno} hai avuto due datori, aggiungi una seconda CU.`,
        perche:
          'Il datore ha calcolato le tasse come se avessi solo lo stipendio: il calcolo serve a vedere cosa cambia con la partita IVA.',
      }}
      azioni={
        <div className={s.azioni}>
          <Button
            appearance="primary"
            className={s.pulsante}
            disabled={salvando}
            onClick={() => void salvaCu()}
          >
            Salva la CU
          </Button>
          <Button className={s.pulsante} icon={<Delete20Regular />} onClick={() => void eliminaCu()}>
            Elimina
          </Button>
          <Esito esito={esito} />
        </div>
      }
    >
      <Griglia>
        <CampoTesto
          etichetta="Datore di lavoro"
          lunghezzaMax={120}
          valore={cu.sostituto ?? ''}
          onChange={(v) => cambia('sostituto')(v.trim() === '' ? null : v)}
          suggerimento="Facoltativo, solo per riconoscerla"
          aiuto={{
            argomento: 'datore di lavoro',
            testo:
              "Il nome di chi ti ha pagato lo stipendio, come in cima alla CU (dati del sostituto d'imposta). Serve solo a te per distinguere le CU.",
          }}
        />
        <CampoEuro
          etichetta="Reddito di lavoro dipendente"
          suggerimento="CU, punto 1 (+ punto 2)"
          valore={cu.reddito_lavoro}
          onChange={(v) => cambia('reddito_lavoro')(v ?? 0)}
          aiuto={{
            argomento: 'reddito di lavoro dipendente',
            testo:
              'Nella CU, parte "Dati fiscali", punto 1: i redditi di lavoro dipendente con contratto a tempo indeterminato. Se c\'è un importo anche nel punto 2 (tempo determinato), somma i due. È lo stipendio dell\'anno già senza i contributi INPS trattenuti, quindi più basso del lordo.',
            esempio:
              "Con 40.000 € lordi l'anno il punto 1 è di solito intorno ai 36.300 € (circa il 9% va all'INPS).",
            daDove: "Istruzioni CU 2026 dell'Agenzia delle Entrate, punti 1 e 2.",
          }}
        />
        <CampoTesto
          etichetta="Giorni di lavoro"
          suggerimento="CU, punto 6"
          lunghezzaMax={3}
          valore={String(cu.giorni_lavoro)}
          inputMode="numeric"
          errore={giorniValidi ? undefined : 'Da 1 a 365'}
          onChange={(v) => cambia('giorni_lavoro')(Number(v.replace(/\D/g, '')) || 0)}
          aiuto={{
            argomento: 'giorni di lavoro',
            testo:
              "Punto 6 della CU: i giorni del rapporto di lavoro per cui spetta la detrazione per lavoro dipendente. 365 se hai lavorato tutto l'anno. Servono a rapportare le detrazioni.",
            daDove: 'Istruzioni CU 2026, punto 6.',
          }}
        />
        <CampoEuro
          etichetta="Ritenute IRPEF"
          suggerimento="CU, punto 21"
          valore={cu.ritenute_irpef}
          onChange={(v) => cambia('ritenute_irpef')(v ?? 0)}
          aiuto={{
            argomento: 'ritenute IRPEF',
            testo:
              "Punto 21 della CU: l'IRPEF che il datore ti ha trattenuto nell'anno, dopo il conguaglio di fine anno.",
            daDove: 'Istruzioni CU 2026, punto 21.',
          }}
        />
        <CampoEuro
          etichetta="Addizionale regionale"
          suggerimento="CU, punto 22"
          valore={cu.addizionale_regionale}
          onChange={(v) => cambia('addizionale_regionale')(v ?? 0)}
          aiuto={{
            argomento: 'addizionale regionale trattenuta',
            testo:
              "Punto 22 della CU: l'addizionale regionale dell'anno calcolata dal datore (te la trattiene a rate l'anno dopo).",
            daDove: 'Istruzioni CU 2026, punto 22.',
          }}
        />
        <CampoEuro
          etichetta="Addizionale comunale, acconto"
          suggerimento="CU, punto 26"
          valore={cu.addizionale_comunale_acconto}
          onChange={(v) => cambia('addizionale_comunale_acconto')(v ?? 0)}
          aiuto={{
            argomento: 'acconto addizionale comunale',
            testo:
              "Punto 26 della CU: l'acconto dell'addizionale comunale dell'anno, trattenuto durante l'anno.",
            daDove: 'Istruzioni CU 2026, punto 26.',
          }}
        />
        <CampoEuro
          etichetta="Addizionale comunale, saldo"
          suggerimento="CU, punto 27"
          valore={cu.addizionale_comunale_saldo}
          onChange={(v) => cambia('addizionale_comunale_saldo')(v ?? 0)}
          aiuto={{
            argomento: 'saldo addizionale comunale',
            testo:
              "Punto 27 della CU: il saldo dell'addizionale comunale dell'anno (te lo trattiene a rate l'anno dopo).",
            daDove: 'Istruzioni CU 2026, punto 27.',
          }}
        />
        <CampoEuro
          etichetta="Acconto comunale anno dopo"
          suggerimento="CU, punto 29 · facoltativo"
          facoltativo
          valore={cu.addizionale_comunale_acconto_anno_dopo}
          onChange={cambia('addizionale_comunale_acconto_anno_dopo')}
          aiuto={{
            argomento: 'punto 29',
            testo:
              "Punto 29 della CU: l'acconto dell'addizionale comunale dell'anno dopo, che il datore ti tratterrà. Con questo numero l'acconto da versare a giugno è preciso; senza, l'app lo stima.",
            daDove: 'Istruzioni CU 2026, punto 29.',
          }}
        />
        <CampoEuro
          etichetta="Detrazioni per lavoro"
          suggerimento="CU, punti 367 + 368 · facoltativo"
          facoltativo
          valore={cu.detrazioni_lavoro_fruite}
          onChange={cambia('detrazioni_lavoro_fruite')}
          aiuto={{
            argomento: 'detrazioni fruite',
            testo:
              "Somma il punto 367 (detrazione per lavoro dipendente) e il punto 368 (ulteriore detrazione, se c'è). Serve solo a spiegarti quanta detrazione perdi con la partita IVA: il calcolo la rifà da solo.",
            daDove: 'Istruzioni CU 2026, punti 367 e 368.',
          }}
        />
        <CampoEuro
          etichetta="Detrazioni per familiari"
          suggerimento="CU, punto 362 · facoltativo"
          facoltativo
          valore={cu.detrazioni_familiari_fruite}
          onChange={cambia('detrazioni_familiari_fruite')}
          aiuto={{
            argomento: 'detrazioni familiari fruite',
            testo:
              'Punto 362 della CU: le detrazioni per coniuge e familiari a carico che il datore ti ha riconosciuto.',
            daDove: 'Istruzioni CU 2026, punto 362.',
          }}
        />
        <CampoEuro
          etichetta="Previdenza complementare"
          suggerimento="CU, punto 412 · facoltativo"
          facoltativo
          valore={cu.previdenza_complementare}
          onChange={cambia('previdenza_complementare')}
          aiuto={{
            argomento: 'previdenza complementare in CU',
            testo:
              "Punto 412 della CU: i contributi al fondo pensione già dedotti dal datore. Contano nel limite annuo di 5.164,57 €: l'app calcola quanto puoi ancora versare con vantaggio. Se c'è un importo nel punto 413 (non dedotto), registralo nelle spese personali.",
            daDove: 'Istruzioni CU 2026, punti 412 e 413.',
          }}
        />
      </Griglia>
    </Scheda>
  );
}

function SchedaDati({ iniziale }: { iniziale: RigaDatiAnno }) {
  const s = useStili();
  const [d, setD] = useState(iniziale);
  const [esito, setEsito] = useState<EsitoSalva>(null);
  const [salvando, setSalvando] = useState(false);
  const cambia =
    <K extends keyof RigaDatiAnno>(k: K) =>
    (v: RigaDatiAnno[K]) =>
      setD((x) => ({ ...x, [k]: v }));

  async function salvaDati() {
    setSalvando(true);
    const r = await salvaConEsito('dati_anno', d);
    setD((x) => ({ ...x, versione: r.versione }));
    setEsito(r.esito);
    setSalvando(false);
  }

  return (
    <Scheda
      titolo={`Partita IVA e altri dati ${d.anno}`}
      aiuto={{
        argomento: "dati dell'anno",
        testo:
          'Il reddito della partita IVA lo calcolo dalle fatture incassate. Qui aggiungi le spese pagate e le altre voci della dichiarazione.',
      }}
      azioni={
        <div className={s.azioni}>
          <Button
            appearance="primary"
            className={s.pulsante}
            disabled={salvando}
            onClick={() => void salvaDati()}
          >
            Salva i dati
          </Button>
          <Esito esito={esito} />
        </div>
      }
    >
      <Griglia>
        <CampoEuro
          etichetta="Spese professionali pagate"
          valore={d.spese_professionali}
          onChange={(v) => cambia('spese_professionali')(v ?? 0)}
          aiuto={{
            argomento: 'spese professionali',
            testo:
              "Le spese per il lavoro pagate nell'anno (per cassa), già nella parte deducibile: per esempio supervisione, formazione, affitto dello studio, software.",
          }}
        />
        <CampoEuro
          etichetta="Reddito professionale (a mano)"
          facoltativo
          negativo
          valore={d.reddito_professionale_manuale}
          onChange={cambia('reddito_professionale_manuale')}
          suggerimento="Lascia vuoto per usare le fatture"
          aiuto={{
            argomento: 'reddito professionale a mano',
            testo:
              "Solo se le fatture non sono in Fiscal: incassi meno spese dell'anno. Può essere negativo (una perdita, con il meno davanti).",
          }}
        />
        <CampoEuro
          etichetta="Altre detrazioni"
          valore={d.altre_detrazioni}
          onChange={(v) => cambia('altre_detrazioni')(v ?? 0)}
          aiuto={{
            argomento: 'altre detrazioni',
            testo:
              "Il totale delle detrazioni per familiari a carico e delle altre detrazioni che ti spettano, se le conosci. L'app non le calcola: le usa come le scrivi.",
          }}
        />
        <CampoEuro
          etichetta="Altri oneri deducibili"
          valore={d.oneri_deducibili}
          onChange={(v) => cambia('oneri_deducibili')(v ?? 0)}
          aiuto={{
            argomento: 'oneri deducibili',
            testo:
              'Spese che si tolgono dal reddito, oltre ai contributi ENPAP (per esempio previdenza complementare). I contributi ENPAP li registri in Versamenti.',
          }}
        />
        <CampoEuro
          etichetta="Reddito professionale atteso anno dopo"
          facoltativo
          valore={d.reddito_atteso}
          onChange={cambia('reddito_atteso')}
          aiuto={{
            argomento: 'reddito atteso',
            testo:
              "Serve solo per il metodo previsionale degli acconti: quanto pensi di guadagnare con la partita IVA l'anno dopo.",
          }}
        />
        <CampoSiNo
          etichetta="Soggetto agli indici di affidabilità (ISA)"
          valore={d.soggetto_isa}
          onChange={cambia('soggetto_isa')}
          aiuto={{
            argomento: 'ISA',
            testo:
              'Cambia la divisione degli acconti (50 e 50 invece di 40 e 60). Il primo anno di attività ne sei escluso; per gli anni dopo chiedilo al commercialista.',
          }}
        />
        <CampoSiNo
          etichetta="Anno concluso"
          valore={d.anno_concluso}
          onChange={cambia('anno_concluso')}
          aiuto={{
            argomento: 'anno concluso',
            testo:
              "Quando l'anno è finito: da quel momento contano solo i contributi pagati davvero, non quelli previsti.",
          }}
        />
      </Griglia>
    </Scheda>
  );
}

function SchedaAliquote({ iniziale }: { iniziale: AliquoteRiga }) {
  const s = useStili();
  const [a, setA] = useState(iniziale);
  const [testi, setTesti] = useState(() => ({
    regionali: iniziale.regionale_scaglioni.map((x) => percentualeInTestoModulo(Number(x.aliquota))),
    comunale: percentualeInTestoModulo(Number(iniziale.comunale_aliquota)),
  }));
  const [esito, setEsito] = useState<EsitoSalva>(null);
  const [salvando, setSalvando] = useState(false);
  // chiavi stabili delle righe: togliendo uno scaglione le righe dopo non ereditano i valori sbagliati
  const [chiavi, setChiavi] = useState(() => iniziale.regionale_scaglioni.map((_, i) => i));
  const scaglioni = a.regionale_scaglioni;

  const aggiornaScaglione = (i: number, campo: 'fino_a' | 'aliquota', v: number | null) =>
    setA((x) => ({
      ...x,
      regionale_scaglioni: x.regionale_scaglioni.map((y, j) => (j === i ? { ...y, [campo]: v } : y)),
    }));

  function aggiungi() {
    setA((x) => {
      const nuovi = [...x.regionale_scaglioni];
      nuovi.splice(nuovi.length - 1, 0, { fino_a: 0, aliquota: 0 });
      return { ...x, regionale_scaglioni: nuovi };
    });
    setTesti((t) => {
      const r = [...t.regionali];
      r.splice(r.length - 1, 0, '');
      return { ...t, regionali: r };
    });
    setChiavi((c) => {
      const n = [...c];
      n.splice(n.length - 1, 0, Math.max(...c) + 1);
      return n;
    });
  }

  function togli(i: number) {
    setA((x) => ({ ...x, regionale_scaglioni: x.regionale_scaglioni.filter((_, j) => j !== i) }));
    setTesti((t) => ({ ...t, regionali: t.regionali.filter((_, j) => j !== i) }));
    setChiavi((c) => c.filter((_, j) => j !== i));
  }

  async function salvaAliquote() {
    const regionali = testi.regionali.map(percentualeDaTesto);
    const comunale = percentualeDaTesto(testi.comunale);
    if (regionali.some((x) => x === null || x > 0.05) || comunale === null || comunale > 0.009)
      return setEsito({
        tipo: 'errore',
        testo: 'Controlla le aliquote: regionale fino al 5%, comunale fino allo 0,9%.',
      });
    const limiti = scaglioni.slice(0, -1).map((x) => x.fino_a ?? 0);
    if (limiti.some((l, i) => l <= (i === 0 ? 0 : limiti[i - 1]!)))
      return setEsito({ tipo: 'errore', testo: 'I limiti degli scaglioni devono crescere.' });
    const riga: AliquoteRiga = {
      ...a,
      regionale_scaglioni: scaglioni.map((x, i) => ({
        fino_a: i === scaglioni.length - 1 ? null : x.fino_a,
        aliquota: regionali[i]!,
      })),
      comunale_aliquota: comunale,
    };
    setSalvando(true);
    const r = await salvaConEsito('aliquote_addizionali', riga);
    setA({ ...riga, versione: r.versione });
    setEsito(r.esito);
    setSalvando(false);
  }

  return (
    <Scheda
      titolo={`Addizionali ${a.anno}`}
      aiuto={{
        argomento: 'addizionali',
        testo:
          'Regione e comune dove hai la residenza applicano una piccola percentuale in più sul reddito. Le trovi sui loro siti (o su finanze.gov.it, sezione addizionali). Restano solo nel tuo archivio.',
      }}
      azioni={
        <div className={s.azioni}>
          <Button
            appearance="primary"
            className={s.pulsante}
            disabled={salvando}
            onClick={() => void salvaAliquote()}
          >
            Salva le aliquote
          </Button>
          <Esito esito={esito} />
        </div>
      }
    >
      <Text weight="semibold">Regionale</Text>
      {scaglioni.map((x, i) => {
        const ultimo = i === scaglioni.length - 1;
        return (
          <div key={chiavi[i] ?? i} className={s.scaglione}>
            {ultimo ? (
              <Text>{scaglioni.length === 1 ? 'Su tutto il reddito' : 'Oltre'}</Text>
            ) : (
              <CampoEuro
                etichetta="Fino a"
                valore={x.fino_a}
                onChange={(v) => aggiornaScaglione(i, 'fino_a', v ?? 0)}
                aiuto={{
                  argomento: 'limite dello scaglione',
                  testo: 'Il reddito fino a cui vale questa aliquota.',
                }}
              />
            )}
            <CampoTesto
              etichetta="Aliquota %"
              lunghezzaMax={6}
              valore={testi.regionali[i] ?? ''}
              inputMode="decimal"
              onChange={(v) =>
                setTesti((t) => ({ ...t, regionali: t.regionali.map((y, j) => (j === i ? v : y)) }))
              }
              aiuto={{ argomento: 'aliquota regionale', testo: 'In percentuale, per esempio 1,23.' }}
            />
            {!ultimo ? (
              <Button
                appearance="subtle"
                aria-label="Togli lo scaglione"
                icon={<Delete20Regular />}
                className={s.pulsante}
                onClick={() => togli(i)}
              />
            ) : (
              <span />
            )}
          </div>
        );
      })}
      <Button className={s.pulsante} icon={<Add20Regular />} onClick={aggiungi}>
        Aggiungi uno scaglione
      </Button>
      <Text weight="semibold">Comunale</Text>
      <Griglia>
        <CampoTesto
          etichetta="Aliquota comunale %"
          lunghezzaMax={6}
          valore={testi.comunale}
          inputMode="decimal"
          onChange={(v) => setTesti((t) => ({ ...t, comunale: v }))}
          aiuto={{ argomento: 'aliquota comunale', testo: 'In percentuale, al massimo 0,8 (0,9 per Roma).' }}
        />
        <CampoEuro
          etichetta="Soglia di esenzione"
          facoltativo
          valore={a.comunale_soglia_esenzione}
          onChange={(v) => setA((x) => ({ ...x, comunale_soglia_esenzione: v }))}
          aiuto={{
            argomento: 'soglia di esenzione',
            testo:
              'Se il comune non fa pagare chi ha un reddito basso, scrivi qui il limite. Sopra la soglia si paga su tutto il reddito.',
          }}
        />
        <CampoSiNo
          etichetta="Verificate sui siti ufficiali"
          valore={a.verificate}
          onChange={(v) => setA((x) => ({ ...x, verificate: v }))}
          aiuto={{
            argomento: 'aliquote verificate',
            testo:
              'Attivalo quando hai controllato le aliquote dell\'anno: finché non lo fai il calcolo resta "provvisorio".',
          }}
        />
      </Griglia>
    </Scheda>
  );
}
