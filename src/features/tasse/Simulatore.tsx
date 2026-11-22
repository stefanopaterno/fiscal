'use client';

import { makeStyles, MessageBar, MessageBarBody, Text, tokens } from '@fluentui/react-components';
import { useState } from 'react';
import type { InputAnno } from '@/engine/irpef/anno';
import { percentualeInTesto } from '@/engine/irpef/aritmetica';
import { confrontaScenario } from '@/engine/irpef/scenario';
import { formattaEuro } from '@/engine/importi';
import { ErroreIrpef } from '@/engine/regole/irpef';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { Griglia, Scheda } from '@/ui/Moduli';
import { CampoEuro, Voce, Voci } from './componenti';

/**
 * "E se fatturo ancora…?" (US2, FR-012..FR-014): calcolo immediato su una copia dei dati, nulla viene
 * salvato. Mostra costo dello scenario, scaglione prima e dopo, giugno con e senza.
 */
const useStili = makeStyles({
  esito: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
});

export function Simulatore({ input, soggettoIsa }: { input: InputAnno; soggettoIsa: boolean }) {
  const s = useStili();
  const [compensi, setCompensi] = useState<number | null>(null);
  const [spese, setSpese] = useState<number | null>(null);

  let esito: ReturnType<typeof confrontaScenario> | null = null;
  let errore: string | null = null;
  if ((compensi ?? 0) > 0 || (spese ?? 0) > 0) {
    try {
      esito = confrontaScenario(input, { compensi: compensi ?? 0, spese: spese ?? 0 }, { soggettoIsa });
    } catch (e) {
      errore = e instanceof ErroreIrpef ? e.message : 'Simulazione non riuscita.';
    }
  }

  return (
    <Scheda
      titolo="E se fatturo ancora…?"
      aiuto={{
        argomento: 'simulatore',
        testo: `Prova un incasso o una spesa in più entro il 31 dicembre ${input.anno}: vedi subito quanto ti costa in tasse e contributi e quanto pagherai a giugno. Non salva niente.`,
        esempio: 'Scrivi 5.000 nei compensi per sapere quanto ti resta davvero di un incarico da 5.000 €.',
      }}
    >
      <Griglia>
        <CampoEuro
          etichetta="Compensi in più"
          facoltativo
          valore={compensi}
          onChange={setCompensi}
          aiuto={{
            argomento: 'compensi in più',
            testo: 'Quanto pensi di incassare ancora entro fine anno, senza integrativo e bollo.',
          }}
        />
        <CampoEuro
          etichetta="Spese in più"
          facoltativo
          valore={spese}
          onChange={setSpese}
          aiuto={{
            argomento: 'spese in più',
            testo:
              'Una spesa professionale che pensi di pagare entro fine anno (per esempio un corso o un computer).',
          }}
        />
      </Griglia>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      {esito ? (
        <div className={s.esito} aria-live="polite">
          <Text>{esito.spiegazione}</Text>
          <Voci>
            <Voce etichetta="IRPEF in più" centesimi={esito.differenze.irpef} />
            <Voce etichetta="Addizionali in più" centesimi={esito.differenze.addizionali} />
            <Voce etichetta="Contributo soggettivo ENPAP" centesimi={esito.differenze.contributiEnpap} />
            <Voce etichetta="Costo totale" centesimi={esito.differenze.costoTotale} totale />
            <Voce etichetta="Ti resta" centesimi={esito.nettoScenario} totale />
            <Voce
              etichetta={`Giugno ${esito.giugno.mese.slice(0, 4)} senza`}
              centesimi={esito.giugno.prima}
            />
            <Voce
              etichetta={`Giugno ${esito.giugno.mese.slice(0, 4)} con`}
              centesimi={esito.giugno.dopo}
              totale
            />
          </Voci>
          <Text size={200}>
            Scaglione: {percentualeInTesto(esito.prima.scaglione.aliquotaMarginale)} →{' '}
            {percentualeInTesto(esito.dopo.scaglione.aliquotaMarginale)}. Reddito imponibile dopo lo scenario:{' '}
            <ImportoNascosto valore={formattaEuro(esito.dopo.redditoImponibile)} />
          </Text>
        </div>
      ) : null}
    </Scheda>
  );
}
