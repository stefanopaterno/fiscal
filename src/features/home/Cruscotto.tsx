'use client';

import {
  Badge,
  Button,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Skeleton,
  SkeletonItem,
  Text,
  Title1,
  tokens,
} from '@fluentui/react-components';
import {
  Calculator24Regular,
  ChevronRight20Regular,
  ClipboardTaskListLtr24Regular,
  DocumentAdd24Regular,
  PersonAdd24Regular,
  SignOut20Regular,
} from '@fluentui/react-icons';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactElement } from 'react';
import { stimaVersamenti } from '@/engine/irpef/acconti';
import { calcolaAnno } from '@/engine/irpef/anno';
import { contributiEnpap } from '@/engine/irpef/enpap';
import { formattaEuro } from '@/engine/importi';
import { totaliFatture } from '@/engine/fattura/totali';
import { anniConRegoleIrpef } from '@/engine/regole/irpef';
import { controllaProfilo } from '@/engine/validazioni/profilo';
import { nomeCliente } from '@/engine/validazioni/cliente';
import { useEsci } from '@/features/auth/useSessione';
import {
  leggiAttivita,
  leggiClienti,
  leggiFatture,
  leggiIncassi,
  leggiProfilo,
  type Cliente,
  type Fattura,
  type Incasso,
  type Profilo,
} from '@/features/fatturazione/dati';
import { dataItaliana, ETICHETTA_STATO, titoloDocumento } from '@/features/fatturazione/DettaglioFattura';
import { BoxSalvadanaio } from '@/features/accantonamento/BoxHome';
import { quadroAccantonamento, type QuadroAccantonamento } from '@/features/accantonamento/dati';
import { BoxConsigli } from '@/features/spese/BoxConsigli';
import type { DatiRaccolti } from '@/features/tasse/dati';
import { GrigliaKpi, Kpi } from '@/features/tasse/componenti';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ImportoNascosto } from '@/ui/ImportoNascosto';
import { Collegamento } from '@/ui/Moduli';
import { COLORI } from '@/ui/tema';
import { oggiData } from '@/lib/oggi';

/**
 * Home (cruscotto): saluto, quanto mettere da parte per le tasse, numeri chiave dell'anno, azioni rapide
 * e ultime fatture. Tutto liquido: si adatta da 360 px al monitor largo. Importi e nomi rispettano l'occhio.
 */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, minWidth: 0 },
  saluto: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  data: { color: tokens.colorNeutralForeground3 },
  evidenza: {
    borderRadius: tokens.borderRadiusXLarge,
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXXL}`,
    backgroundImage: `linear-gradient(135deg, ${COLORI.bluChiaro} 0%, ${COLORI.bluScuro} 100%)`,
    color: '#FFFFFF',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXL,
    boxShadow: tokens.shadow8,
    '@media (max-width: 480px)': { padding: tokens.spacingHorizontalL },
  },
  evidenzaTesto: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: 0 },
  evidenzaTitolo: {},
  evidenzaImporto: {
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightBold,
    fontVariantNumeric: 'tabular-nums',
  },
  evidenzaDettaglio: { opacity: 0.9 },
  evidenzaPulsante: { minHeight: '44px', flexShrink: 0 },
  sezione: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  titoloSezione: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase400 },
  azioni: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
    gap: tokens.spacingVerticalM,
  },
  azione: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minHeight: '72px',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    color: tokens.colorNeutralForeground1,
    textDecorationLine: 'none',
    transitionProperty: 'box-shadow, transform',
    transitionDuration: tokens.durationFast,
    ':hover': { boxShadow: tokens.shadow8, transform: 'translateY(-1px)' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}` },
    // sul telefono, in due colonne, l'icona va sopra il testo
    '@media (max-width: 480px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: tokens.spacingVerticalS,
      padding: tokens.spacingHorizontalM,
    },
  },
  icona: {
    width: '44px',
    height: '44px',
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
  },
  iconaPrimaria: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  azioneTesto: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  azioneNota: { color: tokens.colorNeutralForeground3 },
  elenco: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    overflow: 'hidden',
  },
  fattura: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minHeight: '56px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    color: tokens.colorNeutralForeground1,
    textDecorationLine: 'none',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  fatturaTesto: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 },
  troncato: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  destra: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 },
  intestazioneSezione: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  esci: { alignSelf: 'flex-start', minHeight: '44px' },
});

