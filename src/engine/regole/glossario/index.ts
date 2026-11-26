import { formattaEuro as e } from '../../importi';
import { percentualeInTesto as p } from '../../irpef/aritmetica';
import { regolePerAnno } from '..';
import { regoleIrpefPerAnno } from '../irpef';
import { regoleSpesePerAnno } from '../spese';

/**
 * Glossario (specifica 011, US4, FR-006, FR-008, FR-009): termini fiscali e previdenziali in parole semplici, con un
 * esempio e le pagine dove compaiono. Aliquote, soglie e limiti negli esempi vengono dalle regole dell'anno, mai
 * scritti nel testo: se cambia la regola, cambia anche l'esempio.
 */
export type Voce = {
  id: string;
  termine: string;
  /** Altri modi in cui il termine compare nei testi (per renderlo toccabile). */
  sinonimi: string[];
  definizione: string;
  esempio: (anno: number) => string;
  pagine: { href: string; nome: string }[];
};

const riga = (anno: number) => {
  try {
    return regoleIrpefPerAnno(anno);
  } catch {
    return null;
  }
};
const fatt = (anno: number) => {
  try {
    return regolePerAnno(anno);
  } catch {
    return null;
  }
};
const spese = (anno: number) => {
  try {
    return regoleSpesePerAnno(anno);
  } catch {
    return null;
  }
};
const scaglioni = (anno: number) =>
  riga(anno)
    ?.scaglioni.valore.map((s, i, v) => (s.finoA == null ? `${p(s.aliquota)} oltre ${e(v[i - 1]!.finoA!)}` : `${p(s.aliquota)} fino a ${e(s.finoA)}`))
    .join(', ') ?? 'regole dell\'anno non disponibili';

