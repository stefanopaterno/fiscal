'use client';

import { Button, makeStyles, ProgressBar, Text, Title3, tokens } from '@fluentui/react-components';
import { useSearchParams } from 'next/navigation';
import { Collegamento } from '@/ui/Moduli';
import { guida } from './guide';
import { useAvanzamentoGuide } from './preferenze';

/**
 * Guida passo passo (specifica 011, US2, FR-004): un passo alla volta con cosa fare e cosa controllare, il
 * collegamento alla pagina giusta e l'avanzamento salvato, così la guida si riprende da dove eri.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  passo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
  },
  controlla: { borderLeft: `3px solid ${tokens.colorBrandStroke1}`, paddingLeft: tokens.spacingHorizontalM },
  riga: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalM },
  pulsante: { minHeight: '44px' },
  nota: { color: tokens.colorNeutralForeground3 },
});

export function GuidaPassoPasso() {
  const s = useStili();
  const id = useSearchParams().get('id') ?? '';
  const g = guida(id);
  const [avanzamento, salva] = useAvanzamentoGuide();
  if (!g)
    return (
      <Text>
        Guida non trovata. <Collegamento href="/aiuto/" inLinea>Torna all&apos;aiuto</Collegamento>
      </Text>
    );
  const fatti = Math.min(avanzamento[g.id] ?? 0, g.passi.length);
  const finita = fatti === g.passi.length;
  const p = g.passi[Math.min(fatti, g.passi.length - 1)]!;

  return (
    <div className={s.colonna}>
      <Title3 as="h2">{g.titolo}</Title3>
      <Text>{g.perche}</Text>
      <ProgressBar value={fatti / g.passi.length} thickness="large" aria-label="Avanzamento della guida" />
      <Text className={s.nota}>{finita ? 'Guida completata' : `Passo ${fatti + 1} di ${g.passi.length}`}</Text>
      {finita ? (
        <section className={s.passo} aria-label="Guida completata">
          <Text weight="semibold">Fatto: hai completato tutti i passi.</Text>
          <div className={s.riga}>
            <Button className={s.pulsante} onClick={() => salva(g.id, 0)}>
              Ricomincia
            </Button>
            <Collegamento href="/aiuto/">Altre guide</Collegamento>
          </div>
        </section>
      ) : (
        <section className={s.passo} aria-label={`Passo ${fatti + 1}: ${p.titolo}`}>
          <Text weight="semibold" size={500}>
            {fatti + 1}. {p.titolo}
          </Text>
          <Text>{p.cosa}</Text>
          <Text className={s.controlla}>
            <strong>Controlla: </strong>
            {p.controlla}
          </Text>
          <Collegamento href={p.href}>Apri {p.pagina}</Collegamento>
          <div className={s.riga}>
            {fatti > 0 ? (
              <Button className={s.pulsante} onClick={() => salva(g.id, fatti - 1)}>
                Indietro
              </Button>
            ) : null}
            <Button className={s.pulsante} appearance="primary" onClick={() => salva(g.id, fatti + 1)}>
              {fatti + 1 === g.passi.length ? 'Fatto, finisci' : 'Fatto, avanti'}
            </Button>
          </div>
        </section>
      )}
      <ol>
        {g.passi.map((x, i) => (
          <li key={x.titolo}>
            <Text className={i < fatti ? s.nota : undefined}>
              {x.titolo}
              {i < fatti ? ' ✓' : ''}
            </Text>
          </li>
        ))}
      </ol>
      <Text size={200} className={s.nota}>
        Il punto in cui sei resta su questo dispositivo: puoi chiudere e riprendere quando vuoi.
      </Text>
    </div>
  );
}
