'use client';

import {
  Badge,
  Button,
  Checkbox,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  Skeleton,
  SkeletonItem,
  Switch,
  Text,
  tokens,
} from '@fluentui/react-components';
import { ArrowDownload20Regular, Checkmark20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formattaEuro } from '@/engine/importi';
import { ANTICIPO_PREDEFINITO, anniConScadenze } from '@/engine/regole/scadenze';
import { fileCalendario, type VoceCalendario } from '@/engine/scadenze/calendario';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoData, CampoScelta, CampoTesto, Griglia, Scheda } from '@/ui/Moduli';
import { annoCorrente, oggiIso } from '@/lib/oggi';
import { eliminaRiga, nuovoId, quadroScadenze, salva, spiegaErrore, type QuadroScadenze } from './dati';

/**
 * Calendario delle scadenze (specifica 004, US4, FR-008…FR-012, FR-030…FR-033): tutte le scadenze dell'anno
 * dalle regole, quelle che ti riguardano in evidenza, flag «fatta», proroghe, scadenze personali ed
 * esportazione nel calendario del telefono senza importi né nomi.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  scelta: { maxWidth: '240px' },
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  voce: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalM} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  fatta: { opacity: 0.6 },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  data: { fontVariantNumeric: 'tabular-nums', minWidth: '92px' },
  nota: { color: tokens.colorNeutralForeground3 },
  pulsante: { minHeight: '44px' },
});

const CHIAVE_ANTICIPO = 'fiscal.anticipoScadenze';
export function anticipoScelto(): number {
  try {
    const v = Number(localStorage.getItem(CHIAVE_ANTICIPO));
    return Number.isInteger(v) && v > 0 && v <= 90 ? v : ANTICIPO_PREDEFINITO.valore;
  } catch {
    return ANTICIPO_PREDEFINITO.valore;
  }
}

const dataIt = (iso: string) => iso.split('-').reverse().join('/');
const e = formattaEuro;

export function Scadenze() {
  const s = useStili();
  const anni = anniConScadenze();
  const [anno, setAnno] = useState(() => (anni.includes(annoCorrente()) ? annoCorrente() : anni[0]!));
  const [q, setQ] = useState<QuadroScadenze | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [tutte, setTutte] = useState(false);
  const [giro, setGiro] = useState(0);
  const ricarica = useCallback(() => setGiro((g) => g + 1), []);

  useEffect(() => {
    let vivo = true;
    quadroScadenze(anno)
      .then((x) => vivo && (setQ(x), setErrore(null)))
      .catch((err) => vivo && setErrore(spiegaErrore(err)));
    return () => {
      vivo = false;
    };
  }, [anno, giro]);

  const voci = useMemo(() => (q ? q.voci.filter((v) => tutte || v.pertinente) : []), [q, tutte]);

  return (
    <div className={s.colonna}>
      <div className={s.scelta}>
        <CampoScelta
          etichetta="Anno"
          valore={String(anno)}
          onChange={(v) => setAnno(Number(v))}
          opzioni={anni.map((a) => ({ valore: String(a), etichetta: String(a) }))}
          aiuto={{ argomento: 'anno del calendario', testo: "Le scadenze che cadono nell'anno: a giugno si paga il saldo dell'anno prima." }}
        />
      </div>
      <Switch label="Mostra anche le scadenze che non ti riguardano" checked={tutte} onChange={(_, d) => setTutte(d.checked)} />
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      {!q && !errore ? (
        <Skeleton aria-label="Carico le scadenze">
          <SkeletonItem shape="rectangle" style={{ height: '160px' }} />
        </Skeleton>
      ) : null}
      {q && q.anno === anno ? (
        <>
          <Scheda
            titolo={`Scadenze ${anno}`}
            aiuto={{
              argomento: 'scadenze',
              testo: 'Date dalle regole dell\'anno, spostate al primo giorno lavorativo se cadono di sabato, domenica o festivo. Tocca «Fatta» quando hai pagato o inviato.',
            }}
          >
            {voci.length === 0 ? <Text>Nessuna scadenza.</Text> : null}
            <ul className={s.elenco}>
              {voci.map((v) => (
                <VoceScadenza key={v.chiave} v={v} q={q} onCambio={ricarica} />
              ))}
            </ul>
          </Scheda>
          <NuovaPersonale q={q} onCambio={ricarica} />
          <Esporta q={q} />
        </>
      ) : null}
    </div>
  );
}

function VoceScadenza({ v, q, onCambio }: { v: VoceCalendario; q: QuadroScadenze; onCambio: () => void }) {
  const s = useStili();
  const [sposta, setSposta] = useState(false);
  const [nuovaData, setNuovaData] = useState(v.data);
  const [inCorso, setInCorso] = useState(false);
  const riga = q.stati.find((x) => x.chiave === v.chiave);
  const imp = v.importo ? q.importi.get(v.importo) : undefined;

  async function aggiorna(campi: { fatta_il?: string | null; data?: string | null }) {
    setInCorso(true);
    try {
      const base = riga ?? { id: nuovoId(), versione: 0, anno: v.anno, chiave: v.chiave, fatta_il: null, data: null, titolo: null, esporta: null };
      const nuova = { ...base, ...campi };
      if (!v.personale && nuova.fatta_il == null && nuova.data == null && riga) await eliminaRiga('scadenze_utente', riga.id);
      else await salva('scadenze_utente', nuova);
      onCambio();
    } finally {
      setInCorso(false);
    }
  }

  return (
    <li className={mergeClasses(s.voce, v.stato === 'fatta' && s.fatta)}>
      <div className={s.riga}>
        <Text weight="semibold" className={s.data}>
          {dataIt(v.data)}
        </Text>
        <Text weight="semibold">{v.titolo}</Text>
        {v.stato === 'fatta' ? (
          <Badge appearance="tint" color="success">
            Fatta il {dataIt(v.fattaIl!)}
          </Badge>
        ) : v.stato === 'scaduta' ? (
          <Badge appearance="tint" color="danger">
            Scaduta
          </Badge>
        ) : (
          <Badge appearance="tint" color={v.giorni <= 14 ? 'warning' : 'informative'}>
            {v.giorni === 0 ? 'oggi' : `tra ${v.giorni} ${v.giorni === 1 ? 'giorno' : 'giorni'}`}
          </Badge>
        )}
        {!v.pertinente ? (
          <Badge appearance="tint" color="subtle">
            Non ti riguarda
          </Badge>
        ) : null}
        {v.daVerificare ? (
          <Badge appearance="tint" color="subtle">
            Data da verificare
          </Badge>
        ) : null}
      </div>
      <Text size={200}>{v.descrizione}</Text>
      {imp && imp.importo > 0 ? (
        <Text size={200}>
          Importo {imp.stima ? 'stimato' : ''}: <ImportoNascosto valore={e(imp.importo)} /> ({imp.voci})
        </Text>
      ) : null}
      {v.dataOriginale ? (
        <Text size={200} className={s.nota}>
          {v.prorogata ? 'Prorogata' : 'Spostata al primo giorno lavorativo'}: era il {dataIt(v.dataOriginale)}.
        </Text>
      ) : null}
      <Text size={200} className={s.nota}>
        Fonte: {v.fonte}
      </Text>
      <div className={s.riga}>
        {v.stato === 'fatta' ? (
          <Button className={s.pulsante} appearance="subtle" disabled={inCorso} onClick={() => void aggiorna({ fatta_il: null })}>
            Togli «fatta»
          </Button>
        ) : (
          <Button className={s.pulsante} icon={<Checkmark20Regular />} disabled={inCorso} onClick={() => void aggiorna({ fatta_il: oggiIso() })}>
            Fatta
          </Button>
        )}
        {v.personale ? (
          <Button
            className={s.pulsante}
            appearance="subtle"
            icon={<Delete20Regular />}
            disabled={inCorso}
            onClick={() => riga && void eliminaRiga('scadenze_utente', riga.id).then(onCambio)}
          >
            Elimina
          </Button>
        ) : (
          <Button className={s.pulsante} appearance="subtle" onClick={() => setSposta((x) => !x)}>
            {v.prorogata ? 'Cambia la proroga' : 'Registra una proroga'}
          </Button>
        )}
      </div>
      {sposta ? (
        <div className={s.riga}>
          <CampoData
            etichetta="Nuova data"
            valore={nuovaData}
            onChange={setNuovaData}
            aiuto={{ argomento: 'proroga', testo: 'Se l\'Agenzia delle Entrate o l\'ENPAP spostano la scadenza, scrivi la nuova data.' }}
          />
          <Button className={s.pulsante} appearance="primary" disabled={inCorso || !nuovaData} onClick={() => void aggiorna({ data: nuovaData }).then(() => setSposta(false))}>
            Salva
          </Button>
          {v.prorogata ? (
            <Button className={s.pulsante} disabled={inCorso} onClick={() => void aggiorna({ data: null }).then(() => setSposta(false))}>
              Torna alla data di legge
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function NuovaPersonale({ q, onCambio }: { q: QuadroScadenze; onCambio: () => void }) {
  const s = useStili();
  const [titolo, setTitolo] = useState('');
  const [data, setData] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  async function aggiungi() {
    setErrore(null);
    const n = Math.max(0, ...q.stati.filter((x) => x.chiave.startsWith('personale_')).map((x) => Number(x.chiave.slice(10)) || 0)) + 1;
    try {
      await salva('scadenze_utente', { id: nuovoId(), versione: 0, anno: Number(data.slice(0, 4)), chiave: `personale_${n}`, fatta_il: null, data, titolo: titolo.trim(), esporta: true });
      setTitolo('');
      setData('');
      onCambio();
    } catch (err) {
      setErrore(spiegaErrore(err));
    }
  }
  return (
    <Scheda
      titolo="Aggiungi una scadenza personale"
      aiuto={{ argomento: 'scadenza personale', testo: 'Per esempio la consegna dei documenti al commercialista. Non scrivere nomi di pazienti.' }}
    >
      <Griglia>
        <CampoTesto
          etichetta="Cosa"
          valore={titolo}
          onChange={setTitolo}
          lunghezzaMax={80}
          aiuto={{ argomento: 'descrizione', testo: 'Breve, senza dati sensibili: finisce anche nel calendario del telefono.' }}
        />
        <CampoData etichetta="Quando" valore={data} onChange={setData} aiuto={{ argomento: 'data', testo: 'Il giorno della scadenza.' }} />
      </Griglia>
      <Button className={s.pulsante} appearance="primary" disabled={!titolo.trim() || !data} onClick={() => void aggiungi()}>
        Aggiungi
      </Button>
      {errore ? <Text role="alert">{errore}</Text> : null}
    </Scheda>
  );
}

function Esporta({ q }: { q: QuadroScadenze }) {
  const s = useStili();
  const daFare = q.voci.filter((v) => v.stato !== 'fatta' && v.giorni >= 0);
  const [scelte, setScelte] = useState(() => new Set(daFare.filter((v) => v.esporta).map((v) => v.chiave)));
  const [anticipo, setAnticipo] = useState(String(anticipoScelto()));
  const giorni = Number(anticipo);
  const ok = Number.isInteger(giorni) && giorni >= 1 && giorni <= 90;

  function scarica() {
    try {
      localStorage.setItem(CHIAVE_ANTICIPO, String(giorni));
    } catch {
      /* solo una comodità */
    }
    const testo = fileCalendario(daFare.filter((v) => scelte.has(v.chiave)), giorni, oggiIso());
    const url = URL.createObjectURL(new Blob([testo], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `scadenze-fiscal-${q.anno}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Scheda
      titolo="Porta le scadenze nel calendario del telefono"
      aiuto={{
        argomento: 'esportazione',
        testo: 'Un file da aprire con il calendario del telefono o del PC. Ti propongo quelle che ti riguardano; nel file non ci sono importi né nomi.',
      }}
    >
      {daFare.length === 0 ? <Text>Nessuna scadenza ancora da fare.</Text> : null}
      <div>
        {daFare.map((v) => (
          <div key={v.chiave}>
            <Checkbox
              label={`${dataIt(v.data)} · ${v.titolo}`}
              checked={scelte.has(v.chiave)}
              onChange={(_, d) =>
                setScelte((x) => {
                  const n = new Set(x);
                  if (d.checked) n.add(v.chiave);
                  else n.delete(v.chiave);
                  return n;
                })
              }
            />
          </div>
        ))}
      </div>
      <CampoTesto
        etichetta="Promemoria: giorni prima"
        valore={anticipo}
        onChange={setAnticipo}
        inputMode="numeric"
        lunghezzaMax={2}
        errore={ok ? undefined : 'Da 1 a 90'}
        aiuto={{ argomento: 'anticipo', testo: 'Quanti giorni prima vuoi l\'avviso, nel telefono e nella home di Fiscal.' }}
      />
      <Button className={s.pulsante} appearance="primary" icon={<ArrowDownload20Regular />} disabled={!ok || scelte.size === 0} onClick={scarica}>
        Scarica il file del calendario
      </Button>
    </Scheda>
  );
}