export const GLOSSARIO: Voce[] = [
  {
    id: 'irpef',
    termine: 'IRPEF',
    sinonimi: [],
    definizione: "L'imposta sul reddito delle persone fisiche: si paga su stipendio e partita IVA messi insieme.",
    esempio: (a) => `Nel ${a} gli scaglioni sono: ${scaglioni(a)}.`,
    pagine: [{ href: '/tasse/', nome: 'Tasse' }],
  },
  {
    id: 'scaglione',
    termine: 'scaglione',
    sinonimi: ['scaglioni'],
    definizione: "Una fascia di reddito con la sua aliquota. Ogni euro paga l'aliquota della fascia in cui cade, non tutto il reddito.",
    esempio: (a) => `Scaglioni ${a}: ${scaglioni(a)}. Chi supera il limite paga l'aliquota più alta solo sulla parte in più.`,
    pagine: [{ href: '/tasse/', nome: 'Tasse' }, { href: '/tasse/previsione/', nome: 'Previsione' }],
  },
  {
    id: 'aliquota_marginale',
    termine: 'aliquota marginale',
    sinonimi: ['prossimo euro'],
    definizione: "L'aliquota con cui viene tassato il prossimo euro che guadagni. Con uno stipendio alto, la partita IVA parte già da lì.",
    esempio: (a) => {
      const v = riga(a)?.scaglioni.valore;
      return v ? `Se lo stipendio ti porta già oltre ${e(v[v.length - 2]!.finoA!)}, ogni 100 € di partita IVA pagano ${p(v[v.length - 1]!.aliquota)} di IRPEF, cioè ${e(Math.round(v[v.length - 1]!.aliquota * 100_00))}.` : '';
    },
    pagine: [{ href: '/salvadanaio/', nome: 'Salvadanaio' }],
  },
  {
    id: 'reddito_complessivo',
    termine: 'reddito complessivo',
    sinonimi: [],
    definizione: 'Stipendio più reddito della partita IVA (compensi incassati meno spese). Da qui dipendono le detrazioni.',
    esempio: () => 'Stipendio 40.000 € + partita IVA 10.000 € = reddito complessivo 50.000 €.',
    pagine: [{ href: '/tasse/', nome: 'Tasse' }],
  },
  {
    id: 'imponibile',
    termine: 'reddito imponibile',
    sinonimi: ['imponibile'],
    definizione: 'Il reddito complessivo meno le deduzioni (per esempio i contributi ENPAP versati). È la base su cui si calcolano IRPEF e addizionali.',
    esempio: () => 'Reddito complessivo 50.000 € − contributi ENPAP versati 1.200 € = imponibile 48.800 €.',
    pagine: [{ href: '/tasse/', nome: 'Tasse' }],
  },
  {
    id: 'deducibile',
    termine: 'deducibile',
    sinonimi: ['deduzione', 'deduzioni', 'oneri deducibili'],
    definizione: "Si toglie dal reddito prima di calcolare l'imposta. Vale quanto la tua aliquota marginale.",
    esempio: (a) => {
      const v = riga(a)?.scaglioni.valore;
      const top = v ? v[v.length - 1]!.aliquota : null;
      return top ? `Una spesa deducibile di 100 € al ${p(top)} fa risparmiare ${e(Math.round(top * 100_00))} di IRPEF.` : '';
    },
    pagine: [{ href: '/spese/', nome: 'Spese' }],
  },
  {
    id: 'detraibile',
    termine: 'detraibile',
    sinonimi: ['detrazione', 'detrazioni'],
    definizione: "Si toglie direttamente dall'imposta, di solito in percentuale fissa della spesa. Non diventa rimborso se l'imposta è già zero.",
    esempio: (a) => {
      const s = spese(a)?.oneri.find((o) => o.codice === 'spese_sanitarie');
      if (!s?.aliquota || s.franchigia == null) return '';
      const spesa = 1_000_00 + s.franchigia;
      return `Spese sanitarie: ${p(s.aliquota)} della parte oltre ${e(s.franchigia)}. Con ${e(spesa)} di spese paghi ${e(Math.round((spesa - s.franchigia) * s.aliquota))} di imposta in meno.`;
    },
    pagine: [{ href: '/spese/oneri/', nome: 'Spese personali' }],
  },
  {
    id: 'ritenuta',
    termine: "ritenuta d'acconto",
    sinonimi: ['ritenuta', 'ritenute'],
    definizione: "La parte del compenso che un'azienda o un ente trattiene e versa allo Stato per te. È un anticipo delle tue tasse: in dichiarazione si scala.",
    esempio: (a) => {
      const r = fatt(a)?.aliquotaRitenuta.valore;
      return r ? `Fattura di 1.000 € a un ente: ritenuta del ${p(r)}, cioè ${e(Math.round(r * 1_000_00))}; ricevi il resto.` : '';
    },
    pagine: [{ href: '/fatture/nuova/', nome: 'Nuova fattura' }],
  },
  {
    id: 'sostituto',
    termine: "sostituto d'imposta",
    sinonimi: [],
    definizione: 'Chi trattiene e versa le tasse per conto di qualcun altro: il datore di lavoro per lo stipendio, aziende ed enti per le tue fatture.',
    esempio: () => 'Una ASL o una scuola che ti paga una consulenza è sostituto d\'imposta: applica la ritenuta. Un paziente privato no.',
    pagine: [{ href: '/clienti/', nome: 'Clienti' }],
  },
  {
    id: 'acconto',
    termine: 'acconto',
    sinonimi: ['acconti'],
    definizione: "Un anticipo delle tasse dell'anno in corso, calcolato sull'anno prima. Si paga a giugno e novembre.",
    esempio: (a) => {
      const ac = riga(a)?.acconti.valore;
      return ac ? `Se nella dichiarazione la «differenza» è 3.000 €, gli acconti sono ${p(ac.percentuale)}: ${p(ac.primaRata.nonIsa)} a giugno e il resto a novembre.` : '';
    },
    pagine: [{ href: '/tasse/versamenti/', nome: 'Versamenti' }],
  },
  {
    id: 'saldo',
    termine: 'saldo',
    sinonimi: ['conguaglio'],
    definizione: "Quello che resta da pagare (o da avere) dopo aver scalato ritenute e acconti dalle tasse dovute dell'anno.",
    esempio: () => 'Tasse dovute 10.000 € − ritenute 7.000 € − acconti 2.000 € = saldo 1.000 € da versare a giugno.',
    pagine: [{ href: '/dichiarazione/', nome: 'Dichiarazione' }],
  },
  {
    id: 'cassa',
    termine: 'principio di cassa',
    sinonimi: ['cassa'],
    definizione: "Per la partita IVA conta quando incassi e quando paghi, non la data della fattura.",
    esempio: () => 'Una fattura di dicembre pagata a gennaio conta nei redditi dell\'anno nuovo.',
    pagine: [{ href: '/fatture/', nome: 'Fatture' }],
  },
  {
    id: 'enpap',
    termine: 'ENPAP',
    sinonimi: [],
    definizione: 'La cassa di previdenza degli psicologi: riceve i contributi della partita IVA per la tua pensione.',
    esempio: (a) => {
      const r = riga(a)?.enpap;
      return r ? `Nel ${a}: soggettivo ${p(r.aliquotaSoggettivo.valore)} del reddito, integrativo ${p(r.aliquotaIntegrativo.valore)} dei compensi.` : '';
    },
    pagine: [{ href: '/tasse/versamenti/', nome: 'Versamenti' }],
  },
  {
    id: 'soggettivo',
    termine: 'contributo soggettivo',
    sinonimi: ['soggettivo'],
    definizione: 'Il contributo per la tua pensione, in percentuale del reddito della partita IVA. Lo paghi tu ed è deducibile.',
    esempio: (a) => {
      const r = riga(a)?.enpap.aliquotaSoggettivo.valore;
      return r ? `Reddito di partita IVA 10.000 € × ${p(r)} = ${e(Math.round(r * 10_000_00))} di soggettivo.` : '';
    },
    pagine: [{ href: '/salvadanaio/', nome: 'Salvadanaio' }],
  },
  {
    id: 'integrativo',
    termine: 'contributo integrativo',
    sinonimi: ['integrativo'],
    definizione: "Una maggiorazione sul compenso che addebiti al cliente e giri all'ENPAP. Non è reddito tuo e non è IVA.",
    esempio: (a) => {
      const r = fatt(a)?.aliquotaIntegrativo.valore;
      return r ? `Seduta da 80 €: integrativo ${p(r)} = ${e(Math.round(r * 80_00))}, il paziente paga ${e(80_00 + Math.round(r * 80_00))} (più l'eventuale bollo).` : '';
    },
    pagine: [{ href: '/fatture/nuova/', nome: 'Nuova fattura' }],
  },
  {
    id: 'bollo',
    termine: 'bollo',
    sinonimi: ['marca da bollo', 'imposta di bollo'],
    definizione: "Un'imposta fissa sulle fatture senza IVA sopra una certa cifra. Con la fattura elettronica si paga ogni trimestre con l'F24.",
    esempio: (a) => {
      const r = fatt(a);
      return r ? `Fattura esente di importo superiore a ${e(r.sogliaBollo.valore)}: bollo di ${e(r.importoBollo.valore)}.` : '';
    },
    pagine: [{ href: '/dichiarazione/scadenze/', nome: 'Scadenze' }],
  },
  {
    id: 'esenzione',
    termine: 'esente IVA',
    sinonimi: ['esenzione', 'esenti'],
    definizione: "Le prestazioni sanitarie dello psicologo (diagnosi e cura) non hanno IVA per legge. Altre attività (per esempio formazione a un'azienda) possono averla.",
    esempio: (a) => {
      const iva = fatt(a)?.aliquotaIva.valore;
      return iva ? `Seduta di psicoterapia: niente IVA. Corso per un'azienda: IVA al ${p(iva)}.` : '';
    },
    pagine: [{ href: '/impostazioni/attivita/', nome: 'Attività' }],
  },
  {
    id: 'pro_rata',
    termine: 'pro-rata',
    sinonimi: [],
    definizione: "Se fai sia prestazioni esenti sia prestazioni con IVA, puoi recuperare l'IVA sugli acquisti solo nella proporzione delle seconde.",
    esempio: () => 'Se il 10% dei compensi ha IVA, recuperi solo il 10% dell\'IVA pagata sugli acquisti.',
    pagine: [{ href: '/spese/', nome: 'Spese' }],
  },
  {
    id: 'sts',
    termine: 'Tessera Sanitaria',
    sinonimi: ['Sistema Tessera Sanitaria'],
    definizione: "Il sistema a cui mandi le fatture sanitarie: così le spese dei pazienti finiscono nella loro dichiarazione precompilata.",
    esempio: () => 'Fattura a un paziente che non si è opposto: va inviata; se si è opposto, no.',
    pagine: [{ href: '/adempimenti/', nome: 'Adempimenti' }],
  },
  {
    id: 'cu',
    termine: 'CU',
    sinonimi: ['Certificazione Unica'],
    definizione: "Il documento che il datore di lavoro ti dà ogni anno con stipendio, tasse trattenute e addizionali.",
    esempio: () => 'Punti 1 e 2: reddito; punto 21: IRPEF trattenuta; punto 22: addizionale regionale.',
    pagine: [{ href: '/tasse/dati/', nome: "Dati dell'anno" }],
  },
  {
    id: 'modello_redditi',
    termine: 'Modello Redditi',
    sinonimi: [],
    definizione: 'La dichiarazione dei redditi di chi ha la partita IVA in regime ordinario: sostituisce il 730.',
    esempio: () => 'Con il 730 il rimborso arrivava in busta paga; con il Modello Redditi abbassa il saldo di giugno.',
    pagine: [{ href: '/dichiarazione/', nome: 'Dichiarazione' }],
  },
  {
    id: 'f24',
    termine: 'F24',
    sinonimi: [],
    definizione: 'Il modulo per pagare tasse e contributi allo Stato, dalla banca o dal sito dell\'Agenzia delle Entrate.',
    esempio: () => 'Saldo e primo acconto di giugno si pagano con un solo F24, che può compensare eventuali crediti.',
    pagine: [{ href: '/dichiarazione/scadenze/', nome: 'Scadenze' }],
  },
  {
    id: 'ammortamento',
    termine: 'ammortamento',
    sinonimi: [],
    definizione: 'Un acquisto che dura anni (computer, arredi) si deduce un po\' ogni anno invece che tutto subito.',
    esempio: (a) => {
      const s = spese(a)?.beni.sogliaImmediata.valore;
      return s ? `Sotto ${e(s)} si deduce tutto nell'anno; sopra, una quota all'anno secondo il coefficiente del bene.` : '';
    },
    pagine: [{ href: '/spese/beni/', nome: 'Beni durevoli' }],
  },
  {
    id: 'addizionali',
    termine: 'addizionali',
    sinonimi: ['addizionale regionale', 'addizionale comunale'],
    definizione: 'Piccole imposte di regione e comune calcolate sullo stesso imponibile dell\'IRPEF, con aliquote decise da loro.',
    esempio: () => 'Imponibile 50.000 € con addizionale comunale allo 0,8%: 400 €.',
    pagine: [{ href: '/tasse/dati/', nome: "Dati dell'anno" }],
  },
  {
    id: 'compensazione',
    termine: 'compensazione',
    sinonimi: [],
    definizione: 'Usare un credito d\'imposta per pagare meno nell\'F24 invece di chiederlo a rimborso.',
    esempio: () => 'Credito di 300 € dalla dichiarazione: il secondo acconto di novembre da 1.000 € diventa 700 €.',
    pagine: [{ href: '/dichiarazione/', nome: 'Dichiarazione' }],
  },
  {
    id: 'incapienza',
    termine: 'incapienza',
    sinonimi: [],
    definizione: "Quando le detrazioni superano l'imposta: la parte in più si perde, non diventa rimborso.",
    esempio: () => 'Imposta 500 €, detrazioni 700 €: paghi 0 € e i 200 € in più non tornano.',
    pagine: [{ href: '/dichiarazione/', nome: 'Dichiarazione' }],
  },
  {
    id: 'netto_reale',
    termine: 'netto reale',
    sinonimi: [],
    definizione: 'Quanto puoi spendere davvero della partita IVA: incassato meno spese pagate meno tasse e contributi da mettere da parte.',
    esempio: () => 'Incassati 20.000 €, spese 2.000 €, da mettere da parte 9.000 €: netto reale 9.000 €.',
    pagine: [{ href: '/salvadanaio/', nome: 'Salvadanaio' }],
  },
  {
    id: 'decorrenza',
    termine: 'decorrenza',
    sinonimi: ['parametri fiscali'],
    definizione:
      "Da quando vale un nuovo valore. Alcuni valgono per tutto l'anno d'imposta (scaglioni, detrazioni, addizionali), altri dalla data della fattura o del versamento in poi (bollo, integrativo, ritenuta, codici F24). Le fatture già emesse e gli anni chiusi non cambiano.",
    esempio: (anno) => {
      const f = fatt(anno);
      return f
        ? `Se il bollo passasse da ${e(f.importoBollo.valore)} a un nuovo importo dal 1° marzo ${anno}, le fatture di febbraio resterebbero con ${e(f.importoBollo.valore)}.`
        : 'Un nuovo bollo dal 1° marzo vale solo per le fatture da quel giorno.';
    },
    pagine: [{ href: '/impostazioni/parametri/', nome: 'Parametri fiscali' }],
  },
  {
    id: 'volume_affari',
    termine: "volume d'affari",
    sinonimi: [],
    definizione: "Il totale dei compensi fatturati in un anno. Per l'ENPAP è la base del contributo integrativo.",
    esempio: () => '120 sedute da 80 € = volume d\'affari 9.600 €.',
    pagine: [{ href: '/tasse/', nome: 'Tasse' }],
  },
];

