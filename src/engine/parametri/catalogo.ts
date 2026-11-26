import { CHIAVI_F24, baseF24, type RegoleF24, type VoceF24 } from '../regole/f24/base';
import type { RegoleIrpef } from '../regole/irpef/tipi';
import { scadenzeBase } from '../regole/scadenze/base';
import { BENI, CATEGORIE, ONERI } from '../regole/spese/comuni';
import type { RegoleSpese } from '../regole/spese/tipi';
import type { Regola } from '../regole/tipi';
import type { RegoleFatturazione } from '../regole/tipi';
import type { Area, Convertitore, Decorrenza, FonteUfficiale, Insieme, ParametroCatalogo } from './tipi';
import {
  codice,
  elenco,
  euro,
  euroOpzionale,
  intero,
  mese,
  meseGiorno,
  oggetto,
  percentuale,
  scaglioni,
  siNo,
} from './unita';

/**
 * Catalogo dei parametri aggiornabili da file (specifica 014, FR-001..FR-003, data-model.md `ParametroCatalogo`).
 * Ogni voce dice dove sta il valore nel set di regole per anno, in che unità va scritto nel file, come vale
 * (per anno d'imposta o dalla data dell'operazione), i limiti di plausibilità e dove cercarlo. I parametri che
 * non sono qui non si aggiornano da file: quelli esclusi di proposito sono in `NON_AGGIORNABILI` con il motivo.
 */

// ---------------------------------------------------------------------------------------------------------
// Fonti ufficiali
// ---------------------------------------------------------------------------------------------------------

