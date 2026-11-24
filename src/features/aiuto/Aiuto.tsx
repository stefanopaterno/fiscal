'use client';

import { Badge, makeStyles, ProgressBar, SearchBox, Text, Title3, tokens } from '@fluentui/react-components';
import { useState } from 'react';
import { cercaGlossario } from '@/engine/regole/glossario';
import { TAPPE } from '@/features/tour/Tour';
import { CampoScelta, CampoSiNo, Collegamento, Scheda } from '@/ui/Moduli';
import { annoCorrente } from '@/lib/oggi';
import { GUIDE } from './guide';
import { useAvanzamentoGuide, usePreferenzeAiuto } from './preferenze';

/**
 * Pagina dell'aiuto (specifica 011, US2, US4, US5): ricerca, guide passo passo con l'avanzamento, glossario e
 * preferenze. Funziona anche senza rete: i testi sono nell'app.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  ricerca: { maxWidth: '100%', width: '100%' },
  elenco: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  voce: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalM} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    minWidth: 0,
  },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: `0 ${tokens.spacingHorizontalM}` },
  nota: { color: tokens.colorNeutralForeground3 },
});

export function Aiuto() {
  const s = useStili();
  const [q, setQ] = useState('');
  const [preferenze, imposta] = usePreferenzeAiuto();
  const [avanzamento] = useAvanzamentoGuide();
  const anno = annoCorrente();
  const t = q.trim().toLowerCase();
  const guide = GUIDE.filter((g) => !t || [g.titolo, g.perche, ...g.passi.flatMap((p) => [p.titolo, p.cosa])].some((x) => x.toLowerCase().includes(t)));
  const termini = cercaGlossario(q);
  const tappe = t ? TAPPE.filter((x) => [x.titolo, x.cosa, x.logica].some((y) => y.toLowerCase().includes(t))) : [];

  return (
    <div className={s.colonna}>
      <SearchBox
        className={s.ricerca}
        size="large"
        placeholder="Cerca: acconto, bollo, CU, ritenuta…"
        value={q}
        onChange={(_, d) => setQ(d.value)}
        aria-label="Cerca nell'aiuto"
      />
      {t && guide.length + termini.length + tappe.length === 0 ? <Text>Nessun risultato per «{q}». Prova con un&apos;altra parola.</Text> : null}

      {guide.length ? (
        <Scheda titolo="Guide passo passo" aiuto={{ argomento: 'guide', testo: 'Le operazioni importanti spiegate un passo alla volta. Puoi interrompere e riprendere da dove eri.' }}>
          <ul className={s.elenco}>
            {guide.map((g) => {
              const fatti = Math.min(avanzamento[g.id] ?? 0, g.passi.length);
              return (
                <li key={g.id} className={s.voce}>
                  <div className={s.riga}>
                    <Collegamento href={`/aiuto/guida/?id=${g.id}`}>{g.titolo}</Collegamento>
                    <Badge appearance="tint" color={fatti === g.passi.length ? 'success' : fatti ? 'brand' : 'subtle'}>
                      {fatti === g.passi.length ? 'completata' : fatti ? `passo ${fatti + 1} di ${g.passi.length}` : `${g.passi.length} passi`}
                    </Badge>
                  </div>
                  <Text size={200} className={s.nota}>
                    {g.perche}
                  </Text>
                  {fatti > 0 && fatti < g.passi.length ? <ProgressBar value={fatti / g.passi.length} aria-label={`Avanzamento: ${g.titolo}`} /> : null}
                </li>
              );
            })}
          </ul>
        </Scheda>
      ) : null}

      {tappe.length ? (
        <Scheda titolo="Nel tour" aiuto={{ argomento: 'tour', testo: 'Le sezioni dell\'app che parlano di quello che cerchi.' }}>
          <ul className={s.elenco}>
            {tappe.map((x) => (
              <li key={x.id} className={s.voce}>
                <Collegamento href={x.link[0]!.href}>{x.titolo}</Collegamento>
                <Text size={200}>{x.cosa}</Text>
              </li>
            ))}
          </ul>
        </Scheda>
      ) : null}

      {termini.length ? (
        <Scheda
          titolo={`Glossario (${termini.length})`}
          aiuto={{ argomento: 'glossario', testo: 'Le parole del fisco in parole semplici, con un esempio. Le cifre degli esempi vengono dalle regole dell\'anno.' }}
        >
          <ul className={s.elenco}>
            {termini.map((v) => {
              const esempio = v.esempio(anno);
              return (
                <li key={v.id} id={`termine-${v.id}`} className={s.voce}>
                  <Title3 as="h3">{v.termine}</Title3>
                  <Text>{v.definizione}</Text>
                  {esempio ? <Text size={200}>Esempio: {esempio}</Text> : null}
                  <div className={s.riga}>
                    {v.pagine.map((p) => (
                      <Collegamento key={p.href} href={p.href}>
                        {p.nome}
                      </Collegamento>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </Scheda>
      ) : null}

      <Scheda titolo="Preferenze dell'aiuto" aiuto={{ argomento: 'preferenze dell\'aiuto', testo: 'Valgono su questo dispositivo. L\'aiuto «?» resta sempre disponibile.' }}>
        <CampoSiNo
          etichetta="Suggerimenti automatici per chi inizia"
          valore={preferenze.automatici}
          onChange={(v) => imposta({ automatici: v })}
          aiuto={{ argomento: 'suggerimenti automatici', testo: 'In home compare l\'invito a seguire la guida giusta finché non l\'hai completata.' }}
        />
        <CampoScelta
          etichetta="Livello dei fumetti"
          valore={preferenze.livello}
          onChange={(v) => imposta({ livello: v })}
          opzioni={[
            { valore: 'breve', etichetta: 'Breve: due righe e un esempio' },
            { valore: 'dettagliato', etichetta: 'Dettagliato: con calcolo e fonte' },
          ]}
          aiuto={{ argomento: 'livello', testo: 'Puoi sempre passare dall\'uno all\'altro con «Dettagli» dentro il fumetto.' }}
        />
        <Text size={200} className={s.nota}>
          Gli aiuti sono spiegazioni di supporto, non consulenza fiscale. <Collegamento href="/tour/" inLinea>Fai il tour di Fiscal</Collegamento>
        </Text>
      </Scheda>
    </div>
  );
}
