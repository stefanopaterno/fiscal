'use client';

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
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
  Tab,
  TabList,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { valoreInUso, type AddizionaliPerAnno } from '@/engine/parametri/anteprima';
import { CATALOGO, parametro } from '@/engine/parametri/catalogo';
import { mostraValore } from '@/engine/parametri/mostra';
import { origineParametro } from '@/engine/parametri/origine';
import { righeAttive, testoFonte } from '@/engine/parametri/risolvi';
import type { Area, ParametroCatalogo, RigaRegistro } from '@/engine/parametri/tipi';
import { spiegaErrore } from '@/features/fatturazione/dati';
import { oggiIso } from '@/lib/oggi';
import { annullaParametro, leggiAddizionali, leggiAnniChiusi, leggiRegistro } from './dati';
import { ricaricaRegistro } from './ProviderParametri';

/** Scheda «In uso» (specifica 014, US4, FR-023..FR-025): valore, origine, fonte, stato, cronologia e annullamento. */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  voce: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  riga: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  nota: { color: tokens.colorNeutralForeground3 },
  storia: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, paddingLeft: tokens.spacingHorizontalM, borderLeft: `2px solid ${tokens.colorNeutralStroke2}` },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
});

const AREE: { area: Area; titolo: string }[] = [
  { area: 'irpef', titolo: 'IRPEF' },
  { area: 'acconti', titolo: 'Acconti e versamenti' },
  { area: 'enpap', titolo: 'ENPAP' },
  { area: 'fatturazione', titolo: 'Fatturazione' },
  { area: 'spese', titolo: 'Spese e oneri' },
  { area: 'scadenze', titolo: 'Scadenze' },
  { area: 'f24', titolo: 'Codici tributo F24' },
  { area: 'addizionali', titolo: 'Addizionali' },
];

const dataIt = (d: string) => d.slice(0, 10).split('-').reverse().join('/');

