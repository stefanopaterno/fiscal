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
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { controllaCliente } from '@/engine/validazioni/cliente';
import { leggiCliente, nuovoId, salva, type Cliente } from '@/features/fatturazione/dati';
import { CampoScelta, CampoSiNo, CampoTesto, Griglia, Scheda } from '@/ui/Moduli';

/**
 * Scheda di un cliente o paziente (T014, FR-017): solo i dati per la fattura.
 * Campi da data-model.md: clienti.sostituto_imposta, clienti.opposizione_sts, clienti.pagato_da.
 * Nessun campo per note o dati clinici (SC-007).
 */
type Modulo = {
  tipo: Cliente['tipo'];
  nome: string;
  cognome: string;
  denominazione: string;
  codice_fiscale: string;
  partita_iva: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  nazione: string;
  pec: string;
  codice_destinatario: string;
  sostituto_imposta: boolean;
  opposizione_sts: boolean;
  pagato_da: string;
};

const VUOTO: Modulo = {
  tipo: 'persona_fisica',
  nome: '',
  cognome: '',
  denominazione: '',
  codice_fiscale: '',
  partita_iva: '',
  indirizzo: '',
  cap: '',
  comune: '',
  provincia: '',
  nazione: 'IT',
  pec: '',
  codice_destinatario: '',
  sostituto_imposta: false,
  opposizione_sts: false,
  pagato_da: '',
};

const t = (v: string) => (v.trim() === '' ? null : v.trim());
const m = (v: string) => (v.trim() === '' ? null : v.trim().toUpperCase().replace(/\s+/g, ''));

function inRiga(x: Modulo) {
  const persona = x.tipo === 'persona_fisica';
  return {
    tipo: x.tipo,
    nome: persona ? t(x.nome) : null,
    cognome: persona ? t(x.cognome) : null,
    denominazione: persona ? null : t(x.denominazione),
    codice_fiscale: m(x.codice_fiscale),
    partita_iva: persona ? null : m(x.partita_iva),
    indirizzo: t(x.indirizzo),
    cap: t(x.cap),
    comune: t(x.comune),
    provincia: m(x.provincia),
    nazione: m(x.nazione) ?? 'IT',
    pec: persona ? null : t(x.pec),
    codice_destinatario: persona ? null : m(x.codice_destinatario),
    sostituto_imposta: persona ? false : x.sostituto_imposta,
    opposizione_sts: persona ? x.opposizione_sts : false,
    pagato_da: persona ? t(x.pagato_da) : null,
  };
}

const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
  pulsante: { minHeight: '44px' },
});

