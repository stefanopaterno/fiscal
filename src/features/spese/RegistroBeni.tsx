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
import { Delete20Regular } from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import { formattaEuro } from '@/engine/importi';
import { pianoAmmortamento } from '@/engine/spese/ammortamento';
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { CampoEuro } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoData, CampoScelta, CampoTesto, Griglia, Scheda } from '@/ui/Moduli';
import { percento, regoleOVicine } from './comuni';
import { benePerMotore, elimina, leggiBeni, nuovoId, salva, spiegaErrore, type Bene } from './dati';
import { annoCorrente, oggiIso } from '@/lib/oggi';

/**
 * Registro dei beni durevoli (US1, FR-003; data-model.md beni.*): sotto 516,46 € si deducono subito,
 * sopra con l'ammortamento al coefficiente della categoria. Per ogni bene il piano anno per anno.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  quote: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  intestazione: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
});

const oggi = () => oggiIso();

export function RegistroBeni() {
  const s = useStili();
  const [beni, setBeni] = useState<Bene[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [nuovo, setNuovo] = useState({
    descrizione: '',
    categoria: 'computer',
    costo: null as number | null,
    data: oggi(),
    chiave: 0,
  });

  const ricarica = () =>
    leggiBeni()
      .then(setBeni)
      .catch(() => setErrore('Non riesco a leggere i beni. Controlla la connessione.'));
  useEffect(() => {
    void ricarica();
  }, []);

  const regole = regoleOVicine(annoCorrente());

  async function aggiungi() {
    if (!nuovo.descrizione.trim() || !nuovo.costo) return setErrore('Scrivi descrizione e costo del bene.');
    try {
      await salva('beni', {
        id: nuovoId(),
        versione: 0,
        descrizione: nuovo.descrizione.trim(),
        categoria: nuovo.categoria,
        costo: nuovo.costo,
        data_acquisto: nuovo.data,
        coefficiente: null,
        motivazione: null,
        data_dismissione: null,
        valore_cessione: null,
      });
      setNuovo({
        descrizione: '',
        categoria: 'computer',
        costo: null,
        data: oggi(),
        chiave: nuovo.chiave + 1,
      });
      setErrore(null);
      await ricarica();
    } catch (e) {
      setErrore(spiegaErrore(e));
    }
  }

  async function dismetti(b: Bene, data: string) {
    try {
      await salva('beni', { ...b, data_dismissione: data } as Bene & Record<string, unknown>);
      await ricarica();
    } catch (e) {
      setErrore(spiegaErrore(e));
    }
  }

  async function togli(b: Bene) {
    try {
      await elimina('beni', b.id);
      await ricarica();
    } catch {
      setErrore('Questo bene è collegato a una spesa: elimina prima la spesa.');
    }
  }

  if (!beni) return errore ? <Text>{errore}</Text> : <Spinner label="Carico i beni…" />;

  return (
    <div className={s.colonna}>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      {beni.length === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>
            Nessun bene registrato. Qui vanno computer, tablet, arredi e attrezzature: sopra 516,46 € si
            deducono in più anni.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {beni.map((b) => {
        const piano = pianoAmmortamento(benePerMotore(b));
        const nomeCat = regole.beni.categorie.find((c) => c.codice === b.categoria)?.nome ?? b.categoria;
        return (
          <Scheda
            key={b.id}
            titolo={b.descrizione}
            aiuto={{
              argomento: b.descrizione,
              testo: piano.immediata
                ? `Costo fino a 516,46 €: si deduce tutto nell'anno dell'acquisto.`
                : `Costo oltre 516,46 €: si deduce un po' ogni anno (${percento(piano.coefficiente)} del costo), finché non arrivi al totale.`,
              daDove: regole.beni.categorie.find((c) => c.codice === b.categoria)?.regola.fonte,
            }}
          >
            <div className={s.intestazione}>
              <Text>
                {nomeCat} · acquistato il {dataItaliana(b.data_acquisto)} ·{' '}
                <ImportoNascosto valore={formattaEuro(b.costo)} />
              </Text>
              {b.data_dismissione ? (
                <Badge color="subtle">Dismesso il {dataItaliana(b.data_dismissione)}</Badge>
              ) : null}
            </div>
            <div className={s.quote}>
              {piano.quote.map((q) => (
                <Badge key={q.anno} appearance="tint" color="brand" size="large">
                  {q.anno}: <ImportoNascosto valore={formattaEuro(q.quota)} />
                </Badge>
              ))}
            </div>
            {piano.avvisi.map((a) => (
              <Text key={a} size={200}>
                {a}
              </Text>
            ))}
            {!b.data_dismissione ? (
              <Button className={s.pulsante} onClick={() => void dismetti(b, oggi())}>
                L&apos;ho venduto o buttato oggi
              </Button>
            ) : null}
            <Button
              className={s.pulsante}
              appearance="subtle"
              icon={<Delete20Regular />}
              onClick={() => void togli(b)}
            >
              Elimina dal registro
            </Button>
          </Scheda>
        );
      })}

      <Scheda
        titolo="Aggiungi un bene"
        aiuto={{
          argomento: 'nuovo bene',
          testo: 'Un oggetto che usi per più anni: computer, tablet, mobili dello studio, attrezzature.',
        }}
      >
        <Griglia key={nuovo.chiave}>
          <CampoTesto
            etichetta="Che cos'è"
            lunghezzaMax={120}
            valore={nuovo.descrizione}
            onChange={(v) => setNuovo((x) => ({ ...x, descrizione: v }))}
            aiuto={{ argomento: 'descrizione del bene', testo: 'Per esempio "Computer portatile".' }}
          />
          <CampoScelta
            etichetta="Tipo"
            valore={nuovo.categoria}
            onChange={(v) => setNuovo((x) => ({ ...x, categoria: v }))}
            opzioni={regole.beni.categorie.map((c) => ({
              valore: c.codice,
              etichetta: `${c.nome} (${percento(c.coefficiente)} l'anno)`,
            }))}
            aiuto={{
              argomento: 'tipo di bene',
              testo: 'Decide in quanti anni si deduce il costo (coefficienti ministeriali).',
            }}
          />
          <CampoEuro
            etichetta="Costo"
            facoltativo
            valore={nuovo.costo}
            onChange={(v) => setNuovo((x) => ({ ...x, costo: v }))}
            aiuto={{ argomento: 'costo del bene', testo: "Quanto l'hai pagato, IVA compresa." }}
          />
          <CampoData
            etichetta="Data di acquisto"
            valore={nuovo.data}
            onChange={(v) => setNuovo((x) => ({ ...x, data: v }))}
            aiuto={{ argomento: 'data di acquisto', testo: 'Quando hai iniziato a usarlo.' }}
          />
        </Griglia>
        <Button appearance="primary" className={s.pulsante} onClick={() => void aggiungi()}>
          Aggiungi al registro
        </Button>
      </Scheda>
    </div>
  );
}
