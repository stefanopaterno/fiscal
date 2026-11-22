'use client';

import {
  Badge,
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  ProgressBar,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Delete20Regular } from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import { formattaEuro } from '@/engine/importi';
import type { ModalitaPagamento } from '@/engine/spese/deducibilita';
import { oneriAnno } from '@/engine/spese/oneri';
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { raccogliAnno } from '@/features/tasse/dati';
import { CampoEuro, SceltaAnno, useAnno } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoData, CampoScelta, CampoSiNo, Griglia, Scheda } from '@/ui/Moduli';
import { ETICHETTA_MODALITA, percento, regoleOVicine } from './comuni';
import {
  elimina,
  leggiOneri,
  nuovoId,
  onerePerMotore,
  salva,
  spiegaErrore,
  type OnerePersonale,
} from './dati';

/**
 * Spese personali deducibili e detraibili (US2; data-model.md oneri_personali.*): per ogni voce limite,
 * già usato, residuo ("fino a esaurimento") ed esaurita. Il contributo ENPAP volontario si registra tra i
 * versamenti ENPAP (Tasse → Versamenti), non qui.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  voci: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: tokens.spacingVerticalM,
  },
  voce: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    padding: tokens.spacingHorizontalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  riga: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minHeight: '44px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  testo: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  scelta: { maxWidth: '240px' },
});

export function OneriPersonali() {
  const [anno, setAnno] = useAnno();
  return <OneriPerAnno key={anno} anno={anno} setAnno={setAnno} />;
}

function OneriPerAnno({ anno, setAnno }: { anno: number; setAnno: (a: number) => void }) {
  const s = useStili();
  const [oneri, setOneri] = useState<OnerePersonale[] | null>(null);
  const [contesto, setContesto] = useState({ redditoComplessivo: 0, figli: 0, previdenzaInCu: 0 });
  const [errore, setErrore] = useState<string | null>(null);
  const oggi = new Date().toISOString().slice(0, 10);
  const [nuovo, setNuovo] = useState({
    voce: 'spese_sanitarie',
    importo: null as number | null,
    data: oggi.startsWith(`${anno}-`) ? oggi : `${anno}-12-31`,
    modalita: 'carta' as ModalitaPagamento,
    giustificativo: true,
    chiave: 0,
  });

  const ricarica = () =>
    Promise.all([leggiOneri(anno), raccogliAnno(anno).catch(() => null)])
      .then(([o, t]) => {
        setOneri(o);
        if (t)
          setContesto({
            redditoComplessivo: Math.max(
              0,
              t.input.cu.reduce((x, c) => x + c.redditoLavoro, 0) + t.input.redditoProfessionale,
            ),
            figli: t.impostazioniSpese?.figli_a_carico ?? 0,
            previdenzaInCu: t.previdenzaInCu,
          });
      })
      .catch(() => setErrore('Non riesco a leggere le spese personali. Controlla la connessione.'));
  useEffect(() => {
    void ricarica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regole = regoleOVicine(anno);
  const voci = regole.oneri.filter((v) => v.codice !== 'enpap_volontario');
  if (!oneri) return errore ? <Text>{errore}</Text> : <Spinner label="Carico…" />;

  let esito: ReturnType<typeof oneriAnno> | null = null;
  try {
    esito = oneriAnno(oneri.map(onerePerMotore), { anno, ...contesto });
  } catch {
    esito = null;
  }

  async function aggiungi() {
    if (!nuovo.importo) return setErrore("Scrivi l'importo.");
    try {
      await salva('oneri_personali', {
        id: nuovoId(),
        versione: 0,
        data: nuovo.data,
        importo: nuovo.importo,
        voce: nuovo.voce,
        modalita: nuovo.modalita,
        ha_giustificativo: nuovo.giustificativo,
      });
      setNuovo((x) => ({ ...x, importo: null, chiave: x.chiave + 1 }));
      setErrore(null);
      await ricarica();
    } catch (e) {
      setErrore(spiegaErrore(e));
    }
  }

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
      {esito?.avvisi.length ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            {esito.avvisi.map((a) => (
              <div key={a}>{a}</div>
            ))}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <div className={s.voci}>
        {voci.map((v) => {
          const p = esito?.perVoce.find((x) => x.codice === v.codice);
          const limite = p?.limite ?? null;
          return (
            <div key={v.codice} className={s.voce}>
              <Text weight="semibold">{v.nome}</Text>
              <Text size={200}>
                {v.tipo === 'deduzione'
                  ? 'Abbassa il reddito'
                  : `Detrazione del ${percento(v.aliquota ?? 0)}`}
                {v.franchigia ? ` oltre ${formattaEuro(v.franchigia)}` : ''}
              </Text>
              <Text>
                Usato <ImportoNascosto valore={formattaEuro(p?.utile ?? 0)} />
                {limite !== null ? (
                  <>
                    {' '}
                    di <ImportoNascosto valore={formattaEuro(limite)} />
                  </>
                ) : null}
              </Text>
              {limite !== null && limite > 0 ? (
                <ProgressBar value={Math.min(1, (p?.utile ?? 0) / limite)} thickness="large" />
              ) : null}
              {p?.esaurita ? (
                <Badge color="success" appearance="tint">
                  Esaurita: oltre non c&apos;è vantaggio
                </Badge>
              ) : limite !== null ? (
                <Text size={200}>
                  Resta <ImportoNascosto valore={formattaEuro(p?.residuo ?? limite)} /> fino al 31/12
                </Text>
              ) : null}
              {p && p.detrazione > 0 ? (
                <Text size={200}>
                  Tasse in meno: <ImportoNascosto valore={formattaEuro(p.detrazione)} />
                </Text>
              ) : null}
            </div>
          );
        })}
      </div>

      <Scheda
        titolo={`Pagamenti ${anno}`}
        aiuto={{
          argomento: 'spese personali',
          testo:
            'Le spese tue (non dello studio) che danno uno sconto sulle tasse: fondo pensione, spese mediche, donazioni, interessi del mutuo. Il contributo ENPAP volontario registralo in Tasse → Versamenti.',
        }}
      >
        {oneri.length === 0 ? <Text>Nessun pagamento registrato.</Text> : null}
        {oneri.map((o) => (
          <div key={o.id} className={s.riga}>
            <div className={s.testo}>
              <Text>{regole.oneri.find((v) => v.codice === o.voce)?.nome ?? o.voce}</Text>
              <Text size={200}>
                {dataItaliana(o.data)} · {ETICHETTA_MODALITA[o.modalita]}
                {o.ha_giustificativo ? '' : ' · senza giustificativo'}
              </Text>
            </div>
            <ImportoNascosto valore={formattaEuro(o.importo)} />
            <Button
              appearance="subtle"
              aria-label="Elimina il pagamento"
              icon={<Delete20Regular />}
              onClick={() => void elimina('oneri_personali', o.id).then(ricarica)}
            />
          </div>
        ))}
        <Griglia key={nuovo.chiave}>
          <CampoScelta
            etichetta="Voce"
            valore={nuovo.voce}
            onChange={(v) => setNuovo((x) => ({ ...x, voce: v }))}
            opzioni={voci.map((v) => ({ valore: v.codice, etichetta: v.nome }))}
            aiuto={{
              argomento: 'voce',
              testo: 'Il tipo di spesa personale.',
              daDove: voci.find((v) => v.codice === nuovo.voce)?.regola.fonte,
            }}
          />
          <CampoEuro
            etichetta="Importo"
            facoltativo
            valore={nuovo.importo}
            onChange={(v) => setNuovo((x) => ({ ...x, importo: v }))}
            aiuto={{ argomento: 'importo', testo: 'Quanto hai pagato.' }}
          />
          <CampoData
            etichetta="Data"
            valore={nuovo.data}
            onChange={(v) => setNuovo((x) => ({ ...x, data: v }))}
            aiuto={{ argomento: 'data', testo: "Conta l'anno del pagamento." }}
          />
          <CampoScelta<ModalitaPagamento>
            etichetta="Come hai pagato"
            valore={nuovo.modalita}
            onChange={(v) => setNuovo((x) => ({ ...x, modalita: v }))}
            opzioni={(Object.keys(ETICHETTA_MODALITA) as ModalitaPagamento[]).map((m) => ({
              valore: m,
              etichetta: ETICHETTA_MODALITA[m],
            }))}
            aiuto={{
              argomento: 'pagamento tracciabile',
              testo:
                'Per molte detrazioni serve carta o bonifico; in contanti valgono solo farmaci e dispositivi medici.',
            }}
          />
        </Griglia>
        <CampoSiNo
          etichetta="Ho la ricevuta"
          valore={nuovo.giustificativo}
          onChange={(v) => setNuovo((x) => ({ ...x, giustificativo: v }))}
          aiuto={{
            argomento: 'ricevuta',
            testo: 'Conserva scontrini e ricevute: senza, la detrazione non regge a un controllo.',
          }}
        />
        <Button appearance="primary" className={s.pulsante} onClick={() => void aggiungi()}>
          Aggiungi il pagamento
        </Button>
      </Scheda>
    </div>
  );
}
