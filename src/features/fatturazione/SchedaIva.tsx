'use client';

import {
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  tokens,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { quotaImponibile } from '@/engine/fattura/prorata';
import { formattaEuro } from '@/engine/importi';
import { leggiProfilo, leggiRiepilogoIva, type RiepilogoIva } from '@/features/fatturazione/dati';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { Scheda } from '@/ui/Moduli';

/**
 * Riepilogo IVA dell'anno (T020, US7, FR-020, FR-024, FR-025, FR-026): esenti e imponibili separati,
 * quota imponibile, pro-rata di detraibilità e avviso oltre la soglia (data-model.md +
 * profilo_professionale.soglia_attenzione_imponibile). L'avviso non blocca nulla.
 */
const useStili = makeStyles({
  voce: { display: 'flex', justifyContent: 'space-between', gap: tokens.spacingHorizontalM },
});

export function SchedaIva({ anno }: { anno: number }) {
  const s = useStili();
  const [dati, setDati] = useState<{ r: RiepilogoIva | null; soglia: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiRiepilogoIva(anno), leggiProfilo()])
      .then(([r, p]) => vivo && setDati({ r, soglia: p?.soglia_attenzione_imponibile ?? 10 }))
      .catch(() => vivo && setDati(null));
    return () => {
      vivo = false;
    };
  }, [anno]);

  if (!dati?.r) return null;
  const { r, soglia } = dati;
  const { quota, prorata } = quotaImponibile({ imponibili: r.imponibile_iva, esenti: r.importo_esente });

  return (
    <Scheda
      titolo={`IVA ${anno}`}
      aiuto={{
        argomento: 'riepilogo IVA',
        testo:
          "Quanto hai fatturato senza IVA (le sedute) e con IVA (le altre attività). Se hai solo sedute non devi fare nulla per l'IVA. Se hai anche fatture con IVA, la versi allo Stato e puoi recuperare solo una parte dell'IVA che paghi sugli acquisti: quella parte è il «pro-rata».",
        esempio:
          "9.000 € di sedute e 1.000 € di formazione: quota con IVA 10%, recuperi il 10% dell'IVA sugli acquisti.",
        daDove: "DPR 633/1972, art. 19-bis (pro-rata, arrotondato all'unità).",
      }}
    >
      <div className={s.voce}>
        <Text>Senza IVA (sanitarie)</Text>
        <Text>
          <ImportoNascosto valore={formattaEuro(r.importo_esente)} />
        </Text>
      </div>
      <div className={s.voce}>
        <Text>Con IVA (imponibile)</Text>
        <Text>
          <ImportoNascosto valore={formattaEuro(r.imponibile_iva)} />
        </Text>
      </div>
      {r.imponibile_iva > 0 ? (
        <>
          <div className={s.voce}>
            <Text>IVA incassata da versare</Text>
            <Text>
              <ImportoNascosto valore={formattaEuro(r.iva)} />
            </Text>
          </div>
          <div className={s.voce}>
            <Text>Quota con IVA</Text>
            <Text weight="semibold">{quota.toLocaleString('it-IT')}%</Text>
          </div>
          <div className={s.voce}>
            <Text>IVA sugli acquisti che recuperi (pro-rata)</Text>
            <Text weight="semibold">{prorata}%</Text>
          </div>
          {quota > soglia ? (
            <MessageBar intent="warning">
              <MessageBarBody>
                <MessageBarTitle>Oltre la tua soglia del {soglia}%</MessageBarTitle>
                Le fatture con IVA sono una parte importante del totale. Puoi continuare a emettere, ma
                parlane con il commercialista: cambiano liquidazioni e versamenti IVA.
              </MessageBarBody>
            </MessageBar>
          ) : null}
          <Text size={200}>
            Con fatture con IVA servono liquidazioni periodiche, registri IVA e dichiarazione IVA annuale:
            Fiscal per ora non li prepara, falli seguire al commercialista.
          </Text>
        </>
      ) : (
        <Text size={200}>
          Solo prestazioni sanitarie: nessuna IVA da versare e nessuna dichiarazione IVA da fare per queste
          fatture.
        </Text>
      )}
    </Scheda>
  );
}