/** Tutte le forme toccabili (termine e sinonimi), dalla più lunga, per non spezzare «addizionale regionale». */
export const FORME = GLOSSARIO.flatMap((v) => [v.termine, ...v.sinonimi].map((forma) => ({ forma, id: v.id }))).sort((a, b) => b.forma.length - a.forma.length);

export const voce = (id: string) => GLOSSARIO.find((v) => v.id === id);

/** Cerca nel glossario per termine, sinonimi e definizione (US4). */
export function cercaGlossario(q: string): Voce[] {
  const t = q.trim().toLowerCase();
  if (!t) return GLOSSARIO;
  return GLOSSARIO.filter((v) => [v.termine, ...v.sinonimi, v.definizione].some((x) => x.toLowerCase().includes(t)));
}

/**
 * Divide un testo in parti normali e termini del glossario (al massimo la prima occorrenza di ogni termine),
 * per renderli toccabili negli aiuti (FR-006).
 */
export function trovaTermini(testo: string, massimo = 3): { testo: string; id?: string }[] {
  const presi = new Set<string>();
  const trovati: { da: number; a: number; id: string }[] = [];
  const minuscolo = testo.toLowerCase();
  for (const { forma, id } of FORME) {
    if (presi.has(id) || trovati.length >= massimo) continue;
    const f = forma.toLowerCase();
    let i = minuscolo.indexOf(f);
    while (i >= 0) {
      const prima = i === 0 ? ' ' : minuscolo[i - 1]!;
      const dopo = minuscolo[i + f.length] ?? ' ';
      const confine = !/[\p{L}\d]/u.test(prima) && !/[\p{L}\d]/u.test(dopo);
      const libero = !trovati.some((t) => i < t.a && i + f.length > t.da);
      if (confine && libero) {
        trovati.push({ da: i, a: i + f.length, id });
        presi.add(id);
        break;
      }
      i = minuscolo.indexOf(f, i + 1);
    }
  }
  trovati.sort((x, y) => x.da - y.da);
  const out: { testo: string; id?: string }[] = [];
  let pos = 0;
  for (const t of trovati) {
    if (t.da > pos) out.push({ testo: testo.slice(pos, t.da) });
    out.push({ testo: testo.slice(t.da, t.a), id: t.id });
    pos = t.a;
  }
  if (pos < testo.length) out.push({ testo: testo.slice(pos) });
  return out;
}