export function ParametriInUso({ aggiornamento }: { aggiornamento: number }) {
  const s = useStili();
  const oggi = oggiIso();
  const annoOggi = Number(oggi.slice(0, 4));
  const [anno, setAnno] = useState(annoOggi);
  const [registro, setRegistro] = useState<RigaRegistro[] | null>(null);
  const [anniChiusi, setAnniChiusi] = useState<number[]>([]);
  const [addizionali, setAddizionali] = useState<AddizionaliPerAnno>({});
  const [errore, setErrore] = useState<string | null>(null);
  const [daAnnullare, setDaAnnullare] = useState<RigaRegistro | null>(null);
  const [annullo, setAnnullo] = useState(false);

  const carica = useCallback(async () => {
    try {
      const [r, c, a] = await Promise.all([leggiRegistro(), leggiAnniChiusi(), leggiAddizionali([annoOggi, annoOggi + 1])]);
      setRegistro(r);
      setAnniChiusi(c);
      setAddizionali(a);
    } catch (e) {
      setErrore(spiegaErrore(e));
      setRegistro([]);
    }
  }, [annoOggi]);

  useEffect(() => {
    void carica();
  }, [carica, aggiornamento]);

  const attive = useMemo(() => new Set(righeAttive(registro ?? []).map((r) => r.id)), [registro]);
  const annullate = useMemo(() => new Set((registro ?? []).filter((r) => r.azione === 'annullato').map((r) => r.annulla_id)), [registro]);

  async function conferma() {
    if (!daAnnullare) return;
    setAnnullo(true);
    try {
      await annullaParametro(daAnnullare.id);
      await ricaricaRegistro();
      await carica();
      setDaAnnullare(null);
    } catch (e) {
      setErrore(spiegaErrore(e));
      setDaAnnullare(null);
    } finally {
      setAnnullo(false);
    }
  }

  if (!registro) return <Spinner label="Leggo i parametri…" />;
  const contesto = (p: ParametroCatalogo) => (p.decorrenza === 'data' ? { anno, data: anno === annoOggi ? oggi : `${anno}-01-01` } : { anno });

  return (
    <div className={s.colonna}>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      <TabList selectedValue={String(anno)} onTabSelect={(_, d) => setAnno(Number(d.value))}>
        {[annoOggi, annoOggi + 1].map((a) => (
          <Tab key={a} value={String(a)}>
            {a}
          </Tab>
        ))}
      </TabList>
      <Text size={200} className={s.nota}>
        Valori in uso nel {anno}
        {anno === annoOggi ? ` (per le voci che valgono da una data: oggi, ${dataIt(oggi)})` : ' (al 1° gennaio per le voci che valgono da una data)'}.{' '}
        {registro.length ? `${attive.size} aggiornamenti attivi.` : 'Nessun aggiornamento importato: tutto viene dal programma.'}
      </Text>
      <Accordion multiple collapsible>
        {AREE.map(({ area, titolo }) => {
          const voci = CATALOGO.filter((p) => p.area === area);
          const aggiornate = voci.filter((p) => (registro ?? []).some((r) => r.chiave === p.chiave && attive.has(r.id))).length;
          return (
            <AccordionItem key={area} value={area}>
              <AccordionHeader>
                {titolo} {aggiornate ? `· ${aggiornate} aggiornati` : ''}
              </AccordionHeader>
              <AccordionPanel>
                {voci.map((p) => {
                  const r = valoreInUso(p, contesto(p), addizionali);
                  const o = p.insieme === 'addizionali' ? null : origineParametro(p.chiave, contesto(p));
                  const storia = registro.filter((x) => x.chiave === p.chiave && (p.decorrenza === 'data' || x.anno === anno));
                  return (
                    <div key={p.chiave} className={s.voce}>
                      <div className={s.riga}>
                        <Text weight="semibold">{p.nome}</Text>
                        {r ? (
                          <Badge appearance="tint" color={r.stato === 'verificata' ? 'success' : 'warning'}>
                            {r.stato === 'verificata' ? 'verificata' : 'da verificare'}
                          </Badge>
                        ) : null}
                        {o?.tipo === 'aggiornamento' ? (
                          <Badge appearance="outline" color="brand">
                            {o.allineato ? 'allineato al programma' : `aggiornato il ${dataIt(o.riga.creato_il)}`}
                          </Badge>
                        ) : o?.tipo === 'riportato' ? (
                          <Badge appearance="outline">riportato dal {o.daAnno}</Badge>
                        ) : null}
                      </div>
                      <Text>{r ? mostraValore(p, r.valore) : p.insieme === 'addizionali' ? 'inseriscile in Tasse → Dati dell\'anno' : 'nessuna regola per quest\'anno'}</Text>
                      {r ? (
                        <Text size={200} className={s.nota}>
                          {r.fonte}
                        </Text>
                      ) : null}
                      {storia.length ? (
                        <div className={s.storia}>
                          {storia.map((x) => {
                            const annata = x.anno ?? Number(x.dal!.slice(0, 4));
                            const annullabile = x.azione === 'approvato' && !annullate.has(x.id);
                            return (
                              <div key={x.id} className={s.riga}>
                                <Text size={200}>
                                  {dataIt(x.creato_il)} ·{' '}
                                  {x.azione === 'annullato'
                                    ? 'annullato'
                                    : `${mostraValore(parametro(x.chiave)!, x.valore)}${x.dal ? ` dal ${dataIt(x.dal)}` : ''}${annullate.has(x.id) ? ' (annullato)' : ''}`}
                                  {x.azione === 'approvato' ? ` — ${testoFonte(x.fonte)}` : ''}
                                </Text>
                                {annullabile ? (
                                  anniChiusi.includes(annata) ? (
                                    <Text size={200} className={s.nota}>
                                      anno {annata} chiuso: non si annulla
                                    </Text>
                                  ) : (
                                    <Button size="small" className={s.pulsante} onClick={() => setDaAnnullare(x)}>
                                      Annulla
                                    </Button>
                                  )
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Dialog open={daAnnullare !== null} onOpenChange={(_, d) => !d.open && setDaAnnullare(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Annullare l&apos;aggiornamento?</DialogTitle>
            <DialogContent>
              {daAnnullare ? (
                <Text>
                  «{parametro(daAnnullare.chiave)?.nome}» torna al valore precedente. L&apos;annullamento resta nella cronologia.
                </Text>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" className={s.pulsante} disabled={annullo} onClick={() => void conferma()}>
                {annullo ? 'Annullo…' : 'Annulla l\'aggiornamento'}
              </Button>
              <Button className={s.pulsante} onClick={() => setDaAnnullare(null)}>
                Lascia così
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
