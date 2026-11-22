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
import { useEffect, useState } from 'react';
import { percentualeDaTesto, percentualeInTestoModulo } from '@/features/tasse/componenti';
import { CampoSiNo, CampoTesto, Griglia, Scheda } from '@/ui/Moduli';
import { regoleOVicine } from './comuni';
import {
  IMPOSTAZIONI_PREDEFINITE,
  leggiImpostazioniSpese,
  nuovoId,
  salva,
  spiegaErrore,
  type ImpostazioniSpese as Imp,
} from './dati';

/**
 * Impostazioni delle spese (FR-026, FR-027, US8; data-model.md impostazioni_spese.*): categorie dello studio
 * fisico (spente all'inizio, l'attività parte online), figli a carico per il tetto dell'art. 16-ter,
 * accantonamento coperto, regole pratiche per l'ufficio.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
});

export function ImpostazioniSpese() {
  const s = useStili();
  const [imp, setImp] = useState<Imp | null>(null);
  const [testi, setTesti] = useState({ figli: '0', margine: '20', rapporto: '15' });
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    leggiImpostazioniSpese()
      .then((i) => {
        if (!vivo) return;
        const x = i ?? IMPOSTAZIONI_PREDEFINITE(nuovoId());
        setImp(x);
        setTesti({
          figli: String(x.figli_a_carico),
          margine: percentualeInTestoModulo(Number(x.margine_ufficio)),
          rapporto: percentualeInTestoModulo(Number(x.rapporto_ufficio)),
        });
      })
      .catch(() => vivo && setEsito({ ok: false, testo: 'Non riesco a leggere le impostazioni.' }));
    return () => {
      vivo = false;
    };
  }, []);

  if (!imp) return esito ? <Text>{esito.testo}</Text> : <Spinner label="Un momento…" />;
  const studio = regoleOVicine(new Date().getFullYear()).categorie.filter((c) => !c.attivaDiDefault);

  async function salvaTutto() {
    const figli = Number(testi.figli);
    const margine = percentualeDaTesto(testi.margine);
    const rapporto = percentualeDaTesto(testi.rapporto);
    if (!Number.isInteger(figli) || figli < 0 || figli > 10)
      return setEsito({ ok: false, testo: 'Figli a carico: da 0 a 10.' });
    if (margine === null || margine >= 1 || rapporto === null || rapporto <= 0 || rapporto > 1)
      return setEsito({
        ok: false,
        testo: "Margine e quota dell'affitto vanno in percentuale (es. 20 e 15).",
      });
    try {
      const riga = { ...imp!, figli_a_carico: figli, margine_ufficio: margine, rapporto_ufficio: rapporto };
      const r = await salva('impostazioni_spese', riga as Imp & Record<string, unknown>);
      setImp({ ...riga, versione: r.versione });
      setEsito({ ok: true, testo: 'Salvato.' });
    } catch (e) {
      setEsito({ ok: false, testo: spiegaErrore(e) });
    }
  }

  return (
    <div className={s.colonna}>
      <Scheda
        titolo="Studio fisico"
        aiuto={{
          argomento: 'studio fisico',
          testo:
            'Le sedute partono online: le spese di uno studio sono spente. Accendile quando affitti uno studio o ricevi in casa.',
        }}
      >
        {studio.map((c) => (
          <CampoSiNo
            key={c.codice}
            etichetta={c.nome}
            valore={imp.categorie_attive.includes(c.codice)}
            onChange={(v) =>
              setImp((x) =>
                x
                  ? {
                      ...x,
                      categorie_attive: v
                        ? [...x.categorie_attive, c.codice]
                        : x.categorie_attive.filter((y) => y !== c.codice),
                    }
                  : x,
              )
            }
            aiuto={{ argomento: c.nome.toLowerCase(), testo: `${c.esempio}.`, daDove: c.regola.fonte }}
          />
        ))}
      </Scheda>
      <Scheda
        titolo="Per i consigli"
        aiuto={{
          argomento: 'impostazioni dei consigli',
          testo: 'Dati che servono a calcolare bene i consigli. Restano solo nel tuo archivio.',
        }}
      >
        <Griglia>
          <CampoTesto
            etichetta="Figli a carico"
            lunghezzaMax={2}
            inputMode="numeric"
            valore={testi.figli}
            onChange={(v) => setTesti((x) => ({ ...x, figli: v.replace(/\D/g, '') }))}
            aiuto={{
              argomento: 'figli a carico',
              testo:
                'Con un reddito oltre 75.000 € le spese detraibili contano fino a un tetto che dipende dai figli a carico (art. 16-ter).',
            }}
          />
          <CampoTesto
            etichetta="Margine di sicurezza %"
            lunghezzaMax={5}
            inputMode="decimal"
            valore={testi.margine}
            onChange={(v) => setTesti((x) => ({ ...x, margine: v }))}
            aiuto={{
              argomento: 'margine',
              testo:
                'Quanto degli incassi tieni da parte per i mesi peggiori prima di pensare a un affitto. Regola pratica, non fiscale.',
            }}
          />
          <CampoTesto
            etichetta="Affitto al massimo il % degli incassi"
            lunghezzaMax={5}
            inputMode="decimal"
            valore={testi.rapporto}
            onChange={(v) => setTesti((x) => ({ ...x, rapporto: v }))}
            aiuto={{
              argomento: "quota dell'affitto",
              testo: 'La parte massima degli incassi che vuoi spendere per lo studio.',
            }}
          />
        </Griglia>
      </Scheda>
      {esito ? (
        <MessageBar intent={esito.ok ? 'success' : 'error'}>
          <MessageBarBody>{esito.testo}</MessageBarBody>
        </MessageBar>
      ) : null}
      <Button appearance="primary" className={s.pulsante} onClick={() => void salvaTutto()}>
        Salva
      </Button>
    </div>
  );
}
