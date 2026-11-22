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
import { formattaEuro } from '@/engine/importi';
import { consigli, simulaSpesa, type EsitoConsigli, type Ipotesi } from '@/engine/spese/consigli';
import { budgetUfficio } from '@/engine/spese/ufficio';
import { dataItaliana } from '@/features/fatturazione/DettaglioFattura';
import { leggiFatture, leggiIncassi } from '@/features/fatturazione/dati';
import { raccogliAnno, type DatiRaccolti } from '@/features/tasse/dati';
import { CampoEuro } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { CampoScelta, CampoSiNo, Collegamento, Griglia, Scheda } from '@/ui/Moduli';
import {
  IMPOSTAZIONI_PREDEFINITE,
  leggiImpostazioniSpese,
  nuovoId,
  salva,
  type ImpostazioniSpese,
} from './dati';

/**
 * Consigli per abbassare le tasse dell'anno (US3, US4, US8): lista per risparmio calcolato dal motore
 * IRPEF della 001, voci esaurite, simulatore senza salvare nulla e budget per un ufficio.
 * Mai consigli su date di incasso o fatturazione (FR-012).
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  lista: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
    gap: tokens.spacingVerticalM,
  },
  consiglio: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    padding: tokens.spacingHorizontalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  numeri: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalS,
  },
  numero: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  valore: { fontWeight: tokens.fontWeightSemibold, fontVariantNumeric: 'tabular-nums' },
  nota: { color: tokens.colorNeutralForeground3 },
  intestazione: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
});

type Stato = {
  tasse: DatiRaccolti | null;
  imp: ImpostazioniSpese;
  incassiMensili: number[];
  compensoSeduta: number;
};

export function Consigli() {
  const s = useStili();
  const anno = new Date().getFullYear();
  const [stato, setStato] = useState<Stato | null>(null);
  const [errore, setErrore] = useState(false);
  const [ipotesi, setIpotesi] = useState<{ tipo: Ipotesi['tipo']; importo: number | null }>({
    tipo: 'spesa_professionale',
    importo: null,
  });

  useEffect(() => {
    let vivo = true;
    Promise.all([
      raccogliAnno(anno).catch(() => null),
      leggiImpostazioniSpese(),
      leggiIncassi(),
      leggiFatture(),
    ])
      .then(([tasse, imp, incassi, fatture]) => {
        if (!vivo) return;
        // incassi degli ultimi 12 mesi, mese per mese (proxy della previsione finché manca la 006)
        const oggi = new Date();
        const mesi = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(oggi.getFullYear(), oggi.getMonth() - 11 + i, 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        });
        const perMese = mesi.map((m) =>
          incassi.filter((x) => x.data.startsWith(m)).reduce((t, x) => t + x.importo, 0),
        );
        const primoMese = perMese.findIndex((x) => x > 0);
        const sedute = fatture.filter(
          (f) => f.tipo === 'fattura' && f.stato === 'emessa' && f.importo_esente > 0,
        );
        const compensoSeduta = sedute.length
          ? Math.round(sedute.reduce((t, f) => t + f.totale_compensi, 0) / sedute.length)
          : 0;
        setStato({
          tasse,
          imp: imp ?? IMPOSTAZIONI_PREDEFINITE(nuovoId()),
          incassiMensili: primoMese < 0 ? [] : perMese.slice(primoMese),
          compensoSeduta,
        });
      })
      .catch(() => vivo && setErrore(true));
    return () => {
      vivo = false;
    };
  }, [anno]);

  if (errore)
    return (
      <MessageBar intent="error">
        <MessageBarBody>Non riesco a leggere i dati. Controlla la connessione.</MessageBarBody>
      </MessageBar>
    );
  if (!stato) return <Spinner label="Calcolo i consigli…" />;

  async function aggiornaImpostazioni(modifica: Partial<ImpostazioniSpese>) {
    const nuove = { ...stato!.imp, ...modifica };
    setStato((x) => (x ? { ...x, imp: nuove } : x));
    try {
      const r = await salva('impostazioni_spese', nuove as ImpostazioniSpese & Record<string, unknown>);
      setStato((x) => (x ? { ...x, imp: { ...nuove, versione: r.versione } } : x));
    } catch {
      /* resta in coda o verrà riprovato */
    }
  }

  const t = stato.tasse;
  let esito: EsitoConsigli | null = null;
  if (t && t.cu.length > 0) {
    try {
      esito = consigli(t.input, t.registrati, {
        accantonamentoCoperto: stato.imp.accantonamento_coperto,
        oggi: new Date().toISOString().slice(0, 10),
        figli: stato.imp.figli_a_carico,
        previdenzaInCu: t.previdenzaInCu,
        compensi: t.cassa.compensi,
      });
    } catch {
      esito = null;
    }
  }

  const simulazione =
    t && t.cu.length > 0 && ipotesi.importo
      ? simulaSpesa(t.input, [
          ipotesi.tipo === 'detrazione'
            ? { tipo: 'detrazione', importo: ipotesi.importo, aliquota: 0.19 }
            : { tipo: ipotesi.tipo, importo: ipotesi.importo },
        ]).perOpzione[0]
      : null;

  const ufficio = budgetUfficio(
    stato.incassiMensili,
    { margine: Number(stato.imp.margine_ufficio), rapporto: Number(stato.imp.rapporto_ufficio) },
    stato.compensoSeduta,
  );
  const e = formattaEuro;

  return (
    <div className={s.colonna}>
      {!t || t.cu.length === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>
            Per calcolare quanto risparmi serve la Certificazione Unica {anno}.{' '}
            <Collegamento href={`/tasse/dati/?anno=${anno}`} inLinea>
              Inserisci la CU
            </Collegamento>
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <CampoSiNo
        etichetta="Ho già messo da parte i soldi per le tasse"
        valore={stato.imp.accantonamento_coperto}
        onChange={(v) => void aggiornaImpostazioni({ accantonamento_coperto: v })}
        aiuto={{
          argomento: 'accantonamento coperto',
          testo:
            'Fondo pensione e contributi ENPAP volontari vincolano i soldi per anni: Fiscal li propone solo se hai già da parte quello che serve per giugno e novembre.',
        }}
      />

      {esito ? (
        <>
          {esito.attivi.length > 0 ? (
            <Text>
              Puoi ancora risparmiare fino a <ImportoNascosto valore={e(esito.risparmioTotale)} /> di tasse
              entro il 31 dicembre {anno}.
            </Text>
          ) : (
            <Text>{esito.motivoVuoto}</Text>
          )}
          <div className={s.lista}>
            {esito.attivi.map((c, i) => (
              <div key={c.codice} className={s.consiglio}>
                <div className={s.intestazione}>
                  <Text weight="semibold">
                    {i + 1}. {c.titolo}
                  </Text>
                  <Badge appearance="tint" color={c.natura === 'comunque' ? 'brand' : 'warning'}>
                    {c.natura === 'comunque' ? 'spesa utile al lavoro' : 'solo se ti serve'}
                  </Badge>
                </div>
                <div className={s.numeri}>
                  <span className={s.numero}>
                    <Text size={200} className={s.nota}>
                      Ogni 100 €
                    </Text>
                    <span className={s.valore}>{Math.round(c.risparmioPerEuro * 100)} € in meno</span>
                  </span>
                  <span className={s.numero}>
                    <Text size={200} className={s.nota}>
                      Puoi ancora
                    </Text>
                    <span className={s.valore}>
                      <ImportoNascosto valore={e(c.residuo)} />
                    </span>
                  </span>
                  <span className={s.numero}>
                    <Text size={200} className={s.nota}>
                      Costo netto
                    </Text>
                    <span className={s.valore}>
                      <ImportoNascosto valore={e(c.costoNetto)} />
                    </span>
                  </span>
                  <span className={s.numero}>
                    <Text size={200} className={s.nota}>
                      Risparmio max
                    </Text>
                    <span className={s.valore}>
                      <ImportoNascosto valore={e(c.risparmioMassimo)} />
                    </span>
                  </span>
                </div>
                {c.avvertenze.map((a) => (
                  <Text key={a} size={200}>
                    {a}
                  </Text>
                ))}
                <Text size={200} className={s.nota}>
                  Entro il {dataItaliana(c.scadenza)} · {c.regola}
                </Text>
              </div>
            ))}
          </div>
          {esito.esauriti.length > 0 ? (
            <Text size={200}>
              Esaurite (oltre non c&apos;è vantaggio): {esito.esauriti.map((x) => x.titolo).join(', ')}.
            </Text>
          ) : null}
          {esito.nascosti.map((n) => (
            <Text key={n} size={200} className={s.nota}>
              {n}
            </Text>
          ))}
        </>
      ) : null}

      <Scheda
        titolo="Prima di spendere: simula"
        aiuto={{
          argomento: 'simulatore delle spese',
          testo:
            'Scrivi un importo e vedi quante tasse risparmi e quanto ti costa davvero. Non salva niente.',
        }}
      >
        <Griglia>
          <CampoScelta<Ipotesi['tipo']>
            etichetta="Che cosa"
            valore={ipotesi.tipo}
            onChange={(v) => setIpotesi((x) => ({ ...x, tipo: v }))}
            opzioni={[
              { valore: 'spesa_professionale', etichetta: 'Spesa per il lavoro (deducibile)' },
              { valore: 'deduzione', etichetta: 'Fondo pensione o contributo volontario' },
              { valore: 'detrazione', etichetta: 'Spesa detraibile al 19%' },
            ]}
            aiuto={{
              argomento: 'tipo di spesa',
              testo:
                'Le spese per il lavoro abbassano il reddito della partita IVA; fondo pensione e contributi volontari abbassano il reddito complessivo; le detraibili danno uno sconto del 19% sulle tasse.',
            }}
          />
          <CampoEuro
            etichetta="Importo"
            facoltativo
            valore={ipotesi.importo}
            onChange={(v) => setIpotesi((x) => ({ ...x, importo: v }))}
            aiuto={{ argomento: 'importo', testo: 'Quanto pensi di spendere entro il 31 dicembre.' }}
          />
        </Griglia>
        {simulazione ? (
          <Text>
            Tasse in meno <ImportoNascosto valore={e(simulazione.risparmioImposte)} />
            {simulazione.risparmioContributi > 0 ? (
              <>
                , contributi ENPAP in meno <ImportoNascosto valore={e(simulazione.risparmioContributi)} />
              </>
            ) : null}
            : ti costa davvero <ImportoNascosto valore={e(simulazione.costoNetto)} />. Deducibile non vuol
            dire gratis.
          </Text>
        ) : null}
      </Scheda>

      <Scheda
        titolo="Quanto posso spendere per un ufficio?"
        aiuto={{
          argomento: 'ufficio',
          testo:
            "Una stima prudente dagli incassi degli ultimi mesi: tolgo un margine di sicurezza e tengo l'affitto entro una quota degli incassi. Non è una consulenza: contratti e spese accessorie non sono compresi.",
        }}
      >
        {ufficio.incassiMedi === 0 ? (
          <Text>Servono almeno qualche mese di incassi per un suggerimento.</Text>
        ) : (
          <>
            <Text>
              Affitto massimo consigliato: <ImportoNascosto valore={e(ufficio.canoneMassimo)} /> al mese
              {ufficio.sedute > 0 ? ` (circa ${ufficio.sedute} sedute al mese per coprirlo)` : ''}.
            </Text>
            {!ufficio.affidabile ? (
              <MessageBar intent="warning" layout="multiline">
                <MessageBarBody>
                  <MessageBarTitle>Stima poco affidabile</MessageBarTitle>
                  {ufficio.avvisi.join(' ')}
                </MessageBarBody>
              </MessageBar>
            ) : null}
            <Text size={200} className={s.nota}>
              Ipotesi: {ufficio.ipotesi.join(' · ')}. L&apos;affitto è deducibile: il costo vero è più basso,
              simula l&apos;importo qui sopra.
            </Text>
          </>
        )}
      </Scheda>
    </div>
  );
}
