'use client';

import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  tokens,
  mergeClasses,
} from '@fluentui/react-components';
import { Add20Regular, CheckmarkCircle20Filled, Warning20Filled } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { controllaProfilo } from '@/engine/validazioni/profilo';
import { regolePerAnno } from '@/engine/regole';
import {
  leggiAttivita,
  leggiProfilo,
  nuovoId,
  salva,
  type Attivita,
  type Profilo,
} from '@/features/fatturazione/dati';
import { CampoScelta, CampoSiNo, CampoTesto, Griglia, Scheda, CampoData } from '@/ui/Moduli';
import { annoCorrente } from '@/lib/oggi';

/**
 * Configurazione della partita IVA (T011-T012, US1, FR-001, FR-002, FR-022).
 * Campi da data-model.md: profilo_professionale.* e attivita.natura_iva, attivita.previdenza.
 * L'indicatore "pronto a fatturare" usa lo stesso controllo del database (emetti_fattura).
 */
type CampiTesto =
  | 'nome'
  | 'cognome'
  | 'codice_fiscale'
  | 'partita_iva'
  | 'inizio_attivita'
  | 'indirizzo'
  | 'cap'
  | 'comune'
  | 'provincia'
  | 'pec'
  | 'codice_destinatario'
  | 'iban'
  | 'albo_ordine'
  | 'albo_numero'
  | 'enpap_matricola';

type Modulo = Record<CampiTesto, string> & {
  bollo_a_carico: Profilo['bollo_a_carico'];
  integrativo: 'in_aggiunta' | 'compreso';
  gia_incassata_predefinita: boolean;
  soglia: string;
};

const VUOTO: Modulo = {
  nome: '',
  cognome: '',
  codice_fiscale: '',
  partita_iva: '',
  inizio_attivita: '',
  indirizzo: '',
  cap: '',
  comune: '',
  provincia: '',
  pec: '',
  codice_destinatario: '',
  iban: '',
  albo_ordine: '',
  albo_numero: '',
  enpap_matricola: '',
  bollo_a_carico: 'paziente',
  integrativo: 'in_aggiunta',
  gia_incassata_predefinita: false,
  soglia: '10',
};

function daProfilo(p: Profilo): Modulo {
  const m = { ...VUOTO };
  for (const k of Object.keys(VUOTO) as (keyof Modulo)[]) {
    const v = (p as unknown as Record<string, unknown>)[k];
    if (typeof v === 'string') (m as Record<string, unknown>)[k] = v;
  }
  m.bollo_a_carico = p.bollo_a_carico;
  m.integrativo = p.integrativo_compreso ? 'compreso' : 'in_aggiunta';
  m.gia_incassata_predefinita = p.gia_incassata_predefinita;
  m.soglia = String(p.soglia_attenzione_imponibile);
  return m;
}

const testo = (v: string) => (v.trim() === '' ? null : v.trim());
const maiuscolo = (v: string) => (v.trim() === '' ? null : v.trim().toUpperCase().replace(/\s+/g, ''));

function inRiga(m: Modulo) {
  return {
    nome: testo(m.nome),
    cognome: testo(m.cognome),
    codice_fiscale: maiuscolo(m.codice_fiscale),
    partita_iva: maiuscolo(m.partita_iva),
    inizio_attivita: testo(m.inizio_attivita),
    regime_fiscale: 'ordinario',
    indirizzo: testo(m.indirizzo),
    cap: testo(m.cap),
    comune: testo(m.comune),
    provincia: maiuscolo(m.provincia),
    pec: testo(m.pec),
    codice_destinatario: maiuscolo(m.codice_destinatario),
    iban: maiuscolo(m.iban),
    albo_ordine: testo(m.albo_ordine),
    albo_numero: testo(m.albo_numero),
    enpap_matricola: testo(m.enpap_matricola),
    bollo_a_carico: m.bollo_a_carico,
    integrativo_compreso: m.integrativo === 'compreso',
    gia_incassata_predefinita: m.gia_incassata_predefinita,
    soglia_attenzione_imponibile: Number(m.soglia),
  };
}

const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  stato: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  ok: { color: tokens.colorPaletteGreenForeground1 },
  attenzione: { color: tokens.colorPaletteMarigoldForeground1 },
  elenco: { margin: 0, paddingLeft: '20px' },
  attivita: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: tokens.spacingHorizontalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
  },
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
  pulsante: { minHeight: '44px' },
  barraSalva: {
    position: 'sticky',
    bottom: 'calc(72px + env(safe-area-inset-bottom))',
    zIndex: 5,
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow8,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    '@media (min-width: 900px)': { bottom: tokens.spacingVerticalL },
  },
});

