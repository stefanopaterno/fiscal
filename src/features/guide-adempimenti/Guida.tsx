'use client';

import { Badge, Button, Checkbox, Link, makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Text, tokens } from '@fluentui/react-components';
import { useMemo } from 'react';
import { componi, daRicontrollare, FREQUENZE, PERTINENZE, type Guida as DatiGuida } from '@/engine/regole/guide-adempimenti';
import { BollaAiuto } from '@/ui/AiutoContestuale';
import { Collegamento } from '@/ui/Moduli';
import { Disegno } from './Disegno';
import { azzeraSpunte, cambiaSpunta, useSpunte } from './spunte';

/**
 * Una guida (specifica 015, US2, FR-004, FR-008, FR-010, FR-011, FR-013, FR-015): sezioni in ordine, passi con
 * spunta, campi con «?», fonte e stato. I valori citati vengono dalle regole in vigore oggi.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0, overflowWrap: 'anywhere' },
  sezione: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  riga: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  elenco: { margin: 0, paddingLeft: tokens.spacingHorizontalXL, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  passi: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  passo: { display: 'flex', flexDirection: 'column', gap: '2px', borderRadius: tokens.borderRadiusMedium, outlineOffset: '2px' },
  avvertenza: { color: tokens.colorNeutralForeground3, paddingLeft: '32px' },
  campo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  valore: { fontFamily: tokens.fontFamilyMonospace, fontWeight: tokens.fontWeightSemibold },
  nota: { color: tokens.colorNeutralForeground3 },
  pulsante: { minHeight: '44px', alignSelf: 'flex-start' },
  fonte: { display: 'inline-flex', alignItems: 'center', minHeight: '44px' },
});

const dataIt = (d: string) => d.split('-').reverse().join('/');

export function Guida({ g, oggi }: { g: DatiGuida; oggi: string }) {
  const s = useStili();
  const fatti = useSpunte(g.id);
  const anno = Number(oggi.slice(0, 4));

  // tutti i testi composti una volta, con i valori «da verificare» e quelli aggiornati dalla 014
  const t = useMemo(() => {
    const daVerificare = new Set<string>();
    const aggiornati = new Set<string>();
    const c = (testo: string | undefined) => {
      if (!testo) return '';
      const r = componi(testo, { anno, oggi });
      r.daVerificare.forEach((x) => daVerificare.add(x));
      r.aggiornati.forEach((x) => aggiornati.add(x));
      return r.testo;
    };
    const out = {
      inBreve: c(g.inBreve),
      quando: c(g.quando),
      doveSiFa: c(g.doveSiFa),
      cosaTiServe: (g.cosaTiServe ?? []).map(c),
      passi: g.passi.map((p) => ({ testo: c(p.testo), avvertenza: c(p.avvertenza) })),
      campi: (g.campi ?? []).map((x) => ({ ...x, valore: c(x.valore), aiuto: c(x.aiuto) })),
      errori: (g.errori ?? []).map(c),
      parere: c(g.parere),
    };
    return { ...out, daVerificare: [...daVerificare], aggiornati: [...aggiornati] };
  }, [g, anno, oggi]);

  const vecchia = daRicontrollare(g, oggi);

  return (
    <article className={s.colonna} aria-label={g.titolo}>
      <div className={s.riga}>
        <Badge appearance="outline">{FREQUENZE[g.frequenza]}</Badge>
        {g.pertinenza !== 'sempre' ? (
          <Badge appearance="tint" color="informative">
            {PERTINENZE[g.pertinenza]}
          </Badge>
        ) : null}
        <Badge appearance="tint" color={g.stato === 'verificata' ? 'success' : 'warning'}>
          {g.stato === 'verificata' ? 'verificata' : 'da verificare'}
        </Badge>
      </div>

      {vecchia ? (
        <MessageBar intent="warning">
          <MessageBarBody>Da ricontrollare: l&apos;ultimo controllo è del {dataIt(g.ultimoControllo)}, più di un anno fa.</MessageBarBody>
        </MessageBar>
      ) : null}
      {t.aggiornati.length ? (
        <MessageBar intent="info">
          <MessageBarBody>Aggiornata con i tuoi parametri fiscali: {t.aggiornati.join(', ')}.</MessageBarBody>
        </MessageBar>
      ) : null}

      <Sezione titolo="In breve">
        <Text>{t.inBreve}</Text>
      </Sezione>
      <Sezione titolo="Quando">
        <Text>{t.quando}</Text>
      </Sezione>
      <Sezione titolo="Dove si fa">
        <Text>{t.doveSiFa}</Text>
      </Sezione>
      {t.cosaTiServe.length ? (
        <Sezione titolo="Cosa ti serve">
          <ul className={s.elenco}>
            {t.cosaTiServe.map((x) => (
              <li key={x}>
                <Text>{x}</Text>
              </li>
            ))}
          </ul>
        </Sezione>
      ) : null}

      {g.disegno ? <Disegno disegno={g.disegno} idGuida={g.id} /> : null}

      <Sezione titolo="Passo per passo">
        <ol className={s.passi}>
          {t.passi.map((p, i) => {
            const n = i + 1;
            return (
              <li key={n} id={`passo-${g.id}-${n}`} tabIndex={-1} className={s.passo}>
                <Checkbox
                  checked={fatti.includes(n)}
                  onChange={(_, d) => cambiaSpunta(g.id, n, !!d.checked)}
                  label={
                    <Text>
                      <b>{n}.</b> {p.testo}
                    </Text>
                  }
                />
                {p.avvertenza ? (
                  <Text size={200} className={s.avvertenza}>
                    {p.avvertenza}
                  </Text>
                ) : null}
              </li>
            );
          })}
        </ol>
        {fatti.length ? (
          <Button appearance="subtle" className={s.pulsante} onClick={() => azzeraSpunte(g.id)}>
            Azzera le spunte ({fatti.length}/{t.passi.length})
          </Button>
        ) : null}
      </Sezione>

      {t.campi.length ? (
        <Sezione titolo="Cosa scrivere">
          <div>
            {t.campi.map((c) => (
              <div key={`${c.modulo}|${c.campo}`} className={s.campo}>
                <Text size={200} className={s.nota}>
                  {c.modulo}
                </Text>
                <div className={s.riga}>
                  <Text>{c.campo}:</Text>
                  <Text className={s.valore}>{c.valore}</Text>
                  {c.aiuto ? <BollaAiuto argomento={c.campo} testo={c.aiuto} /> : null}
                </div>
              </div>
            ))}
          </div>
        </Sezione>
      ) : null}

      {t.errori.length ? (
        <Sezione titolo="Errori comuni">
          <ul className={s.elenco}>
            {t.errori.map((x) => (
              <li key={x}>
                <Text>{x}</Text>
              </li>
            ))}
          </ul>
        </Sezione>
      ) : null}

      {t.parere ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Quando chiedere un parere</MessageBarTitle>
            {t.parere}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {g.daVerificare?.length || t.daVerificare.length ? (
        <Sezione titolo="Da verificare">
          <ul className={s.elenco}>
            {[...(g.daVerificare ?? []), ...t.daVerificare].map((x) => (
              <li key={x}>
                <Text size={200}>{x}</Text>
              </li>
            ))}
          </ul>
        </Sezione>
      ) : null}

      <Sezione titolo="Fonte">
        {g.fonti.map((f) => (
          <Link key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className={s.fonte}>
            {f.nome}
            {f.ufficiale ? '' : ' (fonte divulgativa)'}
          </Link>
        ))}
        <Text size={200} className={s.nota}>
          Ultimo controllo: {dataIt(g.ultimoControllo)}. Le guide spiegano: l&apos;invio lo fai tu sui canali ufficiali.
        </Text>
      </Sezione>

      {g.apriInFiscal ? <Collegamento href={g.apriInFiscal.href}>Apri in Fiscal: {g.apriInFiscal.testo}</Collegamento> : null}
    </article>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  const s = useStili();
  return (
    <section className={s.sezione}>
      <Text as="h3" weight="semibold" size={400} style={{ margin: 0 }}>
        {titolo}
      </Text>
      {children}
    </section>
  );
}
