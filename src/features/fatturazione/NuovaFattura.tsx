'use client';

import {
  Button,
  Checkbox,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { calcolaFattura, type RisultatoFattura } from '@/engine/fattura/calcola';
import { centesimiInTesto, euroInCentesimi, formattaEuro } from '@/engine/importi';
import { regolePerAnno } from '@/engine/regole';
import { nomeCliente } from '@/engine/validazioni/cliente';
import { controllaProfilo } from '@/engine/validazioni/profilo';
import {
  emettiFattura,
  leggiAttivita,
  leggiClienti,
  leggiFattura,
  leggiProfilo,
  nuovoId,
  registraIncasso,
  salvaBozza,
  spiegaErrore,
  type Attivita,
  type Cliente,
  type ModalitaIncasso,
  type NaturaIva,
  type Profilo,
} from '@/features/fatturazione/dati';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, CampoTesto, Collegamento, Griglia, Scheda, CampoData } from '@/ui/Moduli';
import { oggiIso } from '@/lib/oggi';

/**
 * Nuova fattura (T015, US2; righe miste T019, già incassata T018).
 * Il calcolo lo fa il motore (src/engine/fattura/calcola.ts) a ogni modifica; il database assegna il
 * numero all'emissione. Salvare ed emettere richiedono la connessione.
 */
type RigaModulo = { id: string; descrizione: string; quantita: string; compenso: string; natura: NaturaIva };

const DESCRIZIONE_SANITARIA = 'Prestazione professionale psicologica';

const MODALITA: { valore: ModalitaIncasso; etichetta: string }[] = [
  { valore: 'carta_pos', etichetta: 'Carta o bancomat (POS)' },
  { valore: 'bonifico', etichetta: 'Bonifico' },
  { valore: 'contanti', etichetta: 'Contanti' },
  { valore: 'altro', etichetta: 'Altro (assegno, app di pagamento…)' },
];

/** Data proposta per la fattura: oggi (o la data di prova, in modalità prova). */
export const oggi = () => oggiIso();

const nuovaRiga = (natura: NaturaIva): RigaModulo => ({
  id: nuovoId(),
  descrizione: natura === 'esente_sanitaria' ? DESCRIZIONE_SANITARIA : '',
  quantita: '1',
  compenso: '',
  natura,
});

const useStili = makeStyles({
  impaginazione: {
    display: 'grid',
    gap: tokens.spacingVerticalL,
    gridTemplateColumns: 'minmax(0, 1fr)',
    alignItems: 'start',
    '@media (min-width: 1100px)': { gridTemplateColumns: 'minmax(0, 1fr) 340px' },
  },
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  laterale: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    minWidth: 0,
    '@media (min-width: 1100px)': { position: 'sticky', top: tokens.spacingVerticalL },
  },
  riga: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: tokens.spacingHorizontalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
  },
  intestazioneRiga: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pulsante: { minHeight: '44px' },
  icona: { minWidth: '44px', minHeight: '44px' },
  importi: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  voce: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  forte: { fontWeight: tokens.fontWeightBold, fontSize: tokens.fontSizeBase400 },
  separatore: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    margin: `${tokens.spacingVerticalS} 0`,
  },
  elenco: {
    margin: 0,
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
});