const GU: FonteUfficiale = { nome: 'Gazzetta Ufficiale', url: 'https://www.gazzettaufficiale.it/' };
const NORMATTIVA: FonteUfficiale = { nome: 'Normattiva', url: 'https://www.normattiva.it/' };
const ADE: FonteUfficiale = { nome: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/' };
const ADE_REDDITI: FonteUfficiale = {
  nome: 'Agenzia delle Entrate: istruzioni Modello Redditi PF',
  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/redditi-persone-fisiche',
};
const ADE_CU: FonteUfficiale = {
  nome: 'Agenzia delle Entrate: istruzioni Certificazione Unica',
  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/certificazione-unica',
};
const ADE_CODICI: FonteUfficiale = {
  nome: 'Agenzia delle Entrate: codici tributo F24',
  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/schede/pagamenti/f24',
};
const FINANZE_ADD: FonteUfficiale = {
  nome: 'Dipartimento delle Finanze: addizionali regionali e comunali',
  url: 'https://www1.finanze.gov.it/finanze/pagina_dichiarazioni/public/dichiarazioni.php',
};
const ENPAP: FonteUfficiale = { nome: 'ENPAP (delibere, regolamento, comunicazioni)', url: 'https://www.enpap.it/' };
const FATTURAPA: FonteUfficiale = { nome: 'FatturaPA', url: 'https://www.fatturapa.gov.it/' };
const STS: FonteUfficiale = { nome: 'Sistema Tessera Sanitaria', url: 'https://sistemats1.sanita.finanze.it/' };

/**
 * Domini ufficiali: una voce può essere «verificata» solo con una fonte su questi siti (o loro sottodomini),
 * più i domini di regione e comune indicati dall'utente (research.md R-06).
 */
export const DOMINI_UFFICIALI = [
  'gazzettaufficiale.it',
  'normattiva.it',
  'agenziaentrate.gov.it',
  'finanze.gov.it',
  'mef.gov.it',
  'enpap.it',
  'inps.it',
  'sanita.finanze.it',
  'sistemats.it',
  'fatturapa.gov.it',
  'governo.it',
  'senato.it',
  'camera.it',
];

// ---------------------------------------------------------------------------------------------------------
// Aiuti per leggere e scrivere i valori nei set
// ---------------------------------------------------------------------------------------------------------

type Rec = Record<string, unknown>;

const prendi = (o: unknown, percorso: string[]): unknown =>
  percorso.reduce<unknown>((x, k) => (x && typeof x === 'object' ? (x as Rec)[k] : undefined), o);

function metti(o: unknown, percorso: string[], valore: unknown): unknown {
  const [k, ...resto] = percorso;
  const base = (o ?? {}) as Rec;
  return { ...base, [k!]: resto.length ? metti(base[k!], resto, valore) : valore };
}

/** Parametro che è già una `Regola<T>` a un percorso fisso del set. */
function regolaA<T>(percorso: string): Pick<ParametroCatalogo<T>, 'percorso' | 'leggi' | 'applica'> {
  const p = percorso.split('.');
  return {
    percorso,
    leggi: (set) => prendi(set, p) as Regola<T> | undefined,
    applica: (set, regola) => metti(set, p, regola),
  };
}

type Base = Omit<ParametroCatalogo<unknown>, 'conv' | 'leggi' | 'applica' | 'percorso'>;

function voce<T>(
  b: Omit<Base, 'insieme' | 'area' | 'decorrenza' | 'fonti'> & {
    insieme: Insieme;
    area: Area;
    decorrenza: Decorrenza;
    fonti: FonteUfficiale[];
  },
  conv: Convertitore<T>,
  accesso: Pick<ParametroCatalogo<T>, 'percorso' | 'leggi' | 'applica'>,
): ParametroCatalogo {
  return { ...b, conv, ...accesso } as ParametroCatalogo;
}

const sogliaCrescenti = (...v: number[]) => v.every((x, i) => i === 0 || x > v[i - 1]!);

// ---------------------------------------------------------------------------------------------------------
// IRPEF, acconti, ENPAP (set `RegoleIrpef`, per anno d'imposta)
// ---------------------------------------------------------------------------------------------------------

const irpef = (
  chiave: string,
  area: Area,
  nome: string,
  spiegazione: string,
  fonti: FonteUfficiale[],
  conv: Convertitore<unknown>,
  percorso: string,
) => voce({ chiave, area, insieme: 'irpef', decorrenza: 'anno', nome, spiegazione, fonti }, conv, regolaA(percorso));

const CATALOGO_IRPEF: ParametroCatalogo[] = [
  irpef(
    'irpef.scaglioni',
    'irpef',
    'Scaglioni e aliquote IRPEF',
    "Le fasce di reddito e la percentuale di imposta di ciascuna: si paga ogni aliquota solo sulla parte di reddito nella sua fascia.",
    [GU, NORMATTIVA, ADE_REDDITI],
    scaglioni(5, 60),
    'scaglioni',
  ),
  irpef(
    'irpef.detrazione_lavoro',
    'irpef',
    'Detrazione per lavoro dipendente',
    'Lo sconto sull\'IRPEF per chi ha uno stipendio: diminuisce man mano che il reddito complessivo sale.',
    [NORMATTIVA, ADE_CU, ADE_REDDITI],
    oggetto(
      {
        importoFisso: ['importo_fisso', euro(0, 5_000)],
        primaSoglia: ['prima_soglia', euro(1_000, 100_000)],
        base: ['base', euro(0, 5_000)],
        aggiunta: ['aggiunta', euro(0, 5_000)],
        secondaSoglia: ['seconda_soglia', euro(1_000, 200_000)],
        terzaSoglia: ['terza_soglia', euro(1_000, 300_000)],
        maggiorazione: [
          'maggiorazione',
          oggetto({
            importo: ['importo', euro(0, 1_000)],
            oltre: ['oltre', euro(0, 200_000)],
            finoA: ['fino_a', euro(0, 200_000)],
          }),
        ],
      },
      (v) =>
        sogliaCrescenti(v.primaSoglia, v.secondaSoglia, v.terzaSoglia) && v.maggiorazione.oltre < v.maggiorazione.finoA
          ? null
          : 'le soglie devono essere crescenti',
    ),
    'detrazioneLavoro',
  ),
  irpef(
    'irpef.ulteriore_detrazione',
    'irpef',
    'Ulteriore detrazione per i dipendenti',
    'Detrazione in più per i redditi medi da lavoro dipendente (taglio del cuneo fiscale).',
    [GU, NORMATTIVA, ADE_CU],
    oggetto(
      {
        importo: ['importo', euro(0, 5_000)],
        oltre: ['oltre', euro(0, 100_000)],
        pienaFinoA: ['piena_fino_a', euro(0, 200_000)],
        azzeraA: ['azzera_a', euro(0, 300_000)],
      },
      (v) => (sogliaCrescenti(v.oltre, v.pienaFinoA, v.azzeraA) ? null : 'le soglie devono essere crescenti'),
    ),
    'ulterioreDetrazione',
  ),
  irpef(
    'irpef.acconti',
    'acconti',
    'Acconti IRPEF e addizionale comunale',
    'Quanto si anticipa sulle tasse dell\'anno dopo, sotto quali importi non si paga e come si divide tra giugno e novembre.',
    [ADE_REDDITI, NORMATTIVA],
    oggetto({
      percentuale: ['percentuale', percentuale(50, 100)],
      sogliaNonDovuto: ['soglia_non_dovuto', euro(0, 1_000)],
      sogliaUnicaSoluzione: ['soglia_unica_soluzione', euro(0, 5_000)],
      primaRata: ['prima_rata', oggetto({ nonIsa: ['non_isa', percentuale(0, 100)], isa: ['isa', percentuale(0, 100)] })],
      addizionaleComunale: ['addizionale_comunale', percentuale(0, 100)],
      mesePrimo: ['mese_primo', mese()],
      meseSecondo: ['mese_secondo', mese()],
      conScaglioniPrecedenti: ['con_scaglioni_precedenti', siNo],
    }),
    'acconti',
  ),
  irpef(
    'irpef.rateizzazione',
    'acconti',
    'Rateizzazione di saldo e primo acconto',
    'In quante rate mensili si possono dividere saldo e primo acconto e gli interessi di ciascuna rata.',
    [NORMATTIVA, ADE_REDDITI],
    oggetto(
      {
        maxRate: ['max_rate', intero(1, 12, 'numero massimo di rate')],
        interessiPerRata: ['interessi_per_rata', elenco(percentuale(0, 10), 1, 12)],
      },
      (v) => (v.interessiPerRata.length === v.maxRate ? null : 'servono gli interessi di ogni rata (uno per rata)'),
    ),
    'rateizzazione',
  ),
  irpef(
    'irpef.differimento',
    'acconti',
    'Pagamento nei 30 giorni dopo la scadenza',
    'La maggiorazione per chi paga saldo e primo acconto nei giorni dopo la scadenza di giugno.',
    [NORMATTIVA, ADE_REDDITI],
    oggetto({
      maggiorazione: ['maggiorazione', percentuale(0, 5)],
      giorni: ['giorni', intero(1, 120, 'giorni di differimento')],
    }),
    'differimento',
  ),
  irpef(
    'enpap.aliquota_soggettivo',
    'enpap',
    'Contributo soggettivo ENPAP',
    'La percentuale del reddito professionale che versi a ENPAP per la tua pensione.',
    [ENPAP],
    percentuale(5, 40),
    'enpap.aliquotaSoggettivo',
  ),
  irpef(
    'enpap.minimo_soggettivo',
    'enpap',
    'Minimo del contributo soggettivo ENPAP',
    'Il contributo soggettivo che si paga comunque, anche con redditi bassi.',
    [ENPAP],
    euroOpzionale(0, 5_000),
    'enpap.minimoSoggettivo',
  ),
  irpef(
    'enpap.minimo_integrativo',
    'enpap',
    'Minimo del contributo integrativo ENPAP',
    'Il contributo integrativo che si paga comunque, anche se in fattura se n\'è addebitato meno.',
    [ENPAP],
    euroOpzionale(0, 2_000),
    'enpap.minimoIntegrativo',
  ),
  irpef(
    'enpap.maternita',
    'enpap',
    'Contributo di maternità ENPAP',
    'Il contributo fisso annuo per la tutela della maternità.',
    [ENPAP],
    euroOpzionale(0, 1_000),
    'enpap.maternita',
  ),
  irpef(
    'enpap.scadenza_saldo',
    'enpap',
    'Scadenza del saldo ENPAP',
    'Il giorno dell\'anno dopo entro cui si paga il saldo dei contributi ENPAP.',
    [ENPAP],
    meseGiorno,
    'enpap.scadenzaSaldo',
  ),
];

// ---------------------------------------------------------------------------------------------------------
// Fatturazione (set `RegoleFatturazione`, dalla data della fattura)
// ---------------------------------------------------------------------------------------------------------

const fattura = (chiave: string, nome: string, spiegazione: string, fonti: FonteUfficiale[], conv: Convertitore<unknown>, percorso: string) =>
  voce({ chiave, area: 'fatturazione', insieme: 'fatturazione', decorrenza: 'data', nome, spiegazione, fonti }, conv, regolaA(percorso));

const CATALOGO_FATTURAZIONE: ParametroCatalogo[] = [
  fattura(
    'fattura.aliquota_integrativo',
    'Contributo integrativo ENPAP in fattura',
    'La percentuale che aggiungi in fattura per ENPAP (la paga il paziente o il cliente).',
    [ENPAP],
    percentuale(0, 10),
    'aliquotaIntegrativo',
  ),
  fattura(
    'fattura.aliquota_iva',
    'Aliquota IVA ordinaria',
    'L\'IVA sulle prestazioni non sanitarie (quelle sanitarie sono esenti).',
    [NORMATTIVA, ADE],
    percentuale(4, 30),
    'aliquotaIva',
  ),
  fattura(
    'fattura.soglia_bollo',
    'Soglia del bollo',
    'Sopra questo importo le fatture esenti da IVA pagano il bollo.',
    [NORMATTIVA, ADE],
    euro(10, 1_000),
    'sogliaBollo',
  ),
  fattura(
    'fattura.importo_bollo',
    'Importo del bollo',
    'Quanto costa il bollo sulle fatture esenti sopra la soglia.',
    [NORMATTIVA, ADE],
    euro(0.5, 20),
    'importoBollo',
  ),
  fattura(
    'fattura.aliquota_ritenuta',
    'Ritenuta d\'acconto',
    'La percentuale che un\'azienda o un ente trattiene dalla tua fattura e versa allo Stato per te.',
    [NORMATTIVA, ADE],
    percentuale(5, 40),
    'aliquotaRitenuta',
  ),
];

// ---------------------------------------------------------------------------------------------------------
// Spese e oneri (set `RegoleSpese`, per anno d'imposta)
// ---------------------------------------------------------------------------------------------------------

const FONTI_SPESE = [NORMATTIVA, ADE, ADE_REDDITI];

type ElementoConCodice = { codice: string; regola: Regola<true> };

/**
 * Campo numerico di un elemento di un elenco con `codice` (categorie, oneri, beni). Il valore non è una
 * `Regola`: fonte e stato si leggono e si scrivono sulla `regola` dell'elemento.
 */
function campoElenco<T>(elencoNome: string, codiceEl: string, campo: string): Pick<ParametroCatalogo<T>, 'percorso' | 'leggi' | 'applica'> {
  const p = elencoNome.split('.');
  return {
    percorso: `${elencoNome}[${codiceEl}].${campo}`,
    leggi: (set) => {
      const el = (prendi(set, p) as (ElementoConCodice & Rec)[] | undefined)?.find((e) => e.codice === codiceEl);
      if (!el || el[campo] === undefined) return undefined;
      return { valore: el[campo] as T, fonte: el.regola.fonte, stato: el.regola.stato };
    },
    applica: (set, regola) => {
      const lista = prendi(set, p) as (ElementoConCodice & Rec)[];
      const nuova = lista.map((e) =>
        e.codice === codiceEl ? { ...e, [campo]: regola.valore, regola: { valore: true, fonte: regola.fonte, stato: regola.stato } } : e,
      );
      return metti(set, p, nuova);
    },
  };
}

const spesa = (chiave: string, nome: string, spiegazione: string, conv: Convertitore<unknown>, accesso: Pick<ParametroCatalogo<unknown>, 'percorso' | 'leggi' | 'applica'>) =>
  voce({ chiave, area: 'spese', insieme: 'spese', decorrenza: 'anno', nome, spiegazione, fonti: FONTI_SPESE }, conv, accesso);

const CATALOGO_SPESE: ParametroCatalogo[] = [
  ...CATEGORIE.flatMap((c) => [
    spesa(
      `spese.categoria.${c.codice}.percentuale`,
      `${c.nome}: quota deducibile`,
      `Quanta parte della spesa «${c.nome.toLowerCase()}» abbassa il reddito professionale.`,
      percentuale(0, 100),
      campoElenco('categorie', c.codice, 'percentuale'),
    ),
    ...(c.tettoSuCompensi !== undefined
      ? [
          spesa(
            `spese.categoria.${c.codice}.tetto_su_compensi`,
            `${c.nome}: tetto sui compensi`,
            'Il massimo deducibile come percentuale dei compensi incassati nell\'anno.',
            percentuale(0, 10),
            campoElenco('categorie', c.codice, 'tettoSuCompensi'),
          ),
        ]
      : []),
    ...(c.tettoAnnuo !== undefined
      ? [
          spesa(
            `spese.categoria.${c.codice}.tetto_annuo`,
            `${c.nome}: tetto annuo`,
            'Il massimo deducibile in un anno.',
            euro(0, 1_000_000),
            campoElenco('categorie', c.codice, 'tettoAnnuo'),
          ),
        ]
      : []),
  ]),
  ...ONERI.flatMap((o) => {
    const campi: [string, string, string, Convertitore<unknown>][] = [];
    if (o.aliquota !== undefined) campi.push(['aliquota', 'aliquota', 'La percentuale della spesa che torna come sconto sull\'IRPEF.', percentuale(0, 100)]);
    if (o.franchigia !== undefined) campi.push(['franchigia', 'franchigia', 'La parte di spesa sotto cui non spetta nulla.', euro(0, 10_000)]);
    if (o.limite !== undefined) campi.push(['limite', 'limite', 'La spesa massima agevolabile in un anno.', euro(0, 1_000_000)]);
    if (o.limiteSuReddito !== undefined)
      campi.push(['limiteSuReddito', 'limite_su_reddito', 'Il massimo agevolabile come percentuale del reddito complessivo.', percentuale(0, 100)]);
    if (o.aliquotaMassimaVolontaria !== undefined)
      campi.push([
        'aliquotaMassimaVolontaria',
        'aliquota_massima_volontaria',
        'La percentuale massima del reddito professionale che puoi versare a ENPAP, contributo obbligatorio compreso.',
        percentuale(0, 100),
      ]);
    return campi.map(([campo, nomeFile, spieg, conv]) =>
      spesa(`spese.onere.${o.codice}.${nomeFile}`, `${o.nome}: ${nomeFile.replace(/_/g, ' ')}`, spieg, conv, campoElenco('oneri', o.codice, campo)),
    );
  }),
  spesa(
    'spese.beni.soglia_immediata',
    'Beni: soglia della deduzione immediata',
    'I beni che costano fino a questo importo si deducono tutti nell\'anno dell\'acquisto.',
    euro(0, 10_000),
    regolaA('beni.sogliaImmediata'),
  ),
  ...BENI.categorie.map((b) =>
    spesa(
      `spese.bene.${b.codice}.coefficiente`,
      `${b.nome}: quota di ammortamento`,
      'La percentuale del costo che si deduce ogni anno.',
      percentuale(1, 100),
      campoElenco('beni.categorie', b.codice, 'coefficiente'),
    ),
  ),
];

// ---------------------------------------------------------------------------------------------------------
// Scadenze (anno solare) e codici tributo F24 (dalla data del versamento)
// ---------------------------------------------------------------------------------------------------------

type SetScadenze = { anno: number; scadenze: Regola<{ chiave: string; data: string }>[] };

function dataScadenza(chiaveScad: string): Pick<ParametroCatalogo<string>, 'percorso' | 'leggi' | 'applica'> {
  return {
    percorso: `scadenze[${chiaveScad}]`,
    leggi: (set) => {
      const r = (set as SetScadenze).scadenze.find((s) => s.valore.chiave === chiaveScad);
      return r ? { valore: r.valore.data, fonte: r.fonte, stato: r.stato } : undefined;
    },
    applica: (set, regola) => {
      const s = set as SetScadenze;
      return {
        ...s,
        scadenze: s.scadenze.map((r) =>
          r.valore.chiave === chiaveScad ? { valore: { ...r.valore, data: regola.valore }, fonte: regola.fonte, stato: regola.stato } : r,
        ),
      };
    },
  };
}

const CATALOGO_SCADENZE: ParametroCatalogo[] = scadenzeBase().map((s) =>
  voce(
    {
      chiave: `scadenze.${s.valore.chiave}.data`,
      area: 'scadenze',
      insieme: 'scadenze',
      decorrenza: 'anno_solare',
      nome: `Scadenza: ${s.valore.titolo}`,
      spiegazione: `Il giorno dell'anno della scadenza «${s.valore.titolo.toLowerCase()}» (una proroga lo sposta).`,
      fonti: s.valore.categoria === 'sts' ? [STS, ADE] : s.valore.categoria === 'enpap' ? [ENPAP] : [ADE, GU],
    },
    meseGiorno,
    dataScadenza(s.valore.chiave),
  ),
);

function codiceF24(chiave: string): Pick<ParametroCatalogo<string>, 'percorso' | 'leggi' | 'applica'> {
  return {
    percorso: `codici.${chiave}`,
    leggi: (set) => {
      const r = (set as RegoleF24).codici[chiave as keyof RegoleF24['codici']];
      return r ? { valore: r.valore.codice, fonte: r.fonte, stato: r.stato } : undefined;
    },
    applica: (set, regola) => {
      const s = set as RegoleF24;
      const vecchia = s.codici[chiave as keyof RegoleF24['codici']];
      const nuova: Regola<VoceF24> = { valore: { ...vecchia.valore, codice: regola.valore }, fonte: regola.fonte, stato: regola.stato };
      return { ...s, codici: { ...s.codici, [chiave]: nuova } };
    },
  };
}

const CATALOGO_F24: ParametroCatalogo[] = CHIAVI_F24.map((k) =>
  voce(
    {
      chiave: `f24.${k}`,
      area: 'f24',
      insieme: 'f24',
      decorrenza: 'data',
      nome: `Codice tributo: ${baseF24(2027).codici[k].valore.descrizione}`,
      spiegazione: 'Il codice da scrivere nell\'F24 per questo versamento.',
      fonti: [ADE_CODICI],
    },
    codice(/^[0-9A-Z]{4}$/, '4001'),
    codiceF24(k),
  ),
);

// ---------------------------------------------------------------------------------------------------------
// Addizionali (dati dell'utente, per anno d'imposta)
// ---------------------------------------------------------------------------------------------------------

const addizionale = (chiave: string, nome: string, spiegazione: string, conv: Convertitore<unknown>, percorso: string) =>
  voce(
    { chiave, area: 'addizionali', insieme: 'addizionali', decorrenza: 'anno', nome, spiegazione, fonti: [FINANZE_ADD] },
    conv,
    { percorso },
  );

const CATALOGO_ADDIZIONALI: ParametroCatalogo[] = [
  addizionale(
    'addizionali.regionale.scaglioni',
    'Addizionale regionale',
    'L\'imposta della tua regione sul reddito, a scaglioni come l\'IRPEF.',
    scaglioni(0, 5),
    'regionale',
  ),
  addizionale(
    'addizionali.comunale.aliquota',
    'Addizionale comunale',
    'L\'imposta del tuo comune sul reddito (al massimo 0,8%, 0,9% per alcuni comuni).',
    percentuale(0, 0.9),
    'comunale.aliquota',
  ),
  addizionale(
    'addizionali.comunale.soglia_esenzione',
    'Esenzione dell\'addizionale comunale',
    'Sotto questo reddito l\'addizionale comunale non si paga.',
    euro(0, 100_000),
    'comunale.soglia',
  ),
];

// ---------------------------------------------------------------------------------------------------------

export const CATALOGO: readonly ParametroCatalogo[] = [
  ...CATALOGO_IRPEF,
  ...CATALOGO_FATTURAZIONE,
  ...CATALOGO_SPESE,
  ...CATALOGO_SCADENZE,
  ...CATALOGO_F24,
  ...CATALOGO_ADDIZIONALI,
];

const PER_CHIAVE = new Map(CATALOGO.map((p) => [p.chiave, p]));

export const parametro = (chiave: string): ParametroCatalogo | undefined => PER_CHIAVE.get(chiave);

export const parametriDi = (insieme: Insieme): ParametroCatalogo[] => CATALOGO.filter((p) => p.insieme === insieme);

/**
 * Regole che si trovano nei set ma non si aggiornano da file, con il motivo (FR-003). Sono regole di
 * interpretazione (cambiarle è un cambio di logica: flusso della 012) o valori derivati da un altro parametro.
 */
export const NON_AGGIORNABILI: Record<string, string> = {
  'irpef:ulterioreRagguagliata': 'regola di interpretazione del calcolo: si cambia con un aggiornamento del programma',
  'irpef:addizionaliSoloConIrpefDovuta': 'regola di interpretazione del calcolo: si cambia con un aggiornamento del programma',
  'irpef:enpap.aliquotaIntegrativo': 'segue «fattura.aliquota_integrativo» (valore in vigore al 1° gennaio dell\'anno)',
  'fatturazione:integrativoFuoriRitenuta': 'regola di interpretazione del calcolo: si cambia con un aggiornamento del programma',
  'spese:beni.primoAnnoMeta': 'regola di interpretazione del calcolo: si cambia con un aggiornamento del programma',
  'spese:tetto16ter': 'struttura con soglie e coefficienti per figli: si cambia con un aggiornamento del programma',
  'spese:scadenza': 'date di comodo di Fiscal per i promemoria, non valori di legge',
  ...Object.fromEntries(
    CATEGORIE.filter((c) => c.codice === 'altro').map((c) => [`spese:categorie[${c.codice}].regola`, 'categoria generica senza valori propri']),
  ),
};

/** Elenco delle `Regola` presenti in un set (per il controllo di copertura del catalogo). */
export function percorsiRegole(set: unknown): string[] {
  const out: string[] = [];
  const visita = (x: unknown, percorso: string) => {
    if (!x || typeof x !== 'object') return;
    const r = x as Rec;
    if ('valore' in r && 'fonte' in r && 'stato' in r) {
      out.push(percorso);
      return;
    }
    if (Array.isArray(x)) {
      x.forEach((el, i) => {
        const e = el as Rec;
        const id = typeof e?.codice === 'string' ? e.codice : (e?.valore as Rec | undefined)?.chiave ?? String(i);
        // Elementi che sono Regola (scadenze): il percorso è l'elemento stesso
        if (e && 'valore' in e && 'fonte' in e && 'stato' in e) out.push(`${percorso}[${String(id)}]`);
        else visita(el, `${percorso}[${String(id)}]`);
      });
      return;
    }
    for (const [k, v] of Object.entries(r)) visita(v, percorso ? `${percorso}.${k}` : k);
  };
  visita(set, '');
  return out;
}

export type { RegoleIrpef, RegoleFatturazione, RegoleSpese };
