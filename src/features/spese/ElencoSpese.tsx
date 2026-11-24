'use client';

import {
  Badge,
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Add20Regular, ArrowDownload20Regular } from '@fluentui/react-icons';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formattaEuro } from '@/engine/importi';
import { totaleSpeseAnno } from '@/engine/spese/deducibilita';
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { leggiFatture, leggiIncassi } from '@/features/fatturazione/dati';
import { redditoDiCassa } from '@/engine/irpef/cassa';
import { GrigliaKpi, Kpi, SceltaAnno, useAnno } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { Scheda } from '@/ui/Moduli';
import { ETICHETTA_MODALITA, regoleOVicine } from './comuni';
import { benePerMotore, leggiBeni, leggiSpese, spesaPerMotore, type Bene, type Spesa } from './dati';

/**
 * Elenco delle spese professionali dell'anno (US1, US6): totali deducibili, spese senza giustificativo,
 * riepilogo per categoria scaricabile per il commercialista.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  barra: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  scelta: { minWidth: '200px' },
  pulsante: { minHeight: '44px' },
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
  categorie: { display: 'flex', flexDirection: 'column' },
  riga: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    minHeight: '36px',
    alignItems: 'center',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
});

export function ElencoSpese() {
  const [anno, setAnno] = useAnno();
  return <ElencoPerAnno key={anno} anno={anno} setAnno={setAnno} />;
}

function ElencoPerAnno({ anno, setAnno }: { anno: number; setAnno: (a: number) => void }) {
  const s = useStili();
  const router = useRouter();
  const [dati, setDati] = useState<{ spese: Spesa[]; beni: Bene[]; compensi: number } | null>(null);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiSpese(anno), leggiBeni(), leggiFatture(), leggiIncassi()])
      .then(([spese, beni, fatture, incassi]) => {
        if (vivo) setDati({ spese, beni, compensi: redditoDiCassa(anno, fatture, incassi).compensi });
      })
      .catch(() => vivo && setErrore(true));
    return () => {
      vivo = false;
    };
  }, [anno]);

  const regole = regoleOVicine(anno);
  const nomeCategoria = (c: string) => regole.categorie.find((x) => x.codice === c)?.nome ?? c;

  if (errore)
    return (
      <MessageBar intent="error">
        <MessageBarBody>Non riesco a leggere le spese. Controlla la connessione e ricarica.</MessageBarBody>
      </MessageBar>
    );
  if (!dati) return <Spinner label="Carico le spese…" />;

  let totale: ReturnType<typeof totaleSpeseAnno> | null = null;
  try {
    totale = totaleSpeseAnno(dati.spese.map(spesaPerMotore), dati.beni.map(benePerMotore), {
      anno,
      compensi: dati.compensi,
    });
  } catch {
    totale = null;
  }
  const pagato = dati.spese.reduce((t, x) => t + x.importo, 0);

  function scaricaRiepilogo() {
    if (!totale) return;
    const righe = [
      ['Categoria', 'Pagato', 'Deducibile', 'Oltre il tetto'],
      ...totale.perCategoria.map((c) =>
        [c.nome, c.speso, c.deducibile, c.eccedenza].map((x) =>
          typeof x === 'number' ? (x / 100).toFixed(2).replace('.', ',') : x,
        ),
      ),
      ['Quote di ammortamento dei beni', '', (totale.ammortamenti / 100).toFixed(2).replace('.', ','), ''],
      ['Totale deducibile', '', (totale.deducibile / 100).toFixed(2).replace('.', ','), ''],
    ];
    const senza = dati!.spese.filter((x) => !x.ha_giustificativo);
    if (senza.length) {
      righe.push(
        [],
        ['Senza giustificativo'],
        ...senza.map((x) => [
          dataItaliana(x.data),
          nomeCategoria(x.categoria),
          (x.importo / 100).toFixed(2).replace('.', ','),
          x.fornitore ?? '',
        ]),
      );
    }
    const csv =
      '﻿' + righe.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `spese-${anno}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className={s.colonna}>
      <div className={s.barra}>
        <div className={s.scelta}>
          <SceltaAnno anno={anno} onChange={setAnno} />
        </div>
        <Button
          appearance="primary"
          className={s.pulsante}
          icon={<Add20Regular />}
          onClick={() => router.push('/spese/scheda/')}
        >
          Nuova spesa
        </Button>
      </div>

      <GrigliaKpi>
        <Kpi
          etichetta={`Pagato nel ${anno}`}
          valore={formattaEuro(pagato)}
          aiuto={{
            argomento: 'pagato',
            testo:
              "Il totale delle spese per il lavoro che hai pagato nell'anno: conta la data del pagamento, non quella della fattura.",
          }}
        />
        <Kpi
          etichetta="Deducibile"
          valore={formattaEuro(totale?.deducibile ?? 0)}
          evidenza
          nota={totale && totale.ammortamenti > 0 ? 'compresi i beni durevoli' : undefined}
          aiuto={{
            argomento: 'deducibile',
            testo:
              'La parte delle spese che abbassa il reddito della partita IVA, e quindi le tasse. Alcune spese contano solo in parte (telefono 80%) o fino a un tetto (formazione 10.000 €).',
            passi: totale
              ? [
                  ...totale.perCategoria.map((c) => (
                    <>
                      {c.nome}: <ImportoNascosto valore={formattaEuro(c.deducibile)} /> su <ImportoNascosto valore={formattaEuro(c.speso)} />
                    </>
                  )),
                  ...(totale.ammortamenti > 0 ? [<>Quota dei beni durevoli (ammortamento): <ImportoNascosto valore={formattaEuro(totale.ammortamenti)} /></>] : []),
                  <>Totale deducibile: <ImportoNascosto valore={formattaEuro(totale.deducibile)} /></>,
                ]
              : undefined,
            fonte: 'Regole delle spese dell\'anno (specifica 008)',
          }}
        />
        <Kpi
          etichetta="Senza giustificativo"
          valore={String(totale?.senzaGiustificativo ?? 0)}
          nascondi={false}
          aiuto={{
            argomento: 'senza giustificativo',
            testo:
              'Spese di cui non hai ancora caricato scontrino o fattura. Conservali: in un controllo servono.',
          }}
        />
      </GrigliaKpi>

      {totale && totale.avvisi.length > 0 ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            {totale.avvisi.map((a) => (
              <div key={a}>{a}</div>
            ))}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {dati.spese.length === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>
            Nessuna spesa nel {anno}. Registra le spese per il lavoro (formazione, supervisione, software,
            telefono…): abbassano le tasse.
          </MessageBarBody>
        </MessageBar>
      ) : (
        <ul className={s.elenco}>
          {dati.spese.map((x) => (
            <li key={x.id}>
              <NextLink href={`/spese/scheda/?id=${x.id}`} className={s.voce}>
                <span className={s.testo}>
                  <Text weight="semibold" className={s.troncato}>
                    {nomeCategoria(x.categoria)}
                  </Text>
                  <Text size={200} className={s.troncato}>
                    {dataItaliana(x.data)}
                    {x.fornitore ? ` · ${x.fornitore}` : ''} · {ETICHETTA_MODALITA[x.modalita]}
                  </Text>
                </span>
                <span className={s.destra}>
                  <Text weight="semibold">
                    <ImportoNascosto valore={formattaEuro(x.importo)} />
                  </Text>
                  {x.bene_id ? (
                    <Badge appearance="tint" color="brand">
                      Bene durevole
                    </Badge>
                  ) : !x.ha_giustificativo ? (
                    <Badge appearance="tint" color="warning">
                      Senza giustificativo
                    </Badge>
                  ) : null}
                </span>
              </NextLink>
            </li>
          ))}
        </ul>
      )}

      {totale && totale.perCategoria.length > 0 ? (
        <Scheda
          titolo={`Riepilogo per categoria ${anno}`}
          aiuto={{
            argomento: 'riepilogo',
            testo:
              'Quanto hai speso e quanto puoi dedurre per ogni categoria: è il prospetto da dare al commercialista.',
          }}
          azioni={
            <Button className={s.pulsante} icon={<ArrowDownload20Regular />} onClick={scaricaRiepilogo}>
              Scarica il riepilogo (CSV)
            </Button>
          }
        >
          <div className={s.categorie}>
            {totale.perCategoria.map((c) => (
              <div key={c.codice} className={s.riga}>
                <Text>{c.nome}</Text>
                <Text>
                  <ImportoNascosto valore={formattaEuro(c.deducibile)} />
                </Text>
              </div>
            ))}
            {totale.ammortamenti > 0 ? (
              <div className={s.riga}>
                <Text>Quote di ammortamento dei beni</Text>
                <Text>
                  <ImportoNascosto valore={formattaEuro(totale.ammortamenti)} />
                </Text>
              </div>
            ) : null}
          </div>
        </Scheda>
      ) : null}
    </div>
  );
}