export function NuovaFattura(props: { id: string | null; clienteIniziale: string | null }) {
  const s = useStili();
  const router = useRouter();
  const [dati, setDati] = useState<{
    profilo: Profilo | null;
    attivita: Attivita[];
    clienti: Cliente[];
  } | null>(null);
  const [erroreLettura, setErroreLettura] = useState<string | null>(null);
  const [id] = useState(props.id ?? nuovoId());
  const [clienteId, setClienteId] = useState('');
  const [attivitaId, setAttivitaId] = useState('');
  const [data, setData] = useState(oggi());
  const [righe, setRighe] = useState<RigaModulo[]>([]);
  const [giaIncassata, setGiaIncassata] = useState(false);
  const [modalita, setModalita] = useState<ModalitaIncasso>('carta_pos');
  const [mostraErrori, setMostraErrori] = useState(false);
  const [inCorso, setInCorso] = useState<'bozza' | 'emissione' | null>(null);
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const [profilo, attivita, clienti, esistente] = await Promise.all([
          leggiProfilo(),
          leggiAttivita(),
          leggiClienti(),
          props.id ? leggiFattura(props.id) : Promise.resolve(null),
        ]);
        if (!vivo) return;
        if (props.id && esistente?.fattura.stato !== 'bozza') {
          router.replace(`/fatture/dettaglio/?id=${props.id}`);
          return;
        }
        setDati({ profilo, attivita, clienti });
        const predefinita = attivita.find((a) => a.predefinita) ?? attivita[0];
        if (esistente) {
          const f = esistente.fattura;
          setClienteId(f.cliente_id);
          setAttivitaId(f.attivita_id);
          setData(f.data);
          setRighe(
            esistente.righe.map((r) => ({
              id: r.id,
              descrizione: r.descrizione,
              quantita: String(r.quantita),
              // con l'integrativo compreso si mostra di nuovo il prezzo pieno (compenso + contributo)
              compenso: centesimiInTesto(
                profilo?.integrativo_compreso
                  ? r.compenso + Math.round(r.integrativo / r.quantita)
                  : r.compenso,
              ),
              natura: r.natura,
            })),
          );
        } else {
          setClienteId(clienti.some((c) => c.id === props.clienteIniziale) ? props.clienteIniziale! : '');
          setAttivitaId(predefinita?.id ?? '');
          setRighe([nuovaRiga(predefinita?.natura_iva ?? 'esente_sanitaria')]);
        }
        setGiaIncassata(profilo?.gia_incassata_predefinita ?? false);
      } catch {
        if (vivo)
          setErroreLettura('Non riesco a leggere i dati. Controlla la connessione e ricarica la pagina.');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [props.id, props.clienteIniziale, router]);

  const cliente = dati?.clienti.find((c) => c.id === clienteId);
  const anno = Number(data.slice(0, 4));

  // Righe lette dal modulo: compenso in centesimi, quantità intera ≥ 1
  const righeLette = righe.map((r) => ({
    ...r,
    centesimi: euroInCentesimi(r.compenso),
    q: /^\d+$/.test(r.quantita.trim()) && Number(r.quantita) >= 1 ? Number(r.quantita) : null,
  }));
  const righeValide = righeLette.every(
    (r) => r.centesimi !== null && r.q !== null && r.descrizione.trim() !== '',
  );

  // Il calcolo è leggero: si rifà a ogni modifica
  const calcolo = ((): { r: RisultatoFattura | null; errore: string | null } => {
    if (!dati?.profilo || !righeValide || righeLette.length === 0) return { r: null, errore: null };
    try {
      return {
        r: calcolaFattura({
          anno,
          righe: righeLette.map((x) => ({ compenso: x.centesimi!, quantita: x.q!, natura: x.natura })),
          sostitutoImposta: cliente?.sostituto_imposta ?? false,
          bolloACarico: dati.profilo.bollo_a_carico,
          integrativoCompreso: dati.profilo.integrativo_compreso,
          opposizioneSts: cliente?.opposizione_sts ?? false,
        }),
        errore: null,
      };
    } catch (e) {
      return { r: null, errore: e instanceof Error ? e.message : 'Calcolo non riuscito.' };
    }
  })();

  if (erroreLettura)
    return (
      <MessageBar intent="error">
        <MessageBarBody>{erroreLettura}</MessageBarBody>
      </MessageBar>
    );
  if (!dati) return <Spinner label="Un momento…" />;

  const profiloPronto = dati.profilo ? controllaProfilo(dati.profilo, dati.attivita.length).pronto : false;
  const r = calcolo.r;
  const aliquotaIntegrativo = (() => {
    try {
      return Math.round(regolePerAnno(anno).aliquotaIntegrativo.valore * 100);
    } catch {
      return null;
    }
  })();

  const cambiaRiga = (rid: string, campi: Partial<RigaModulo>) =>
    setRighe((x) => x.map((riga) => (riga.id === rid ? { ...riga, ...campi } : riga)));

  function problemi(): string[] {
    const p: string[] = [];
    if (!clienteId) p.push('Scegli il cliente.');
    if (!attivitaId) p.push("Scegli l'attività.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) p.push('Scegli la data.');
    if (righe.length === 0) p.push('Aggiungi almeno una prestazione.');
    if (!righeValide) p.push('Completa le prestazioni: descrizione, quantità e importo.');
    if (calcolo.errore) p.push(calcolo.errore);
    return p;
  }

  async function salvaComeBozza(): Promise<boolean> {
    if (!r) return false;
    await salvaBozza(
      {
        id,
        tipo: 'fattura',
        data,
        cliente_id: clienteId,
        attivita_id: attivitaId,
        fattura_rif_id: null,
        fotografia: {
          regole: (() => {
            const rg = regolePerAnno(anno);
            return {
              anno: rg.anno,
              aliquota_integrativo: rg.aliquotaIntegrativo.valore,
              aliquota_iva: rg.aliquotaIva.valore,
              soglia_bollo: rg.sogliaBollo.valore,
              importo_bollo: rg.importoBollo.valore,
              aliquota_ritenuta: rg.aliquotaRitenuta.valore,
              da_verificare: r.regoleDaVerificare,
            };
          })(),
          pagato_da: cliente?.pagato_da ?? null,
        },
        totale_compensi: r.totaleCompensi,
        totale_integrativo: r.totaleIntegrativo,
        imponibile_iva: r.imponibileIva,
        iva: r.iva,
        importo_esente: r.importoEsente,
        bollo: r.bollo,
        bollo_addebitato: r.bolloAddebitato,
        ritenuta: r.ritenuta,
        totale: r.totale,
        netto: r.netto,
        dicitura: r.diciture.join('\n') || null,
      },
      righeLette.map((x, i) => ({
        id: x.id,
        posizione: i + 1,
        descrizione: x.descrizione.trim(),
        quantita: x.q!,
        // compenso calcolato dal motore: con l'integrativo compreso è quello scorporato
        compenso: r.righe[i]?.compenso ?? x.centesimi!,
        natura: x.natura,
        integrativo: r.righe[i]?.integrativo ?? 0,
        iva: 0, // l'IVA si calcola sul totale imponibile della fattura
      })),
    );
    return true;
  }

  async function esegui(tipo: 'bozza' | 'emissione') {
    setEsito(null);
    if (problemi().length > 0) {
      setMostraErrori(true);
      return;
    }
    setInCorso(tipo);
    try {
      await salvaComeBozza();
      if (tipo === 'bozza') {
        setEsito({
          tipo: 'ok',
          testo: 'Bozza salvata. Non ha ancora un numero: lo prende quando la emetti.',
        });
        router.replace(`/fatture/nuova/?id=${id}`);
        return;
      }
      await emettiFattura(id);
      if (giaIncassata && r) {
        await registraIncasso({
          id: nuovoId(),
          fattura_id: id,
          data,
          importo: r.netto,
          modalita,
          tracciabile: modalita !== 'contanti',
        });
      }
      router.push(`/fatture/dettaglio/?id=${id}&emessa=1`);
    } catch (e) {
      setEsito({ tipo: 'errore', testo: spiegaErrore(e) });
    } finally {
      setInCorso(null);
    }
  }

  const elencoProblemi = mostraErrori ? problemi() : [];

  return (
    <div className={s.impaginazione}>
      <div className={s.colonna}>
        {!profiloPronto ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              <MessageBarTitle>Configurazione da completare</MessageBarTitle>
              Puoi preparare la bozza, ma per emetterla completa prima i tuoi dati in{' '}
              <Collegamento inLinea href="/impostazioni/attivita/">
                Partita IVA e attività
              </Collegamento>
              .
            </MessageBarBody>
          </MessageBar>
        ) : null}

        <Scheda
          titolo="A chi e quando"
          aiuto={{
            argomento: 'a chi e quando',
            testo: "Il cliente a cui intesti la fattura, la data e l'attività a cui si riferisce.",
          }}
        >
          {dati.clienti.length === 0 ? (
            <MessageBar intent="info">
              <MessageBarBody>
                Non hai ancora clienti.{' '}
                <Collegamento inLinea href="/clienti/scheda/?ritorno=/fatture/nuova/">
                  Aggiungi il primo
                </Collegamento>
                .
              </MessageBarBody>
            </MessageBar>
          ) : null}
          <Griglia>
            <CampoScelta
              etichetta="Cliente"
              obbligatorio
              valore={clienteId}
              onChange={setClienteId}
              errore={mostraErrori && !clienteId ? 'Scegli il cliente.' : undefined}
              opzioni={[
                { valore: '', etichetta: 'Scegli…' },
                ...dati.clienti
                  .map((c) => ({ valore: c.id, etichetta: nomeCliente(c) }))
                  .sort((a, b) => a.etichetta.localeCompare(b.etichetta, 'it')),
              ]}
              aiuto={{
                argomento: 'cliente',
                testo: "Il paziente (anche se minorenne o se paga un altro) o l'ente a cui fai la fattura.",
              }}
            />
            <CampoData
              etichetta="Data"
              obbligatorio

              valore={data}
              onChange={setData}
              aiuto={{
                argomento: 'data della fattura',
                testo:
                  "Di solito il giorno in cui vieni pagato. Non può essere precedente all'ultima fattura emessa né all'inizio dell'attività.",
              }}
            />
            <CampoScelta
              etichetta="Attività"
              obbligatorio
              valore={attivitaId}
              onChange={(v) => {
                setAttivitaId(v);
                const a = dati.attivita.find((x) => x.id === v);
                if (a && righe.length === 1 && righe[0]!.compenso === '') setRighe([nuovaRiga(a.natura_iva)]);
              }}
              opzioni={[
                ...(dati.attivita.length === 0
                  ? [{ valore: '', etichetta: 'Nessuna attività configurata' }]
                  : []),
                ...dati.attivita.map((a) => ({ valore: a.id, etichetta: a.nome })),
              ]}
              aiuto={{
                argomento: 'attività',
                testo: "Quale delle tue attività stai fatturando. Decide se di solito c'è l'IVA.",
              }}
            />
          </Griglia>
          <Collegamento href="/clienti/scheda/?ritorno=/fatture/nuova/">+ Nuovo cliente</Collegamento>
        </Scheda>

        <Scheda
          titolo="Prestazioni"
          aiuto={{
            argomento: 'prestazioni',
            testo:
              'Cosa fatturi. Scrivi una descrizione generica: niente diagnosi né informazioni sulla salute del paziente.',
            esempio:
              '«Prestazione professionale psicologica», quantità 4, importo 60 € = quattro sedute da 60 €.',
          }}
          azioni={
            <Button
              className={s.pulsante}
              icon={<Add20Regular />}
              onClick={() =>
                setRighe((x) => [
                  ...x,
                  nuovaRiga(dati.attivita.find((a) => a.id === attivitaId)?.natura_iva ?? 'esente_sanitaria'),
                ])
              }
            >
              Aggiungi una prestazione
            </Button>
          }
        >
          {righeLette.map((riga, i) => (
            <div key={riga.id} className={s.riga}>
              <div className={s.intestazioneRiga}>
                <Text weight="semibold">Prestazione {i + 1}</Text>
                {righe.length > 1 ? (
                  <Button
                    appearance="subtle"
                    className={s.icona}
                    icon={<Delete20Regular />}
                    aria-label={`Togli la prestazione ${i + 1}`}
                    onClick={() => setRighe((x) => x.filter((y) => y.id !== riga.id))}
                  />
                ) : null}
              </div>
              <CampoTesto
                etichetta="Descrizione"
                lunghezzaMax={1000}
                obbligatorio
                valore={riga.descrizione}
                onChange={(v) => cambiaRiga(riga.id, { descrizione: v })}
                errore={
                  mostraErrori && riga.descrizione.trim() === '' ? 'Scrivi una descrizione.' : undefined
                }
                aiuto={{
                  argomento: 'descrizione',
                  testo: 'Cosa hai fatto, in modo generico. Mai la diagnosi o il motivo della terapia.',
                  esempio: 'Prestazione professionale psicologica; Ciclo di 4 colloqui; Corso di formazione',
                }}
              />
              <Griglia>
                <CampoTesto
                  etichetta="Quantità"
                  lunghezzaMax={4}
                  inputMode="numeric"
                  valore={riga.quantita}
                  onChange={(v) => cambiaRiga(riga.id, { quantita: v })}
                  errore={riga.q === null ? 'Un numero intero da 1 in su.' : undefined}
                  aiuto={{ argomento: 'quantità', testo: 'Quante sedute o prestazioni uguali. Di solito 1.' }}
                />
                <CampoTesto
                  etichetta="Importo unitario (€)"
                  lunghezzaMax={12}
                  obbligatorio
                  inputMode="decimal"
                  valore={riga.compenso}
                  onChange={(v) => cambiaRiga(riga.id, { compenso: v })}
                  segnaposto="80,00"
                  errore={
                    riga.compenso !== '' && riga.centesimi === null
                      ? 'Scrivi un importo, per esempio 80 o 80,50.'
                      : mostraErrori && riga.compenso === ''
                        ? "Scrivi l'importo."
                        : undefined
                  }
                  aiuto={{
                    argomento: 'importo unitario',
                    testo: dati?.profilo?.integrativo_compreso
                      ? 'Il prezzo per una prestazione con il contributo ENPAP già dentro (scelta nelle impostazioni): Fiscal ne ricava il tuo compenso. IVA e bollo li aggiunge Fiscal.'
                      : 'Il tuo compenso per una prestazione, senza contributo ENPAP, IVA e bollo: quelli li aggiunge Fiscal.',
                  }}
                />
                <CampoScelta
                  etichetta="IVA"
                  valore={riga.natura}
                  onChange={(v) => cambiaRiga(riga.id, { natura: v })}
                  opzioni={[
                    { valore: 'esente_sanitaria', etichetta: 'Sanitaria, senza IVA' },
                    { valore: 'imponibile', etichetta: 'Con IVA al 22%' },
                  ]}
                  aiuto={{
                    argomento: 'IVA della prestazione',
                    testo:
                      "Le prestazioni sanitarie (colloqui, sostegno, psicoterapia, valutazioni a scopo di cura) sono senza IVA. Formazione, supervisione ad aziende, consulenze non sanitarie hanno l'IVA al 22%.",
                    daDove: 'DPR 633/1972, art. 10, n. 18.',
                  }}
                />
              </Griglia>
            </div>
          ))}
        </Scheda>

        <Scheda
          titolo="Pagamento"
          aiuto={{
            argomento: 'pagamento',
            testo:
              "Se il paziente ha già pagato, segnalo qui: Fiscal registra l'incasso insieme alla fattura. Le tasse si pagano su quello che incassi, quando lo incassi.",
          }}
        >
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'già incassata',
              testo:
                'Spunta se hai già ricevuto i soldi. Viene registrato un incasso pari al netto a pagare.',
            }}
          >
            <Checkbox
              label="Già incassata"
              checked={giaIncassata}
              onChange={(_, d) => setGiaIncassata(d.checked === true)}
            />
          </ConAiuto>
          {giaIncassata ? (
            <CampoScelta
              etichetta="Come ha pagato"
              valore={modalita}
              onChange={setModalita}
              opzioni={MODALITA}
              suggerimento={
                modalita === 'contanti'
                  ? 'Pagando in contanti il paziente non può detrarre la spesa nella dichiarazione dei redditi.'
                  : undefined
              }
              aiuto={{
                argomento: 'modalità di pagamento',
                testo:
                  'Con carta, bancomat o bonifico il pagamento è «tracciabile» e il paziente può detrarre il 19% della spesa. In contanti no.',
              }}
            />
          ) : null}
        </Scheda>
      </div>

      <div className={s.laterale}>
        <Scheda
          titolo="Riepilogo"
          aiuto={{
            argomento: 'riepilogo',
            testo:
              'I conti della fattura, aggiornati mentre scrivi. Gli importi sono arrotondati al centesimo.',
          }}
        >
          {calcolo.errore ? (
            <MessageBar intent="error">
              <MessageBarBody>{calcolo.errore}</MessageBarBody>
            </MessageBar>
          ) : null}
          {r ? (
            <Riepilogo r={r} aliquotaIntegrativo={aliquotaIntegrativo} />
          ) : (
            <Text>Scrivi l&apos;importo della prestazione per vedere i conti.</Text>
          )}
        </Scheda>

        {r && r.spiegazioni.length > 0 ? (
          <Scheda
            titolo="Perché questi numeri"
            aiuto={{
              argomento: 'spiegazioni',
              testo: 'Le regole che Fiscal ha applicato a questa fattura, in parole semplici.',
            }}
          >
            <ul className={s.elenco}>
              {r.spiegazioni.map((sp) => (
                <li key={sp}>
                  <Text>{sp}</Text>
                </li>
              ))}
            </ul>
            {r.regoleDaVerificare.length > 0 ? (
              <MessageBar intent="warning">
                <MessageBarBody>
                  Alcune regole di quest&apos;anno sono ancora da confermare con ENPAP e commercialista: i
                  numeri sono stime.
                </MessageBarBody>
              </MessageBar>
            ) : null}
          </Scheda>
        ) : null}

        {elencoProblemi.length > 0 ? (
          <MessageBar intent="error">
            <MessageBarBody>
              <MessageBarTitle>Manca qualcosa</MessageBarTitle>
              {elencoProblemi.join(' ')}
            </MessageBarBody>
          </MessageBar>
        ) : null}
        {esito ? (
          <MessageBar intent={esito.tipo === 'ok' ? 'success' : 'error'}>
            <MessageBarBody>{esito.testo}</MessageBarBody>
          </MessageBar>
        ) : null}
        <div className={s.azioni}>
          <Button
            appearance="primary"
            className={s.pulsante}
            disabled={inCorso !== null || !profiloPronto}
            onClick={() => void esegui('emissione')}
          >
            {inCorso === 'emissione' ? 'Emetto…' : 'Emetti la fattura'}
          </Button>
          <Button className={s.pulsante} disabled={inCorso !== null} onClick={() => void esegui('bozza')}>
            {inCorso === 'bozza' ? 'Salvo…' : 'Salva come bozza'}
          </Button>
        </div>
        <Text size={200}>
          Una fattura emessa prende il numero successivo e non si può più modificare: per correggerla si fa
          una nota di credito.
        </Text>
      </div>
    </div>
  );
}

