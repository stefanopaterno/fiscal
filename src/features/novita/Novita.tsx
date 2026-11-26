'use client';

import {
  Badge,
  Button,
  Link,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import { Copy20Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { controlliDovuti, controlloSettimanale, promemoriaParametri, promptControllo, type Controllo } from '@/engine/novita/controlli';
import { modificheProgramma, type ModificaRaggruppata, type StatoModifica } from '@/engine/novita/modifiche';
import { impattoNovita, type Impatto } from '@/engine/novita/impatto';
import { regoleAperte } from '@/engine/novita/regole-aperte';
import { formattaEuro } from '@/engine/importi';
import { NOTIZIE, ULTIMO_CONTROLLO, type Notizia } from '@/engine/regole/novita';
import { leggiImportazioni, segnaModifica, type Importazione } from '@/features/parametri/dati';
import { leggiAliquote, raccogliAnno } from '@/features/tasse/dati';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { Collegamento, Scheda } from '@/ui/Moduli';
import { oggiIso } from '@/lib/oggi';

/**
 * Pagina delle novità normative (specifica 012): controlli da fare (addizionali alle date giuste e
 * controllo settimanale, con il prompt da incollare all'assistente), notizie con fonte e proposta,
 * regole ancora da verificare. Nessun dato personale lascia l'app.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  voce: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: 0 },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  nota: { color: tokens.colorNeutralForeground3 },
  prompt: { width: '100%', minHeight: '180px' },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  fonte: { display: 'inline-flex', alignItems: 'center', minHeight: '44px', textDecorationLine: 'none', ':hover': { textDecorationLine: 'underline' } },
  regola: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    overflowWrap: 'anywhere',
  },
});

const STATO: Record<Notizia['stato'], { testo: string; colore: 'success' | 'warning' | 'informative' }> = {
  in_vigore: { testo: 'In vigore', colore: 'success' },
  approvata: { testo: 'Approvata, non ancora pubblicata', colore: 'warning' },
  proposta: { testo: 'Proposta', colore: 'informative' },
};

/** Controlli dovuti oggi (usato anche dalla home), compreso il promemoria dei parametri (specifica 014). */
export async function controlliDiOggi(): Promise<{
  controlli: Controllo[];
  settimanale: ReturnType<typeof controlloSettimanale>;
  parametri: ReturnType<typeof promemoriaParametri>;
  importazioni: Importazione[];
}> {
  const oggi = oggiIso();
  const anno = Number(oggi.slice(0, 4));
  const anni = [anno, anno + 1];
  const [righe, importazioni] = await Promise.all([
    Promise.all(anni.map((a) => leggiAliquote(a).catch(() => null))),
    leggiImportazioni().catch(() => [] as Importazione[]),
  ]);
  const aliquoteVerificate = new Map(anni.map((a, i) => [a, righe[i]?.verificate === true]));
  const parametri = promemoriaParametri(oggi, {
    ultimaImportazione: importazioni[0]?.creato_il ?? null,
    daVerificareAnnoInCorso: regoleAperte().filter((r) => r.anno === anno).length,
  });
  return { controlli: controlliDovuti(oggi, { aliquoteVerificate }), settimanale: controlloSettimanale(oggi), parametri, importazioni };
}

export function Novita() {
  const s = useStili();
  const oggi = oggiIso();
  const [dovuti, setDovuti] = useState<Controllo[] | null>(null);
  const [parametri, setParametri] = useState<ReturnType<typeof promemoriaParametri> | null>(null);
  const [importazioni, setImportazioni] = useState<Importazione[]>([]);
  const [copiato, setCopiato] = useState(false);
  const settimanale = controlloSettimanale(oggi);
  const prompt = useMemo(() => promptControllo(oggi), [oggi]);
  const aperte = useMemo(() => regoleAperte(), []);

  useEffect(() => {
    let vivo = true;
    controlliDiOggi()
      .then((c) => {
        if (!vivo) return;
        setDovuti(c.controlli);
        setParametri(c.parametri);
        setImportazioni(c.importazioni);
      })
      .catch(() => vivo && setDovuti([]));
    return () => {
      vivo = false;
    };
  }, []);

  async function copia() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiato(true);
    } catch {
      setCopiato(false);
    }
  }

  const notizie = [...NOTIZIE].sort((a, b) => b.data.localeCompare(a.data));
  const daFare = (dovuti?.length ?? 0) > 0 || settimanale.scaduto;

  return (
    <div className={s.colonna}>
      <MessageBar intent={settimanale.scaduto ? 'warning' : 'success'} layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>
            Ultimo controllo delle fonti: {ULTIMO_CONTROLLO.data.split('-').reverse().join('/')}
            {settimanale.giorni > 0 ? ` (${settimanale.giorni} ${settimanale.giorni === 1 ? 'giorno' : 'giorni'} fa)` : ' (oggi)'}
          </MessageBarTitle>
          {ULTIMO_CONTROLLO.esito} Fonti: {ULTIMO_CONTROLLO.fonti.join(', ')}.
        </MessageBarBody>
      </MessageBar>

      <Scheda
        titolo="Controlli da fare"
        aiuto={{
          argomento: 'controlli',
          testo:
            'Ogni settimana si controllano le fonti ufficiali; le addizionali quando regione e comune le pubblicano (febbraio, fine dicembre e maggio). Le regole cambiano solo dopo il tuo sì.',
        }}
      >
        {!daFare ? <Text>Niente da fare: il controllo è aggiornato.</Text> : null}
        <ul className={s.elenco}>
          {settimanale.scaduto ? (
            <li className={s.voce}>
              <Text weight="semibold">Controllo settimanale delle novità</Text>
              <Text>Sono passati più di 7 giorni: copia il testo qui sotto e incollalo all&apos;assistente.</Text>
            </li>
          ) : null}
          {(dovuti ?? []).map((c) => (
            <li key={c.chiave} className={s.voce}>
              <Text weight="semibold">{c.titolo}</Text>
              <Text>{c.perche}</Text>
              <Collegamento href={`/tasse/dati/?anno=${c.anno}`}>Apri i dati del {c.anno}</Collegamento>
            </li>
          ))}
        </ul>
        <Textarea
          className={s.prompt}
          value={prompt}
          readOnly
          resize="vertical"
          aria-label="Testo da incollare all'assistente"
        />
        <Button className={s.pulsante} icon={<Copy20Regular />} onClick={() => void copia()}>
          {copiato ? 'Copiato' : 'Copia il testo per l\'assistente'}
        </Button>
        <Text size={200} className={s.nota}>
          Il testo contiene solo informazioni pubbliche: nessun importo, né regione o comune.
        </Text>
      </Scheda>

      <Scheda
        titolo="Parametri fiscali"
        aiuto={{
          argomento: 'aggiornamento dei parametri',
          testo:
            'Quando cambiano aliquote, soglie o scadenze: prepari la richiesta per Claude, importi la sua risposta e approvi voce per voce. Lo storico non cambia.',
        }}
      >
        {parametri?.dovuto ? (
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>{parametri.motivo}</MessageBarBody>
          </MessageBar>
        ) : (
          <Text>
            {importazioni[0]
              ? `Ultimo aggiornamento importato il ${importazioni[0].creato_il.slice(0, 10).split('-').reverse().join('/')}.`
              : 'Nessun aggiornamento importato: Fiscal usa i valori del programma.'}
          </Text>
        )}
        <Collegamento href="/impostazioni/parametri/">Apri i parametri fiscali</Collegamento>
        <DaFareNelProgramma importazioni={importazioni} onCambio={setImportazioni} />
      </Scheda>

      <Scheda
        titolo="Novità"
        aiuto={{
          argomento: 'novità',
          testo: 'Cosa cambia, da quando, la fonte ufficiale e cosa propongo di aggiornare. Per vedere l\'effetto sui tuoi conti usa il simulatore delle tasse.',
        }}
      >
        {notizie.length === 0 ? <Text>Nessuna novità.</Text> : null}
        <ul className={s.elenco}>
          {notizie.map((n) => (
            <li key={n.id} className={s.voce}>
              <div className={s.riga}>
                <Text weight="semibold">{n.titolo}</Text>
                <Badge appearance="tint" color={STATO[n.stato].colore}>
                  {STATO[n.stato].testo}
                </Badge>
                {n.tiRiguarda !== true ? (
                  <Badge appearance="tint" color="subtle">
                    Non ti riguarda
                  </Badge>
                ) : null}
              </div>
              <Text>{n.cosaCambia}</Text>
              <Text size={200}>Da quando: {n.daQuando}</Text>
              <Text size={200}>Effetto: {n.impatto}</Text>
              {n.tiRiguarda !== true ? <Text size={200}>{n.tiRiguarda}</Text> : null}
              <Text size={200} className={s.nota}>
                Regole toccate: {n.regole.join(', ')}
              </Text>
              {n.simulazione && n.tiRiguarda === true ? <ImpattoSuiConti n={n} /> : null}
              {n.proposta ? (
                <Text size={200}>
                  Proposta ({n.proposta.stato === 'in_attesa' ? 'in attesa del tuo sì' : n.proposta.stato}): {n.proposta.descrizione}
                </Text>
              ) : null}
              <div className={s.riga}>
                {n.fonti.map((f) => (
                  <Link key={f.url} href={f.url} target="_blank" rel="noreferrer" className={s.fonte}>
                    {f.nome}
                    {f.ufficiale ? '' : ' (fonte divulgativa, da confermare)'}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <Text size={200} className={s.nota}>
          Per gli effetti importanti conferma col commercialista.
        </Text>
      </Scheda>

      <Scheda
        titolo={`Regole da verificare (${aperte.length})`}
        aiuto={{
          argomento: 'regole da verificare',
          testo: 'Le regole usate come stima finché la fonte ufficiale non le conferma: a ogni controllo si guarda se si possono chiudere.',
        }}
      >
        <div>
          {aperte.map((r) => (
            <div key={`${r.ambito}-${r.anno}-${r.percorso}`} className={s.regola}>
              <Text weight="semibold">
                {r.ambito} {r.anno} · {r.percorso}
              </Text>
              <Text size={200}>Valore usato: {r.valore}</Text>
              <Text size={200} className={s.nota}>
                {r.fonte}
              </Text>
            </div>
          ))}
        </div>
      </Scheda>
    </div>
  );
}

/** Impatto della novità sui tuoi conti (T006): calcolato qui, con i tuoi dati, senza mandarli fuori. */
function ImpattoSuiConti({ n }: { n: Notizia }) {
  const s = useStili();
  const [stato, setStato] = useState<'idle' | 'calcolo' | 'errore' | Impatto>('idle');
  const sim = n.simulazione!;
  if (stato === 'idle' || stato === 'calcolo')
    return (
      <Button
        className={s.pulsante}
        disabled={stato === 'calcolo'}
        onClick={async () => {
          setStato('calcolo');
          try {
            const r = impattoNovita(n, (await raccogliAnno(sim.anno)).input);
            setStato(r ?? 'errore');
          } catch {
            setStato('errore');
          }
        }}
      >
        {stato === 'calcolo' ? 'Calcolo…' : `Calcola l'impatto sui miei conti ${sim.anno}`}
      </Button>
    );
  if (stato === 'errore')
    return <Text size={200}>Non riesco a calcolarlo: servono la CU e i dati del {sim.anno} in «Dati dell&apos;anno».</Text>;
  const r = stato;
  return (
    <Text size={200}>
      IRPEF e addizionali {sim.anno} con le regole in uso: <ImportoNascosto valore={formattaEuro(r.inUso)} />; {sim.alternativa}:{' '}
      <ImportoNascosto valore={formattaEuro(r.alternativa)} />.{' '}
      {r.differenza === 0
        ? 'Per te non cambia nulla.'
        : r.differenza < 0
          ? <>Con le regole in uso paghi <ImportoNascosto valore={formattaEuro(-r.differenza)} /> in meno.</>
          : <>Con le regole in uso paghi <ImportoNascosto valore={formattaEuro(r.differenza)} /> in più.</>}
      {r.provvisorio ? ' (stima provvisoria)' : ''}
    </Text>
  );
}

/** Novità arrivate con i file di aggiornamento che richiedono un aggiornamento di Fiscal (specifica 014, US5). */
function DaFareNelProgramma({ importazioni, onCambio }: { importazioni: Importazione[]; onCambio: (i: Importazione[]) => void }) {
  const s = useStili();
  const [errore, setErrore] = useState<string | null>(null);
  const voci = modificheProgramma(importazioni);
  if (!voci.length) return null;
  const aperte = voci.filter((v) => v.stato === 'aperta');

  async function segna(v: ModificaRaggruppata, stato: StatoModifica) {
    setErrore(null);
    try {
      const toccate = importazioni.filter((i) => v.importazioni.includes(i.id));
      for (const imp of toccate) await segnaModifica(imp, v.impronta, stato);
      onCambio(await leggiImportazioni());
    } catch {
      setErrore('Non riesco a salvare: controlla la connessione.');
    }
  }

  return (
    <div className={s.voce}>
      <Text weight="semibold">Da fare nel programma ({aperte.length})</Text>
      {errore ? <Text className={s.nota}>{errore}</Text> : null}
      <ul className={s.elenco}>
        {voci.map((v) => (
          <li key={v.impronta} className={s.voce}>
            <div className={s.riga}>
              <Text weight="semibold">{v.titolo}</Text>
              <Badge appearance="tint" color={v.stato === 'aperta' ? 'warning' : 'success'}>
                {v.stato === 'aperta' ? 'da fare' : v.stato === 'fatta' ? 'fatta' : 'non mi riguarda'}
              </Badge>
            </div>
            <Text>{v.descrizione}</Text>
            {v.dal ? <Text size={200}>Da quando: {v.dal.split('-').reverse().join('/')}</Text> : null}
            {/^https:\/\//.test(v.fonte.url) ? (
              <Link href={v.fonte.url} target="_blank" rel="noopener noreferrer" className={s.fonte}>
                Fonte: {v.fonte.titolo}
              </Link>
            ) : null}
            {v.stato === 'aperta' ? (
              <div className={s.riga}>
                <Button className={s.pulsante} onClick={() => void segna(v, 'fatta')}>
                  Fatta
                </Button>
                <Button className={s.pulsante} onClick={() => void segna(v, 'non_riguarda')}>
                  Non mi riguarda
                </Button>
              </div>
            ) : (
              <Button className={s.pulsante} appearance="subtle" onClick={() => void segna(v, 'aperta')}>
                Riapri
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Text size={200} className={s.nota}>
        Per farle, incolla la novità all&apos;assistente: richiede una modifica di Fiscal con i suoi controlli.
      </Text>
    </div>
  );
}
