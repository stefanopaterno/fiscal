'use client';

import { Button, makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Text, tokens } from '@fluentui/react-components';
import { Print20Regular } from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import { percentualeInTesto } from '@/engine/irpef/aritmetica';
import { formattaEuro } from '@/engine/importi';
import { QUADRI } from '@/engine/regole/dichiarazione';
import { SceltaAnno, useAnno } from '@/features/tasse/componenti';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { oggiIso } from '@/lib/oggi';
import { quadroDichiarazione, spiegaErrore, type QuadroDichiarazione } from './dati';

/**
 * Riepilogo dell'anno per il commercialista (specifica 004, US5, FR-014, FR-018): organizzato per i quadri del
 * Modello Redditi, con la data di generazione e le sezioni incomplete. Si stampa o si salva in PDF dal browser.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  scelta: { maxWidth: '240px', '@media print': { display: 'none' } },
  sezione: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    breakInside: 'avoid',
  },
  riga: { display: 'flex', justifyContent: 'space-between', gap: tokens.spacingHorizontalM, borderBottom: `1px dotted ${tokens.colorNeutralStroke2}` },
  valore: { fontVariantNumeric: 'tabular-nums', textAlign: 'right' },
  incompleta: { color: tokens.colorPaletteDarkOrangeForeground1 },
  nota: { color: tokens.colorNeutralForeground3 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start', '@media print': { display: 'none' } },
});

const e = formattaEuro;

function Riga({ voce, valore }: { voce: string; valore: number | string }) {
  const s = useStili();
  return (
    <div className={s.riga}>
      <Text>{voce}</Text>
      <Text className={s.valore}>{typeof valore === 'number' ? <ImportoNascosto valore={e(valore)} /> : valore}</Text>
    </div>
  );
}

function Sezione({ codice, incompleta, children }: { codice: string; incompleta?: string | null; children: React.ReactNode }) {
  const s = useStili();
  return (
    <section className={s.sezione} aria-label={QUADRI.valore[codice]}>
      <Text weight="semibold">
        {codice === 'acconti' ? '' : `Quadro ${codice} · `}
        {QUADRI.valore[codice]}
      </Text>
      {incompleta ? <Text size={200} className={s.incompleta}>Incompleto: {incompleta}</Text> : null}
      {children}
    </section>
  );
}

export function Riepilogo() {
  const s = useStili();
  const [anno, setAnno] = useAnno();
  const [q, setQ] = useState<QuadroDichiarazione | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    quadroDichiarazione(anno)
      .then((x) => vivo && (setQ(x), setErrore(null)))
      .catch((err) => vivo && setErrore(spiegaErrore(err)));
    return () => {
      vivo = false;
    };
  }, [anno]);

  const da = (chiave: string) => {
    const el = q?.checklist.elementi.find((x) => x.chiave === chiave);
    return el && el.stato === 'da_fornire' ? el.titolo.toLowerCase() : null;
  };

  return (
    <div className={s.colonna}>
      <div className={s.scelta}>
        <SceltaAnno anno={anno} onChange={setAnno} />
      </div>
      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      ) : null}
      {q && q.anno === anno ? (
        <>
          <Text>
            Redditi {anno} · generato il {oggiIso().split('-').reverse().join('/')} · {q.checklist.percentuale}% dei dati pronti
          </Text>
          <MessageBar intent="info" layout="multiline">
            <MessageBarBody>
              <MessageBarTitle>Prima di stampare</MessageBarTitle>
              Tocca l&apos;occhio per mostrare gli importi. È un supporto per il commercialista, non la dichiarazione ufficiale.
            </MessageBarBody>
          </MessageBar>
          <Button className={s.pulsante} appearance="primary" icon={<Print20Regular />} onClick={() => window.print()}>
            Stampa o salva in PDF
          </Button>

          <Sezione codice="RC" incompleta={da('cu')}>
            {q.raccolti.cu.map((c, i) => (
              <div key={c.id}>
                <Text size={200}>{q.raccolti.cu.length > 1 ? `CU ${i + 1}` : 'CU'}{c.sostituto ? ` · ${c.sostituto}` : ''}</Text>
                <Riga voce="Reddito di lavoro dipendente (punti 1–2)" valore={c.reddito_lavoro} />
                <Riga voce="Giorni di lavoro (punto 6)" valore={String(c.giorni_lavoro)} />
                <Riga voce="Ritenute IRPEF (punto 21)" valore={c.ritenute_irpef} />
                <Riga voce="Addizionale regionale trattenuta (punto 22)" valore={c.addizionale_regionale} />
                <Riga voce="Addizionale comunale trattenuta (punti 26–27)" valore={c.addizionale_comunale_acconto + c.addizionale_comunale_saldo} />
              </div>
            ))}
          </Sezione>

          {q.raccolti.annoInizio != null && anno >= q.raccolti.annoInizio ? (
            <Sezione codice="RE" incompleta={da('compensi') ?? da('spese')}>
              <Riga voce="Compensi incassati (ritenuta compresa)" valore={q.raccolti.cassa.compensi} />
              {(q.raccolti.spese?.perCategoria ?? []).map((c) => (
                <Riga
                  key={c.codice}
                  voce={`Spese: ${c.nome}`}
                  valore={c.deducibile}
                />
              ))}
              {q.raccolti.spese?.ammortamenti ? <Riga voce="Quote di ammortamento" valore={q.raccolti.spese.ammortamenti} /> : null}
              {q.raccolti.dati?.spese_professionali ? <Riga voce="Altre spese inserite a mano" valore={q.raccolti.dati.spese_professionali} /> : null}
              <Riga voce="Reddito professionale" valore={q.raccolti.input.redditoProfessionale} />
              <Riga voce="Ritenute d'acconto subite" valore={q.raccolti.cassa.ritenute} />
            </Sezione>
          ) : null}

          <Sezione codice="RR" incompleta={da('enpap')}>
            <Riga
              voce="Contributi ENPAP versati nell'anno (soggettivo e maternità)"
              valore={(q.raccolti.input.versamentiPrevidenza ?? []).filter((v) => v.data.startsWith(`${anno}-`) && v.tipo !== 'integrativo').reduce((t, v) => t + v.importo, 0)}
            />
            <Riga voce="Integrativo incassato (volume d'affari ENPAP)" valore={q.raccolti.cassa.integrativo} />
          </Sezione>

          <Sezione codice="RP" incompleta={da('oneri')}>
            <Riga voce="Oneri deducibili" valore={q.raccolti.input.oneriDeducibili ?? 0} />
            <Riga voce="Detrazioni (spese sanitarie, familiari, altre)" valore={q.raccolti.input.altreDetrazioni ?? 0} />
          </Sezione>

          {q.risultato ? (
            <>
              <Sezione codice="RN">
                <Riga voce="Reddito complessivo" valore={q.risultato.redditoComplessivo} />
                <Riga voce="Reddito imponibile" valore={q.risultato.redditoImponibile} />
                <Riga voce="IRPEF lorda" valore={q.risultato.irpefLorda.totale} />
                <Riga voce="Detrazioni" valore={q.risultato.detrazioneLavoro + q.risultato.ulterioreDetrazione + q.risultato.altreDetrazioni} />
                <Riga voce="IRPEF netta" valore={q.risultato.irpefNetta} />
                <Riga voce="Ritenute" valore={q.risultato.ritenute} />
                <Riga voce="Acconti versati" valore={q.risultato.accontiVersati} />
                <Riga voce="Saldo IRPEF" valore={q.risultato.conguaglioIrpef} />
                <Riga voce="Aliquota sul prossimo euro" valore={percentualeInTesto(q.risultato.scaglione.aliquotaMarginale)} />
              </Sezione>
              {q.risultato.addizionali ? (
                <Sezione codice="RV" incompleta={da('addizionali')}>
                  <Riga voce="Addizionale regionale dovuta" valore={q.risultato.addizionali.regionale.dovuta} />
                  <Riga voce="Addizionale comunale dovuta" valore={q.risultato.addizionali.comunale.dovuta} />
                  <Riga voce="Acconto comunale dell'anno dopo" valore={q.risultato.addizionali.comunale.accontoAnnoDopo} />
                </Sezione>
              ) : null}
              <Sezione codice="RX">
                <Riga voce={q.esito!.saldo >= 0 ? 'Saldo a debito' : 'Credito'} valore={Math.abs(q.esito!.saldo)} />
                {q.creditoAnnoPrima ? <Riga voce="Credito dell'anno prima usato" valore={q.creditoAnnoPrima} /> : null}
                {q.dichiarazione?.credito_scelta ? <Riga voce="Scelta per il credito" valore={q.dichiarazione.credito_scelta} /> : null}
              </Sezione>
            </>
          ) : (
            <Text className={s.incompleta}>Calcolo dell&apos;IRPEF non disponibile: manca la CU o le regole dell&apos;anno.</Text>
          )}
          <Text size={200} className={s.nota}>
            Importi in euro calcolati da Fiscal con le regole {anno} (alcune da verificare). Da controllare con il commercialista.
          </Text>
        </>
      ) : null}
    </div>
  );
}
