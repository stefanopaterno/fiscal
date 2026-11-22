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
import { CampoSiNo, CampoTesto, Griglia, Scheda } from '@/ui/Moduli';
import { CampoEuro, percentualeDaTesto, percentualeInTestoModulo, SceltaAnno, useAnno } from './componenti';
import {
  elimina,
  leggiAliquote,
  leggiCu,
  leggiDatiAnno,
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

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiCu(anno), leggiDatiAnno(anno), leggiAliquote(anno)])
      .then(([c, d, a]) => {
        if (!vivo) return;
        setCu(c.length > 0 ? c : [nuovaCu(anno, nuovoId())]);
        setDati(d ?? nuoviDatiAnno(anno, nuovoId()));
        setAliquote(a ?? nuoveAliquote(anno, nuovoId()));
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
        <>
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
        </>
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
          valore={cu.sostituto ?? ''}
          onChange={(v) => cambia('sostituto')(v.trim() === '' ? null : v)}
          suggerimento="Facoltativo, solo per riconoscerla"
          aiuto={{
            argomento: 'datore di lavoro',
            testo: 'Il nome di chi ti ha pagato lo stipendio. Serve solo a te per distinguere le CU.',
          }}
        />
        <CampoEuro
          etichetta="Reddito di lavoro dipendente (punto 1)"
          valore={cu.reddito_lavoro}
          onChange={(v) => cambia('reddito_lavoro')(v ?? 0)}
          aiuto={{
            argomento: 'reddito di lavoro dipendente',
            testo:
              "Il punto 1 della CU (se hai un contratto a termine, il punto 2): lo stipendio dell'anno già senza i contributi INPS trattenuti. È più basso del lordo in busta paga.",
            esempio:
              "Con 40.000 € lordi l'anno il punto 1 è di solito intorno ai 36.300 € (circa il 9% va all'INPS).",
          }}
        />
        <CampoTesto
          etichetta="Giorni di lavoro (punto 6)"
          valore={String(cu.giorni_lavoro)}
          inputMode="numeric"
          errore={giorniValidi ? undefined : 'Da 1 a 365'}
          onChange={(v) => cambia('giorni_lavoro')(Number(v.replace(/\D/g, '')) || 0)}
          aiuto={{
            argomento: 'giorni di lavoro',
            testo: "I giorni per cui spetta la detrazione: 365 se hai lavorato tutto l'anno.",
          }}
        />
        <CampoEuro
          etichetta="Ritenute IRPEF (punto 21)"
          valore={cu.ritenute_irpef}
          onChange={(v) => cambia('ritenute_irpef')(v ?? 0)}
          aiuto={{
            argomento: 'ritenute IRPEF',
            testo: "L'IRPEF che il datore ti ha già trattenuto in busta paga nell'anno.",
          }}
        />
        <CampoEuro
          etichetta="Addizionale regionale (punto 22)"
          valore={cu.addizionale_regionale}
          onChange={(v) => cambia('addizionale_regionale')(v ?? 0)}
          aiuto={{
            argomento: 'addizionale regionale trattenuta',
            testo: "L'addizionale regionale dell'anno trattenuta dal datore.",
          }}
        />
        <CampoEuro
          etichetta="Addizionale comunale, acconto (punto 26)"
          valore={cu.addizionale_comunale_acconto}
          onChange={(v) => cambia('addizionale_comunale_acconto')(v ?? 0)}
          aiuto={{
            argomento: 'acconto addizionale comunale',
            testo: "La parte di addizionale comunale dell'anno trattenuta come acconto.",
          }}
        />
        <CampoEuro
          etichetta="Addizionale comunale, saldo (punto 27)"
          valore={cu.addizionale_comunale_saldo}
          onChange={(v) => cambia('addizionale_comunale_saldo')(v ?? 0)}
          aiuto={{
            argomento: 'saldo addizionale comunale',
            testo: "Il saldo dell'addizionale comunale dell'anno trattenuto dal datore.",
          }}
        />
        <CampoEuro
          etichetta="Acconto comunale anno dopo (punto 29)"
          facoltativo
          valore={cu.addizionale_comunale_acconto_anno_dopo}
          onChange={cambia('addizionale_comunale_acconto_anno_dopo')}
          aiuto={{
            argomento: 'punto 29',
            testo:
              "L'acconto dell'addizionale comunale dell'anno dopo che il datore ti tratterrà. Con questo numero l'acconto da versare a giugno è preciso; senza, l'app lo stima.",
          }}
        />
        <CampoEuro
          etichetta="Detrazioni per lavoro dipendente riconosciute"
          facoltativo
          valore={cu.detrazioni_lavoro_fruite}
          onChange={cambia('detrazioni_lavoro_fruite')}
          aiuto={{
            argomento: 'detrazioni fruite',
            testo:
              'Quanto ti ha riconosciuto il datore come detrazione per lavoro dipendente. Serve solo per spiegarti quanta ne perdi con la partita IVA.',
          }}
        />
        <CampoEuro
          etichetta="Detrazioni per familiari riconosciute"
          facoltativo
          valore={cu.detrazioni_familiari_fruite}
          onChange={cambia('detrazioni_familiari_fruite')}
          aiuto={{
            argomento: 'detrazioni familiari fruite',
            testo: 'Le detrazioni per familiari a carico applicate in busta paga, se ci sono.',
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
