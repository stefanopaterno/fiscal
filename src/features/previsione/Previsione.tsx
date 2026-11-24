'use client';

import {
  Badge,
  Button,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Skeleton,
  SkeletonItem,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Save20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { percentualeInTesto } from '@/engine/irpef/aritmetica';
import { centesimiInTesto, euroInCentesimi, formattaEuro } from '@/engine/importi';
import type { Metodo } from '@/engine/previsione/proiezione';
import { GrigliaKpi, Kpi, SceltaAnno, useAnno } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, CampoTesto, Collegamento, Griglia, Scheda } from '@/ui/Moduli';
import {
  nuovoId,
  quadroPrevisione,
  rigaDaFotografia,
  salva,
  spiegaErrore,
  type IpotesiRiga,
  type QuadroPrevisione,
} from './dati';

/**
 * Prospetto della previsione (specifica 006, US1–US5): tasse previste a fine anno con tre scenari, mesi reali
 * e previsti, ipotesi modificabili, andamento della previsione e calendario dei pagamenti per 18 mesi.
 * Tutto stimato col motore della 001; importi con l'occhio (FR-015).
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  scelta: { maxWidth: '240px' },
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  mese: {
    display: 'grid',
    gridTemplateColumns: 'minmax(84px, 120px) 1fr auto',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  dettaglio: { gridColumn: '1 / -1', color: tokens.colorNeutralForeground3, display: 'flex', flexWrap: 'wrap', gap: `0 ${tokens.spacingHorizontalL}` },
  pista: { height: '12px', borderRadius: tokens.borderRadiusMedium, backgroundColor: tokens.colorNeutralBackground3, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: tokens.borderRadiusMedium, backgroundColor: tokens.colorBrandBackground },
  barraPrevista: {
    backgroundColor: 'transparent',
    backgroundImage: `repeating-linear-gradient(45deg, ${tokens.colorBrandBackground2Hover} 0 6px, ${tokens.colorBrandBackground2} 6px 12px)`,
    border: `1px dashed ${tokens.colorBrandStroke1}`,
    boxSizing: 'border-box',
  },
  valore: { fontVariantNumeric: 'tabular-nums', textAlign: 'right' },
  nota: { color: tokens.colorNeutralForeground3 },
  pesi: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: tokens.spacingHorizontalM },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  pesante: { backgroundColor: tokens.colorPaletteYellowBackground1, borderRadius: tokens.borderRadiusMedium, padding: tokens.spacingHorizontalS },
  errore: { color: tokens.colorPaletteRedForeground1 },
});

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const nomeMese = (iso: string) => `${MESI_LUNGHI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const NOME_METODO: Record<Metodo, string> = {
  andamento: 'Andamento',
  stagionalita: 'Stagionalità',
  impegni: 'Impegni noti',
  obiettivo: 'Obiettivo annuo',
};
const e = formattaEuro;

export function Previsione() {
  const s = useStili();
  const [anno, setAnno] = useAnno();
  const [q, setQ] = useState<QuadroPrevisione | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);
  const ricarica = useCallback(() => setGiro((g) => g + 1), []);
  const chiusa = useRef(new Set<string>());

  useEffect(() => {
    let vivo = true;
    quadroPrevisione(anno)
      .then(async (x) => {
        // chiusura mensile alla prima apertura dopo la fine del mese (FR-005)
        const c = x.chiusuraDaSalvare;
        if (c && !chiusa.current.has(`${anno}-${c.mese}`)) {
          chiusa.current.add(`${anno}-${c.mese}`);
          await salva('previsioni_salvate', rigaDaFotografia(anno, c, nuovoId())).catch(() => undefined);
          x = await quadroPrevisione(anno);
        }
        if (vivo) {
          setQ(x);
          setErrore(null);
        }
      })
      .catch((err) => vivo && setErrore(spiegaErrore(err)));
    return () => {
      vivo = false;
    };
  }, [anno, giro]);

  return (
    <div className={s.colonna}>
      <div className={s.scelta}>
        <SceltaAnno anno={anno} onChange={setAnno} />
      </div>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      {!q && !errore ? (
        <Skeleton aria-label="Calcolo la previsione">
          <SkeletonItem shape="rectangle" style={{ height: '160px' }} />
        </Skeleton>
      ) : null}
      {q && q.anno === anno ? <Contenuto q={q} onCambio={ricarica} /> : null}
    </div>
  );
}

function Contenuto({ q, onCambio }: { q: QuadroPrevisione; onCambio: () => void }) {
  const s = useStili();
  if (q.manca)
    return (
      <MessageBar intent="info" layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>{q.manca === 'cu' ? `Manca la Certificazione Unica ${q.anno}` : `Mancano le regole fiscali del ${q.anno}`}</MessageBarTitle>
          {q.manca === 'cu' ? (
            <>
              Le tasse della partita IVA dipendono dallo stipendio.{' '}
              <Collegamento href={`/tasse/dati/?anno=${q.anno}`} inLinea>
                Inserisci la CU
              </Collegamento>
            </>
          ) : (
            'Non mostro importi senza regole.'
          )}
        </MessageBarBody>
      </MessageBar>
    );
  const sc = q.scenari!;
  return (
    <>
      {q.proiezione.pochiDati ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Pochi dati</MessageBarTitle>
            Con meno di tre mesi di incassi l&apos;andamento è poco affidabile: inserisci un obiettivo annuo nelle ipotesi.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {q.proiezione.metodo == null ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            Nessun incasso e nessun obiettivo: la previsione conta solo i dati reali. Inserisci un obiettivo annuo qui sotto.
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <GrigliaKpi>
        <Kpi
          evidenza
          etichetta={`Tasse e contributi ${q.anno}`}
          valore={e(sc.atteso.totale)}
          nota={sc.atteso.provvisorio ? 'stima provvisoria' : 'stima'}
          aiuto={{
            argomento: 'tasse previste',
            testo: "IRPEF e addizionali in più per la partita IVA, più i contributi ENPAP soggettivo e maternità, sui compensi attesi nell'anno.",
            passi: [
              <>Compensi attesi: <ImportoNascosto valore={e(sc.atteso.compensi)} /></>,
              <>Reddito della partita IVA (compensi meno spese): <ImportoNascosto valore={e(sc.atteso.reddito)} /></>,
              <>IRPEF e addizionali con e senza partita IVA, sopra lo stipendio: <ImportoNascosto valore={e(sc.atteso.imposte)} /></>,
              <>ENPAP soggettivo e maternità: <ImportoNascosto valore={e(sc.atteso.contributi)} /></>,
              <>Totale: <ImportoNascosto valore={e(sc.atteso.totale)} /></>,
            ],
            fonte: 'Motore delle tasse di Fiscal con le regole dell\'anno',
            daVerificare: sc.atteso.provvisorio,
          }}
        />
        <Kpi
          etichetta="Scenario prudente"
          valore={e(sc.prudente.totale)}
          nota={`incassi futuri −${Math.round(q.ipotesi.prudente * 100)}%`}
          aiuto={{
            argomento: 'scenario prudente',
            testo: 'Se incassi meno del previsto nei mesi che mancano: le tasse scendono, ma conviene prepararsi allo scenario atteso.',
            passi: [
              <>Compensi con i mesi futuri ridotti: <ImportoNascosto valore={e(sc.prudente.compensi)} /></>,
              <>Reddito: <ImportoNascosto valore={e(sc.prudente.reddito)} /></>,
              <>Tasse e contributi: <ImportoNascosto valore={e(sc.prudente.totale)} /></>,
            ],
          }}
        />
        <Kpi
          etichetta="Scenario ottimistico"
          valore={e(sc.ottimistico.totale)}
          nota={`incassi futuri +${Math.round(q.ipotesi.ottimistico * 100)}%`}
          aiuto={{
            argomento: 'scenario ottimistico',
            testo: 'Se incassi di più del previsto: è il caso da coprire per non avere sorprese.',
            passi: [
              <>Compensi con i mesi futuri aumentati: <ImportoNascosto valore={e(sc.ottimistico.compensi)} /></>,
              <>Reddito: <ImportoNascosto valore={e(sc.ottimistico.reddito)} /></>,
              <>Tasse e contributi: <ImportoNascosto valore={e(sc.ottimistico.totale)} /></>,
            ],
          }}
        />
        {q.prossimo ? (
          <Kpi
            etichetta={`Versamento di ${nomeMese(q.prossimo.mese)}`}
            valore={e(q.prossimo.totale)}
            aiuto={{
              argomento: 'prossimo versamento',
              testo: 'Quello che si paga in quel mese con l\'F24 (e a ottobre all\'ENPAP), dalle stime dell\'anno.',
              passi: [
                ...q.prossimo.voci.map((v) => <>{v.tipo}: <ImportoNascosto valore={e(v.importo)} /></>),
                <>Totale: <ImportoNascosto valore={e(q.prossimo.totale)} /></>,
              ],
            }}
          />
        ) : null}
      </GrigliaKpi>

      <Netto q={q} />
      <PropostaVariabilita q={q} onCambio={onCambio} />
      <Variazione q={q} onCambio={onCambio} />
      <Prospetto q={q} />
      <Ipotesi key={`${q.ipotesi.id}-${q.ipotesi.versione}`} q={q} onCambio={onCambio} />
      <Andamento q={q} />
      <Calendario q={q} />
      <Text size={200} className={s.nota}>
        Stime fatte con le regole dell&apos;anno e con le ipotesi indicate; spese e ritenute dei mesi futuri seguono la
        proporzione avuta finora. Non garantiscono l&apos;assenza di conguagli.
      </Text>
    </>
  );
}

function Variazione({ q, onCambio }: { q: QuadroPrevisione; onCambio: () => void }) {
  const s = useStili();
  const [inCorso, setInCorso] = useState(false);
  const v = q.variazioni.get('attuale');
  const ultima = q.fotografie.at(-1);
  async function salvaOra() {
    if (!q.attuale) return;
    setInCorso(true);
    try {
      const esistente = q.fotografie.find((f) => f.mese === q.attuale!.mese);
      await salva('previsioni_salvate', {
        ...rigaDaFotografia(q.anno, q.attuale, esistente?.id ?? nuovoId()),
        versione: esistente?.versione ?? 0,
      });
      onCambio();
    } finally {
      setInCorso(false);
    }
  }
  return (
    <>
      {v && ultima ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Rispetto alla previsione di {nomeMese(ultima.mese)}</MessageBarTitle>
            <ImportoNascosto valore={v.join(' ')} segnaposto="Importi nascosti: tocca l'occhio per vedere la variazione." />
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <Button className={s.pulsante} icon={<Save20Regular />} disabled={inCorso} onClick={() => void salvaOra()}>
        Salva la previsione di oggi
      </Button>
    </>
  );
}

function Prospetto({ q }: { q: QuadroPrevisione }) {
  const s = useStili();
  const max = Math.max(1, ...q.proiezione.mesi.map((m) => m.valore), ...(q.annoPrima ?? []));
  const cambio = q.righe.find((r) => r.cambioScaglione);
  return (
    <Scheda
      titolo="Mese per mese"
      aiuto={{
        argomento: 'prospetto',
        testo: 'Barre piene: incassi reali. Barre tratteggiate: previsti. Per ogni mese le tasse maturate se l\'anno finisse lì.',
      }}
    >
      {cambio ? (
        <Text>
          A {MESI_LUNGHI[cambio.mese - 1]} il prossimo euro passa al {percentualeInTesto(cambio.aliquota)} di IRPEF.
        </Text>
      ) : null}
      <ul className={s.elenco}>
        {q.proiezione.mesi.map((m) => {
          const r = q.righe[m.mese - 1]!;
          return (
            <li key={m.mese} className={s.mese}>
              <span>
                <Text weight={m.tipo === 'in_corso' ? 'semibold' : 'regular'}>{MESI[m.mese - 1]}</Text>{' '}
                {m.tipo !== 'reale' ? (
                  <Badge appearance="tint" size="small" color={m.tipo === 'in_corso' ? 'brand' : 'subtle'}>
                    {m.tipo === 'in_corso' ? 'in corso' : 'previsto'}
                  </Badge>
                ) : null}
              </span>
              <div className={s.pista} aria-hidden="true">
                <div
                  className={mergeClasses(s.barra, m.tipo === 'previsto' && s.barraPrevista)}
                  style={{ width: `${Math.round((m.valore / max) * 100)}%` }}
                />
              </div>
              <Text className={s.valore}>
                <ImportoNascosto valore={e(m.valore)} />
              </Text>
              <Text size={200} className={s.dettaglio}>
                <span>
                  Da inizio anno <ImportoNascosto valore={e(r.cumulato)} />
                </span>
                <span>
                  Tasse maturate <ImportoNascosto valore={e(r.imposteMaturate)} />
                </span>
                <span>Aliquota {percentualeInTesto(r.aliquota)}</span>
                {r.cambioScaglione ? <Badge appearance="tint" size="small" color="warning">cambio di scaglione</Badge> : null}
                {q.annoPrima ? (
                  <span>
                    Anno prima <ImportoNascosto valore={e(q.annoPrima[m.mese - 1] ?? 0)} />
                  </span>
                ) : null}
              </Text>
            </li>
          );
        })}
      </ul>
    </Scheda>
  );
}

function Ipotesi({ q, onCambio }: { q: QuadroPrevisione; onCambio: () => void }) {
  const s = useStili();
  const ip = q.ipotesi;
  const [metodo, setMetodo] = useState<Metodo | 'auto'>(ip.metodo ?? 'auto');
  const [obiettivo, setObiettivo] = useState(ip.obiettivo == null ? '' : centesimiInTesto(ip.obiettivo));
  const [netto, setNetto] = useState(ip.obiettivo_netto == null ? '' : centesimiInTesto(ip.obiettivo_netto));
  const [prudente, setPrudente] = useState(String(Math.round(ip.prudente * 100)));
  const [ottimistico, setOttimistico] = useState(String(Math.round(ip.ottimistico * 100)));
  const [pesi, setPesi] = useState(ip.pesi.map((p) => String(Math.round(p * 100))));
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const num = (t: string) => Number(t.replace(',', '.'));
  const obiettivoC = obiettivo.trim() === '' ? null : euroInCentesimi(obiettivo);
  const nettoC = netto.trim() === '' ? null : euroInCentesimi(netto);
  const pesiOk = pesi.every((p) => Number.isFinite(num(p)) && num(p) >= 0 && num(p) <= 100);
  const ok =
    (obiettivo.trim() === '' || (obiettivoC != null && obiettivoC > 0)) &&
    (netto.trim() === '' || (nettoC != null && nettoC > 0)) &&
    num(prudente) >= 0 && num(prudente) <= 90 &&
    num(ottimistico) >= 0 && num(ottimistico) <= 200 &&
    pesiOk;

  async function salvaIpotesi() {
    setInCorso(true);
    setErrore(null);
    const riga: IpotesiRiga = {
      ...ip,
      id: ip.id || nuovoId(),
      metodo: metodo === 'auto' ? null : metodo,
      obiettivo: obiettivoC,
      obiettivo_netto: nettoC,
      prudente: num(prudente) / 100,
      ottimistico: num(ottimistico) / 100,
      pesi: pesi.map((p) => Math.round(num(p) * 10) / 1000),
    };
    try {
      await salva('ipotesi_previsione', riga);
      onCambio();
    } catch (err) {
      setErrore(spiegaErrore(err));
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Scheda
      titolo="Ipotesi"
      aiuto={{
        argomento: 'ipotesi',
        testo:
          'Come prevedere i mesi che mancano. Nel primo anno si parte dall\'obiettivo annuo; dopo tre mesi di incassi si passa all\'andamento. I dati reali non cambiano mai.',
      }}
    >
      <Text>
        Metodo usato: <strong>{q.proiezione.metodo ? NOME_METODO[q.proiezione.metodo] : 'nessuno'}</strong>
      </Text>
      {q.perMetodo.length > 1 ? (
        <ul className={s.elenco}>
          {q.perMetodo.map((m) => (
            <li key={m.metodo}>
              <Text size={200}>
                {NOME_METODO[m.metodo]}: compensi <ImportoNascosto valore={e(m.compensi)} />, tasse e contributi{' '}
                <ImportoNascosto valore={e(m.totale)} />
              </Text>
            </li>
          ))}
        </ul>
      ) : null}
      <Griglia>
        <CampoScelta
          etichetta="Metodo"
          valore={metodo}
          onChange={setMetodo}
          opzioni={[
            { valore: 'auto', etichetta: 'Automatico' },
            ...q.disponibili.map((d) => ({
              valore: d.metodo,
              // l'obiettivo appena scritto lo rende disponibile anche prima di salvare
              etichetta: `${NOME_METODO[d.metodo]}${d.disponibile || (d.metodo === 'obiettivo' && (obiettivoC ?? 0) > 0) ? '' : ' (non disponibile)'}`,
            })),
          ]}
          suggerimento={q.disponibili.find((d) => d.metodo === metodo)?.motivo}
          aiuto={{ argomento: 'metodo', testo: 'Andamento: media dei mesi passati. Stagionalità: gli stessi mesi dell\'anno prima. Impegni noti: le fatture da incassare. Obiettivo: quanto pensi di fatturare.' }}
        />
        <CampoTesto
          etichetta="Obiettivo annuo di compensi"
          valore={obiettivo}
          onChange={setObiettivo}
          inputMode="decimal"
          lunghezzaMax={12}
          segnaposto="es. 30.000"
          errore={obiettivo.trim() !== '' && (obiettivoC == null || obiettivoC <= 0) ? 'Importo non valido' : undefined}
          aiuto={{ argomento: 'obiettivo', testo: 'Compensi dell\'anno senza integrativo, IVA e bollo. La parte che manca si distribuisce sui mesi rimasti secondo i pesi.' }}
        />
        <CampoTesto
          etichetta="Obiettivo di netto dell'anno"
          valore={netto}
          onChange={setNetto}
          inputMode="decimal"
          lunghezzaMax={12}
          segnaposto="es. 18.000"
          errore={netto.trim() !== '' && (nettoC == null || nettoC <= 0) ? 'Importo non valido' : undefined}
          aiuto={{
            argomento: 'obiettivo di netto',
            testo: 'Quanto vuoi che ti resti dalla partita IVA nell\'anno, dopo spese, tasse e contributi. Fiscal calcola quanto devi incassare per arrivarci.',
          }}
        />
        <CampoTesto
          etichetta="Prudente: incassi in meno (%)"
          valore={prudente}
          onChange={setPrudente}
          inputMode="numeric"
          lunghezzaMax={2}
          aiuto={{ argomento: 'prudente', testo: 'Quanto in meno rispetto all\'atteso nei mesi futuri.' }}
        />
        <CampoTesto
          etichetta="Ottimistico: incassi in più (%)"
          valore={ottimistico}
          onChange={setOttimistico}
          inputMode="numeric"
          lunghezzaMax={3}
          aiuto={{ argomento: 'ottimistico', testo: 'Quanto in più rispetto all\'atteso nei mesi futuri.' }}
        />
      </Griglia>
      <Text weight="semibold">Attività per mese (%)</Text>
      <div className={s.pesi}>
        {pesi.map((p, i) => (
          <CampoTesto
            key={MESI[i]}
            etichetta={MESI_LUNGHI[i]!}
            valore={p}
            onChange={(v) => setPesi((x) => x.map((y, j) => (j === i ? v : y)))}
            inputMode="numeric"
            lunghezzaMax={3}
            errore={Number.isFinite(num(p)) && num(p) >= 0 && num(p) <= 100 ? undefined : '0–100'}
            aiuto={{ argomento: `peso di ${MESI_LUNGHI[i]}`, testo: '100 = mese normale, 0 = mese di pausa (per esempio le ferie di agosto).' }}
          />
        ))}
      </div>
      <Button className={s.pulsante} appearance="primary" disabled={inCorso || !ok} onClick={() => void salvaIpotesi()}>
        Salva le ipotesi
      </Button>
      {errore ? (
        <Text role="alert" className={s.errore}>
          {errore}
        </Text>
      ) : null}
    </Scheda>
  );
}

function Andamento({ q }: { q: QuadroPrevisione }) {
  const s = useStili();
  if (q.fotografie.length === 0) return null;
  const max = Math.max(1, ...q.fotografie.map((f) => Number(f.totale)));
  return (
    <Scheda
      titolo="Come è cambiata la previsione"
      aiuto={{ argomento: 'andamento della previsione', testo: 'La previsione di fine anno salvata a ogni fine mese, con il perché di ogni variazione.' }}
    >
      <ul className={s.elenco}>
        {q.fotografie.map((f) => (
          <li key={f.id} className={s.mese}>
            <Text>{nomeMese(f.mese)}</Text>
            <div className={s.pista} aria-hidden="true">
              <div className={s.barra} style={{ width: `${Math.round((Number(f.totale) / max) * 100)}%` }} />
            </div>
            <Text className={s.valore}>
              <ImportoNascosto valore={e(Number(f.totale))} />
            </Text>
            {q.variazioni.get(f.mese) ? (
              <Text size={200} className={s.dettaglio}>
                <ImportoNascosto valore={q.variazioni.get(f.mese)!.join(' ')} segnaposto="••••" />
              </Text>
            ) : null}
          </li>
        ))}
      </ul>
    </Scheda>
  );
}

function Calendario({ q }: { q: QuadroPrevisione }) {
  const s = useStili();
  const conPagamenti = q.calendario.filter((m) => m.totale > 0);
  const giugno = q.calendario.find((m) => m.mese === `${q.anno + 1}-06`);
  return (
    <Scheda
      titolo="Quando escono i soldi (18 mesi)"
      aiuto={{
        argomento: 'calendario dei pagamenti',
        testo: 'Saldo e acconti di giugno e novembre e contributi ENPAP previsti, mese per mese. I mesi non elencati non hanno versamenti di tasse.',
      }}
    >
      {q.primoAnno && giugno && giugno.totale > 0 ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Giugno {q.anno + 1} è il mese più pesante</MessageBarTitle>
            Nel primo anno di partita IVA a giugno paghi insieme il saldo del {q.anno} e il primo acconto del {q.anno + 1}:{' '}
            <ImportoNascosto valore={e(giugno.totale)} />.{' '}
            <Collegamento href="/salvadanaio/" inLinea>
              Guarda il salvadanaio
            </Collegamento>
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {conPagamenti.length === 0 ? <Text>Nessun versamento previsto nei prossimi 18 mesi.</Text> : null}
      <ul className={s.elenco}>
        {conPagamenti.map((m) => (
          <li key={m.mese} className={mergeClasses(s.mese, m.piuPesante && s.pesante)}>
            <Text weight="semibold">{nomeMese(m.mese)}</Text>
            <span>{m.piuPesante ? <Badge appearance="tint" color="warning">il più pesante</Badge> : null}</span>
            <Text className={s.valore} weight="semibold">
              <ImportoNascosto valore={e(m.totale)} />
            </Text>
            <Text size={200} className={s.dettaglio}>
              {m.voci.map((v) => (
                <span key={v.tipo}>
                  {v.tipo} <ImportoNascosto valore={e(v.importo)} />
                </span>
              ))}
            </Text>
          </li>
        ))}
      </ul>
    </Scheda>
  );
}

/** Netto previsto e obiettivo di netto (FR-011, T008). */
function Netto({ q }: { q: QuadroPrevisione }) {
  const n = q.netto;
  if (!n) return null;
  const manca = n.obiettivo != null ? n.obiettivo - n.previsto : null;
  return (
    <GrigliaKpi>
      <Kpi
        etichetta={`Netto previsto ${q.anno}`}
        valore={e(n.previsto)}
        nota="compensi meno spese, tasse e contributi"
        aiuto={{
          argomento: 'netto previsto',
          testo: 'Quello che ti resta della partita IVA nello scenario atteso. Non conta IVA, integrativo e bollo, che non sono tuoi.',
          passi: [
            <>Compensi attesi: <ImportoNascosto valore={e(q.scenari!.atteso.compensi)} /></>,
            <>Tasse e contributi: <ImportoNascosto valore={e(q.scenari!.atteso.totale)} /></>,
            <>Netto (tolte anche le spese deducibili): <ImportoNascosto valore={e(n.previsto)} /></>,
          ],
        }}
      />
      {n.obiettivo != null ? (
        <Kpi
          etichetta="Obiettivo di netto"
          valore={e(n.obiettivo)}
          nota={
            manca != null && manca > 0
              ? n.compensiNecessari != null
                ? 'servono più compensi: vedi i dettagli'
                : 'non raggiungibile con questi dati'
              : 'raggiunto nello scenario atteso'
          }
          aiuto={{
            argomento: 'compensi per l\'obiettivo',
            testo: 'Fiscal prova diversi compensi con il motore delle tasse finché il netto arriva all\'obiettivo: tiene conto degli scaglioni e dei contributi, quindi ogni euro in più vale meno di un euro netto.',
            dettaglio: 'Le spese future seguono il rapporto con i compensi avuto finora.',
            passi:
              n.compensiNecessari != null
                ? [
                    <>Netto previsto: <ImportoNascosto valore={e(n.previsto)} /></>,
                    <>Obiettivo: <ImportoNascosto valore={e(n.obiettivo)} /></>,
                    <>Compensi necessari nell&apos;anno: <ImportoNascosto valore={e(n.compensiNecessari)} /></>,
                    <>Cioè in più rispetto all&apos;atteso: <ImportoNascosto valore={e(n.compensiNecessari - q.scenari!.atteso.compensi)} /></>,
                  ]
                : undefined,
          }}
        />
      ) : null}
    </GrigliaKpi>
  );
}

