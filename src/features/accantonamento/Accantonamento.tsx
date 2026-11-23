'use client';

import {
  Badge,
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  ProgressBar,
  Skeleton,
  SkeletonItem,
  Text,
  tokens,
} from '@fluentui/react-components';
import { ArrowSync20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useState } from 'react';
import { percentualeInTesto } from '@/engine/irpef/aritmetica';
import { centesimiInTesto, euroInCentesimi, formattaEuro } from '@/engine/importi';
import { regoleAccantonamento } from '@/engine/regole/accantonamento';
import { GrigliaKpi, Kpi } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoData, CampoScelta, CampoSiNo, CampoTesto, Collegamento, Griglia, Scheda } from '@/ui/Moduli';
import { annoCorrente, oggiIso } from '@/lib/oggi';
import {
  eliminaMovimento,
  fotografa,
  nuovoId,
  quadroAccantonamento,
  salva,
  spiegaErrore,
  type ImpostazioniAccantonamento,
  type QuadroAccantonamento,
  type TipoMovimento,
} from './dati';
import { Promemoria } from './Promemoria';

/**
 * Pagina del salvadanaio (specifica 007, US1–US7): promemoria degli incassi, percentuale del mese con i
 * motivi, copertura delle scadenze, piano del primo anno, movimenti, controllo del saldo e impostazioni.
 * Tutti gli importi rispettano l'occhio (FR-013). I valori sono stime (FR-012).
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  per100: {
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    fontWeight: tokens.fontWeightBold,
    fontVariantNumeric: 'tabular-nums',
  },
  motivi: { margin: 0, paddingLeft: tokens.spacingHorizontalXL, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  nota: { color: tokens.colorNeutralForeground3 },
  scadenze: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  scadenza: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  riga: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: tokens.spacingHorizontalM },
  movimenti: { listStyle: 'none', margin: 0, padding: 0 },
  movimento: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minHeight: '48px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  movimentoTesto: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 },
  positivo: { color: tokens.colorPaletteGreenForeground1, fontVariantNumeric: 'tabular-nums' },
  negativo: { color: tokens.colorPaletteRedForeground1, fontVariantNumeric: 'tabular-nums' },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  errore: { color: tokens.colorPaletteRedForeground1 },
});

const ETICHETTA_TIPO: Record<TipoMovimento, string> = {
  accantonamento: 'Messo da parte',
  scadenza_pagata: 'Scadenza pagata',
  rettifica: 'Rettifica del saldo',
  interessi: 'Interessi',
};

const e = formattaEuro;
const dataItaliana = (iso: string) => iso.split('-').reverse().join('/');

export function Accantonamento() {
  const s = useStili();
  const anno = annoCorrente();
  const [q, setQ] = useState<QuadroAccantonamento | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);
  const ricarica = useCallback(() => setGiro((g) => g + 1), []);

  useEffect(() => {
    let vivo = true;
    quadroAccantonamento(anno)
      .then((x) => vivo && (setQ(x), setErrore(null)))
      .catch((err) => vivo && setErrore(spiegaErrore(err)));
    return () => {
      vivo = false;
    };
  }, [anno, giro]);

  if (errore)
    return (
      <MessageBar intent="error">
        <MessageBarBody>{errore}</MessageBarBody>
      </MessageBar>
    );
  if (!q)
    return (
      <Skeleton aria-label="Carico il salvadanaio">
        <SkeletonItem shape="rectangle" style={{ height: '160px' }} />
      </Skeleton>
    );

  return (
    <div className={s.colonna}>
      <Avvisi q={q} />
      <GrigliaKpi>
        <Kpi
          evidenza
          etichetta="Nel salvadanaio"
          valore={e(q.saldo)}
          aiuto={{ argomento: 'salvadanaio', testo: 'La somma dei movimenti registrati: quello che hai messo da parte meno le scadenze già pagate.' }}
        />
        <Kpi
          etichetta="Serve per le scadenze"
          valore={e(q.fabbisogno)}
          aiuto={{ argomento: 'fabbisogno', testo: `Imposte, contributi ENPAP, IVA e bollo delle scadenze ancora da pagare, sul reddito ${q.anno} fino a oggi.` }}
        />
        <Kpi
          etichetta={q.mancaTotale > 0 ? 'Manca' : 'In più'}
          valore={e(q.mancaTotale > 0 ? q.mancaTotale : q.eccedenza)}
          aiuto={{ argomento: 'copertura', testo: 'La differenza tra quello che hai nel salvadanaio e quello che serve per le prossime scadenze.' }}
        />
        <Kpi
          etichetta="Netto reale disponibile"
          valore={e(q.netto.disponibile)}
          aiuto={{
            argomento: 'netto reale',
            testo: `Incassato della partita IVA nel ${q.anno} (${e(q.netto.incassato)}) meno spese pagate (${e(q.netto.spese)}) e accantonamenti necessari (${e(q.netto.necessari)}). Senza stipendio e senza fatture non ancora pagate.`,
          }}
        />
      </GrigliaKpi>

      {q.promemoria.length > 0 ? (
        <Scheda
          titolo="Da mettere da parte"
          aiuto={{ argomento: 'promemoria', testo: 'Per ogni incasso: quanto mettere da parte e perché. «Fatto» lo registra nel salvadanaio, «Dopo» lo tiene in fondo alla lista.' }}
        >
          <Promemoria voci={q.promemoria} onCambio={ricarica} />
        </Scheda>
      ) : null}

      <PercentualeDelMese q={q} onCambio={ricarica} />
      <Copertura q={q} />
      {q.piano ? <Piano q={q} /> : null}
      <Movimenti q={q} onCambio={ricarica} />
      <Impostazioni key={`${q.impostazioni.id}-${q.impostazioni.versione}`} q={q} onCambio={ricarica} />
      <Text size={200} className={s.nota}>
        Sono stime fatte con i dati inseriti fino a oggi e con le regole dell&apos;anno (alcune ancora da verificare):
        non garantiscono l&apos;assenza di conguagli. <Collegamento href="/tasse/" inLinea>Vedi il calcolo delle tasse</Collegamento>
      </Text>
    </div>
  );
}

function Avvisi({ q }: { q: QuadroAccantonamento }) {
  return (
    <>
      {q.manca ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>
              {q.manca === 'cu' ? `Manca la Certificazione Unica ${q.anno}` : `Mancano le regole fiscali del ${q.anno}`}
            </MessageBarTitle>
            {q.manca === 'cu' ? (
              <>
                Quanto mettere da parte dipende dallo stipendio: la partita IVA si somma alla busta paga.{' '}
                <Collegamento href={`/tasse/dati/?anno=${q.anno}`} inLinea>
                  Inserisci la CU
                </Collegamento>
              </>
            ) : (
              'Puoi comunque registrare i movimenti del salvadanaio.'
            )}
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {q.impostazioni.avvisi && q.mancaTotale > 0 ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Il salvadanaio non basta</MessageBarTitle>
            Per coprire le prossime scadenze mancano <ImportoNascosto valore={e(q.mancaTotale)} />.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {q.vincoloOltreScadenza ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Conto vincolato oltre la scadenza</MessageBarTitle>
            Il conto è vincolato fino al {dataItaliana(q.impostazioni.vincolato_fino!)}: le somme non saranno
            disponibili per «{q.vincoloOltreScadenza}».
          </MessageBarBody>
        </MessageBar>
      ) : null}
    </>
  );
}

function PercentualeDelMese({ q, onCambio }: { q: QuadroAccantonamento; onCambio: () => void }) {
  const s = useStili();
  const [inCorso, setInCorso] = useState(false);
  const p = q.percentuale;
  const imp = q.impostazioni;
  const media =
    imp.metodo === 'media' && q.raccolti.cassa.compensi > 0
      ? Math.round(((q.necessari.imposte + q.necessari.contributi) * 100_00) / q.raccolti.cassa.compensi)
      : null;
  const per100 = media != null ? media + Math.round(media * imp.margine) : p.per100;
  const foto = imp.percentuale_mese;

  async function aggiorna() {
    setInCorso(true);
    try {
      await salva('impostazioni_accantonamento', {
        ...imp,
        id: imp.id || nuovoId(),
        percentuale_mese: fotografa(p, q.oggi.slice(0, 7)),
      });
      onCambio();
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Scheda
      titolo="Percentuale del mese"
      aiuto={{
        argomento: 'percentuale',
        testo:
          'Quanto mettere da parte su ogni 100 € di compenso per IRPEF, addizionali e contributo soggettivo ENPAP. Integrativo, IVA e bollo incassati si mettono da parte per intero.',
      }}
    >
      <Text>
        Su ogni 100 € di compenso metti da parte{' '}
        <span className={s.per100}>
          <ImportoNascosto valore={e(per100)} />
        </span>
      </Text>
      <Text size={200} className={s.nota}>
        {media != null ? 'Metodo: media dell\'anno.' : 'Metodo: effetto reale del prossimo euro (marginale).'}{' '}
        In più, per intero: integrativo ENPAP, IVA e bollo incassati.
      </Text>
      <ul className={s.motivi}>
        {p.motivi.map((m) => (
          <li key={m}>
            <Text>{m}</Text>
          </li>
        ))}
      </ul>
      {foto && q.cambiamenti.length > 0 ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Cosa è cambiato dalla percentuale di {foto.mese.split('-').reverse().join('/')}</MessageBarTitle>
            {q.cambiamenti.join(' ')} Prima: <ImportoNascosto valore={e(foto.per100)} /> ogni 100 €.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {q.fotografiaDaAggiornare || q.cambiamenti.length > 0 ? (
        <Button className={s.pulsante} icon={<ArrowSync20Regular />} disabled={inCorso} onClick={() => void aggiorna()}>
          {foto ? 'Aggiorna la percentuale del mese' : 'Fissa la percentuale del mese'}
        </Button>
      ) : null}
    </Scheda>
  );
}

function Copertura({ q }: { q: QuadroAccantonamento }) {
  const s = useStili();
  return (
    <Scheda
      titolo="Copertura delle scadenze"
      aiuto={{
        argomento: 'copertura',
        testo: `Il salvadanaio copre le scadenze in ordine di data. Importi sul reddito ${q.anno} fino a oggi: crescono con i prossimi incassi.`,
      }}
    >
      {q.scadenze.length === 0 ? <Text>Nessuna scadenza da coprire per ora.</Text> : null}
      <ul className={s.scadenze}>
        {q.scadenze.map((sc) => (
          <li key={sc.voce} className={s.scadenza}>
            <div className={s.riga}>
              <Text weight="semibold">{sc.voce}</Text>
              <Text>
                <ImportoNascosto valore={e(sc.importo)} />
              </Text>
            </div>
            <ProgressBar
              value={sc.importo > 0 ? sc.coperto / sc.importo : 1}
              color={sc.manca === 0 ? 'success' : sc.coperto > 0 ? 'warning' : 'error'}
              thickness="large"
              aria-label={`Copertura di ${sc.voce}`}
            />
            <Text size={200} className={s.nota}>
              {sc.manca === 0 ? (
                'Coperta'
              ) : (
                <>
                  Coperti <ImportoNascosto valore={e(sc.coperto)} />, mancano <ImportoNascosto valore={e(sc.manca)} />
                </>
              )}
            </Text>
          </li>
        ))}
      </ul>
      {q.eccedenza > 0 ? (
        <Text>
          In più rispetto alle scadenze: <ImportoNascosto valore={e(q.eccedenza)} />
        </Text>
      ) : null}
    </Scheda>
  );
}

function Piano({ q }: { q: QuadroAccantonamento }) {
  const s = useStili();
  const p = q.piano!;
  return (
    <Scheda
      titolo="Piano del primo anno"
      aiuto={{
        argomento: 'piano',
        testo: `Nel primo anno di partita IVA a giugno ${q.anno + 1} paghi il saldo e anche il primo acconto: il piano divide quello che manca per i mesi che restano.`,
      }}
    >
      {p.mancante === 0 ? (
        <Text>Il salvadanaio copre già le scadenze stimate fino a oggi.</Text>
      ) : (
        <Text>
          Metti da parte <ImportoNascosto valore={e(p.mensile)} /> al mese per {p.mesi} {p.mesi === 1 ? 'mese' : 'mesi'}, fino a
          giugno {q.anno + 1}.
        </Text>
      )}
      {p.interessi > 0 ? (
        <Text size={200} className={s.nota}>
          Già tolti <ImportoNascosto valore={e(p.interessi)} /> di interessi netti stimati del conto (ritenuta{' '}
          {percentualeInTesto(regoleAccantonamento(q.anno).ritenutaInteressi.valore)}). Gli interessi non sono reddito della
          partita IVA.
        </Text>
      ) : null}
    </Scheda>
  );
}

function Movimenti({ q, onCambio }: { q: QuadroAccantonamento; onCambio: () => void }) {
  const s = useStili();
  const [tipo, setTipo] = useState<'versamento' | 'scadenza_pagata' | 'interessi'>('versamento');
  const [data, setData] = useState(oggiIso());
  const [importo, setImporto] = useState('');
  const [saldoReale, setSaldoReale] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const centesimi = euroInCentesimi(importo);
  const reale = euroInCentesimi(saldoReale);
  const visibili = q.movimenti.filter((m) => !m.rimandato);

  async function registra(mov: { tipo: TipoMovimento; importo: number; data: string }) {
    setInCorso(true);
    setErrore(null);
    try {
      await salva('salvadanaio', { id: nuovoId(), versione: 0, incasso_id: null, rimandato: false, ...mov });
      setImporto('');
      setSaldoReale('');
      onCambio();
    } catch (err) {
      setErrore(spiegaErrore(err));
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Scheda
      titolo="Movimenti"
      aiuto={{ argomento: 'movimenti', testo: 'Quello che hai messo da parte e quello che hai prelevato per pagare le scadenze.' }}
    >
      <Griglia>
        <CampoScelta
          etichetta="Movimento"
          valore={tipo}
          onChange={setTipo}
          opzioni={[
            { valore: 'versamento', etichetta: 'Ho messo da parte' },
            { valore: 'scadenza_pagata', etichetta: 'Ho pagato una scadenza' },
            { valore: 'interessi', etichetta: 'Interessi del conto' },
          ]}
          aiuto={{ argomento: 'movimento', testo: 'Una scadenza pagata (F24, ENPAP) toglie la somma dal salvadanaio.' }}
        />
        <CampoData etichetta="Data" valore={data} onChange={setData} aiuto={{ argomento: 'data', testo: 'Il giorno del movimento.' }} />
        <CampoTesto
          etichetta="Importo"
          valore={importo}
          onChange={setImporto}
          inputMode="decimal"
          lunghezzaMax={12}
          segnaposto="0,00"
          errore={importo && (centesimi == null || centesimi === 0) ? 'Importo non valido' : undefined}
          aiuto={{ argomento: 'importo', testo: 'In euro, per esempio 250,00.' }}
        />
      </Griglia>
      <Button
        className={s.pulsante}
        appearance="primary"
        disabled={inCorso || !data || centesimi == null || centesimi === 0}
        onClick={() =>
          void registra({
            tipo: tipo === 'versamento' ? 'accantonamento' : tipo,
            importo: tipo === 'scadenza_pagata' ? -centesimi! : centesimi!,
            data,
          })
        }
      >
        Registra
      </Button>

      <Griglia>
        <CampoTesto
          etichetta="Saldo reale del conto"
          valore={saldoReale}
          onChange={setSaldoReale}
          inputMode="decimal"
          lunghezzaMax={12}
          segnaposto={centesimiInTesto(q.saldo)}
          aiuto={{
            argomento: 'controllo del saldo',
            testo: 'Facoltativo, una volta al mese: scrivi quanto c\'è davvero sul conto. La differenza si registra come rettifica.',
          }}
        />
      </Griglia>
      {reale != null && reale !== q.saldo ? (
        <Button
          className={s.pulsante}
          disabled={inCorso}
          onClick={() => void registra({ tipo: 'rettifica', importo: reale - q.saldo, data: oggiIso() })}
        >
          Registra la differenza ({reale > q.saldo ? '+' : '−'}
          <ImportoNascosto valore={e(Math.abs(reale - q.saldo))} />)
        </Button>
      ) : null}
      {errore ? (
        <Text role="alert" className={s.errore}>
          {errore}
        </Text>
      ) : null}

      {visibili.length === 0 ? <Text>Nessun movimento.</Text> : null}
      <ul className={s.movimenti}>
        {visibili.map((m) => (
          <li key={m.id} className={s.movimento}>
            <span className={s.movimentoTesto}>
              <Text>{ETICHETTA_TIPO[m.tipo]}</Text>
              <Text size={200} className={s.nota}>
                {dataItaliana(m.data)}
                {m.incasso_id ? ' · da un incasso' : ''}
              </Text>
            </span>
            <Text className={m.importo > 0 ? s.positivo : s.negativo}>
              {m.importo > 0 ? '+' : '−'}
              <ImportoNascosto valore={e(Math.abs(m.importo))} />
            </Text>
            <Button
              appearance="subtle"
              icon={<Delete20Regular />}
              aria-label="Elimina il movimento"
              onClick={() => void eliminaMovimento(m.id).then(onCambio, (err) => setErrore(spiegaErrore(err)))}
            />
          </li>
        ))}
      </ul>
    </Scheda>
  );
}

function Impostazioni({ q, onCambio }: { q: QuadroAccantonamento; onCambio: () => void }) {
  const s = useStili();
  const imp = q.impostazioni;
  const [margine, setMargine] = useState(String(Math.round(imp.margine * 100)));
  const [metodo, setMetodo] = useState(imp.metodo);
  const [avvisi, setAvvisi] = useState(imp.avvisi);
  const [tasso, setTasso] = useState(imp.tasso_lordo == null ? '' : String(imp.tasso_lordo * 100).replace('.', ','));
  const [vincolo, setVincolo] = useState(imp.vincolato_fino ?? '');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const margineN = Number(margine.replace(',', '.'));
  const tassoN = tasso.trim() === '' ? null : Number(tasso.replace(',', '.'));
  const margineOk = Number.isFinite(margineN) && margineN >= 0 && margineN <= 50;
  const tassoOk = tassoN == null || (Number.isFinite(tassoN) && tassoN >= 0 && tassoN <= 20);

  async function salvaImpostazioni() {
    setInCorso(true);
    setErrore(null);
    const nuove: ImpostazioniAccantonamento = {
      ...imp,
      id: imp.id || nuovoId(),
      margine: Math.round(margineN * 10) / 1000,
      metodo,
      avvisi,
      tasso_lordo: tassoN == null ? null : Math.round(tassoN * 100) / 10000,
      vincolato_fino: vincolo || null,
    };
    try {
      await salva('impostazioni_accantonamento', nuove);
      onCambio();
    } catch (err) {
      setErrore(spiegaErrore(err));
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Scheda
      titolo="Impostazioni del salvadanaio"
      aiuto={{ argomento: 'impostazioni', testo: 'Margine di sicurezza, metodo di calcolo, avvisi e conto su cui metti da parte.' }}
    >
      <Griglia>
        <CampoTesto
          etichetta="Margine di sicurezza (%)"
          valore={margine}
          onChange={setMargine}
          inputMode="decimal"
          lunghezzaMax={4}
          errore={margineOk ? undefined : 'Da 0 a 50'}
          aiuto={{
            argomento: 'margine',
            testo: `Una quota in più su imposte e contributi, mostrata a parte. Nel primo anno ${percentualeInTesto(regoleAccantonamento(q.anno).marginePrimoAnno.valore)} perché regole e dati sono ancora provvisori.`,
          }}
        />
        <CampoScelta
          etichetta="Metodo"
          valore={metodo}
          onChange={setMetodo}
          opzioni={[
            { valore: 'marginale', etichetta: 'Effetto reale (marginale)' },
            { valore: 'media', etichetta: 'Media dell\'anno' },
          ]}
          aiuto={{
            argomento: 'metodo',
            testo: 'Marginale: quanto costa davvero il prossimo euro, sopra lo stipendio (più prudente). Media: imposte e contributi della partita IVA divisi per i compensi dell\'anno.',
          }}
        />
        <CampoTesto
          etichetta="Tasso annuo lordo del conto (%)"
          valore={tasso}
          onChange={setTasso}
          inputMode="decimal"
          lunghezzaMax={5}
          segnaposto="facoltativo"
          errore={tassoOk ? undefined : 'Da 0 a 20'}
          aiuto={{ argomento: 'tasso', testo: 'Se il conto rende interessi, il piano mensile si riduce di una stima degli interessi netti.' }}
        />
        <CampoData
          etichetta="Conto vincolato fino al"
          valore={vincolo}
          onChange={setVincolo}
          aiuto={{ argomento: 'vincolo', testo: 'Facoltativo: se le somme non sono disponibili prima di questa data, ti avviso quando cade dopo una scadenza.' }}
        />
      </Griglia>
      <CampoSiNo
        etichetta="Avvisami quando il salvadanaio non basta"
        valore={avvisi}
        onChange={setAvvisi}
        aiuto={{ argomento: 'avvisi', testo: 'Un avviso in home e in questa pagina quando mancano soldi per le prossime scadenze.' }}
      />
      <Button className={s.pulsante} appearance="primary" disabled={inCorso || !margineOk || !tassoOk} onClick={() => void salvaImpostazioni()}>
        Salva le impostazioni
      </Button>
      {errore ? (
        <Text role="alert" className={s.errore}>
          {errore}
        </Text>
      ) : null}
      <Badge appearance="tint" color="informative">
        Ritenuta sugli interessi {percentualeInTesto(regoleAccantonamento(q.anno).ritenutaInteressi.valore)} · da verificare
      </Badge>
    </Scheda>
  );
}
