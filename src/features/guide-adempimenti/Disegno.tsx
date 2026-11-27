'use client';

import { makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';
import type { Disegno as DatiDisegno, ModuloDisegno } from '@/engine/regole/guide-adempimenti';

/**
 * Disegni schematici dei moduli (specifica 015, US4, FR-009, research.md R-04): blocchi ridisegnati con i token di
 * Fluent, nessuna schermata dei siti ufficiali. Le caselle della guida sono evidenziate e numerate; il numero porta
 * al passo. Una colonna sui telefoni, nessuno scroll orizzontale.
 */
type Casella = { id: string; titolo: string; colonne?: string[]; largo?: boolean };

const MODULI: Record<ModuloDisegno, { titolo: string; caselle: Casella[] }> = {
  f24: {
    titolo: 'Modello F24 (schema)',
    caselle: [
      { id: 'contribuente', titolo: 'Contribuente', colonne: ['codice fiscale', 'cognome e nome', 'nascita', 'domicilio'], largo: true },
      { id: 'erario', titolo: 'Sezione Erario', colonne: ['codice tributo', 'rateazione', 'anno', 'debito', 'credito'], largo: true },
      { id: 'inps', titolo: 'Sezione INPS', colonne: ['non per ENPAP'] },
      { id: 'regioni', titolo: 'Sezione Regioni', colonne: ['codice regione', 'codice tributo', 'anno', 'debito'] },
      { id: 'locali', titolo: 'Sezione IMU e altri tributi locali', colonne: ['codice comune', 'codice tributo', 'anno', 'debito'], largo: true },
      { id: 'totali', titolo: 'Saldo finale', colonne: ['totale a debito', 'totale a credito', 'saldo'] },
      { id: 'pagamento', titolo: 'Pagamento', colonne: ['data', 'conto di addebito', 'quietanza'] },
    ],
  },
  redditi: {
    titolo: 'Modello Redditi PF (schema)',
    caselle: [
      { id: 'frontespizio', titolo: 'Frontespizio', colonne: ['dati anagrafici', 'residenza', 'familiari'], largo: true },
      { id: 'rc', titolo: 'Quadro RC', colonne: ['lavoro dipendente (dalla CU)'] },
      { id: 're', titolo: 'Quadro RE', colonne: ['compensi incassati', 'spese', 'ritenute'] },
      { id: 'rp', titolo: 'Quadro RP', colonne: ['oneri deducibili', 'spese detraibili'] },
      { id: 'rn', titolo: 'Quadro RN', colonne: ['calcolo IRPEF', 'acconti'] },
      { id: 'rv', titolo: 'Quadro RV', colonne: ['addizionale regionale', 'addizionale comunale'] },
      { id: 'invio', titolo: 'Invio', colonne: ['ricevuta telematica'] },
    ],
  },
  inizio_attivita: {
    titolo: 'Dichiarazione di inizio, variazione o cessazione attività (schema)',
    caselle: [
      { id: 'quadro_a', titolo: 'Tipo di dichiarazione', colonne: ['inizio', 'variazione', 'cessazione'], largo: true },
      { id: 'quadro_b', titolo: 'Attività', colonne: ['codice ATECO', 'descrizione', 'data di inizio'] },
      { id: 'luogo', titolo: 'Luoghi', colonne: ['dove eserciti', 'dove tieni le scritture'] },
      { id: 'regime', titolo: 'Regime', colonne: ['contabilità semplificata', 'forfettario'] },
      { id: 'firma', titolo: 'Firma e invio', colonne: ['ricevuta', 'certificato di attribuzione'] },
    ],
  },
  fattura: {
    titolo: 'Fattura elettronica (schema)',
    caselle: [
      { id: 'cedente', titolo: 'Professionista', colonne: ['partita IVA', 'regime', 'indirizzo'] },
      { id: 'cliente', titolo: 'Cliente o paziente', colonne: ['codice fiscale', 'indirizzo'] },
      { id: 'righe', titolo: 'Righe', colonne: ['descrizione', 'quantità', 'prezzo'], largo: true },
      { id: 'natura', titolo: 'Natura IVA', colonne: ['esenzione e dicitura'] },
      { id: 'cassa', titolo: 'Cassa previdenziale', colonne: ['contributo integrativo'] },
      { id: 'bollo', titolo: 'Bollo virtuale', colonne: ['sì / no', 'importo'] },
      { id: 'ritenuta', titolo: 'Ritenuta', colonne: ['solo verso sostituti'] },
      { id: 'invio', titolo: 'Totale e invio', colonne: ['totale', 'netto a pagare', 'Sistema di Interscambio'], largo: true },
    ],
  },
};

const useStili = makeStyles({
  cornice: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    minWidth: 0,
  },
  griglia: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 480px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  casella: {
    position: 'relative',
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground3,
    minWidth: 0,
    overflowWrap: 'anywhere',
    textAlign: 'left',
    font: 'inherit',
  },
  larga: { gridColumn: '1 / -1' },
  attiva: {
    border: `2px solid ${tokens.colorBrandStroke1}`,
    color: tokens.colorNeutralForeground1,
    cursor: 'pointer',
    minHeight: '44px',
    ':hover': { backgroundColor: tokens.colorBrandBackground2 },
  },
  numero: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '22px',
    height: '22px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    marginRight: tokens.spacingHorizontalXS,
  },
  colonne: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' },
  colonna: {
    fontSize: tokens.fontSizeBase100,
    border: `1px solid ${tokens.colorNeutralStroke3}`,
    borderRadius: tokens.borderRadiusSmall,
    padding: '0 4px',
  },
});

export function Disegno({ disegno, idGuida }: { disegno: DatiDisegno; idGuida: string }) {
  const s = useStili();
  const modulo = MODULI[disegno.modulo];
  const vai = (n: number) => {
    const el = document.getElementById(`passo-${idGuida}-${n}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
  };
  return (
    <figure className={s.cornice} aria-label={modulo.titolo} style={{ margin: 0 }}>
      <Text size={200} weight="semibold">
        {modulo.titolo}
      </Text>
      <div className={s.griglia}>
        {modulo.caselle.map((c) => {
          const n = disegno.caselle[c.id];
          const contenuto = (
            <>
              <Text size={200} weight={n ? 'semibold' : 'regular'}>
                {n ? <span className={s.numero}>{n}</span> : null}
                {c.titolo}
              </Text>
              {c.colonne ? (
                <span className={s.colonne}>
                  {c.colonne.map((x) => (
                    <span key={x} className={s.colonna}>
                      {x}
                    </span>
                  ))}
                </span>
              ) : null}
            </>
          );
          return n ? (
            <button
              key={c.id}
              type="button"
              className={mergeClasses(s.casella, s.attiva, c.largo && s.larga)}
              onClick={() => vai(n)}
              aria-label={`${c.titolo}: vai al passo ${n}`}
            >
              {contenuto}
            </button>
          ) : (
            <div key={c.id} className={mergeClasses(s.casella, c.largo && s.larga)}>
              {contenuto}
            </div>
          );
        })}
      </div>
      <Text size={100}>Schema ridisegnato da Fiscal: tocca un numero per andare al passo.</Text>
    </figure>
  );
}
