'use client';

import { NomePaziente } from '@/features/consensi/nomi';
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  Title2,
  tokens,
} from '@fluentui/react-components';
import { Delete20Regular, Print20Regular } from '@fluentui/react-icons';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { euroInCentesimi, formattaEuro, centesimiInTesto } from '@/engine/importi';
import { type DatiCliente } from '@/engine/validazioni/cliente';
import {
  creaNotaDiCredito,
  eliminaBozza,
  eliminaFatturaProva,
  eliminaIncasso,
  leggiCliente,
  leggiFattura,
  nuovoId,
  registraIncasso,
  spiegaErrore,
  type Cliente,
  type Fattura,
  type Incasso,
  type ModalitaIncasso,
  type RigaFattura,
} from '@/features/fatturazione/dati';
import { oggi, Riepilogo } from '@/features/fatturazione/NuovaFattura';
import { useModalita } from '@/features/modalita/useModalita';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { PromemoriaFattura } from '@/features/accantonamento/Promemoria';
import { CampoScelta, CampoTesto, Collegamento, Griglia, Scheda, CampoData } from '@/ui/Moduli';

/**
 * Dettaglio di una fattura (T016), incassi (T018, FR-010) e nota di credito (FR-012).
 * I dati del cliente vengono dalla fotografia salvata all'emissione: le modifiche successive non la cambiano.
 */
export const ETICHETTA_STATO: Record<Fattura['stato'], string> = {
  bozza: 'Bozza',
  emessa: 'Emessa',
  annullata: 'Annullata',
};
export const ETICHETTA_MODALITA: Record<ModalitaIncasso, string> = {
  contanti: 'Contanti',
  carta_pos: 'Carta o POS',
  bonifico: 'Bonifico',
  altro: 'Altro',
};

export function titoloDocumento(f: Pick<Fattura, 'tipo' | 'numero' | 'anno' | 'stato'>): string {
  const nome = f.tipo === 'nota_credito' ? 'Nota di credito' : 'Fattura';
  return f.numero ? `${nome} n. ${f.numero}/${f.anno}` : `${nome} (bozza)`;
}

export const dataItaliana = (iso: string) => iso.split('-').reverse().join('/');

const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  testata: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  etichette: { display: 'flex', gap: tokens.spacingHorizontalXS, flexWrap: 'wrap' },
  titolo: { margin: 0 },
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
  pulsante: { minHeight: '44px' },
  icona: { minWidth: '44px', minHeight: '44px' },
  riga: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    minWidth: 0,
  },
  testoRiga: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  dicitura: { whiteSpace: 'pre-line', color: tokens.colorNeutralForeground2 },
  incasso: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, minWidth: 0 },
  incassoTesto: { flexGrow: 1, minWidth: 0 },
});

type Caricato = { fattura: Fattura; righe: RigaFattura[]; incassi: Incasso[]; cliente: DatiCliente | null };

