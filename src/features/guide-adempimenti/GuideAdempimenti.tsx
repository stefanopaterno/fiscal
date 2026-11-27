'use client';

import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  SearchBox,
  Text,
  tokens,
} from '@fluentui/react-components';
import { ArrowLeft24Regular, BookOpen24Regular, ChevronRight20Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { cercaGuide, FREQUENZE, GRUPPI, guida, PERTINENZE } from '@/engine/regole/guide-adempimenti';
import { oggiIso } from '@/lib/oggi';
import { Guida } from './Guida';

/**
 * Guide agli adempimenti (specifica 015, US1, FR-001..FR-003): pulsante in home sotto il calendario fiscale, layer
 * sopra a tutto con indice e ricerca; una guida si apre nello stesso layer. Con `?guida=<id>` nell'indirizzo si
 * apre direttamente su quella guida (collegamenti da Aiuto e dalle altre pagine).
 */
const useStili = makeStyles({
  trigger: {
    minHeight: '44px',
    justifyContent: 'flex-start',
    textAlign: 'left',
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
  },
  triggerTesto: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 },
  triggerNota: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  triggerFine: { marginLeft: 'auto', color: tokens.colorNeutralForeground3 },
  surface: { maxWidth: '760px', width: 'min(760px, 94vw)' },
  content: { maxHeight: '74vh', overflowY: 'auto', overflowX: 'hidden' },
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  gruppo: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  voce: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    minHeight: '44px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  testoVoce: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flexGrow: 1, overflowWrap: 'anywhere' },
  etichette: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  nota: { color: tokens.colorNeutralForeground3 },
  titolo: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, minWidth: 0 },
});

/** Guida chiesta nell'indirizzo (`?guida=<id>`), solo se esiste. */
function guidaDallIndirizzo(): string | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('guida');
  return guida(id) ? id : null;
}

export function GuideAdempimenti() {
  const s = useStili();
  const [iniziale] = useState(guidaDallIndirizzo);
  const [aperto, setAperto] = useState(iniziale !== null);
  const [scelta, setScelta] = useState<string | null>(iniziale);
  const [cerca, setCerca] = useState('');
  const g = guida(scelta);
  const trovate = cercaGuide(cerca);

  return (
    <>
      <Button appearance="outline" className={s.trigger} icon={<BookOpen24Regular />} onClick={() => setAperto(true)}>
        <span className={s.triggerTesto}>
          <Text weight="semibold">Guide agli adempimenti</Text>
          <span className={s.triggerNota}>Come si fanno: partita IVA, F24, dichiarazioni e altro</span>
        </span>
        <ChevronRight20Regular className={s.triggerFine} />
      </Button>

      <Dialog open={aperto} onOpenChange={(_, d) => setAperto(d.open)}>
        <DialogSurface className={s.surface}>
          <DialogBody>
            <DialogTitle
              action={<Button appearance="subtle" aria-label="Chiudi" icon={<Dismiss24Regular />} onClick={() => setAperto(false)} />}
            >
              <span className={s.titolo}>
                {g ? <Button appearance="subtle" aria-label="Indietro" icon={<ArrowLeft24Regular />} onClick={() => setScelta(null)} /> : null}
                {g ? g.titolo : 'Guide agli adempimenti'}
              </span>
            </DialogTitle>
            <DialogContent className={s.content}>
              {g ? (
                <Guida g={g} oggi={oggiIso()} />
              ) : (
                <div className={s.colonna}>
                  <SearchBox
                    value={cerca}
                    onChange={(_, d) => setCerca(d.value)}
                    placeholder="Cerca: F24, bollo, 740, ENPAP…"
                    aria-label="Cerca una guida"
                  />
                  {trovate.length === 0 ? <Text>Nessuna guida con queste parole.</Text> : null}
                  {GRUPPI.map(({ gruppo, titolo }) => {
                    const voci = trovate.filter((x) => x.gruppo === gruppo);
                    if (!voci.length) return null;
                    return (
                      <section key={gruppo} className={s.gruppo} aria-label={titolo}>
                        <Text as="h3" weight="semibold" size={400} style={{ margin: 0 }}>
                          {titolo}
                        </Text>
                        {voci.map((v) => (
                          <button key={v.id} type="button" className={s.voce} onClick={() => setScelta(v.id)}>
                            <span className={s.testoVoce}>
                              <Text weight="semibold">{v.titolo}</Text>
                              <Text size={200} className={s.nota}>
                                {v.riga}
                              </Text>
                              <span className={s.etichette}>
                                <Badge appearance="outline" size="small">
                                  {FREQUENZE[v.frequenza]}
                                </Badge>
                                {v.pertinenza !== 'sempre' ? (
                                  <Badge appearance="tint" size="small" color="informative">
                                    {PERTINENZE[v.pertinenza]}
                                  </Badge>
                                ) : null}
                              </span>
                            </span>
                            <ChevronRight20Regular className={s.nota} />
                          </button>
                        ))}
                      </section>
                    );
                  })}
                  <Text size={200} className={s.nota}>
                    Le guide valgono per il tuo assetto: psicologo ENPAP, regime ordinario, anche dipendente. Codici e date
                    vengono dalle regole in uso in Fiscal.
                  </Text>
                </div>
              )}
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