export function SchedaCliente({ id, ritorno }: { id: string | null; ritorno: string | null }) {
  const s = useStili();
  const router = useRouter();
  const [modulo, setModulo] = useState<Modulo>(VUOTO);
  const [meta, setMeta] = useState<{ id: string; versione: number } | null>(
    id ? null : { id: nuovoId(), versione: 0 },
  );
  const [errore, setErrore] = useState<string | null>(null);
  const [mostraErrori, setMostraErrori] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    leggiCliente(id)
      .then((c) => {
        if (!vivo) return;
        if (!c) {
          setErrore('Cliente non trovato.');
          return;
        }
        setModulo({
          ...VUOTO,
          ...Object.fromEntries(Object.entries(c).filter(([k, v]) => k in VUOTO && v !== null)),
        } as Modulo);
        setMeta({ id: c.id, versione: c.versione });
      })
      .catch(() => vivo && setErrore('Non riesco a leggere il cliente. Controlla la connessione.'));
    return () => {
      vivo = false;
    };
  }, [id]);

  const errori = useMemo(() => controllaCliente(inRiga(modulo)), [modulo]);
  const e = mostraErrori ? errori : {};
  const persona = modulo.tipo === 'persona_fisica';
  const cambia =
    <K extends keyof Modulo>(k: K) =>
    (v: Modulo[K]) =>
      setModulo((x) => ({ ...x, [k]: v }));

  async function salvaCliente() {
    if (!meta) return;
    if (Object.keys(errori).length > 0) {
      setMostraErrori(true);
      return;
    }
    setSalvando(true);
    try {
      await salva('clienti', { ...meta, ...inRiga(modulo) });
      const dest = ritorno && ritorno.startsWith('/') && !ritorno.startsWith('//') ? ritorno : '/clienti/';
      router.push(dest.includes('?') ? `${dest}&cliente=${meta.id}` : `${dest}?cliente=${meta.id}`);
    } finally {
      setSalvando(false);
    }
  }

  if (errore)
    return (
      <MessageBar intent="error">
        <MessageBarBody>{errore}</MessageBarBody>
      </MessageBar>
    );
  if (!meta) return <Spinner label="Un momento…" />;

  return (
    <div className={s.colonna}>
      <Scheda
        titolo="Chi è"
        aiuto={{
          argomento: 'chi è',
          testo:
            "La persona o l'ente a cui intesti la fattura. Per le sedute la fattura va intestata al paziente, anche se è minorenne o se paga un altro.",
        }}
      >
        <CampoScelta
          etichetta="Tipo"
          valore={modulo.tipo}
          onChange={cambia('tipo')}
          opzioni={[
            { valore: 'persona_fisica', etichetta: 'Persona (paziente)' },
            { valore: 'ente', etichetta: 'Ente o azienda' },
          ]}
          aiuto={{
            argomento: 'tipo di cliente',
            testo:
              'Persona: un paziente privato. Ente o azienda: per esempio una ASL, una scuola, una società o un altro professionista.',
          }}
        />
        {persona ? (
          <Griglia>
            <CampoTesto
              etichetta="Nome"
              obbligatorio
              valore={modulo.nome}
              onChange={cambia('nome')}
              errore={e.nome}
              aiuto={{ argomento: 'nome del paziente', testo: 'Il nome del paziente, come sul documento.' }}
            />
            <CampoTesto
              etichetta="Cognome"
              obbligatorio
              valore={modulo.cognome}
              onChange={cambia('cognome')}
              errore={e.cognome}
              aiuto={{ argomento: 'cognome del paziente', testo: 'Il cognome del paziente.' }}
            />
            <CampoTesto
              etichetta="Codice fiscale"
              obbligatorio
              maiuscolo
              valore={modulo.codice_fiscale}
              onChange={cambia('codice_fiscale')}
              errore={e.codice_fiscale}
              aiuto={{
                argomento: 'codice fiscale del paziente',
                testo: 'Quello del paziente (anche se minorenne), non di chi paga.',
                perche:
                  'È obbligatorio in fattura e serve per mandare la spesa al Sistema Tessera Sanitaria, così il paziente la trova nella dichiarazione precompilata.',
              }}
            />
          </Griglia>
        ) : (
          <Griglia>
            <CampoTesto
              etichetta="Denominazione"
              obbligatorio
              valore={modulo.denominazione}
              onChange={cambia('denominazione')}
              errore={e.denominazione}
              aiuto={{
                argomento: 'denominazione',
                testo: "Il nome ufficiale dell'ente o della società.",
                esempio: 'ASL Roma 1',
              }}
            />
            <CampoTesto
              etichetta="Partita IVA"
              inputMode="numeric"
              valore={modulo.partita_iva}
              onChange={cambia('partita_iva')}
              errore={e.partita_iva}
              aiuto={{
                argomento: 'partita IVA del cliente',
                testo:
                  '11 cifre. Alcuni enti pubblici o associazioni hanno solo il codice fiscale: in quel caso lascia vuoto e compila il codice fiscale.',
              }}
            />
            <CampoTesto
              etichetta="Codice fiscale"
              maiuscolo
              valore={modulo.codice_fiscale}
              onChange={cambia('codice_fiscale')}
              errore={e.codice_fiscale}
              aiuto={{
                argomento: "codice fiscale dell'ente",
                testo: 'Spesso è uguale alla partita IVA. Facoltativo se hai la partita IVA.',
              }}
            />
          </Griglia>
        )}
      </Scheda>

      <Scheda
        titolo="Indirizzo"
        aiuto={{
          argomento: 'indirizzo del cliente',
          testo: "La residenza del paziente o la sede dell'ente: va scritta in fattura.",
        }}
      >
        <CampoTesto
          etichetta="Indirizzo"
          obbligatorio
          valore={modulo.indirizzo}
          onChange={cambia('indirizzo')}
          errore={e.indirizzo}
          aiuto={{ argomento: 'indirizzo', testo: 'Via e numero civico.' }}
        />
        <Griglia>
          <CampoTesto
            etichetta="CAP"
            obbligatorio={modulo.nazione === 'IT'}
            inputMode="numeric"
            valore={modulo.cap}
            onChange={cambia('cap')}
            errore={e.cap}
            aiuto={{ argomento: 'CAP', testo: 'Il codice postale, 5 cifre.' }}
          />
          <CampoTesto
            etichetta="Comune"
            obbligatorio
            valore={modulo.comune}
            onChange={cambia('comune')}
            errore={e.comune}
            aiuto={{ argomento: 'comune', testo: 'Il comune di residenza o della sede.' }}
          />
          <CampoTesto
            etichetta="Provincia"
            obbligatorio={modulo.nazione === 'IT'}
            maiuscolo
            valore={modulo.provincia}
            onChange={cambia('provincia')}
            errore={e.provincia}
            aiuto={{ argomento: 'provincia', testo: 'La sigla di 2 lettere.', esempio: 'RM' }}
          />
          <CampoTesto
            etichetta="Nazione"
            maiuscolo
            valore={modulo.nazione}
            onChange={cambia('nazione')}
            aiuto={{ argomento: 'nazione', testo: "La sigla di 2 lettere della nazione. IT per l'Italia." }}
          />
        </Griglia>
      </Scheda>

      {persona ? (
        <Scheda
          titolo="Per le sedute"
          aiuto={{
            argomento: 'opzioni del paziente',
            testo: 'Scelte che cambiano cosa compare in fattura e cosa mandi al Sistema Tessera Sanitaria.',
          }}
        >
          <CampoSiNo
            etichetta="Si oppone all'invio al Sistema Tessera Sanitaria"
            valore={modulo.opposizione_sts}
            onChange={cambia('opposizione_sts')}
            aiuto={{
              argomento: 'opposizione al Sistema Tessera Sanitaria',
              testo:
                "Di solito le spese per le sedute vengono comunicate allo Stato, così il paziente le trova già nella sua dichiarazione dei redditi. Il paziente può chiederti di non farlo: in quel caso attiva questa opzione e in fattura compare la frase dell'opposizione.",
            }}
          />
          <CampoTesto
            etichetta="Pagato da (facoltativo)"
            valore={modulo.pagato_da}
            onChange={cambia('pagato_da')}
            aiuto={{
              argomento: 'pagato da',
              testo:
                'Solo il nome di chi paga, se è diverso dal paziente (per esempio un genitore). Non serve altro: la fattura resta intestata al paziente.',
            }}
          />
        </Scheda>
      ) : (
        <Scheda
          titolo="Per gli enti"
          aiuto={{
            argomento: "opzioni dell'ente",
            testo: "Dati per la fattura elettronica e per la ritenuta d'acconto.",
          }}
        >
          <CampoSiNo
            etichetta="Mi trattiene la ritenuta d'acconto"
            valore={modulo.sostituto_imposta}
            onChange={cambia('sostituto_imposta')}
            aiuto={{
              argomento: "ritenuta d'acconto",
              testo:
                "Enti, aziende e altri professionisti con partita IVA (i «sostituti d'imposta») ti pagano il compenso meno il 20%, che versano loro allo Stato per te. Lo recuperi nella dichiarazione dei redditi.",
              esempio:
                'Compenso 1.000 €: ricevi 800 € più il contributo e il bollo; i 200 € li ritrovi come tasse già pagate.',
            }}
          />
          <Griglia>
            <CampoTesto
              etichetta="PEC"
              tipo="email"
              inputMode="email"
              valore={modulo.pec}
              onChange={cambia('pec')}
              aiuto={{
                argomento: 'PEC del cliente',
                testo: 'Per mandare la fattura elettronica, se non ha un codice destinatario.',
              }}
            />
            <CampoTesto
              etichetta="Codice destinatario"
              maiuscolo
              valore={modulo.codice_destinatario}
              onChange={cambia('codice_destinatario')}
              aiuto={{
                argomento: 'codice destinatario',
                testo:
                  'Il codice di 7 caratteri (6 per la Pubblica Amministrazione) che il cliente ti comunica per ricevere la fattura elettronica.',
              }}
            />
          </Griglia>
        </Scheda>
      )}

      <div className={s.azioni}>
        <Button
          appearance="primary"
          className={s.pulsante}
          disabled={salvando}
          onClick={() => void salvaCliente()}
        >
          {salvando ? 'Salvo…' : 'Salva il cliente'}
        </Button>
        <Button className={s.pulsante} onClick={() => router.back()}>
          Annulla
        </Button>
        {mostraErrori && Object.keys(errori).length > 0 ? <Text>Completa i campi in rosso.</Text> : null}
      </div>
    </div>
  );
}
