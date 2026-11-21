'use client';

import {
  Badge,
  Button,
  Checkbox,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { ArrowDownload20Regular, Copy20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { riepilogoFatturaElettronica } from '@/engine/adempimenti/fattura-elettronica';
import { csvSts, righeSts } from '@/engine/adempimenti/sts';
import { formattaEuro } from '@/engine/importi';
import { nomeCliente, type DatiCliente } from '@/engine/validazioni/cliente';
import {
  leggiFatture,
  leggiIncassi,
  leggiRighe,
  segnaStsInviate,
  spiegaErrore,
  type Fattura,
  type Incasso,
} from '@/features/fatturazione/dati';
import { dataItaliana, titoloDocumento } from '@/features/fatturazione/DettaglioFattura';
import { AvvisoExportInChiaro } from '@/ui/AvvisoExportInChiaro';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, Griglia, Scheda } from '@/ui/Moduli';

/**
 * Adempimenti (T021, US5): preparazione dei dati per il Sistema Tessera Sanitaria (FR-014) e riepilogo
 * per la fattura elettronica alle aziende e agli enti (FR-015). Fiscal non invia nulla.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  voce: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    minWidth: 0,
  },
  testo: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 },
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'center' },
  pulsante: { minHeight: '44px' },
  badge: { flexShrink: 0, whiteSpace: 'nowrap' },
  segnaposto: { minWidth: '44px', minHeight: '44px', flexShrink: 0 },
  testoFe: {
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalM,
    margin: 0,
  },
});

const clienteDi = (f: Fattura) =>
  (f.fotografia?.cliente ?? null) as (DatiCliente & { codice_fiscale?: string }) | null;

export function Adempimenti() {
  const s = useStili();
  const [fatture, setFatture] = useState<Fattura[] | null>(null);
  const [incassi, setIncassi] = useState<Incasso[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [anno, setAnno] = useState<string>('');
  const [scelte, setScelte] = useState<Set<string>>(new Set());
  const [chiediExport, setChiediExport] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const carica = useCallback(async () => {
    try {
      const [f, i] = await Promise.all([leggiFatture(), leggiIncassi()]);
      setFatture(f.filter((x) => x.stato !== 'bozza'));
      setIncassi(i);
    } catch {
      setErrore('Non riesco a leggere le fatture. Controlla la connessione e ricarica la pagina.');
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await carica();
    })();
  }, [carica]);

  const anni = useMemo(
    () => [...new Set((fatture ?? []).map((f) => f.anno))].sort((a, b) => b - a),
    [fatture],
  );
  const annoScelto = anno || String(anni[0] ?? '');
  const sts = (fatture ?? []).filter((f) => f.stato_sts !== 'non_dovuto' && String(f.anno) === annoScelto);
  const daInviare = sts.filter((f) => f.stato_sts === 'da_inviare');
  const perEnti = (fatture ?? []).filter(
    (f) => clienteDi(f)?.tipo === 'ente' && String(f.anno) === annoScelto,
  );

  if (errore)
    return (
      <MessageBar intent="error">
        <MessageBarBody>{errore}</MessageBarBody>
      </MessageBar>
    );
  if (!fatture) return <Spinner label="Un momento…" />;

  const selezionate = daInviare.filter((f) => scelte.has(f.id));
  const daEsportare = selezionate.length > 0 ? selezionate : daInviare;

  function scaricaCsv() {
    const righe = righeSts(
      daEsportare.map((f) => ({
        numero: f.numero!,
        anno: f.anno,
        data: f.data,
        tipo: f.tipo,
        codiceFiscalePaziente: clienteDi(f)?.codice_fiscale ?? '',
        totale: f.totale,
        incassi: incassi.filter((i) => i.fattura_id === (f.fattura_rif_id ?? f.id)),
      })),
    );
    const blob = new Blob(['﻿' + csvSts(righe)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tessera-sanitaria-${annoScelto}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setChiediExport(false);
  }

  async function segna() {
    try {
      const n = await segnaStsInviate(selezionate.map((f) => f.id));
      setMessaggio(`${n === 1 ? '1 spesa segnata' : `${n} spese segnate`} come inviata.`);
      setScelte(new Set());
      await carica();
    } catch (e) {
      setMessaggio(spiegaErrore(e));
    }
  }

  return (
    <div className={s.colonna}>
      {anni.length > 1 ? (
        <Griglia>
          <CampoScelta
            etichetta="Anno"
            valore={annoScelto}
            onChange={setAnno}
            opzioni={anni.map((a) => ({ valore: String(a), etichetta: String(a) }))}
            aiuto={{ argomento: 'anno', testo: 'Gli adempimenti si fanno anno per anno.' }}
          />
        </Griglia>
      ) : null}

      <Scheda
        titolo="Sistema Tessera Sanitaria"
        aiuto={{
          argomento: 'Sistema Tessera Sanitaria',
          testo:
            "Le spese per le sedute dei pazienti vanno comunicate allo Stato, così il paziente le trova già nella sua dichiarazione dei redditi. Fiscal prepara l'elenco; tu lo inserisci nel portale del Sistema Tessera Sanitaria (o lo fa il commercialista) e poi lo segni come inviato.",
          perche: 'Le spese dei pazienti che si sono opposti non compaiono qui.',
          daDove:
            'D.Lgs. 175/2014, art. 3; DM 31/07/2015. Scadenze e campi del portale: da confermare con il commercialista.',
        }}
      >
        {sts.length === 0 ? <Text>Nessuna spesa da comunicare per il {annoScelto || 'periodo'}.</Text> : null}
        {sts.map((f) => {
          const c = clienteDi(f);
          const pagata = incassi.some((i) => i.fattura_id === (f.fattura_rif_id ?? f.id));
          return (
            <div key={f.id} className={s.voce}>
              {f.stato_sts === 'da_inviare' ? (
                <Checkbox
                  aria-label={`Scegli ${titoloDocumento(f)}`}
                  checked={scelte.has(f.id)}
                  onChange={(_, d) =>
                    setScelte((x) => {
                      const n = new Set(x);
                      if (d.checked) n.add(f.id);
                      else n.delete(f.id);
                      return n;
                    })
                  }
                />
              ) : (
                <span className={s.segnaposto} />
              )}
              <span className={s.testo}>
                <Text weight="semibold">
                  {titoloDocumento(f)} · {dataItaliana(f.data)}
                </Text>
                <Text size={200}>
                  <ImportoNascosto valore={c ? nomeCliente(c) : '—'} segnaposto="••••" /> ·{' '}
                  <ImportoNascosto valore={formattaEuro(f.totale)} />
                  {!pagata && f.tipo === 'fattura' ? ' · non ancora incassata' : ''}
                </Text>
              </span>
              <Badge
                className={s.badge}
                appearance="tint"
                color={f.stato_sts === 'inviata' ? 'success' : 'warning'}
              >
                {f.stato_sts === 'inviata' ? 'Inviata' : 'Da inviare'}
              </Badge>
            </div>
          );
        })}
        {messaggio ? (
          <MessageBar intent="info">
            <MessageBarBody>{messaggio}</MessageBarBody>
          </MessageBar>
        ) : null}
        {chiediExport ? (
          <AvvisoExportInChiaro
            cosa={`l'elenco delle spese sanitarie del ${annoScelto} (con i codici fiscali dei pazienti) in un file CSV`}
            onConferma={scaricaCsv}
            onAnnulla={() => setChiediExport(false)}
          />
        ) : daInviare.length > 0 ? (
          <div className={s.azioni}>
            <Button
              className={s.pulsante}
              icon={<ArrowDownload20Regular />}
              onClick={() => setChiediExport(true)}
            >
              {selezionate.length > 0
                ? `Scarica le ${selezionate.length} scelte (CSV)`
                : 'Scarica le da inviare (CSV)'}
            </Button>
            <Button
              appearance="primary"
              className={s.pulsante}
              disabled={selezionate.length === 0}
              onClick={() => void segna()}
            >
              Segna le scelte come inviate
            </Button>
          </div>
        ) : null}
      </Scheda>

      <Scheda
        titolo="Fattura elettronica"
        aiuto={{
          argomento: 'fattura elettronica',
          testo:
            "Alle aziende e agli enti la fattura va mandata anche in formato elettronico, tramite il Sistema di Interscambio (per esempio con il programma gratuito dell'Agenzia delle Entrate). Qui trovi i dati già pronti da copiare. Ai pazienti non si fa: per loro basta la fattura stampata o in PDF.",
        }}
      >
        {perEnti.length === 0 ? (
          <Text>Nessuna fattura ad aziende o enti nel {annoScelto || 'periodo'}.</Text>
        ) : null}
        {perEnti.map((f) => (
          <RiepilogoFe key={f.id} fattura={f} />
        ))}
      </Scheda>
    </div>
  );
}

function RiepilogoFe({ fattura: f }: { fattura: Fattura }) {
  const s = useStili();
  const [testo, setTesto] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);

  async function mostra() {
    if (testo) {
      setTesto(null);
      return;
    }
    const righe = await leggiRighe([f.id]);
    const regole = f.fotografia?.regole as { aliquota_integrativo?: number } | undefined;
    setTesto(
      riepilogoFatturaElettronica({
        tipo: f.tipo,
        numero: f.numero!,
        anno: f.anno,
        data: f.data,
        professionista: (f.fotografia?.professionista ?? {}) as Record<string, string>,
        cliente: clienteDi(f) ?? {},
        righe,
        totaleIntegrativo: f.totale_integrativo,
        aliquotaIntegrativo: regole?.aliquota_integrativo ?? null,
        imponibileIva: f.imponibile_iva,
        iva: f.iva,
        importoEsente: f.importo_esente,
        bollo: f.bollo_addebitato || f.bollo > 0 ? f.bollo : 0,
        ritenuta: f.ritenuta,
        totale: f.totale,
        netto: f.netto,
        fatturaStornata: f.fotografia?.fattura_stornata as
          { numero: number; anno: number; data: string } | undefined,
      }),
    );
  }

  return (
    <div className={s.colonna}>
      <div className={s.voce}>
        <span className={s.testo}>
          <Text weight="semibold">
            {titoloDocumento(f)} · {dataItaliana(f.data)}
          </Text>
          <Text size={200}>{clienteDi(f) ? nomeCliente(clienteDi(f)!) : '—'}</Text>
        </span>
        <Button className={s.pulsante} onClick={() => void mostra()}>
          {testo ? 'Chiudi' : 'Mostra i dati'}
        </Button>
      </div>
      {testo ? (
        <>
          <pre className={s.testoFe}>{testo}</pre>
          <Button
            className={s.pulsante}
            icon={<Copy20Regular />}
            onClick={() =>
              void navigator.clipboard.writeText(testo).then(() => {
                setCopiato(true);
                setTimeout(() => setCopiato(false), 2000);
              })
            }
          >
            {copiato ? 'Copiato' : 'Copia'}
          </Button>
        </>
      ) : null}
    </div>
  );
}
