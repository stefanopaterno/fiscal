'use client';

import {
  Badge,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { stimaVersamenti } from '@/engine/irpef/acconti';
import { calcolaAnno, type RisultatoAnno } from '@/engine/irpef/anno';
import { percentualeInTesto } from '@/engine/irpef/aritmetica';
import { contributiEnpap, type ContributiEnpap } from '@/engine/irpef/enpap';
import { formattaEuro } from '@/engine/importi';
import { ErroreIrpef } from '@/engine/regole/irpef';
import { Collegamento, Scheda } from '@/ui/Moduli';
import { GrigliaKpi, Kpi, SceltaAnno, useAnno, Voce, Voci } from './componenti';
import { raccogliAnno, type DatiRaccolti } from './dati';
import { Simulatore } from './Simulatore';

/**
 * Quadro delle imposte dell'anno (US1, US3; contracts/pagine.md): conguaglio, scaglione, cosa versare a
 * giugno e novembre dell'anno dopo, contributi ENPAP e simulatore. Ogni numero ha la sua spiegazione.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  collegamenti: { display: 'flex', gap: tokens.spacingHorizontalL, flexWrap: 'wrap' },
  elenco: { margin: 0, paddingLeft: '20px' },
  scelta: { maxWidth: '240px' },
});

type Stato =
  | { tipo: 'caricamento' }
  | { tipo: 'errore'; messaggio: string }
  | { tipo: 'senza_cu'; dati: DatiRaccolti }
  | { tipo: 'pronto'; dati: DatiRaccolti; risultato: RisultatoAnno; enpap: ContributiEnpap | null };

export function QuadroAnno() {
  const [anno, setAnno] = useAnno();
  return <QuadroAnnoPerAnno key={anno} anno={anno} setAnno={setAnno} />;
}

function QuadroAnnoPerAnno({ anno, setAnno }: { anno: number; setAnno: (a: number) => void }) {
  const s = useStili();
  const [stato, setStato] = useState<Stato>({ tipo: 'caricamento' });

  useEffect(() => {
    let vivo = true;
    raccogliAnno(anno)
      .then((dati) => {
        if (!vivo) return;
        if (dati.cu.length === 0) return setStato({ tipo: 'senza_cu', dati });
        try {
          const risultato = calcolaAnno(dati.input);
          const conPiva =
            dati.input.redditoProfessionale !== 0 || (dati.annoInizio !== null && dati.annoInizio <= anno);
          const enpap = conPiva
            ? contributiEnpap(anno, {
                redditoProfessionale: dati.input.redditoProfessionale,
                volumeAffari: dati.cassa.compensi,
              })
            : null;
          setStato({ tipo: 'pronto', dati, risultato, enpap });
        } catch (e) {
          setStato({
            tipo: 'errore',
            messaggio: e instanceof ErroreIrpef ? e.message : 'Il calcolo non è riuscito.',
          });
        }
      })
      .catch(
        () =>
          vivo &&
          setStato({
            tipo: 'errore',
            messaggio: 'Non riesco a leggere i dati. Controlla la connessione e ricarica.',
          }),
      );
    return () => {
      vivo = false;
    };
  }, [anno]);

  const collegamenti = (
    <div className={s.collegamenti}>
      <Collegamento href={`/tasse/dati/?anno=${anno}`}>Dati dell&apos;anno e CU</Collegamento>
      <Collegamento href={`/tasse/versamenti/?anno=${anno}`}>Versamenti</Collegamento>
      <Collegamento href={`/tasse/strategia/?anno=${anno}`}>Strategia dei versamenti</Collegamento>
    </div>
  );

  return (
    <div className={s.colonna}>
      <div className={s.scelta}>
        <SceltaAnno anno={anno} onChange={setAnno} />
      </div>
      {stato.tipo === 'caricamento' ? <Spinner label="Calcolo in corso…" /> : null}
      {stato.tipo === 'errore' ? (
        <MessageBar intent="error">
          <MessageBarBody>{stato.messaggio}</MessageBarBody>
        </MessageBar>
      ) : null}
      {stato.tipo === 'senza_cu' ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Manca la Certificazione Unica {anno}</MessageBarTitle>
            Il calcolo parte dal tuo reddito da dipendente: inserisci i numeri della CU (bastano 5 minuti).{' '}
            <Collegamento href={`/tasse/dati/?anno=${anno}`}>Inserisci la CU</Collegamento>
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {stato.tipo === 'pronto' ? <Quadro {...stato} /> : null}
      {collegamenti}
    </div>
  );
}

function Quadro({
  dati,
  risultato: r,
  enpap,
}: {
  dati: DatiRaccolti;
  risultato: RisultatoAnno;
  enpap: ContributiEnpap | null;
}) {
  const s = useStili();
  const isa = dati.dati?.soggetto_isa ?? false;
  const stima = stimaVersamenti(r, { metodo: 'storico', soggettoIsa: isa });
  const spiega = (voce: string) => r.spiegazioni.find((x) => x.voce === voce);
  const annoDopo = r.anno + 1;
  const primoAnno = dati.annoInizio === r.anno;
  const enpapTotale = enpap ? enpap.soggettivo + enpap.maternita + enpap.integrativo : 0;
  const daAccantonare = stima.giugno + stima.novembre + enpapTotale;
  const e = formattaEuro;

  return (
    <>
      {r.provvisorio ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Risultato provvisorio</MessageBarTitle>
            Alcune regole o alcuni dati non sono ancora confermati: i numeri sono stime da verificare con il
            commercialista.
            <ul className={s.elenco}>
              {[...r.datiMancanti, ...r.regoleDaVerificare].map((x) => (
                <li key={x}>
                  <Text size={200}>{x}</Text>
                </li>
              ))}
            </ul>
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {primoAnno ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Primo anno di partita IVA</MessageBarTitle>
            Nel {r.anno} gli acconti si calcolano sull&apos;anno prima, quando avevi solo il lavoro da
            dipendente: quasi tutte le tasse della partita IVA {r.anno} arrivano insieme a giugno {annoDopo}{' '}
            (saldo e primo acconto), più i contributi ENPAP a ottobre. Mettili da parte man mano che incassi.
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <GrigliaKpi>
        <Kpi
          etichetta={`Da accantonare per il ${annoDopo}`}
          valore={e(daAccantonare)}
          evidenza
          nota={`Giugno, novembre${enpap ? ' ed ENPAP' : ''}`}
          aiuto={{
            argomento: 'da accantonare',
            testo: `Quello che dovrai versare nel ${annoDopo} per i redditi ${r.anno}: saldo e primo acconto a giugno, secondo acconto a novembre${enpap ? ', contributi ENPAP a ottobre' : ''}. Tienilo da parte sul conto.`,
          }}
        />
        <Kpi
          etichetta={`Conguaglio ${r.anno}`}
          valore={e(r.conguaglioTotale)}
          nota={r.conguaglioTotale >= 0 ? 'da versare' : 'a credito'}
          aiuto={{
            argomento: 'conguaglio',
            testo:
              'IRPEF e addizionali dovute sul totale dei tuoi redditi, meno quello che il datore ti ha già trattenuto in busta paga e gli acconti già versati.',
          }}
        />
        <Kpi
          etichetta="Aliquota marginale"
          valore={percentualeInTesto(r.scaglione.aliquotaMarginale)}
          nascondi={false}
          nota={
            r.scaglione.mancaAlProssimo != null
              ? `mancano ${formattaEuro(r.scaglione.mancaAlProssimo)} allo scaglione dopo`
              : 'scaglione più alto'
          }
          aiuto={{ argomento: 'aliquota marginale', testo: spiega('scaglione')?.testo ?? '' }}
        />
        <Kpi
          etichetta={`Giugno ${annoDopo}`}
          valore={e(stima.giugno)}
          nota="saldo + primo acconto"
          aiuto={{ argomento: 'giugno', testo: stima.acconti.spiegazione }}
        />
        <Kpi
          etichetta={`Novembre ${annoDopo}`}
          valore={e(stima.novembre)}
          nota="secondo acconto"
          aiuto={{ argomento: 'novembre', testo: stima.acconti.spiegazione }}
        />
        {enpap ? (
          <Kpi
            etichetta={`ENPAP ${enpap.scadenza.split('-').reverse().join('/')}`}
            valore={e(enpapTotale)}
            nota={enpap.provvisorio ? 'stima provvisoria' : undefined}
            aiuto={{ argomento: 'contributi ENPAP', testo: enpap.spiegazione }}
          />
        ) : null}
      </GrigliaKpi>

      <Scheda
        titolo={`Il calcolo del ${r.anno}`}
        aiuto={{
          argomento: 'calcolo',
          testo:
            "Le voci della dichiarazione, nell'ordine in cui si calcolano. Tocca il ? di ogni voce per sapere da dove viene.",
        }}
      >
        <Voci>
          <Voce etichetta="Reddito da dipendente (CU)" centesimi={r.redditoLavoro} />
          <Voce
            etichetta={
              dati.manuale
                ? 'Reddito professionale (inserito da te)'
                : 'Reddito professionale (incassi − spese)'
            }
            centesimi={r.redditoProfessionale}
          />
          <Voce
            etichetta="Reddito complessivo"
            centesimi={r.redditoComplessivo}
            totale
            spiegazione={spiega('redditoComplessivo')?.testo}
            regola={spiega('redditoComplessivo')?.regola}
          />
          <Voce
            etichetta="Contributi e oneri deducibili"
            segno="−"
            centesimi={r.contributiDedotti + r.contributiPrevisti + r.oneriDeducibili}
          />
          <Voce
            etichetta="Reddito imponibile"
            centesimi={r.redditoImponibile}
            totale
            spiegazione={spiega('redditoImponibile')?.testo}
            regola={spiega('redditoImponibile')?.regola}
          />
          <Voce
            etichetta="IRPEF lorda"
            centesimi={r.irpefLorda.totale}
            spiegazione={spiega('irpefLorda')?.testo}
            regola={spiega('irpefLorda')?.regola}
          />
          <Voce
            etichetta="Detrazione lavoro dipendente"
            segno="−"
            centesimi={r.detrazioneLavoro}
            spiegazione={spiega('detrazioneLavoro')?.testo}
            regola={spiega('detrazioneLavoro')?.regola}
          />
          <Voce
            etichetta="Ulteriore detrazione"
            segno="−"
            centesimi={r.ulterioreDetrazione}
            spiegazione={spiega('ulterioreDetrazione')?.testo}
            regola={spiega('ulterioreDetrazione')?.regola}
          />
          {r.altreDetrazioni > 0 ? (
            <Voce etichetta="Altre detrazioni (inserite da te)" segno="−" centesimi={r.altreDetrazioni} />
          ) : null}
          <Voce
            etichetta="IRPEF netta"
            centesimi={r.irpefNetta}
            totale
            spiegazione={spiega('irpefNetta')?.testo}
            regola={spiega('irpefNetta')?.regola}
          />
          <Voce
            etichetta="Già pagata (ritenute e acconti)"
            segno="−"
            centesimi={r.ritenute + r.accontiVersati}
          />
          <Voce
            etichetta="Conguaglio IRPEF"
            centesimi={r.conguaglioIrpef}
            totale
            spiegazione={spiega('conguaglioIrpef')?.testo}
            regola={spiega('conguaglioIrpef')?.regola}
          />
          {r.addizionali ? (
            <>
              <Voce
                etichetta="Addizionale regionale (conguaglio)"
                centesimi={r.addizionali.regionale.conguaglio}
                spiegazione={spiega('addizionali')?.testo}
                regola={spiega('addizionali')?.regola}
              />
              <Voce
                etichetta="Addizionale comunale (conguaglio)"
                centesimi={r.addizionali.comunale.conguaglio}
              />
              <Voce
                etichetta={`Acconto comunale ${annoDopo}`}
                centesimi={r.addizionali.comunale.accontoAnnoDopo}
              />
            </>
          ) : null}
        </Voci>
        <Text size={200}>
          <Badge appearance="tint" color={r.provvisorio ? 'warning' : 'success'}>
            {r.provvisorio ? 'provvisorio' : 'regole verificate'}
          </Badge>{' '}
          Sono stime per uso personale: la dichiarazione ufficiale e il commercialista restano il riferimento.
        </Text>
      </Scheda>

      <Simulatore input={dati.input} soggettoIsa={isa} />
    </>
  );
}