export function ConfigurazioneAttivita() {
  const s = useStili();
  const [caricato, setCaricato] = useState(false);
  const [erroreLettura, setErroreLettura] = useState(false);
  const [modulo, setModulo] = useState<Modulo>(VUOTO);
  const [meta, setMeta] = useState({ id: '', versione: 0 });
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [esito, setEsito] = useState<'salvato' | 'in_coda' | 'errori' | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const [p, a] = await Promise.all([leggiProfilo(), leggiAttivita()]);
        if (!vivo) return;
        if (p) {
          setModulo(daProfilo(p));
          setMeta({ id: p.id, versione: p.versione });
        } else setMeta({ id: nuovoId(), versione: 0 });
        setAttivita(a);
      } catch {
        if (vivo) setErroreLettura(true);
      } finally {
        if (vivo) setCaricato(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const attivitaSalvate = attivita.filter((a) => a.versione > 0).length;
  const controllo = useMemo(
    () => controllaProfilo(inRiga(modulo), attivitaSalvate),
    [modulo, attivitaSalvate],
  );
  const sogliaValida =
    /^\d+$/.test(modulo.soglia) && Number(modulo.soglia) >= 1 && Number(modulo.soglia) <= 100;
  const anno = annoCorrente();
  const regole = regolePerAnnoSicuro(Math.max(anno, 2026));

  const cambia =
    <K extends keyof Modulo>(k: K) =>
    (v: Modulo[K]) => {
      setEsito(null);
      setModulo((m) => ({ ...m, [k]: v }));
    };

  async function salvaProfilo() {
    if (Object.keys(controllo.errori).length > 0 || !sogliaValida) {
      setEsito('errori');
      return;
    }
    setSalvando(true);
    try {
      const r = await salva('profilo_professionale', { ...meta, ...inRiga(modulo) });
      setMeta((m) => ({ ...m, versione: r.versione }));
      setEsito(r.inviata ? 'salvato' : 'in_coda');
    } finally {
      setSalvando(false);
    }
  }

  if (!caricato) return <Spinner label="Un momento…" />;
  if (erroreLettura)
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          Non riesco a leggere la configurazione. Controlla la connessione e ricarica la pagina.
        </MessageBarBody>
      </MessageBar>
    );

  const err = controllo.errori;

  return (
    <div className={s.colonna}>
      <Scheda
        titolo="Pronto a fatturare?"
        aiuto={{
          argomento: 'pronto a fatturare',
          testo:
            'Per emettere una fattura servono alcuni dati obbligatori per legge: chi sei, la tua partita IVA, da quando sei aperto e dove hai la sede. Finché manca qualcosa Fiscal ti fa preparare le bozze, ma non emetterle.',
        }}
      >
        {controllo.pronto ? (
          <Text className={mergeClasses(s.stato, s.ok)} weight="semibold">
            <CheckmarkCircle20Filled /> Sì, puoi emettere fatture.
          </Text>
        ) : (
          <>
            <Text className={mergeClasses(s.stato, s.attenzione)} weight="semibold">
              <Warning20Filled /> Non ancora.
            </Text>
            {controllo.mancanti.length > 0 ? (
              <>
                <Text>Mancano:</Text>
                <ul className={s.elenco}>
                  {controllo.mancanti.map((m) => (
                    <li key={m}>
                      <Text>{m}</Text>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {Object.keys(err).length > 0 ? <Text>Ci sono dati da correggere (in rosso).</Text> : null}
          </>
        )}
      </Scheda>

      <Scheda
        titolo="Chi sei"
        aiuto={{
          argomento: 'chi sei',
          testo:
            "I tuoi dati come compaiono in alto su ogni fattura. Devono essere uguali a quelli dell'Agenzia delle Entrate.",
        }}
      >
        <Griglia>
          <CampoTesto
            etichetta="Nome"
            lunghezzaMax={60}
            obbligatorio
            valore={modulo.nome}
            onChange={cambia('nome')}
            autoComplete="given-name"
            aiuto={{ argomento: 'nome', testo: 'Il tuo nome di battesimo, come sul documento.' }}
          />
          <CampoTesto
            etichetta="Cognome"
            lunghezzaMax={60}
            obbligatorio
            valore={modulo.cognome}
            onChange={cambia('cognome')}
            autoComplete="family-name"
            aiuto={{ argomento: 'cognome', testo: 'Il tuo cognome, come sul documento.' }}
          />
          <CampoTesto
            etichetta="Codice fiscale"
            lunghezzaMax={16}
            obbligatorio
            maiuscolo
            valore={modulo.codice_fiscale}
            onChange={cambia('codice_fiscale')}
            errore={err.codice_fiscale}
            aiuto={{
              argomento: 'codice fiscale',
              testo: 'Il codice di 16 lettere e numeri che trovi sulla tessera sanitaria.',
              perche: 'Va scritto su ogni fattura e serve per il Sistema Tessera Sanitaria.',
            }}
          />
        </Griglia>
      </Scheda>

      <Scheda
        titolo="Partita IVA"
        aiuto={{
          argomento: 'partita IVA',
          testo:
            "I dati che ti ha dato l'Agenzia delle Entrate quando hai aperto la partita IVA (modello AA9).",
        }}
      >
        <Griglia>
          <CampoTesto
            etichetta="Numero di partita IVA"
            lunghezzaMax={11}
            obbligatorio
            inputMode="numeric"
            valore={modulo.partita_iva}
            onChange={cambia('partita_iva')}
            errore={err.partita_iva}
            aiuto={{
              argomento: 'numero di partita IVA',
              testo: '11 cifre. Le trovi sulla ricevuta di apertura della partita IVA.',
              esempio: '12345678903',
            }}
          />
          <CampoData
            etichetta="Data di inizio attività"
            obbligatorio

            valore={modulo.inizio_attivita}
            onChange={cambia('inizio_attivita')}
            aiuto={{
              argomento: 'data di inizio attività',
              testo: 'Il giorno da cui la partita IVA è aperta.',
              perche: 'Una fattura non può avere una data precedente: Fiscal te lo impedisce.',
            }}
          />
        </Griglia>
        <Text>
          <Text weight="semibold">Regime fiscale: </Text>ordinario (contabilità semplificata)
        </Text>
      </Scheda>

      <Scheda
        titolo="Sede"
        aiuto={{
          argomento: 'sede',
          testo:
            "L'indirizzo dichiarato all'apertura della partita IVA: lo studio, oppure casa tua se lavori lì o non hai uno studio fisso.",
        }}
      >
        <CampoTesto
          etichetta="Indirizzo"
          lunghezzaMax={60}
          obbligatorio
          valore={modulo.indirizzo}
          onChange={cambia('indirizzo')}
          autoComplete="street-address"
          aiuto={{ argomento: 'indirizzo', testo: 'Via e numero civico.', esempio: 'Via Roma 1' }}
        />
        <Griglia>
          <CampoTesto
            etichetta="CAP"
            lunghezzaMax={5}
            obbligatorio
            inputMode="numeric"
            valore={modulo.cap}
            onChange={cambia('cap')}
            errore={err.cap}
            autoComplete="postal-code"
            aiuto={{ argomento: 'CAP', testo: 'Il codice postale, 5 cifre.', esempio: '00100' }}
          />
          <CampoTesto
            etichetta="Comune"
            lunghezzaMax={60}
            obbligatorio
            valore={modulo.comune}
            onChange={cambia('comune')}
            aiuto={{ argomento: 'comune', testo: 'Il comune della sede.' }}
          />
          <CampoTesto
            etichetta="Provincia"
            lunghezzaMax={2}
            obbligatorio
            maiuscolo
            valore={modulo.provincia}
            onChange={cambia('provincia')}
            errore={err.provincia}
            aiuto={{
              argomento: 'provincia',
              testo: 'La sigla di 2 lettere.',
              esempio: 'RM per Roma, MI per Milano',
            }}
          />
        </Griglia>
      </Scheda>

      <Scheda
        titolo="Contatti e pagamenti"
        aiuto={{
          argomento: 'contatti e pagamenti',
          testo: 'Facoltativi. Servono per la fattura elettronica agli enti e per farti pagare con bonifico.',
        }}
      >
        <Griglia>
          <CampoTesto
            etichetta="PEC"
            lunghezzaMax={254}
            tipo="email"
            inputMode="email"
            valore={modulo.pec}
            onChange={cambia('pec')}
            errore={err.pec}
            aiuto={{
              argomento: 'PEC',
              testo:
                "La posta elettronica certificata. Per i professionisti iscritti all'Albo è obbligatoria averla.",
            }}
          />
          <CampoTesto
            etichetta="Codice destinatario"
            lunghezzaMax={7}
            maiuscolo
            valore={modulo.codice_destinatario}
            onChange={cambia('codice_destinatario')}
            errore={err.codice_destinatario}
            aiuto={{
              argomento: 'codice destinatario',
              testo:
                'Il codice di 7 caratteri con cui ricevi le fatture elettroniche dei tuoi fornitori. Se non ne hai uno, lascia vuoto: si usa la PEC.',
            }}
          />
        </Griglia>
        <CampoTesto
          etichetta="IBAN"
          lunghezzaMax={34}
          maiuscolo
          valore={modulo.iban}
          onChange={cambia('iban')}
          errore={err.iban}
          aiuto={{
            argomento: 'IBAN',
            testo:
              'Il conto su cui vuoi ricevere i bonifici. Compare sulla fattura per chi paga con bonifico.',
            perche:
              "Ti consigliamo un conto dedicato alla partita IVA: così vedi subito cosa è dell'attività e cosa no.",
          }}
        />
      </Scheda>

      <Scheda
        titolo="Albo ed ENPAP"
        aiuto={{
          argomento: 'albo ed ENPAP',
          testo:
            "L'iscrizione all'Ordine degli Psicologi e alla tua cassa di previdenza (ENPAP). Sono facoltativi per emettere, ma è buona norma indicare l'iscrizione all'Albo in fattura.",
        }}
      >
        <Griglia>
          <CampoTesto
            etichetta="Ordine regionale"
            valore={modulo.albo_ordine}
            onChange={cambia('albo_ordine')}
            aiuto={{
              argomento: 'ordine regionale',
              testo: "L'Ordine a cui sei iscritto.",
              esempio: 'Ordine degli Psicologi del Lazio',
            }}
          />
          <CampoTesto
            etichetta="Numero di iscrizione all'Albo"
            valore={modulo.albo_numero}
            onChange={cambia('albo_numero')}
            aiuto={{
              argomento: "numero di iscrizione all'Albo",
              testo: "Il numero che ti ha dato l'Ordine.",
            }}
          />
          <CampoTesto
            etichetta="Matricola ENPAP"
            valore={modulo.enpap_matricola}
            onChange={cambia('enpap_matricola')}
            aiuto={{
              argomento: 'matricola ENPAP',
              testo: "Il tuo numero di iscrizione all'ENPAP, la cassa di previdenza degli psicologi.",
            }}
          />
        </Griglia>
      </Scheda>

      <Scheda
        titolo="Come preparo le fatture"
        aiuto={{
          argomento: 'come preparo le fatture',
          testo: 'Scelte che valgono per tutte le fatture nuove. Le fatture già emesse non cambiano.',
        }}
      >
        <CampoScelta
          etichetta="Il bollo da 2 € lo paga"
          valore={modulo.bollo_a_carico}
          onChange={cambia('bollo_a_carico')}
          opzioni={[
            { valore: 'paziente', etichetta: 'Il paziente (si aggiunge al totale)' },
            { valore: 'professionista', etichetta: 'Io (il totale non cambia)' },
          ]}
          aiuto={{
            argomento: 'bollo',
            testo: `Sulle fatture senza IVA sopra ${(regole?.sogliaBollo.valore ?? 7747) / 100} € c'è un'imposta di bollo da 2 €. Lo versi tu allo Stato in ogni caso: qui scegli se farlo pagare al paziente aggiungendolo alla fattura.`,
            esempio: 'Seduta da 80 €: con «il paziente» la fattura diventa 80 + contributo + 2 € di bollo.',
            daDove: 'DPR 642/1972, Tariffa parte I, art. 13.',
          }}
        />
        <CampoScelta
          etichetta="Contributo integrativo ENPAP"
          valore={modulo.integrativo}
          onChange={cambia('integrativo')}
          opzioni={[
            { valore: 'in_aggiunta', etichetta: 'In aggiunta al prezzo (lo paga il paziente)' },
            { valore: 'compreso', etichetta: 'Compreso nel prezzo (a carico mio)' },
          ]}
          aiuto={{
            argomento: 'contributo integrativo',
            testo: `Il contributo integrativo ENPAP (${Math.round((regole?.aliquotaIntegrativo.valore ?? 0.04) * 100)}% dal 2027) va sempre scritto in fattura e versato all'ENPAP. Puoi farlo pagare in più al paziente oppure tenerlo dentro il tuo prezzo: in quel caso Fiscal ricava il compenso dal prezzo (scorporo) e il contributo lo paghi tu.`,
            esempio:
              'Seduta da 80 €. In aggiunta: il paziente paga 80 + 3,20 = 83,20 €. Compreso: il paziente paga 80 €, il tuo compenso è 76,92 € e 3,08 € sono il contributo.',
            perche:
              'Cambia quanto paga il paziente e quanto resta a te: il reddito su cui paghi le tasse è il compenso, senza contributo.',
            daDove:
              "Regolamento ENPAP sul contributo integrativo, dovuto sul volume d'affari anche se non lo incassi dal paziente (da confermare con ENPAP).",
          }}
        />
        <CampoSiNo
          etichetta="Proponi «già incassata» quando emetto"
          valore={modulo.gia_incassata_predefinita}
          onChange={cambia('gia_incassata_predefinita')}
          aiuto={{
            argomento: 'già incassata',
            testo:
              "Se di solito il paziente paga subito, alla fine della seduta, attivalo: quando emetti la fattura Fiscal segna anche l'incasso. Puoi sempre cambiarlo fattura per fattura.",
          }}
        />
        <CampoTesto
          etichetta="Avvisami se le fatture con IVA superano il (%)"
          lunghezzaMax={3}
          inputMode="numeric"
          valore={modulo.soglia}
          onChange={cambia('soglia')}
          errore={sogliaValida ? undefined : 'Scrivi un numero da 1 a 100.'}
          aiuto={{
            argomento: 'soglia di attenzione IVA',
            testo:
              'Le sedute da psicologo sono senza IVA. Se fai anche attività con IVA (corsi, consulenze alle aziende), oltre una certa quota cambiano gli adempimenti IVA. Fiscal ti avvisa, senza bloccarti.',
            esempio: '10: ti avviso quando più di 10 € su 100 fatturati sono con IVA.',
          }}
        />
      </Scheda>

      <div className={s.barraSalva}>
        <Button
          appearance="primary"
          className={s.pulsante}
          disabled={salvando}
          onClick={() => void salvaProfilo()}
        >
          {salvando ? 'Salvo…' : 'Salva i dati'}
        </Button>
        {esito === 'salvato' ? <Text>Salvato.</Text> : null}
        {esito === 'in_coda' ? <Text>Sei senza rete: lo salvo appena torna la connessione.</Text> : null}
        {esito === 'errori' ? <Text>Correggi prima i campi in rosso.</Text> : null}
      </div>

      <ElencoAttivita attivita={attivita} onCambia={setAttivita} />
    </div>
  );
}

function regolePerAnnoSicuro(anno: number) {
  try {
    return regolePerAnno(anno);
  } catch {
    return null;
  }
}

const NATURE = [
  { valore: 'esente_sanitaria' as const, etichetta: 'Sanitaria, senza IVA (sedute, psicoterapia)' },
  { valore: 'imponibile' as const, etichetta: 'Con IVA al 22% (formazione, consulenze, altro)' },
];
const PREVIDENZE = [
  { valore: 'enpap' as const, etichetta: 'ENPAP' },
  { valore: 'gestione_separata' as const, etichetta: 'Gestione Separata INPS' },
  { valore: 'da_verificare' as const, etichetta: 'Non lo so ancora (da chiedere)' },
];

function ElencoAttivita(props: { attivita: Attivita[]; onCambia: (a: Attivita[]) => void }) {
  const s = useStili();
  const [stato, setStato] = useState<Record<string, string>>({});

  const aggiorna = (id: string, campi: Partial<Attivita>) =>
    props.onCambia(props.attivita.map((a) => (a.id === id ? { ...a, ...campi } : a)));

  function aggiungi() {
    const prima = props.attivita.length === 0;
    props.onCambia([
      ...props.attivita,
      {
        id: nuovoId(),
        versione: 0,
        nome: prima ? 'Psicologo' : '',
        codice_ateco: prima ? '86.93.00' : '',
        natura_iva: prima ? 'esente_sanitaria' : 'imponibile',
        previdenza: 'enpap',
        predefinita: prima,
      },
    ]);
  }

  async function salvaAttivita(a: Attivita) {
    if (a.nome.trim() === '') {
      setStato((x) => ({ ...x, [a.id]: "Scrivi un nome per l'attività." }));
      return;
    }
    let elenco = props.attivita;
    // Una sola predefinita: prima tolgo il segno dalle altre (quelle già salvate anche nel database)
    if (a.predefinita) {
      for (const altra of elenco.filter((x) => x.id !== a.id && x.predefinita)) {
        const versione =
          altra.versione > 0 ? (await salva('attivita', { ...riga(altra), predefinita: false })).versione : 0;
        elenco = elenco.map((x) => (x.id === altra.id ? { ...x, predefinita: false, versione } : x));
      }
    }
    const r = await salva('attivita', riga(a));
    elenco = elenco.map((x) => (x.id === a.id ? { ...a, versione: r.versione } : x));
    props.onCambia(elenco);
    setStato((x) => ({
      ...x,
      [a.id]: r.inviata ? 'Salvata.' : 'Senza rete: la salvo appena torna la connessione.',
    }));
  }

  return (
    <Scheda
      titolo="Le tue attività"
      aiuto={{
        argomento: 'attività',
        testo:
          "Cosa fai con la partita IVA. Di solito una sola: «Psicologo», con sedute senza IVA. Se fai anche altro (per esempio corsi o consulenze alle aziende) aggiungi un'attività con IVA.",
        perche:
          "Ogni fattura è collegata a un'attività: così Fiscal sa se mettere l'IVA e quale cassa di previdenza usare.",
      }}
      azioni={
        <Button className={s.pulsante} icon={<Add20Regular />} onClick={aggiungi}>
          Aggiungi un&apos;attività
        </Button>
      }
    >
      {props.attivita.length === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Nessuna attività</MessageBarTitle>
            Aggiungine una: ti propongo «Psicologo» già compilata.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {props.attivita.map((a) => (
        <div key={a.id} className={s.attivita}>
          <Griglia>
            <CampoTesto
              etichetta="Nome dell'attività"
              obbligatorio
              valore={a.nome}
              onChange={(v) => aggiorna(a.id, { nome: v })}
              aiuto={{
                argomento: "nome dell'attività",
                testo: 'Un nome per riconoscerla.',
                esempio: 'Psicologo, Formazione',
              }}
            />
            <CampoTesto
              etichetta="Codice ATECO"
              lunghezzaMax={8}
              valore={a.codice_ateco ?? ''}
              onChange={(v) => aggiorna(a.id, { codice_ateco: v })}
              aiuto={{
                argomento: 'codice ATECO',
                testo:
                  "Il codice che descrive la tua attività, scelto all'apertura della partita IVA. Per gli psicologi di solito è 86.93.00.",
                daDove: 'Lo trovi sulla ricevuta di apertura (modello AA9) o nel cassetto fiscale.',
              }}
            />
            <CampoScelta
              etichetta="IVA"
              valore={a.natura_iva}
              onChange={(v) => aggiorna(a.id, { natura_iva: v })}
              opzioni={NATURE}
              aiuto={{
                argomento: "IVA dell'attività",
                testo:
                  "Le prestazioni sanitarie dello psicologo (diagnosi, sostegno, psicoterapia) sono senza IVA. Le altre attività, come la formazione o le consulenze alle aziende, di solito hanno l'IVA al 22%.",
                daDove: 'DPR 633/1972, art. 10, n. 18 (esenzione delle prestazioni sanitarie).',
              }}
            />
            <CampoScelta
              etichetta="Cassa di previdenza"
              valore={a.previdenza}
              onChange={(v) => aggiorna(a.id, { previdenza: v })}
              opzioni={PREVIDENZE}
              aiuto={{
                argomento: 'cassa di previdenza',
                testo:
                  "Dove versi i contributi per la pensione su questi guadagni. Per l'attività di psicologo è l'ENPAP. Per attività diverse potrebbe essere la Gestione Separata INPS: se non sei sicuro, scegli «non lo so» e chiedilo al commercialista.",
              }}
            />
          </Griglia>
          <CampoSiNo
            etichetta="Attività proposta nelle fatture nuove"
            valore={a.predefinita}
            onChange={(v) => aggiorna(a.id, { predefinita: v })}
            aiuto={{
              argomento: 'attività predefinita',
              testo: 'Quella che ti propongo quando crei una fattura.',
            }}
          />
          <div className={s.azioni}>
            <Button className={s.pulsante} onClick={() => void salvaAttivita(a)}>
              Salva l&apos;attività
            </Button>
            {stato[a.id] ? <Text>{stato[a.id]}</Text> : null}
          </div>
        </div>
      ))}
    </Scheda>
  );
}

function riga(a: Attivita) {
  return {
    id: a.id,
    versione: a.versione,
    nome: a.nome.trim(),
    codice_ateco: a.codice_ateco?.trim() || null,
    natura_iva: a.natura_iva,
    previdenza: a.previdenza,
    predefinita: a.predefinita,
  };
}