function Voce(p: { etichetta: string; valore: number; forte?: boolean; aiuto?: string; segno?: string }) {
  const s = useStili();
  const testo = (
    <div className={s.voce}>
      <Text className={p.forte ? s.forte : undefined}>{p.etichetta}</Text>
      <Text className={p.forte ? s.forte : undefined}>
        <ImportoNascosto valore={`${p.segno ?? ''}${formattaEuro(p.valore)}`} />
      </Text>
    </div>
  );
  return p.aiuto ? (
    <ConAiuto allineamento="centro" aiuto={{ argomento: p.etichetta.toLowerCase(), testo: p.aiuto }}>
      {testo}
    </ConAiuto>
  ) : (
    testo
  );
}

/** I conti della fattura, con un "?" sulle voci meno ovvie. Riutilizzato nel dettaglio. */
export function Riepilogo(props: {
  r: Pick<
    RisultatoFattura,
    | 'totaleCompensi'
    | 'totaleIntegrativo'
    | 'imponibileIva'
    | 'iva'
    | 'importoEsente'
    | 'bollo'
    | 'bolloAddebitato'
    | 'ritenuta'
    | 'totale'
    | 'netto'
  >;
  aliquotaIntegrativo: number | null;
}) {
  const s = useStili();
  const { r } = props;
  return (
    <div className={s.importi}>
      <Voce etichetta="Compensi" valore={r.totaleCompensi} />
      <Voce
        etichetta={`Contributo ENPAP${props.aliquotaIntegrativo !== null ? ` ${props.aliquotaIntegrativo}%` : ''}`}
        valore={r.totaleIntegrativo}
        aiuto="Il contributo integrativo ENPAP: lo aggiungi in fattura e lo paga il cliente. Non è tuo guadagno: lo versi tutto all'ENPAP."
      />
      {r.imponibileIva > 0 ? (
        <>
          <Voce etichetta="Imponibile IVA" valore={r.imponibileIva} />
          <Voce
            etichetta="IVA 22%"
            valore={r.iva}
            aiuto="L'IVA la incassi dal cliente ma non è tua: la versi allo Stato con le liquidazioni IVA."
          />
        </>
      ) : null}
      {r.importoEsente > 0 ? (
        <Voce
          etichetta="Senza IVA (esente)"
          valore={r.importoEsente}
          aiuto="La parte sanitaria della fattura, esente da IVA: compenso più contributo ENPAP."
        />
      ) : null}
      {r.bollo > 0 ? (
        <Voce
          etichetta={r.bolloAddebitato ? 'Bollo' : 'Bollo (lo paghi tu)'}
          valore={r.bollo}
          aiuto={
            r.bolloAddebitato
              ? 'Imposta di bollo da 2 € sulle fatture senza IVA sopra 77,47 €. La paga il paziente; tu la versi allo Stato.'
              : 'Imposta di bollo da 2 €: hai scelto di pagarla tu, quindi non entra nel totale. La versi allo Stato.'
          }
        />
      ) : null}
      <div className={s.separatore} />
      <Voce etichetta="Totale fattura" valore={r.totale} forte />
      {r.ritenuta > 0 ? (
        <>
          <Voce
            etichetta="Ritenuta d'acconto 20%"
            valore={r.ritenuta}
            segno="− "
            aiuto="Il cliente trattiene il 20% del compenso e lo versa allo Stato per te: lo recuperi nella dichiarazione dei redditi come tasse già pagate."
          />
          <Voce etichetta="Netto a pagare" valore={r.netto} forte />
        </>
      ) : null}
    </div>
  );
}
