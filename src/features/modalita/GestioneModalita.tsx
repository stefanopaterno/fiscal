'use client';

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { useVerificaRecente } from '@/features/auth/useVerificaRecente';
import {
  cancellaDatiProva,
  caricaDatiEsempio,
  passaAProduzione,
  spiegaErrore,
} from '@/features/fatturazione/dati';
import { aggiornaModalita, useModalita } from '@/features/modalita/useModalita';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { annoCorrente, dataProva, EVENTO_DATA_PROVA, impostaDataProva } from '@/lib/oggi';
import { CampoData, Scheda } from '@/ui/Moduli';

/**
 * Prova e produzione (FR-027..FR-030). In prova: caricare dati d'esempio (FR-032) e cancellare le prove.
 * Passaggio alla produzione: irreversibile, cancella fatture e incassi di prova, chiede PRODUZIONE e
 * password+codice.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  elenco: {
    margin: 0,
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
});

export function GestioneModalita() {
  const s = useStili();
  const modalita = useModalita();
  const { chiedi, finestra } = useVerificaRecente();
  const [anagraficheProva, setAnagraficheProva] = useState(false);
  const [tieni, setTieni] = useState(true);
  const [conferma, setConferma] = useState('');
  const [capito, setCapito] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [chiediEsempio, setChiediEsempio] = useState(false);
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null);

  if (!modalita) return <Spinner label="Un momento…" />;

  if (!modalita.in_prova)
    return (
      <Scheda
        titolo="Sei in produzione"
        aiuto={{
          argomento: 'produzione',
          testo:
            'Le fatture che emetti ora sono vere: hanno un numero progressivo per legge e non si possono cancellare. Per correggerne una si fa una nota di credito.',
        }}
      >
        <Text>
          {modalita.produzione_dal
            ? `Dal ${new Date(modalita.produzione_dal).toLocaleDateString('it-IT')}.`
            : 'La modalità prova è chiusa.'}{' '}
          La modalità prova non si può più riattivare.
        </Text>
      </Scheda>
    );

  async function cancella() {
    setMessaggio(null);
    setInCorso(true);
    try {
      const r = await cancellaDatiProva(anagraficheProva);
      setMessaggio({
        tipo: 'ok',
        // clienti e attività d'esempio si cancellano sempre: il conteggio compare anche senza spunta
        testo: `Cancellati: ${r.fatture} documenti, ${r.incassi} incassi${anagraficheProva || r.anagrafiche > 0 ? `, ${r.anagrafiche} tra clienti e attività` : ''}.`,
      });
    } catch (e) {
      setMessaggio({ tipo: 'errore', testo: spiegaErrore(e) });
    } finally {
      setInCorso(false);
    }
  }

  async function caricaEsempio() {
    setChiediEsempio(false);
    setMessaggio(null);
    setInCorso(true);
    try {
      const r = await caricaDatiEsempio();
      setMessaggio({
        tipo: 'ok',
        testo: `Caricati ${r.clienti} clienti, ${r.fatture} documenti (fatture, bozze e una nota di credito), ${r.incassi} incassi e ${r.versamenti} versamenti ENPAP. Sono tutti finti: li trovi in Fatture e Clienti.`,
      });
    } catch (e) {
      setMessaggio({ tipo: 'errore', testo: spiegaErrore(e) });
    } finally {
      setInCorso(false);
    }
  }

  async function produzione() {
    setMessaggio(null);
    if (!(await chiedi())) return;
    setInCorso(true);
    try {
      await passaAProduzione(conferma.trim(), tieni);
      impostaDataProva(null); // in produzione vale solo la data vera
      await aggiornaModalita();
    } catch (e) {
      setMessaggio({ tipo: 'errore', testo: spiegaErrore(e) });
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className={s.colonna}>
      {finestra}
      {messaggio ? (
        <MessageBar intent={messaggio.tipo === 'ok' ? 'success' : 'error'}>
          <MessageBarBody>{messaggio.testo}</MessageBarBody>
        </MessageBar>
      ) : null}

      <Scheda
        titolo="Sei in modalità prova"
        aiuto={{
          argomento: 'modalità prova',
          testo:
            "Finché sei in prova puoi fare tutte le prove che vuoi: emettere fatture anche con date di oggi (prima dell'apertura della partita IVA), stamparle e cancellarle. Le fatture hanno la scritta «PROVA — senza valore fiscale».",
        }}
      >
        <ul className={s.elenco}>
          <li>
            <Text>Le fatture di prova si cancellano dal loro dettaglio o tutte insieme qui sotto.</Text>
          </li>
          <li>
            <Text>La data di inizio attività non viene controllata.</Text>
          </li>
          <li>
            <Text>Su stampa e PDF compare «PROVA — senza valore fiscale».</Text>
          </li>
        </ul>
        <ConAiuto
          allineamento="centro"
          aiuto={{
            argomento: 'cancella anche clienti e attività',
            testo:
              "Se spunti, cancello anche i clienti, le attività e i tuoi dati della partita IVA. Se no, restano e cancello solo fatture e incassi. I dati d'esempio (clienti finti e versamenti ENPAP) li tolgo comunque.",
          }}
        >
          <Checkbox
            label="Cancella anche clienti, attività e dati della partita IVA"
            checked={anagraficheProva}
            onChange={(_, d) => setAnagraficheProva(d.checked === true)}
          />
        </ConAiuto>
        <Button className={s.pulsante} disabled={inCorso} onClick={() => void cancella()}>
          Cancella i dati di prova
        </Button>
      </Scheda>

      <DataProva />

      <Scheda
        titolo="Dati d'esempio"
        aiuto={{
          argomento: "dati d'esempio",
          testo:
            "Riempio l'app con un anno di lavoro inventato, così vedi come appare piena: 12 clienti finti, circa 40 fatture del 2027 (sedute, qualche pacchetto, consulenze a un ente), incassi e versamenti ENPAP. La tua Certificazione Unica non la tocco: quella la inserisci tu.",
          esempio:
            'Una seduta da 80 €: 3,20 € di contributo ENPAP (4% dal 2027) e 2 € di bollo, totale 85,20 €.',
          perche:
            'Per provare elenchi, totali e tasse senza scrivere niente. Quando hai finito, «Cancella i dati di prova» li toglie tutti.',
        }}
      >
        <Text>
          Nomi, codici fiscali e importi sono inventati. Si caricano una volta sola e spariscono con «Cancella
          i dati di prova» o con il passaggio alla produzione.
        </Text>
        <Button className={s.pulsante} disabled={inCorso} onClick={() => setChiediEsempio(true)}>
          Carica dati d&apos;esempio
        </Button>
      </Scheda>

      <Dialog open={chiediEsempio} onOpenChange={(_, d) => setChiediEsempio(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Caricare i dati d&apos;esempio?</DialogTitle>
            <DialogContent>
              Aggiungo clienti, fatture, incassi e versamenti finti del 2026. Se non hai ancora inserito i
              tuoi dati della partita IVA, ne metto di finti anche lì. Potrai toglierli tutti con «Cancella i
              dati di prova».
            </DialogContent>
            <DialogActions>
              <Button className={s.pulsante} onClick={() => setChiediEsempio(false)}>
                No
              </Button>
              <Button appearance="primary" className={s.pulsante} onClick={() => void caricaEsempio()}>
                Sì, carica
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Scheda
        titolo="Passa alla produzione"
        aiuto={{
          argomento: 'passare alla produzione',
          testo:
            'Quando la partita IVA è aperta e sei pronto a fare fatture vere. Cancello tutte le fatture e gli incassi di prova, la numerazione riparte da 1 e da quel momento le fatture emesse non si possono più cancellare.',
          perche: 'È una regola di legge: le fatture emesse vanno conservate e numerate senza buchi.',
        }}
      >
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Non si torna indietro</MessageBarTitle>
            Dopo il passaggio la modalità prova non si può più riattivare, nemmeno chiedendolo.
          </MessageBarBody>
        </MessageBar>
        <ConAiuto
          allineamento="centro"
          aiuto={{
            argomento: 'tieni clienti e attività',
            testo:
              'Consigliato se i clienti e i tuoi dati inseriti durante la prova sono veri: così non devi riscriverli. Le fatture di prova vengono cancellate comunque.',
          }}
        >
          <Checkbox
            label="Tieni clienti, attività e dati della partita IVA"
            checked={tieni}
            onChange={(_, d) => setTieni(d.checked === true)}
          />
        </ConAiuto>
        <ConAiuto
          allineamento="centro"
          aiuto={{ argomento: 'conferma', testo: 'Una spunta per essere sicuri che hai letto.' }}
        >
          <Checkbox
            label="Ho capito: le fatture di prova vengono cancellate e non si torna indietro"
            checked={capito}
            onChange={(_, d) => setCapito(d.checked === true)}
          />
        </ConAiuto>
        <ConAiuto aiuto={{ argomento: 'parola di conferma', testo: 'Scrivi PRODUZIONE in maiuscolo.' }}>
          <Field label="Scrivi PRODUZIONE per confermare">
            <Input value={conferma} onChange={(_, d) => setConferma(d.value)} autoComplete="off" />
          </Field>
        </ConAiuto>
        <Button
          appearance="primary"
          className={s.pulsante}
          disabled={inCorso || !capito || conferma.trim() !== 'PRODUZIONE'}
          onClick={() => void produzione()}
        >
          {inCorso ? 'Un momento…' : 'Passa alla produzione'}
        </Button>
        <Text size={200}>Ti chiederò di nuovo password e codice a 6 cifre.</Text>
      </Scheda>
    </div>
  );
}

/**
 * Data di prova: in modalità prova l'app ragiona come se oggi fosse la data scelta (anno corrente, date
 * proposte, consigli, scadenze). Solo su questo dispositivo; il blocco e la sicurezza usano l'orario vero.
 */
