'use client';

import { Button, makeStyles, Text, tokens } from '@fluentui/react-components';
import { ChevronRight20Regular, Lightbulb24Regular } from '@fluentui/react-icons';
import { useRouter } from 'next/navigation';
import { formattaEuro } from '@/engine/importi';
import { consigli } from '@/engine/spese/consigli';
import { regoleSpesePerAnno } from '@/engine/regole/spese';
import type { DatiRaccolti } from '@/features/tasse/dati';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { oggiIso } from '@/lib/oggi';

/**
 * Box "Come abbassare le tasse" della home (US7, US5; FR-019..FR-021): le prime 3 azioni per impatto con
 * residuo, risparmio, costo netto e scadenza; da ottobre diventa il promemoria di fine anno.
 */
const useStili = makeStyles({
  box: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    borderLeft: `4px solid ${tokens.colorPaletteMarigoldBorderActive}`,
  },
  titolo: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  icona: { color: tokens.colorPaletteMarigoldForeground2, display: 'flex' },
  voci: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
    gap: tokens.spacingVerticalM,
  },
  voce: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  nota: { color: tokens.colorNeutralForeground3 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
});

export function BoxConsigli({ tasse, anno }: { tasse: DatiRaccolti | null; anno: number }) {
  const s = useStili();
  const router = useRouter();
  if (!tasse || tasse.cu.length === 0) return null;
  const oggi = oggiIso();
  let esito;
  try {
    esito = consigli(tasse.input, tasse.registrati, {
      accantonamentoCoperto: tasse.impostazioniSpese?.accantonamento_coperto ?? false,
      oggi,
      figli: tasse.impostazioniSpese?.figli_a_carico ?? 0,
      previdenzaInCu: tasse.previdenzaInCu,
      compensi: tasse.cassa.compensi,
    });
  } catch {
    return null;
  }
  let fineAnno = false;
  try {
    fineAnno = oggi.slice(5) >= regoleSpesePerAnno(anno).scadenza.valore.promemoriaDal;
  } catch {
    fineAnno = false;
  }
  const prime = esito.attivi.slice(0, 3);
  const e = formattaEuro;
  return (
    <section className={s.box} aria-labelledby="box-consigli">
      <ConAiuto
        allineamento="centro"
        aiuto={{
          argomento: 'come abbassare le tasse',
          testo:
            "Le azioni che riducono di più le tasse di quest'anno, calcolate sul tuo reddito. Per ognuna: quanto puoi ancora usare, quanto risparmi e quanto ti costa davvero. Conta la data del pagamento, entro il 31 dicembre.",
        }}
      >
        <span className={s.titolo}>
          <span className={s.icona} aria-hidden="true">
            <Lightbulb24Regular />
          </span>
          <Text id="box-consigli" weight="semibold" size={400}>
            {fineAnno ? `Entro il 31 dicembre puoi ancora…` : 'Come abbassare le tasse'}
          </Text>
        </span>
      </ConAiuto>
      {prime.length === 0 ? (
        <Text>{esito.motivoVuoto ?? 'Per ora non ci sono azioni utili.'}</Text>
      ) : (
        <div className={s.voci}>
          {prime.map((c) => (
            <div key={c.codice} className={s.voce}>
              <Text weight="semibold">{c.titolo}</Text>
              <Text size={200}>
                Puoi ancora <ImportoNascosto valore={e(c.residuo)} /> · risparmi fino a{' '}
                <ImportoNascosto valore={e(c.risparmioMassimo)} />
              </Text>
              <Text size={200} className={s.nota}>
                Costo netto <ImportoNascosto valore={e(c.costoNetto)} />: deducibile non vuol dire gratis.
              </Text>
            </div>
          ))}
        </div>
      )}
      <Button
        className={s.pulsante}
        appearance="secondary"
        icon={<ChevronRight20Regular />}
        iconPosition="after"
        onClick={() => router.push('/spese/consigli/')}
      >
        Tutti i consigli e il simulatore
      </Button>
    </section>
  );
}
