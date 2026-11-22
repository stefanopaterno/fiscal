'use client';

import {
  Button,
  Checkbox,
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
import { useState } from 'react';
import { useVerificaRecente } from '@/features/auth/useVerificaRecente';
import { cancellaDatiProva, passaAProduzione, spiegaErrore } from '@/features/fatturazione/dati';
import { aggiornaModalita, useModalita } from '@/features/modalita/useModalita';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { Scheda } from '@/ui/Moduli';

/**
 * Prova e produzione (FR-027..FR-030). In prova: cancellare le prove. Passaggio alla produzione:
 * irreversibile, cancella fatture e incassi di prova, chiede PRODUZIONE e password+codice.
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
        testo: `Cancellati: ${r.fatture} documenti, ${r.incassi} incassi${anagraficheProva ? `, ${r.anagrafiche} tra clienti e attività` : ''}.`,
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
              'Se spunti, cancello anche i clienti, le attività e i tuoi dati della partita IVA. Se no, restano e cancello solo fatture e incassi.',
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