/** Proposta dell'intervallo dalla variabilità reale (FR-004, T008): l'utente la accetta o la rifiuta. */
function PropostaVariabilita({ q, onCambio }: { q: QuadroPrevisione; onCambio: () => void }) {
  const chiave = `fiscal.variabilita.${q.anno}`;
  const [rifiutata, setRifiutata] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(chiave) === String(q.variabilita?.frazione);
    } catch {
      return false;
    }
  });
  const [errore, setErrore] = useState<string | null>(null);
  const v = q.variabilita;
  if (!v || rifiutata) return null;
  if (Math.abs(q.ipotesi.prudente - v.frazione) < 0.001 && Math.abs(q.ipotesi.ottimistico - v.frazione) < 0.001) return null;
  const pct = Math.round(v.frazione * 100);
  return (
    <MessageBar intent="info" layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>Intervallo dai tuoi dati</MessageBarTitle>
        Negli ultimi {v.mesiUsati} mesi un mese si è scostato in media del {Math.round(v.scostamentoMensile * 100)}% dalla media. Sui{' '}
        {v.mesiFuturi} mesi che mancano gli scostamenti in parte si compensano: propongo scenari a ±{pct}% invece di −
        {Math.round(q.ipotesi.prudente * 100)}% / +{Math.round(q.ipotesi.ottimistico * 100)}%.
        {errore ? ` ${errore}` : ''}
      </MessageBarBody>
      <MessageBarActions>
        <Button
          onClick={async () => {
            try {
              await salva('ipotesi_previsione', { ...q.ipotesi, id: q.ipotesi.id || nuovoId(), prudente: v.frazione, ottimistico: v.frazione });
              onCambio();
            } catch (err) {
              setErrore(spiegaErrore(err));
            }
          }}
        >
          Usa ±{pct}%
        </Button>
        <Button
          appearance="subtle"
          onClick={() => {
            try {
              localStorage.setItem(chiave, String(v.frazione));
            } catch {
              /* preferenza solo per questa sessione */
            }
            setRifiutata(true);
          }}
        >
          No, grazie
        </Button>
      </MessageBarActions>
    </MessageBar>
  );
}