function DataProva() {
  const sd = useStiliData();
  const [data, setData] = useState<string | null>(null);
  useEffect(() => {
    const leggi = () => setData(dataProva());
    leggi();
    window.addEventListener(EVENTO_DATA_PROVA, leggi);
    return () => window.removeEventListener(EVENTO_DATA_PROVA, leggi);
  }, []);
  return (
    <Scheda
      titolo="Data di prova"
      aiuto={{
        argomento: 'data di prova',
        testo:
          'Fai finta che oggi sia un altro giorno, per esempio il 22 novembre 2027: home, tasse, consigli e date proposte nelle fatture seguono quella data. Vale solo in prova e solo su questo dispositivo; quando passi alla produzione torna la data vera.',
        esempio: "Scegli il 22/11/2027 per vedere l'anno 2027 quasi finito, con i consigli di fine anno.",
      }}
    >
      <CampoData
        etichetta="Oggi è il"
        valore={data ?? ''}
        onChange={(v) => impostaDataProva(v || null)}
        suggerimento={data ? `Anno di lavoro: ${annoCorrente()}` : 'Vuoto: si usa la data vera'}
        aiuto={{ argomento: 'oggi è il', testo: 'Lascia vuoto per usare la data di oggi.' }}
      />
      {data ? (
        <Button className={sd.pulsante} onClick={() => impostaDataProva(null)}>
          Torna alla data vera
        </Button>
      ) : null}
    </Scheda>
  );
}

const useStiliData = makeStyles({ pulsante: { minHeight: '44px', alignSelf: 'flex-start' } });
