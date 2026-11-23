'use client';

import { Badge, Button, Field, Input, makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';
import { Checkmark20Regular, Clock20Regular, Edit20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useState } from 'react';
import { centesimiInTesto, euroInCentesimi, formattaEuro } from '@/engine/importi';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { oggiIso } from '@/lib/oggi';
import { nuovoId, quadroAccantonamento, salva, spiegaErrore, type IncassoAccantonato } from './dati';

const dataItaliana = (iso: string) => iso.split('-').reverse().join('/');

/**
 * Promemoria dopo un incasso (specifica 007, US1, FR-002, FR-004): quanto mettere da parte, perché, e tre
 * tocchi: "Fatto", "Importo diverso", "Dopo". Resta finché non è chiuso. Importi con l'occhio (FR-013).
 */
const useStili = makeStyles({
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  voce: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    borderLeft: `4px solid ${tokens.colorBrandStroke1}`,
  },
  rimandato: { borderLeftColor: tokens.colorNeutralStroke1 },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.spacingHorizontalM },
  importo: { fontSize: tokens.fontSizeBase500, fontWeight: tokens.fontWeightSemibold, fontVariantNumeric: 'tabular-nums' },
  nota: { color: tokens.colorNeutralForeground3 },
  scomposizione: { display: 'flex', flexWrap: 'wrap', gap: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`, color: tokens.colorNeutralForeground2 },
  azioni: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: tokens.spacingHorizontalS },
  pulsante: { minHeight: '44px' },
  campo: { maxWidth: '160px' },
  errore: { color: tokens.colorPaletteRedForeground1 },
});

export function Promemoria({
  voci,
  onCambio,
  massimo,
}: {
  voci: IncassoAccantonato[];
  onCambio: () => void;
  massimo?: number;
}) {
  const s = useStili();
  const mostrate = massimo ? voci.slice(0, massimo) : voci;
  if (mostrate.length === 0) return null;
  return (
    <ul className={s.elenco} aria-label="Promemoria di accantonamento">
      {mostrate.map((v) => (
        <VocePromemoria key={v.incassoId} voce={v} onCambio={onCambio} />
      ))}
    </ul>
  );
}

function VocePromemoria({ voce: v, onCambio }: { voce: IncassoAccantonato; onCambio: () => void }) {
  const s = useStili();
  const [diverso, setDiverso] = useState(false);
  const [testo, setTesto] = useState(centesimiInTesto(v.totale));
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const e = formattaEuro;

  async function registra(importo: number, rimandato: boolean) {
    setInCorso(true);
    setErrore(null);
    try {
      await salva('salvadanaio', {
        id: v.movimento?.id ?? nuovoId(),
        versione: v.movimento?.versione ?? 0,
        data: oggiIso(),
        importo,
        tipo: 'accantonamento',
        incasso_id: v.incassoId,
        rimandato,
      });
      onCambio();
    } catch (err) {
      setErrore(spiegaErrore(err));
    } finally {
      setInCorso(false);
    }
  }

  const importoDiverso = euroInCentesimi(testo);
  return (
    <li className={mergeClasses(s.voce, v.stato === 'rimandato' && s.rimandato)}>
      <div className={s.riga}>
        <Text>
          Incasso del {dataItaliana(v.data)} · fattura {v.numero} · <ImportoNascosto valore={e(v.incassato)} />
        </Text>
        {v.stato === 'rimandato' ? (
          <Badge appearance="tint" color="subtle">
            Rimandato
          </Badge>
        ) : null}
      </div>
      <div className={s.riga}>
        <Text>
          Metti da parte <span className={s.importo}><ImportoNascosto valore={e(v.totale)} /></span>
        </Text>
        <Text className={s.nota}>
          Ti restano <ImportoNascosto valore={e(v.netto)} />
        </Text>
      </div>
      <div className={s.scomposizione}>
        <Text size={200}>IRPEF e addizionali <ImportoNascosto valore={e(v.imposte)} /></Text>
        <Text size={200}>ENPAP soggettivo <ImportoNascosto valore={e(v.contributi)} /></Text>
        {v.integrativo ? <Text size={200}>Integrativo <ImportoNascosto valore={e(v.integrativo)} /></Text> : null}
        {v.iva ? <Text size={200}>IVA <ImportoNascosto valore={e(v.iva)} /></Text> : null}
        {v.bollo ? <Text size={200}>Bollo <ImportoNascosto valore={e(v.bollo)} /></Text> : null}
        {v.margine ? <Text size={200}>Margine <ImportoNascosto valore={e(v.margine)} /></Text> : null}
        {v.ritenuta ? <Text size={200}>Meno ritenuta <ImportoNascosto valore={e(v.ritenuta)} /></Text> : null}
      </div>
      <div className={s.azioni}>
        {diverso ? (
          <>
            <Field
              label="Importo messo da parte"
              className={s.campo}
              validationState={importoDiverso == null || importoDiverso === 0 ? 'error' : 'none'}
              validationMessage={importoDiverso == null || importoDiverso === 0 ? 'Scrivi un importo, per esempio 40,00' : undefined}
            >
              <Input value={testo} input={{ inputMode: 'decimal', maxLength: 12 }} onChange={(_, d) => setTesto(d.value)} contentAfter="€" />
            </Field>
            <Button
              className={s.pulsante}
              appearance="primary"
              disabled={inCorso || importoDiverso == null || importoDiverso === 0}
              onClick={() => void registra(importoDiverso!, false)}
            >
              Salva
            </Button>
            <Button className={s.pulsante} onClick={() => setDiverso(false)}>
              Annulla
            </Button>
          </>
        ) : (
          <>
            <Button
              className={s.pulsante}
              appearance="primary"
              icon={<Checkmark20Regular />}
              disabled={inCorso}
              onClick={() => void registra(v.totale, false)}
            >
              Fatto
            </Button>
            <Button className={s.pulsante} icon={<Edit20Regular />} disabled={inCorso} onClick={() => setDiverso(true)}>
              Importo diverso
            </Button>
            {v.stato !== 'rimandato' ? (
              <Button
                className={s.pulsante}
                appearance="subtle"
                icon={<Clock20Regular />}
                disabled={inCorso}
                onClick={() => void registra(v.totale, true)}
              >
                Dopo
              </Button>
            ) : null}
          </>
        )}
      </div>
      {errore ? <Text role="alert" className={s.errore}>{errore}</Text> : null}
    </li>
  );
}

/**
 * Promemoria degli incassi di una fattura (dettaglio fattura): compare subito dopo la registrazione di un
 * incasso. `chiave` cambia quando cambiano gli incassi, così il quadro si ricalcola.
 */
export function PromemoriaFattura({ fatturaId, anni, chiave }: { fatturaId: string; anni: number[]; chiave: string }) {
  const [voci, setVoci] = useState<IncassoAccantonato[]>([]);
  const [giro, setGiro] = useState(0);
  const ricarica = useCallback(() => setGiro((g) => g + 1), []);
  const elencoAnni = [...new Set(anni)].join(',');
  useEffect(() => {
    let vivo = true;
    const lista = elencoAnni ? elencoAnni.split(',').map(Number) : [];
    Promise.all(lista.map((a) => quadroAccantonamento(a).catch(() => null)))
      .then((quadri) => {
        if (!vivo) return;
        setVoci(quadri.flatMap((q) => q?.promemoria.filter((p) => p.fatturaId === fatturaId) ?? []));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [fatturaId, elencoAnni, chiave, giro]);
  if (voci.length === 0) return null;
  return (
    <section aria-label="Da mettere da parte" style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
      <Text weight="semibold">Da mettere da parte per tasse e contributi</Text>
      <Promemoria voci={voci} onCambio={ricarica} />
    </section>
  );
}
