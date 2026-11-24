'use client';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  mergeClasses,
  Text,
  tokens,
} from '@fluentui/react-components';
import { CalendarLtr24Regular, ChevronRight20Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { useState } from 'react';

/**
 * Calendario fiscale (specifica 013): un disegno informativo che si apre come layer sopra a tutto dalla home.
 * Mostra il flusso di controlli, adempimenti e scadenze dal 2027 fino al regime, per l'assetto dell'utente
 * (psicologo ENPAP, regime ordinario, dipendente in cumulo). È solo informativo: nessun dato, nessun calcolo,
 * nessuna cifra dell'utente. Le date 2028 valgono salvo proroghe; il punto ENPAP del primo anno è da verificare.
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

  intro: { color: tokens.colorNeutralForeground3, margin: `0 0 ${tokens.spacingVerticalL}` },
  profilo: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS, marginBottom: tokens.spacingVerticalL },
  tag: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusCircular,
    padding: `2px ${tokens.spacingHorizontalS}`,
  },

  legenda: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
  },
  voceLegenda: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 },
  quadrato: { width: '11px', height: '11px', borderRadius: '3px', flexShrink: 0 },
  qOk: { backgroundColor: tokens.colorPaletteGreenForeground1 },
  qDue: { backgroundColor: tokens.colorPaletteDarkOrangeForeground1 },
  qChk: { backgroundColor: tokens.colorBrandForeground1 },
  qVer: { border: `1.5px dashed ${tokens.colorNeutralForeground3}` },

  // Spina temporale verticale
  spina: {
    position: 'relative',
    paddingLeft: '28px',
    '::before': {
      content: '""',
      position: 'absolute',
      left: '6px',
      top: '6px',
      bottom: '30px',
      width: '2px',
      backgroundColor: tokens.colorNeutralStroke2,
      borderRadius: '2px',
    },
  },
  tappa: { position: 'relative', paddingBottom: tokens.spacingVerticalL },
  nodo: {
    position: 'absolute',
    left: '-28px',
    top: '2px',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `2px solid ${tokens.colorBrandForeground1}`,
    zIndex: 1,
  },
  nodoAnno: { backgroundColor: tokens.colorBrandForeground1, boxShadow: `0 0 0 4px ${tokens.colorBrandBackground2}` },
  periodo: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase300 },
  periodoNota: { display: 'block', fontWeight: tokens.fontWeightRegular, fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },

  carte: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, marginTop: tokens.spacingVerticalS },
  carta: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    boxShadow: tokens.shadow4,
  },
  cartaOk: { borderLeft: `3px solid ${tokens.colorPaletteGreenForeground1}` },
  titoloCarta: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase300, display: 'block' },
  testoCarta: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200, display: 'block', marginTop: '2px' },
  come: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2, display: 'block', marginTop: tokens.spacingVerticalXS },
  testa: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },

  etichetta: { display: 'inline-flex', alignItems: 'center', fontSize: tokens.fontSizeBase100, fontWeight: tokens.fontWeightSemibold, padding: `2px ${tokens.spacingHorizontalS}`, borderRadius: tokens.borderRadiusCircular },
  etOk: { backgroundColor: tokens.colorPaletteGreenBackground2, color: tokens.colorPaletteGreenForeground1 },
  etVer: { color: tokens.colorNeutralForeground3, border: `1px dashed ${tokens.colorNeutralForeground3}` },

  // Decisione a rami
  decisione: { border: `1px dashed ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorNeutralBackground2 },
  domanda: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase300, display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  segnoD: { display: 'grid', placeItems: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: tokens.colorBrandForeground1, color: tokens.colorNeutralBackground1, fontSize: tokens.fontSizeBase100, fontWeight: tokens.fontWeightBold, flexShrink: 0 },
  rami: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalM, '@media (max-width: 480px)': { gridTemplateColumns: '1fr' } },
  ramo: { backgroundColor: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: tokens.borderRadiusMedium, padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`, minWidth: 0 },
  ramoTit: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase200, display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, marginBottom: '2px', '::before': { content: '"→"', color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightBold } },
  ramoTesto: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },

  // Scadenze
  cartaDue: {
    backgroundColor: tokens.colorPaletteDarkOrangeBackground2,
    border: `1px solid ${tokens.colorPaletteDarkOrangeBorderActive}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    boxShadow: tokens.shadow4,
  },
  f24: { display: 'inline-block', fontSize: tokens.fontSizeBase100, letterSpacing: '0.06em', textTransform: 'uppercase', color: tokens.colorPaletteDarkOrangeForeground1, border: `1px solid ${tokens.colorPaletteDarkOrangeBorderActive}`, borderRadius: tokens.borderRadiusSmall, padding: '2px 7px', fontWeight: tokens.fontWeightSemibold, marginBottom: tokens.spacingVerticalS },
  data: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorPaletteDarkOrangeForeground1, fontSize: tokens.fontSizeBase400, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  elenco: { margin: `${tokens.spacingVerticalS} 0 0`, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  vociDue: { fontSize: tokens.fontSizeBase200, paddingLeft: '16px', position: 'relative', '::before': { content: '""', position: 'absolute', left: '2px', top: '0.55em', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tokens.colorPaletteDarkOrangeForeground1 } },

  nota: { backgroundColor: tokens.colorNeutralBackground3, border: `1px dashed ${tokens.colorNeutralForeground3}`, borderRadius: tokens.borderRadiusLarge, padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}` },
  notaTit: { fontWeight: tokens.fontWeightSemibold, display: 'block' },
  notaTesto: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2, display: 'block', marginTop: '2px' },

  cartaLoop: { border: `1px solid ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorBrandBackground2 },
  ripeti: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, fontSize: tokens.fontSizeBase200, color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, marginTop: tokens.spacingVerticalS },

  freccia: { display: 'block', textAlign: 'center', color: tokens.colorNeutralStroke2, fontSize: tokens.fontSizeBase400, lineHeight: 1, margin: `-10px 0 2px -28px` },

  piede: { marginTop: tokens.spacingVerticalL, paddingTop: tokens.spacingVerticalM, borderTop: `1px solid ${tokens.colorNeutralStroke2}`, color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

function Diagramma() {
  const s = useStili();
  return (
    <div>
      <p className={s.intro}>
        Dalla prima fattura al primo F24. Come scorrono controlli, contributi e scadenze dal giorno in cui apri la
        partita IVA fino al regime a pieno ritmo.
      </p>
      <div className={s.profilo}>
        <span className={s.tag}>Psicologo · regime ordinario</span>
        <span className={s.tag}>ENPAP</span>
        <span className={s.tag}>Dipendente in cumulo</span>
        <span className={s.tag}>P.IVA da gennaio 2027</span>
      </div>

      <div className={s.legenda} aria-label="Legenda">
        <span className={s.voceLegenda}><i className={mergeClasses(s.quadrato, s.qOk)} /> Incassi e accantonamento</span>
        <span className={s.voceLegenda}><i className={mergeClasses(s.quadrato, s.qDue)} /> Scadenze e versamenti</span>
        <span className={s.voceLegenda}><i className={mergeClasses(s.quadrato, s.qChk)} /> Controlli e scelte</span>
        <span className={s.voceLegenda}><i className={mergeClasses(s.quadrato, s.qVer)} /> Da verificare</span>
      </div>

      <div className={s.spina}>
        {/* Fase 1 */}
        <div className={s.tappa}>
          <span className={mergeClasses(s.nodo, s.nodoAnno)} />
          <div className={s.periodo}>Gennaio 2027<span className={s.periodoNota}>Si parte</span></div>
          <div className={s.carte}>
            <div className={mergeClasses(s.carta, s.cartaOk)}>
              <span className={s.titoloCarta}>Apertura della partita IVA</span>
              <span className={s.testoCarta}>
                Attività di psicologo, regime ordinario, iscrizione ENPAP. Resti dipendente in parallelo: i due redditi
                si sommeranno in dichiarazione (cumulo).
              </span>
            </div>
          </div>
        </div>
        <span className={s.freccia} aria-hidden>↓</span>

        {/* Fase 2 */}
        <div className={s.tappa}>
          <span className={s.nodo} />
          <div className={s.periodo}>Tutto il 2027<span className={s.periodoNota}>Durante l&apos;anno, a ogni fattura</span></div>
          <div className={s.carte}>
            <div className={mergeClasses(s.carta, s.decisione)}>
              <div className={s.domanda}><span className={s.segnoD}>?</span> Che prestazione stai fatturando?</div>
              <div className={s.rami}>
                <div className={s.ramo}>
                  <div className={s.ramoTit}>Sanitaria</div>
                  <div className={s.ramoTesto}>Psicoterapia: esente IVA, bollo 2&nbsp;€ oltre 77,47&nbsp;€, va al Sistema Tessera Sanitaria.</div>
                </div>
                <div className={s.ramo}>
                  <div className={s.ramoTit}>Non sanitaria</div>
                  <div className={s.ramoTesto}>Consulenza, formazione, docenza: IVA 22%, fattura verso enti/aziende allo SDI.</div>
                </div>
              </div>
            </div>

            <div className={mergeClasses(s.carta, s.cartaOk)}>
              <div className={s.testa}>
                <span className={s.titoloCarta}>Incassi, e metti da parte</span>
                <span className={mergeClasses(s.etichetta, s.etOk)}>Salvadanaio</span>
              </div>
              <span className={s.testoCarta}>Conti per cassa: conta quando incassi, non quando emetti.</span>
              <span className={s.come}>A ogni incasso Fiscal ti dice quanto accantonare per IRPEF, addizionali ed ENPAP, così a giugno 2028 i soldi ci sono già.</span>
            </div>

            <div className={mergeClasses(s.carta, s.decisione)}>
              <div className={s.domanda}><span className={s.segnoD}>?</span> Hai emesso fatture con IVA?</div>
              <div className={s.rami}>
                <div className={s.ramo}>
                  <div className={s.ramoTit}>Solo esenti</div>
                  <div className={s.ramoTesto}>Nessuna liquidazione IVA periodica.</div>
                </div>
                <div className={s.ramo}>
                  <div className={s.ramoTit}>Anche imponibili</div>
                  <div className={s.ramoTesto}>Liquidazioni IVA periodiche e pro-rata di detraibilità.</div>
                </div>
              </div>
            </div>

            <div className={s.carta}>
              <div className={s.testa}>
                <span className={s.titoloCarta}>Contributi ENPAP</span>
                <span className={mergeClasses(s.etichetta, s.etVer)}>Da verificare</span>
              </div>
              <span className={s.testoCarta}>Possibile contributo minimo o agevolazioni per i nuovi iscritti già nel 2027. L&apos;integrativo (2%, poi 4%) lo incassi in fattura e lo giri all&apos;ENPAP.</span>
              <span className={s.come}>È l&apos;unico punto ancora aperto del primo anno: da confermare con l&apos;ENPAP.</span>
            </div>

            <div className={s.carta}>
              <span className={s.titoloCarta}>Ritenute d&apos;acconto subite</span>
              <span className={s.testoCarta}>Verso enti e aziende il cliente trattiene il 20% e lo versa per te: diventa un credito da scomputare in dichiarazione. Verso i pazienti privati non c&apos;è ritenuta.</span>
            </div>

            <div className={s.nota}>
              <span className={s.notaTit}>Niente acconti nel 2027.</span>
              <span className={s.notaTesto}>Primo anno di professione: non esiste uno storico su cui calcolare gli acconti. Quindi nel 2027 non versi IRPEF né addizionali sulla professione. Il tuo lavoro qui è registrare e accantonare.</span>
            </div>
          </div>
        </div>
        <span className={s.freccia} aria-hidden>↓</span>

        {/* Fase 3 */}
        <div className={s.tappa}>
          <span className={mergeClasses(s.nodo, s.nodoAnno)} />
          <div className={s.periodo}>Inizio 2028<span className={s.periodoNota}>Si tirano le somme del 2027</span></div>
          <div className={s.carte}>
            <div className={s.carta}>
              <span className={s.titoloCarta}>Arriva la CU 2028</span>
              <span className={s.testoCarta}>Certifica il tuo reddito da dipendente del 2027. È il pezzo che mancava: ora il cumulo dipendente + professione si può chiudere.</span>
            </div>
            <div className={s.carta}>
              <span className={s.titoloCarta}>Comunicazione reddituale ENPAP</span>
              <span className={s.testoCarta}>Dichiari all&apos;ENPAP il reddito professionale 2027: da qui nascono saldo e acconti dei contributi.</span>
            </div>
          </div>
        </div>
        <span className={s.freccia} aria-hidden>↓</span>

        {/* Fase 4 */}
        <div className={s.tappa}>
          <span className={s.nodo} />
          <div className={s.periodo}>2028<span className={s.periodoNota}>I versamenti veri</span></div>
          <div className={s.carte}>
            <div className={s.cartaDue}>
              <span className={s.f24}>F24 · Modello Redditi PF 2028</span>
              <div className={s.data}>📅 30 giugno 2028</div>
              <ul className={s.elenco}>
                <li className={s.vociDue}>Saldo IRPEF 2027 + saldo addizionale regionale e comunale</li>
                <li className={s.vociDue}>1º acconto IRPEF 2028</li>
                <li className={s.vociDue}>Saldo ENPAP 2027 + 1º acconto 2028</li>
              </ul>
            </div>
            <div className={s.cartaDue}>
              <span className={s.f24}>F24</span>
              <div className={s.data}>📅 30 novembre 2028</div>
              <ul className={s.elenco}>
                <li className={s.vociDue}>2º acconto IRPEF 2028</li>
                <li className={s.vociDue}>2º acconto ENPAP 2028</li>
              </ul>
            </div>
          </div>
        </div>
        <span className={s.freccia} aria-hidden>↻</span>

        {/* Fase 5 */}
        <div className={s.tappa}>
          <span className={mergeClasses(s.nodo, s.nodoAnno)} />
          <div className={s.periodo}>Dal 2028 in poi<span className={s.periodoNota}>A regime</span></div>
          <div className={s.carte}>
            <div className={mergeClasses(s.carta, s.cartaLoop)}>
              <span className={s.titoloCarta}>Ogni anno lo stesso ritmo</span>
              <span className={s.testoCarta}>Giugno: saldo dell&apos;anno prima + 1º acconto. Novembre: 2º acconto. In mezzo, se fatturi con IVA, le liquidazioni periodiche.</span>
              <span className={s.ripeti}>↺ Si ripete, e il Salvadanaio riempie mese per mese</span>
            </div>
          </div>
        </div>
      </div>

      <div className={s.piede}>
        <b>Come leggerlo:</b> è la rotta tipica per il tuo assetto, non un calcolo sui tuoi importi. Le cifre esatte le
        fa Fiscal con i tuoi dati. Le date 2028 valgono salvo proroghe; il punto ENPAP del primo anno è da confermare con
        l&apos;ente.
      </div>
    </div>
  );
}

/** Pulsante sulla home che apre il calendario come layer sopra a tutto. */
export function CalendarioFiscale() {
  const s = useStili();
  const [aperto, setAperto] = useState(false);
  return (
    <>
      <Button
        appearance="outline"
        className={s.trigger}
        icon={<CalendarLtr24Regular />}
        onClick={() => setAperto(true)}
      >
        <span className={s.triggerTesto}>
          <Text weight="semibold">Calendario fiscale</Text>
          <span className={s.triggerNota}>Come funzionano scadenze e adempimenti dal 2027</span>
        </span>
        <ChevronRight20Regular className={s.triggerFine} />
      </Button>

      <Dialog open={aperto} onOpenChange={(_, d) => setAperto(d.open)}>
        <DialogSurface className={s.surface}>
          <DialogBody>
            <DialogTitle
              action={
                <Button appearance="subtle" aria-label="Chiudi" icon={<Dismiss24Regular />} onClick={() => setAperto(false)} />
              }
            >
              Calendario fiscale 2027
            </DialogTitle>
            <DialogContent className={s.content}>
              <Diagramma />
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}