export function DettaglioFattura({ id, appenaEmessa }: { id: string; appenaEmessa: boolean }) {
  const s = useStili();
  const router = useRouter();
  const [dati, setDati] = useState<Caricato | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(
    appenaEmessa ? { tipo: 'ok', testo: 'Fattura emessa. Ora puoi stamparla o salvarla in PDF.' } : null,
  );
  const [chiediNota, setChiediNota] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [chiediElimina, setChiediElimina] = useState(false);
  const modalita = useModalita();

  const carica = useCallback(async () => {
    try {
      const r = await leggiFattura(id);
      if (!r) {
        setErrore('Fattura non trovata.');
        return;
      }
      const foto = r.fattura.fotografia?.cliente as DatiCliente | undefined;
      const cliente: DatiCliente | Cliente | null = foto ?? (await leggiCliente(r.fattura.cliente_id));
      setDati({ ...r, cliente });
    } catch {
      setErrore('Non riesco a leggere la fattura. Controlla la connessione e ricarica la pagina.');
    }
  }, [id]);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      if (vivo) await carica();
    })();
    return () => {
      vivo = false;
    };
  }, [carica]);

  if (errore)
    return (
      <MessageBar intent="error">
        <MessageBarBody>{errore}</MessageBarBody>
      </MessageBar>
    );
  if (!dati) return <Spinner label="Un momento…" />;

  const { fattura: f, righe, incassi, cliente } = dati;
  const incassato = incassi.reduce((t, i) => t + i.importo, 0);
  const residuo = f.netto - incassato;
  const rif = f.fotografia?.fattura_stornata as { numero: number; anno: number; data: string } | undefined;

  async function nota() {
    setInCorso(true);
    try {
      const n = await creaNotaDiCredito(f.id, oggi());
      setChiediNota(false);
      router.push(`/fatture/dettaglio/?id=${n.id}`);
    } catch (e) {
      setChiediNota(false);
      setMessaggio({ tipo: 'errore', testo: spiegaErrore(e) });
    } finally {
      setInCorso(false);
    }
  }

  async function eliminaProva() {
    setInCorso(true);
    try {
      await eliminaFatturaProva(f.id);
      router.push('/fatture/');
    } catch (e) {
      setChiediElimina(false);
      setMessaggio({ tipo: 'errore', testo: spiegaErrore(e) });
      setInCorso(false);
    }
  }

  async function elimina() {
    setInCorso(true);
    try {
      await eliminaBozza(f.id);
      router.push('/fatture/');
    } catch (e) {
      setMessaggio({ tipo: 'errore', testo: spiegaErrore(e) });
      setInCorso(false);
    }
  }

  return (
    <div className={s.colonna}>
      <div className={s.testata}>
        <ConAiuto
          allineamento="centro"
          aiuto={{
            argomento: 'dettaglio della fattura',
            testo:
              'Una fattura emessa non si modifica. Qui la stampi, registri quando ti pagano e, se serve, la annulli con una nota di credito.',
          }}
        >
          <Title2 as="h1" className={s.titolo}>
            {titoloDocumento(f)}
          </Title2>
        </ConAiuto>
        <Text>
          del {dataItaliana(f.data)} a{' '}
          <NomePaziente cliente={cliente} />
        </Text>
        <div className={s.etichette}>
          <Badge
            appearance="tint"
            color={f.stato === 'emessa' ? 'success' : f.stato === 'bozza' ? 'informative' : 'danger'}
          >
            {ETICHETTA_STATO[f.stato]}
          </Badge>
          {f.tipo === 'fattura' && f.stato !== 'bozza' ? (
            <Badge appearance="tint" color={residuo === 0 ? 'success' : 'warning'}>
              {residuo === 0 ? 'Incassata' : incassato > 0 ? 'Incassata in parte' : 'Da incassare'}
            </Badge>
          ) : null}
          {f.stato_sts === 'da_inviare' ? (
            <Badge appearance="tint" color="warning">
              Tessera Sanitaria: da inviare
            </Badge>
          ) : f.stato_sts === 'inviata' ? (
            <Badge appearance="tint" color="success">
              Tessera Sanitaria: inviata
            </Badge>
          ) : null}
        </div>
        {rif ? (
          <Text>
            Storna la fattura n. {rif.numero}/{rif.anno} del {dataItaliana(rif.data)}.
          </Text>
        ) : null}
      </div>

      {messaggio ? (
        <MessageBar intent={messaggio.tipo === 'ok' ? 'success' : 'error'}>
          <MessageBarBody>{messaggio.testo}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div className={s.azioni}>
        {f.stato === 'bozza' ? (
          <>
            <Button
              appearance="primary"
              className={s.pulsante}
              onClick={() => router.push(`/fatture/nuova/?id=${f.id}`)}
            >
              Completa ed emetti
            </Button>
            <Button
              className={s.pulsante}
              icon={<Delete20Regular />}
              disabled={inCorso}
              onClick={() => void elimina()}
            >
              Elimina la bozza
            </Button>
          </>
        ) : (
          <>
            <Button
              appearance="primary"
              className={s.pulsante}
              icon={<Print20Regular />}
              onClick={() => router.push(`/fatture/stampa/?id=${f.id}`)}
            >
              Stampa o salva in PDF
            </Button>
            {f.tipo === 'fattura' && f.stato === 'emessa' ? (
              <Button className={s.pulsante} onClick={() => setChiediNota(true)}>
                Annulla con nota di credito
              </Button>
            ) : null}
            {modalita?.in_prova && f.fotografia?.prova === true ? (
              <Button
                className={s.pulsante}
                icon={<Delete20Regular />}
                onClick={() => setChiediElimina(true)}
              >
                Elimina (è una prova)
              </Button>
            ) : null}
          </>
        )}
      </div>

      <Scheda
        titolo="Prestazioni"
        aiuto={{ argomento: 'prestazioni della fattura', testo: 'Le voci scritte in fattura.' }}
      >
        {righe.map((r) => (
          <div key={r.id} className={s.riga}>
            <span className={s.testoRiga}>
              <Text>{r.descrizione}</Text>
              <Text size={200}>
                {r.quantita} × {formattaEuro(r.compenso)} ·{' '}
                {r.natura === 'imponibile' ? 'con IVA' : 'senza IVA'}
              </Text>
            </span>
            <Text>
              <ImportoNascosto valore={formattaEuro(r.compenso * r.quantita)} />
            </Text>
          </div>
        ))}
      </Scheda>

      <Scheda
        titolo="Importi"
        aiuto={{
          argomento: 'importi della fattura',
          testo: 'I conti calcolati e salvati quando hai creato la fattura.',
        }}
      >
        <Riepilogo
          r={{
            totaleCompensi: f.totale_compensi,
            totaleIntegrativo: f.totale_integrativo,
            imponibileIva: f.imponibile_iva,
            iva: f.iva,
            importoEsente: f.importo_esente,
            bollo: f.bollo,
            bolloAddebitato: f.bollo_addebitato,
            ritenuta: f.ritenuta,
            totale: f.totale,
            netto: f.netto,
          }}
          aliquotaIntegrativo={
            typeof (f.fotografia?.regole as { aliquota_integrativo?: number } | undefined)
              ?.aliquota_integrativo === 'number'
              ? Math.round(
                  (f.fotografia.regole as { aliquota_integrativo: number }).aliquota_integrativo * 100,
                )
              : null
          }
        />
        {f.dicitura ? (
          <Text size={200} className={s.dicitura}>
            {f.dicitura}
          </Text>
        ) : null}
      </Scheda>

      {f.tipo === 'fattura' && f.stato !== 'bozza' ? (
        <Incassi key={residuo} fattura={f} incassi={incassi} residuo={residuo} onCambio={carica} />
      ) : null}

      {f.tipo === 'fattura' && incassi.length > 0 ? (
        <PromemoriaFattura
          fatturaId={f.id}
          anni={incassi.map((i) => Number(i.data.slice(0, 4)))}
          chiave={incassi.map((i) => i.id).join(',')}
        />
      ) : null}

      <Dialog open={chiediElimina} onOpenChange={(_, d) => setChiediElimina(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Eliminare questa fattura di prova?</DialogTitle>
            <DialogContent>
              Cancello la fattura con i suoi incassi e le eventuali note di credito collegate. In modalità
              prova si può fare; in produzione non sarà più possibile.
            </DialogContent>
            <DialogActions>
              <Button className={s.pulsante} onClick={() => setChiediElimina(false)}>
                No
              </Button>
              <Button
                appearance="primary"
                className={s.pulsante}
                disabled={inCorso}
                onClick={() => void eliminaProva()}
              >
                Sì, elimina
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      <Dialog open={chiediNota} onOpenChange={(_, d) => setChiediNota(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Annullare la fattura?</DialogTitle>
            <DialogContent>
              Creo una nota di credito con la data di oggi e lo stesso importo: prende il numero successivo e
              la fattura risulta annullata (resta consultabile). Non si può tornare indietro.
            </DialogContent>
            <DialogActions>
              <Button className={s.pulsante} onClick={() => setChiediNota(false)}>
                No, lascia stare
              </Button>
              <Button
                appearance="primary"
                className={s.pulsante}
                disabled={inCorso}
                onClick={() => void nota()}
              >
                {inCorso ? 'Creo…' : 'Sì, crea la nota di credito'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      <Collegamento href="/fatture/">← Tutte le fatture</Collegamento>
    </div>
  );
}

function Incassi(props: {
  fattura: Fattura;
  incassi: Incasso[];
  residuo: number;
  onCambio: () => Promise<void>;
}) {
  const s = useStili();
  const [data, setData] = useState(oggi());
  const [importo, setImporto] = useState(centesimiInTesto(props.residuo));
  const [modalita, setModalita] = useState<ModalitaIncasso>('carta_pos');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const centesimi = euroInCentesimi(importo);

  async function registra() {
    setErrore(null);
    if (centesimi === null || centesimi <= 0) {
      setErrore('Scrivi un importo, per esempio 80 o 80,50.');
      return;
    }
    if (centesimi > props.residuo) {
      setErrore(`Restano da incassare ${formattaEuro(props.residuo)}.`);
      return;
    }
    setInCorso(true);
    try {
      await registraIncasso({
        id: nuovoId(),
        fattura_id: props.fattura.id,
        data,
        importo: centesimi,
        modalita,
        tracciabile: modalita !== 'contanti',
      });
      await props.onCambio();
    } catch (e) {
      setErrore(spiegaErrore(e));
    } finally {
      setInCorso(false);
    }
  }

  async function togli(id: string) {
    try {
      await eliminaIncasso(id);
      await props.onCambio();
    } catch (e) {
      setErrore(spiegaErrore(e));
    }
  }

  return (
    <Scheda
      titolo="Incassi"
      aiuto={{
        argomento: 'incassi',
        testo:
          "Quando e come sei stato pagato. Le tasse si calcolano su quello che incassi nell'anno («principio di cassa»): una fattura di dicembre pagata a gennaio conta per l'anno nuovo.",
      }}
    >
      {props.incassi.length === 0 ? <Text>Nessun incasso registrato.</Text> : null}
      {props.incassi.map((i) => (
        <div key={i.id} className={s.incasso}>
          <Text className={s.incassoTesto}>
            {dataItaliana(i.data)} · {ETICHETTA_MODALITA[i.modalita]}
            {i.tracciabile ? '' : ' (non tracciabile)'}
          </Text>
          <Text weight="semibold">
            <ImportoNascosto valore={formattaEuro(i.importo)} />
          </Text>
          <Button
            appearance="subtle"
            className={s.icona}
            icon={<Delete20Regular />}
            aria-label={`Togli l'incasso del ${dataItaliana(i.data)}`}
            onClick={() => void togli(i.id)}
          />
        </div>
      ))}
      <Text>
        Da incassare: <ImportoNascosto valore={formattaEuro(props.residuo)} />
      </Text>
      {props.residuo > 0 && props.fattura.stato === 'emessa' ? (
        <>
          <Griglia>
            <CampoData
              etichetta="Data dell'incasso"

              valore={data}
              onChange={setData}
              aiuto={{ argomento: "data dell'incasso", testo: 'Il giorno in cui hai ricevuto i soldi.' }}
            />
            <CampoTesto
              etichetta="Importo (€)"
              lunghezzaMax={12}
              inputMode="decimal"
              valore={importo}
              onChange={setImporto}
              aiuto={{
                argomento: "importo dell'incasso",
                testo: 'Quanto hai ricevuto. Può essere anche solo una parte.',
              }}
            />
            <CampoScelta
              etichetta="Come ha pagato"
              valore={modalita}
              onChange={setModalita}
              opzioni={(Object.keys(ETICHETTA_MODALITA) as ModalitaIncasso[]).map((m) => ({
                valore: m,
                etichetta: ETICHETTA_MODALITA[m],
              }))}
              aiuto={{
                argomento: 'modalità di pagamento',
                testo:
                  'Carta, bancomat e bonifico sono tracciabili: il paziente può detrarre la spesa. I contanti no.',
              }}
            />
          </Griglia>
          {errore ? (
            <MessageBar intent="error">
              <MessageBarBody>{errore}</MessageBarBody>
            </MessageBar>
          ) : null}
          <Button className={s.pulsante} disabled={inCorso} onClick={() => void registra()}>
            {inCorso ? 'Registro…' : "Registra l'incasso"}
          </Button>
        </>
      ) : errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
    </Scheda>
  );
}