type Dati = {
  profilo: Profilo | null;
  configurato: boolean;
  fatture: Fattura[];
  incassi: Incasso[];
  clienti: Map<string, Cliente>;
  tasse: DatiRaccolti | null;
  salvadanaio: QuadroAccantonamento | null;
};

export function Cruscotto() {
  const s = useStili();
  const esci = useEsci();
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState(false);
  const [giro, setGiro] = useState(0);
  const oggi = oggiData();
  const anno = oggi.getFullYear();

  useEffect(() => {
    let vivo = true;
    const annoTasse = anniConRegoleIrpef().includes(anno) ? anno : null;
    Promise.all([
      leggiProfilo(),
      leggiAttivita(),
      leggiFatture(),
      leggiIncassi(),
      leggiClienti(),
      annoTasse ? quadroAccantonamento(annoTasse).catch(() => null) : Promise.resolve(null),
    ])
      .then(([profilo, attivita, fatture, incassi, clienti, salvadanaio]) => {
        if (!vivo) return;
        setDati({
          profilo,
          configurato: profilo ? controllaProfilo(profilo, attivita.length).pronto : false,
          fatture,
          incassi,
          clienti: new Map(clienti.map((c) => [c.id, c])),
          tasse: salvadanaio?.raccolti ?? null,
          salvadanaio,
        });
      })
      .catch(() => vivo && setErrore(true));
    return () => {
      vivo = false;
    };
  }, [anno, giro]);

  const nome = dati?.profilo?.nome?.trim();
  const dataLunga = oggi.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={s.colonna}>
      <div className={s.saluto}>
        <Text className={s.data}>{dataLunga.charAt(0).toUpperCase() + dataLunga.slice(1)}</Text>
        <ConAiuto
          allineamento="centro"
          aiuto={{
            argomento: 'home',
            testo:
              "A colpo d'occhio: quanto mettere da parte per le tasse, quanto hai incassato e cosa resta da incassare, e le scorciatoie per le cose di tutti i giorni.",
          }}
        >
          <Title1 as="h1">{nome ? `Ciao, ${nome}` : 'Ciao'}</Title1>
        </ConAiuto>
      </div>

      {errore ? (
        <MessageBar intent="error">
          <MessageBarBody>
            Non riesco a leggere i dati. Controlla la connessione e ricarica la pagina.
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {dati && !dati.configurato ? (
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Completa la configurazione</MessageBarTitle>
            Per emettere fatture servono i tuoi dati e almeno un&apos;attività.{' '}
            <Collegamento href="/impostazioni/attivita/" inLinea>
              Configura la partita IVA
            </Collegamento>
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {dati ? <Evidenza tasse={dati.tasse} anno={anno} /> : <Caricamento />}

      {dati?.salvadanaio ? <BoxSalvadanaio q={dati.salvadanaio} onCambio={() => setGiro((g) => g + 1)} /> : null}

      {dati ? <BoxConsigli tasse={dati.tasse} anno={anno} /> : null}

      {dati ? <NumeriChiave dati={dati} anno={anno} /> : null}

      <section className={s.sezione} aria-labelledby="azioni-rapide">
        <Text id="azioni-rapide" className={s.titoloSezione}>
          Azioni rapide
        </Text>
        <div className={s.azioni}>
          <Azione
            href="/fatture/nuova/"
            titolo="Nuova fattura"
            nota="Seduta o consulenza"
            icona={<DocumentAdd24Regular />}
            primaria
          />
          <Azione
            href="/clienti/scheda/"
            titolo="Nuovo cliente"
            nota="Paziente o ente"
            icona={<PersonAdd24Regular />}
          />
          <Azione
            href="/tasse/"
            titolo="Le mie tasse"
            nota="Conguaglio e acconti"
            icona={<Calculator24Regular />}
          />
          <Azione
            href="/adempimenti/"
            titolo="Adempimenti"
            nota="Tessera Sanitaria e SDI"
            icona={<ClipboardTaskListLtr24Regular />}
          />
        </div>
      </section>

      {dati && dati.fatture.length > 0 ? <UltimeFatture dati={dati} /> : null}

      <Button appearance="subtle" icon={<SignOut20Regular />} className={s.esci} onClick={() => void esci()}>
        Esci
      </Button>
    </div>
  );
}

function Caricamento() {
  return (
    <Skeleton aria-label="Carico i dati">
      <SkeletonItem shape="rectangle" style={{ height: '120px', borderRadius: tokens.borderRadiusXLarge }} />
    </Skeleton>
  );
}

/** Il riquadro in evidenza: quanto mettere da parte per le tasse dell'anno dopo. */
function Evidenza({ tasse, anno }: { tasse: DatiRaccolti | null; anno: number }) {
  const s = useStili();
  const router = useRouter();
  if (!tasse || tasse.cu.length === 0) {
    return (
      <div className={s.evidenza}>
        <div className={s.evidenzaTesto}>
          <Text weight="semibold" size={500}>
            Quanto mettere da parte per le tasse?
          </Text>
          <Text className={s.evidenzaDettaglio}>
            Inserisci la Certificazione Unica {anno}: Fiscal somma stipendio e partita IVA e ti dice quanto
            accantonare per giugno e novembre.
          </Text>
        </div>
        <Button
          className={s.evidenzaPulsante}
          appearance="secondary"
          onClick={() => router.push(`/tasse/dati/?anno=${anno}`)}
        >
          Inserisci la CU
        </Button>
      </div>
    );
  }
  let risultato;
  try {
    risultato = calcolaAnno(tasse.input);
  } catch {
    return null;
  }
  const stima = stimaVersamenti(risultato, {
    metodo: 'storico',
    soggettoIsa: tasse.dati?.soggetto_isa ?? false,
  });
  const conPiva =
    tasse.input.redditoProfessionale !== 0 || (tasse.annoInizio !== null && tasse.annoInizio <= anno);
  const enpap = conPiva
    ? contributiEnpap(anno, {
        redditoProfessionale: tasse.input.redditoProfessionale,
        volumeAffari: tasse.cassa.compensi,
      })
    : null;
  const enpapTotale = enpap ? enpap.soggettivo + enpap.maternita + enpap.integrativo : 0;
  const totale = stima.giugno + stima.novembre + enpapTotale;
  return (
    <div className={s.evidenza}>
      <div className={s.evidenzaTesto}>
        <Text weight="semibold" className={s.evidenzaTitolo}>
          Da mettere da parte per il {anno + 1}
        </Text>
        <span className={s.evidenzaImporto}>
          <ImportoNascosto valore={formattaEuro(totale)} />
        </span>
        <Text className={s.evidenzaDettaglio}>
          Giugno <ImportoNascosto valore={formattaEuro(stima.giugno)} /> · Novembre{' '}
          <ImportoNascosto valore={formattaEuro(stima.novembre)} />
          {enpap ? (
            <>
              {' '}
              · ENPAP <ImportoNascosto valore={formattaEuro(enpapTotale)} />
            </>
          ) : null}
          {risultato.provvisorio ? ' · stima provvisoria' : ''}
        </Text>
      </div>
      <Button
        className={s.evidenzaPulsante}
        appearance="secondary"
        icon={<ChevronRight20Regular />}
        iconPosition="after"
        onClick={() => router.push(`/tasse/?anno=${anno}`)}
      >
        Vedi il calcolo
      </Button>
    </div>
  );
}

function NumeriChiave({ dati, anno }: { dati: Dati; anno: number }) {
  const dellAnno = dati.fatture.filter((f) => f.anno === anno);
  const incassiAnno = dati.incassi.filter((i) => i.data.startsWith(`${anno}-`));
  const tutte = totaliFatture(dati.fatture, dati.incassi);
  const incassato = incassiAnno.reduce((x, i) => x + i.importo, 0);
  const emesse = dellAnno.filter((f) => f.tipo === 'fattura' && f.stato !== 'bozza').length;
  const bozze = dati.fatture.filter((f) => f.stato === 'bozza').length;
  return (
    <GrigliaKpi>
      <Kpi
        etichetta={`Incassato nel ${anno}`}
        valore={formattaEuro(incassato)}
        aiuto={{
          argomento: 'incassato',
          testo: `I soldi delle fatture ricevuti dal 1° gennaio ${anno}: è la base del reddito della partita IVA (principio di cassa).`,
        }}
      />
      <Kpi
        etichetta="Da incassare"
        valore={formattaEuro(tutte.daIncassare)}
        aiuto={{
          argomento: 'da incassare',
          testo: 'Le fatture emesse che i clienti non hanno ancora pagato del tutto.',
        }}
      />
      <Kpi
        etichetta={`Fatture ${anno}`}
        valore={String(emesse)}
        nascondi={false}
        nota={bozze > 0 ? `${bozze} ${bozze === 1 ? 'bozza' : 'bozze'} da completare` : undefined}
        aiuto={{
          argomento: 'fatture emesse',
          testo: `Quante fatture hai emesso nel ${anno}, senza contare bozze e note di credito.`,
        }}
      />
    </GrigliaKpi>
  );
}

function UltimeFatture({ dati }: { dati: Dati }) {
  const s = useStili();
  const ultime = [...dati.fatture]
    .sort((a, b) => b.data.localeCompare(a.data) || (b.numero ?? 0) - (a.numero ?? 0))
    .slice(0, 5);
  const incassatoPer = new Map<string, number>();
  for (const i of dati.incassi)
    incassatoPer.set(i.fattura_id, (incassatoPer.get(i.fattura_id) ?? 0) + i.importo);
  return (
    <section className={s.sezione} aria-labelledby="ultime-fatture">
      <div className={s.intestazioneSezione}>
        <Text id="ultime-fatture" className={s.titoloSezione}>
          Ultime fatture
        </Text>
        <Collegamento href="/fatture/">Tutte le fatture</Collegamento>
      </div>
      <ul className={s.elenco}>
        {ultime.map((f) => {
          const cliente = dati.clienti.get(f.cliente_id);
          const pagata =
            f.stato === 'emessa' && f.tipo === 'fattura' && (incassatoPer.get(f.id) ?? 0) >= f.netto;
          return (
            <li key={f.id}>
              <NextLink
                href={f.stato === 'bozza' ? `/fatture/nuova/?id=${f.id}` : `/fatture/dettaglio/?id=${f.id}`}
                className={s.fattura}
              >
                <span className={s.fatturaTesto}>
                  <Text weight="semibold" className={s.troncato}>
                    <ImportoNascosto valore={cliente ? nomeCliente(cliente) : 'Cliente'} segnaposto="••••" />
                  </Text>
                  <Text size={200}>
                    {titoloDocumento(f)} · {dataItaliana(f.data)}
                  </Text>
                </span>
                <span className={s.destra}>
                  <Text weight="semibold">
                    <ImportoNascosto valore={formattaEuro(f.totale)} />
                  </Text>
                  <Badge
                    appearance="tint"
                    color={
                      f.stato === 'bozza'
                        ? 'subtle'
                        : pagata
                          ? 'success'
                          : f.stato === 'annullata'
                            ? 'danger'
                            : 'warning'
                    }
                  >
                    {f.stato === 'emessa' && f.tipo === 'fattura'
                      ? pagata
                        ? 'Pagata'
                        : 'Da incassare'
                      : ETICHETTA_STATO[f.stato]}
                  </Badge>
                </span>
              </NextLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Azione(props: {
  href: string;
  titolo: string;
  nota: string;
  icona: ReactElement;
  primaria?: boolean;
}) {
  const s = useStili();
  return (
    <NextLink href={props.href} className={s.azione}>
      <span className={mergeClasses(s.icona, props.primaria && s.iconaPrimaria)} aria-hidden="true">
        {props.icona}
      </span>
      <span className={s.azioneTesto}>
        <Text weight="semibold">{props.titolo}</Text>
        <Text size={200} className={s.azioneNota}>
          {props.nota}
        </Text>
      </span>
    </NextLink>
  );
}
