'use client';

import {
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
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, CampoTesto, Griglia, Scheda, CampoData } from '@/ui/Moduli';
import { CampoEuro, useAnno } from './componenti';
import {
  elimina,
  leggiVersamentiImposte,
  leggiVersamentiPrevidenza,
  nuovoId,
  salva,
  spiegaErrore,
  type VersamentoImpostaRiga,
  type VersamentoPrevidenzaRiga,
  type VoceImposta,
} from './dati';
import { oggiIso } from '@/lib/oggi';

/**
 * Versamenti realmente fatti (T018; data-model.md versamenti_previdenza.*, versamenti_imposte.*):
 * i contributi ENPAP si deducono nell'anno della data, gli acconti si scalano dal saldo (FR-005, FR-031).
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  riga: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minHeight: '44px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  testo: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
});

const ETICHETTA_CONTRIBUTO: Record<VersamentoPrevidenzaRiga['tipo'], string> = {
  soggettivo: 'Soggettivo',
  integrativo: 'Integrativo',
  maternita: 'Maternità',
};

const ETICHETTA_VOCE: Record<VoceImposta, string> = {
  irpef_acconto_1: 'IRPEF, primo acconto',
  irpef_acconto_2: 'IRPEF, secondo acconto',
  irpef_saldo: 'IRPEF, saldo',
  add_regionale: 'Addizionale regionale',
  add_comunale_saldo: 'Addizionale comunale, saldo',
  add_comunale_acconto: 'Addizionale comunale, acconto',
};

const oggi = () => oggiIso();
const dataValida = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

export function Versamenti() {
  const s = useStili();
  const [anno] = useAnno();
  const [prev, setPrev] = useState<VersamentoPrevidenzaRiga[] | null>(null);
  const [imp, setImp] = useState<VersamentoImpostaRiga[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const ricarica = () =>
    Promise.all([leggiVersamentiPrevidenza(), leggiVersamentiImposte()])
      .then(([p, i]) => {
        setPrev(p);
        setImp(i);
      })
      .catch(() => setErrore('Non riesco a leggere i versamenti. Controlla la connessione.'));

  useEffect(() => {
    void ricarica();
  }, []);

  async function togli(tabella: 'versamenti_previdenza' | 'versamenti_imposte', id: string) {
    try {
      await elimina(tabella, id);
      await ricarica();
    } catch (e) {
      setErrore(spiegaErrore(e));
    }
  }

  if (!prev || !imp) return errore ? <Text>{errore}</Text> : <Spinner label="Carico i versamenti…" />;

  return (
    <div className={s.colonna}>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      <Scheda
        titolo="Contributi ENPAP versati"
        aiuto={{
          argomento: 'contributi versati',
          testo:
            "Registra ogni pagamento all'ENPAP. Soggettivo e maternità abbassano l'IRPEF dell'anno in cui li paghi; l'integrativo no, perché è dei clienti.",
          esempio: 'Il saldo sui redditi 2027 pagato il 1° ottobre 2028 conta nella dichiarazione 2028.',
        }}
      >
        {prev.length === 0 ? <Text>Nessun versamento registrato.</Text> : null}
        {prev.map((v) => (
          <div key={v.id} className={s.riga}>
            <div className={s.testo}>
              <Text>
                {ETICHETTA_CONTRIBUTO[v.tipo]} — redditi {v.anno_reddito}
              </Text>
              <Text size={200}>{dataItaliana(v.data)}</Text>
            </div>
            <ImportoNascosto valore={formattaEuro(v.importo)} />
            <Button
              appearance="subtle"
              aria-label="Elimina il versamento"
              icon={<Delete20Regular />}
              onClick={() => void togli('versamenti_previdenza', v.id)}
            />
          </div>
        ))}
        <NuovoContributo anno={anno} onSalvato={ricarica} />
      </Scheda>
      <Scheda
        titolo="Imposte versate (F24)"
        aiuto={{
          argomento: 'imposte versate',
          testo:
            "Gli acconti e i saldi che hai pagato con F24. Gli acconti dell'anno si scalano dal saldo; se hai versato più del dovuto diventa un credito.",
        }}
      >
        {imp.length === 0 ? <Text>Nessun versamento registrato.</Text> : null}
        {imp.map((v) => (
          <div key={v.id} className={s.riga}>
            <div className={s.testo}>
              <Text>
                {ETICHETTA_VOCE[v.voce]} {v.anno_imposta}
              </Text>
              <Text size={200}>{dataItaliana(v.data)}</Text>
            </div>
            <ImportoNascosto valore={formattaEuro(v.importo)} />
            <Button
              appearance="subtle"
              aria-label="Elimina il versamento"
              icon={<Delete20Regular />}
              onClick={() => void togli('versamenti_imposte', v.id)}
            />
          </div>
        ))}
        <NuovaImposta anno={anno} onSalvato={ricarica} />
      </Scheda>
    </div>
  );
}

function NuovoContributo({ anno, onSalvato }: { anno: number; onSalvato: () => Promise<void> }) {
  const s = useStili();
  const [data, setData] = useState(oggi());
  const [importo, setImporto] = useState<number | null>(null);
  const [tipo, setTipo] = useState<VersamentoPrevidenzaRiga['tipo']>('soggettivo');
  const [annoReddito, setAnnoReddito] = useState(String(anno - 1));
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [chiave, setChiave] = useState(0);

  async function aggiungi() {
    if (!dataValida(data) || !importo || importo <= 0 || !/^\d{4}$/.test(annoReddito))
      return setMessaggio('Inserisci data, importo e anno del reddito.');
    try {
      await salva('versamenti_previdenza', {
        id: nuovoId(),
        versione: 0,
        data,
        importo,
        tipo,
        cassa: 'enpap',
        anno_reddito: Number(annoReddito),
      });
      setMessaggio(null);
      setImporto(null);
      setChiave((k) => k + 1);
      await onSalvato();
    } catch (e) {
      setMessaggio(spiegaErrore(e));
    }
  }

  return (
    <>
      <Griglia>
        <CampoData
          etichetta="Data"

          valore={data}
          onChange={setData}
          aiuto={{
            argomento: 'data del versamento',
            testo: "Il giorno in cui hai pagato: decide l'anno in cui il contributo si deduce.",
          }}
        />
        <CampoEuro
          key={chiave}
          etichetta="Importo"
          valore={importo}
          facoltativo
          onChange={setImporto}
          aiuto={{ argomento: 'importo', testo: 'Quanto hai pagato.' }}
        />
        <CampoScelta
          etichetta="Contributo"
          valore={tipo}
          onChange={setTipo}
          opzioni={(Object.keys(ETICHETTA_CONTRIBUTO) as VersamentoPrevidenzaRiga['tipo'][]).map((k) => ({
            valore: k,
            etichetta: ETICHETTA_CONTRIBUTO[k],
          }))}
          aiuto={{
            argomento: 'tipo di contributo',
            testo:
              'Soggettivo: la tua pensione. Integrativo: il 4% che hai fatto pagare ai clienti. Maternità: quota fissa annuale.',
          }}
        />
        <CampoTesto
          etichetta="Redditi dell'anno"
          lunghezzaMax={4}
          valore={annoReddito}
          inputMode="numeric"
          onChange={setAnnoReddito}
          aiuto={{
            argomento: 'anno del reddito',
            testo:
              "A quale anno di reddito si riferisce il contributo (di solito l'anno prima del pagamento).",
          }}
        />
      </Griglia>
      <Button className={s.pulsante} onClick={() => void aggiungi()}>
        Aggiungi il contributo
      </Button>
      {messaggio ? <Text>{messaggio}</Text> : null}
    </>
  );
}

function NuovaImposta({ anno, onSalvato }: { anno: number; onSalvato: () => Promise<void> }) {
  const s = useStili();
  const [data, setData] = useState(oggi());
  const [importo, setImporto] = useState<number | null>(null);
  const [voce, setVoce] = useState<VoceImposta>('irpef_acconto_1');
  const [annoImposta, setAnnoImposta] = useState(String(anno));
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [chiave, setChiave] = useState(0);

  async function aggiungi() {
    if (!dataValida(data) || !importo || importo <= 0 || !/^\d{4}$/.test(annoImposta))
      return setMessaggio("Inserisci data, importo e anno d'imposta.");
    try {
      await salva('versamenti_imposte', {
        id: nuovoId(),
        versione: 0,
        data,
        importo,
        voce,
        anno_imposta: Number(annoImposta),
      });
      setMessaggio(null);
      setImporto(null);
      setChiave((k) => k + 1);
      await onSalvato();
    } catch (e) {
      setMessaggio(spiegaErrore(e));
    }
  }

  return (
    <>
      <Griglia>
        <CampoData
          etichetta="Data"

          valore={data}
          onChange={setData}
          aiuto={{ argomento: 'data del versamento', testo: "Il giorno dell'F24." }}
        />
        <CampoEuro
          key={chiave}
          etichetta="Importo"
          valore={importo}
          facoltativo
          onChange={setImporto}
          aiuto={{ argomento: 'importo', testo: 'Quanto hai pagato per questa voce.' }}
        />
        <CampoScelta
          etichetta="Voce"
          valore={voce}
          onChange={setVoce}
          opzioni={(Object.keys(ETICHETTA_VOCE) as VoceImposta[]).map((k) => ({
            valore: k,
            etichetta: ETICHETTA_VOCE[k],
          }))}
          aiuto={{
            argomento: 'voce',
            testo:
              'Cosa hai pagato. Gli acconti di un anno si scrivono con l\'anno a cui si riferiscono (gli acconti pagati nel 2028 sono "2028").',
          }}
        />
        <CampoTesto
          etichetta="Anno d'imposta"
          lunghezzaMax={4}
          valore={annoImposta}
          inputMode="numeric"
          onChange={setAnnoImposta}
          aiuto={{
            argomento: "anno d'imposta",
            testo: "L'anno di reddito a cui si riferisce il versamento.",
          }}
        />
      </Griglia>
      <Button className={s.pulsante} onClick={() => void aggiungi()}>
        Aggiungi il versamento
      </Button>
      {messaggio ? <Text>{messaggio}</Text> : null}
    </>
  );
}
