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
import {
  Attach20Regular,
  Delete20Regular,
  DocumentArrowUp20Regular,
  Eye20Regular,
} from '@fluentui/react-icons';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { formattaEuro } from '@/engine/importi';
import { totaleSpeseAnno, type ModalitaPagamento } from '@/engine/spese/deducibilita';
import { leggiFatturaRicevuta } from '@/engine/spese/fattura-ricevuta';
import { CampoEuro, percentualeDaTesto, percentualeInTestoModulo } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoData, CampoScelta, CampoSiNo, CampoTesto, Griglia, Scheda } from '@/ui/Moduli';
import { categorieAttive, ETICHETTA_MODALITA, percento, regoleOVicine } from './comuni';
import {
  apriGiustificativo,
  caricaGiustificativo,
  elimina,
  leggiImpostazioniSpese,
  leggiSpesa,
  nuovoId,
  salva,
  spiegaErrore,
  type Spesa,
} from './dati';
import { annoCorrente, oggiIso } from '@/lib/oggi';

/**
 * Scheda di una spesa professionale (US1, US6; data-model.md spese.*). Propone la deducibilità della
 * categoria dalle regole dell'anno, permette di cambiarla con una motivazione, di allegare il giustificativo
 * (foto dal telefono o PDF) e di precompilare i dati da una fattura elettronica ricevuta (XML).
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
  pulsante: { minHeight: '44px' },
  nascosto: { display: 'none' },
  anteprima: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorBrandBackground2,
  },
  grande: { fontSize: tokens.fontSizeBase500, fontWeight: tokens.fontWeightSemibold },
});

const oggi = () => oggiIso();

const vuota = (id: string): Spesa => ({
  id,
  versione: 0,
  data: oggi(),
  importo: 0,
  iva_detraibile: 0,
  fornitore: null,
  descrizione: null,
  categoria: 'formazione',
  percentuale: null,
  motivazione: null,
  modalita: 'carta',
  ha_giustificativo: false,
  rimborsata: false,
  bene_id: null,
});

export function SchedaSpesa({ id }: { id: string | null }) {
  const s = useStili();
  const router = useRouter();
  const [spesa, setSpesa] = useState<Spesa | null>(id ? null : vuota(nuovoId()));
  const [attivate, setAttivate] = useState<string[]>([]);
  const [percTesto, setPercTesto] = useState('');
  const [cambiaPerc, setCambiaPerc] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'errore' | 'info'; testo: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [chiave, setChiave] = useState(0);
  const inputFile = useRef<HTMLInputElement>(null);
  const inputXml = useRef<HTMLInputElement>(null);
  // id della spesa già in memoria (appena salvata): non va riletta dal database
  const inMemoria = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;
    leggiImpostazioniSpese()
      .then((i) => vivo && setAttivate(i?.categorie_attive ?? []))
      .catch(() => undefined);
    if (id && inMemoria.current !== id)
      leggiSpesa(id)
        .then((x) => {
          if (!vivo) return;
          if (!x) return setEsito({ tipo: 'errore', testo: 'Spesa non trovata.' });
          setSpesa(x);
          if (x.percentuale != null) {
            setCambiaPerc(true);
            setPercTesto(percentualeInTestoModulo(Number(x.percentuale)));
          }
        })
        .catch(() => vivo && setEsito({ tipo: 'errore', testo: 'Non riesco a leggere la spesa.' }));
    return () => {
      vivo = false;
    };
  }, [id]);

  if (!spesa) return esito ? <Text>{esito.testo}</Text> : <Spinner label="Un momento…" />;

  const anno = Number(spesa.data.slice(0, 4)) || annoCorrente();
  const regole = regoleOVicine(anno);
  const categorie = categorieAttive(regole, attivate);
  const cat = regole.categorie.find((c) => c.codice === spesa.categoria);
  const percPersonalizzata = cambiaPerc ? percentualeDaTesto(percTesto) : null;
  const cambia =
    <K extends keyof Spesa>(k: K) =>
    (v: Spesa[K]) =>
      setSpesa((x) => (x ? { ...x, [k]: v } : x));

  // anteprima: la singola spesa (i tetti annui si applicano sul totale dell'anno, nell'elenco)
  let deducibile = 0;
  try {
    deducibile = totaleSpeseAnno(
      [
        {
          data: spesa.data,
          categoria: spesa.categoria,
          importo: spesa.importo,
          ivaDetraibile: spesa.iva_detraibile,
          percentuale: percPersonalizzata,
          modalita: spesa.modalita,
          rimborsata: spesa.rimborsata,
        },
      ],
      [],
      { anno, compensi: Number.MAX_SAFE_INTEGER / 100 },
    ).deducibile;
  } catch {
    deducibile = 0;
  }

  async function leggiXml(f: File) {
    try {
      const doc = new DOMParser().parseFromString(await f.text(), 'application/xml');
      if (doc.getElementsByTagName('parsererror').length) throw new Error('xml');
      const d = leggiFatturaRicevuta(doc);
      setSpesa((x) =>
        x
          ? {
              ...x,
              fornitore: d.fornitore?.slice(0, 120) ?? x.fornitore,
              data: d.data ?? x.data,
              importo: d.totale ?? x.importo,
              descrizione:
                (d.descrizione ?? (d.numero ? `Fattura n. ${d.numero}` : x.descrizione))?.slice(0, 200) ??
                null,
              ha_giustificativo: true,
            }
          : x,
      );
      setChiave((k) => k + 1);
      setEsito({
        tipo: 'info',
        testo: `Letti dalla fattura: ${d.fornitore ?? 'fornitore'}, ${d.totale != null ? formattaEuro(d.totale) : 'importo da controllare'}${d.iva ? ` (IVA ${formattaEuro(d.iva)}, indetraibile con attività esente)` : ''}. Controlla la categoria e salva.`,
      });
      setFile(f);
    } catch {
      setEsito({
        tipo: 'errore',
        testo: "Non riesco a leggere il file: serve l'XML della fattura elettronica (non il PDF).",
      });
    }
  }

  async function salvaSpesa() {
    if (!spesa) return;
    if (spesa.importo <= 0) return setEsito({ tipo: 'errore', testo: "Scrivi l'importo pagato." });
    if (cambiaPerc && (percPersonalizzata === null || percPersonalizzata > 1))
      return setEsito({ tipo: 'errore', testo: 'Scrivi la percentuale deducibile, da 0 a 100.' });
    if (cambiaPerc && !spesa.motivazione?.trim())
      return setEsito({
        tipo: 'errore',
        testo: 'Scrivi perché cambi la percentuale (serve in caso di controllo).',
      });
    setSalvando(true);
    try {
      const riga: Spesa = {
        ...spesa,
        percentuale: cambiaPerc ? percPersonalizzata : null,
        motivazione: cambiaPerc ? spesa.motivazione : null,
        ha_giustificativo: spesa.ha_giustificativo || file !== null,
      };
      // prima il file: se il caricamento non riesce, la spesa non risulta "con giustificativo"
      if (file) await caricaGiustificativo(riga.id, file);
      const r = await salva('spese', riga as Spesa & Record<string, unknown>);
      setSpesa({ ...riga, versione: r.versione });
      inMemoria.current = riga.id;
      setFile(null);
      if (!id) router.replace(`/spese/scheda/?id=${riga.id}`);
      setEsito({
        tipo: 'ok',
        testo: r.inviata
          ? 'Spesa salvata.'
          : 'Salvata su questo dispositivo: la invio appena torna la connessione.',
      });
    } catch (e) {
      setEsito({ tipo: 'errore', testo: spiegaErrore(e) });
    } finally {
      setSalvando(false);
    }
  }

  async function eliminaSpesa() {
    if (!spesa || spesa.versione === 0) return router.push('/spese/');
    try {
      await elimina('spese', spesa.id);
      router.push('/spese/');
    } catch (e) {
      setEsito({ tipo: 'errore', testo: spiegaErrore(e) });
    }
  }

  return (
    <div className={s.colonna}>
      <Scheda
        titolo="La spesa"
        aiuto={{
          argomento: 'spesa',
          testo:
            "Una spesa per il lavoro, nell'anno in cui la paghi. Se hai la fattura elettronica (XML) del fornitore, caricala: Fiscal compila da solo fornitore, data e importo.",
        }}
        azioni={
          <div className={s.azioni}>
            <Button
              className={s.pulsante}
              icon={<DocumentArrowUp20Regular />}
              onClick={() => inputXml.current?.click()}
            >
              Leggi da fattura elettronica (XML)
            </Button>
            <input
              ref={inputXml}
              type="file"
              accept=".xml,text/xml,application/xml"
              className={s.nascosto}
              aria-label="File XML della fattura"
              onChange={(e) => e.target.files?.[0] && void leggiXml(e.target.files[0])}
            />
          </div>
        }
      >
        <Griglia key={chiave}>
          <CampoData
            etichetta="Data del pagamento"
            obbligatorio
            valore={spesa.data}
            onChange={cambia('data')}
            aiuto={{
              argomento: 'data del pagamento',
              testo:
                "Il giorno in cui hai pagato (non quello della fattura): decide l'anno in cui la spesa abbassa le tasse.",
            }}
          />
          <CampoEuro
            etichetta="Importo pagato"
            valore={spesa.importo || null}
            facoltativo
            onChange={(v) => cambia('importo')(v ?? 0)}
            aiuto={{
              argomento: 'importo',
              testo:
                "Quanto hai pagato, IVA compresa: con le sedute esenti l'IVA non si recupera e fa parte del costo.",
            }}
          />
          <CampoScelta
            etichetta="Categoria"
            valore={spesa.categoria}
            onChange={cambia('categoria')}
            opzioni={categorie.map((c) => ({ valore: c.codice, etichetta: c.nome }))}
            aiuto={{
              argomento: 'categoria',
              testo: cat
                ? `${cat.nome}: deducibile al ${percento(cat.percentuale)}. Esempio: ${cat.esempio}.`
                : 'Scegli il tipo di spesa.',
              daDove: cat?.regola.fonte,
            }}
          />
          <CampoTesto
            etichetta="Fornitore"
            lunghezzaMax={120}
            valore={spesa.fornitore ?? ''}
            onChange={(v) => cambia('fornitore')(v.trim() ? v : null)}
            suggerimento="Facoltativo"
            aiuto={{ argomento: 'fornitore', testo: 'Chi ti ha fatto la fattura o lo scontrino.' }}
          />
          <CampoScelta<ModalitaPagamento>
            etichetta="Come hai pagato"
            valore={spesa.modalita}
            onChange={cambia('modalita')}
            opzioni={(Object.keys(ETICHETTA_MODALITA) as ModalitaPagamento[]).map((m) => ({
              valore: m,
              etichetta: ETICHETTA_MODALITA[m],
            }))}
            aiuto={{
              argomento: 'modalità di pagamento',
              testo:
                'Alcune spese (vitto e alloggio, rappresentanza) si deducono solo se pagate con carta, bonifico o altri strumenti tracciabili.',
            }}
          />
          <CampoTesto
            etichetta="Descrizione"
            lunghezzaMax={200}
            valore={spesa.descrizione ?? ''}
            onChange={(v) => cambia('descrizione')(v.trim() ? v : null)}
            suggerimento="Facoltativa"
            aiuto={{
              argomento: 'descrizione',
              testo:
                'Due parole per ricordarti cos\'era (es. "corso EMDR livello 1"). Niente dati dei pazienti.',
            }}
          />
        </Griglia>
        <CampoSiNo
          etichetta="Cambio la percentuale deducibile"
          valore={cambiaPerc}
          onChange={setCambiaPerc}
          aiuto={{
            argomento: 'percentuale personalizzata',
            testo:
              'Per esempio internet usato anche per casa: deduci il 50% invece del 100%. Serve una motivazione.',
          }}
        />
        {cambiaPerc ? (
          <Griglia>
            <CampoTesto
              etichetta="Percentuale deducibile %"
              lunghezzaMax={6}
              inputMode="decimal"
              valore={percTesto}
              onChange={setPercTesto}
              aiuto={{ argomento: 'percentuale', testo: 'Da 0 a 100.' }}
            />
            <CampoTesto
              etichetta="Perché"
              lunghezzaMax={300}
              valore={spesa.motivazione ?? ''}
              onChange={(v) => cambia('motivazione')(v)}
              aiuto={{
                argomento: 'motivazione',
                testo: 'Una frase che spieghi la scelta, utile in caso di controllo.',
              }}
            />
          </Griglia>
        ) : null}
        <CampoSiNo
          etichetta="Me la rimborsa il cliente"
          valore={spesa.rimborsata}
          onChange={cambia('rimborsata')}
          aiuto={{
            argomento: 'spesa rimborsata',
            testo:
              'Se il cliente ti rimborsa la spesa a parte (rimborso analitico in fattura), non è un costo tuo e non si deduce.',
          }}
        />

        <div className={s.anteprima} aria-live="polite">
          <Text>Questa spesa abbassa il reddito di</Text>
          <span className={s.grande}>
            <ImportoNascosto valore={formattaEuro(deducibile)} />
          </span>
          <Text size={200}>
            {spesa.rimborsata
              ? 'Rimborsata dal cliente: non si deduce.'
              : cat?.richiedeTracciabilita && spesa.modalita === 'contanti'
                ? 'Pagata in contanti: per questa categoria serve un pagamento tracciabile.'
                : `${percento(percPersonalizzata ?? cat?.percentuale ?? 1)} dell'importo${cat?.tettoAnnuo ? `, fino a ${formattaEuro(cat.tettoAnnuo)} l'anno per la categoria` : ''}${cat?.tettoSuCompensi ? `, fino al ${percento(cat.tettoSuCompensi)} dei compensi dell'anno` : ''}.`}
          </Text>
        </div>
      </Scheda>

      <Scheda
        titolo="Giustificativo"
        aiuto={{
          argomento: 'giustificativo',
          testo:
            'Scontrino, ricevuta o fattura. Dal telefono puoi fotografarlo. Resta nel tuo archivio privato, visibile solo a te.',
        }}
      >
        <Text>
          {file
            ? `Pronto da caricare: ${file.name}`
            : spesa.ha_giustificativo
              ? 'Giustificativo presente.'
              : 'Nessun giustificativo: la spesa resta segnata come "senza giustificativo".'}
        </Text>
        <div className={s.azioni}>
          <Button
            className={s.pulsante}
            icon={<Attach20Regular />}
            onClick={() => inputFile.current?.click()}
          >
            {spesa.ha_giustificativo ? 'Sostituisci il file' : 'Fotografa o allega'}
          </Button>
          <input
            ref={inputFile}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className={s.nascosto}
            aria-label="File del giustificativo"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {spesa.ha_giustificativo && spesa.versione > 0 ? (
            <Button
              className={s.pulsante}
              icon={<Eye20Regular />}
              onClick={async () => {
                const url = await apriGiustificativo(spesa.id);
                if (url) window.open(url, '_blank', 'noopener');
                else setEsito({ tipo: 'errore', testo: 'Il file non è ancora caricato.' });
              }}
            >
              Apri
            </Button>
          ) : null}
        </div>
      </Scheda>

      {esito ? (
        <MessageBar intent={esito.tipo === 'errore' ? 'error' : esito.tipo === 'ok' ? 'success' : 'info'}>
          <MessageBarBody>{esito.testo}</MessageBarBody>
        </MessageBar>
      ) : null}
      <div className={s.azioni}>
        <Button
          appearance="primary"
          className={s.pulsante}
          disabled={salvando}
          onClick={() => void salvaSpesa()}
        >
          Salva la spesa
        </Button>
        <Button className={s.pulsante} icon={<Delete20Regular />} onClick={() => void eliminaSpesa()}>
          Elimina
        </Button>
      </div>
    </div>
  );
}
