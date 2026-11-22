import { formattaEuro } from '../importi';
import { ErroreIrpef, regoleIrpefPerAnno, type RegoleIrpef, type Scaglione } from '../regole/irpef';
import type { Regola } from '../regole/tipi';
import {
  coefficiente4,
  coefficienteInTesto,
  divisioneArrotondata,
  perAliquota,
  perCoefficiente,
  percentualeInTesto,
  somma,
} from './aritmetica';

/**
 * Calcolo dell'IRPEF dell'anno sul cumulo CU + partita IVA (specifica 001, contracts/motore-irpef.md).
 *
 * Logica, nell'ordine del Modello Redditi PF:
 * 1. reddito complessivo = lavoro dipendente (CU) + reddito professionale (anche negativo);
 * 2. reddito imponibile = complessivo − contributi previdenziali deducibili − altri oneri deducibili;
 * 3. IRPEF lorda per scaglioni sull'imponibile;
 * 4. detrazioni per lavoro dipendente e ulteriore detrazione sul reddito **complessivo**;
 * 5. IRPEF netta, ritenute (CU e d'acconto), "differenza" (base dell'acconto) e conguaglio;
 * 6. addizionali sull'imponibile, dovute solo se l'IRPEF netta è maggiore di zero.
 */

export type CuInput = {
  /** Punto 1 (e 2) della CU: reddito di lavoro dipendente, già senza i contributi trattenuti. */
  redditoLavoro: number;
  /** Giorni di lavoro dell'anno (per rapportare la detrazione); 365 se assente. */
  giorniLavoro?: number | null;
  /** Punto 21. */
  ritenuteIrpef: number;
  /** Punto 22. */
  addRegionale: number;
  /** Punto 26: acconto dell'addizionale comunale dell'anno. */
  addComunaleAcconto: number;
  /** Punto 27: saldo dell'addizionale comunale dell'anno. */
  addComunaleSaldo: number;
  /** Punto 29: acconto dell'addizionale comunale dell'anno dopo, già trattenuto. */
  addComunaleAccontoAnnoDopo?: number | null;
  /** Solo per la spiegazione: detrazioni già riconosciute in busta paga. */
  detrazioniLavoroFruite?: number | null;
  detrazioniFamiliariFruite?: number | null;
};

export type VersamentoPrevidenza = {
  data: string;
  importo: number;
  tipo: 'soggettivo' | 'integrativo' | 'maternita';
  cassa: 'enpap' | 'gestione_separata';
};

export type AliquoteAddizionali = {
  /** Scaglioni regionali (anche uno solo, con `finoA` null). */
  regionale: Scaglione[];
  comunale: { aliquota: number; soglia?: number | null };
  /** Verificate dall'utente sui siti ufficiali di regione e comune. */
  verificate: boolean;
};

export type InputAnno = {
  anno: number;
  cu: CuInput[];
  /** Compensi incassati − spese pagate nell'anno (principio di cassa); può essere negativo. */
  redditoProfessionale: number;
  /** Ritenute d'acconto subite sulle fatture incassate nell'anno. */
  ritenuteSubite?: number;
  versamentiPrevidenza?: VersamentoPrevidenza[];
  /** Anno non concluso: contributi deducibili previsti entro il 31/12 non ancora pagati. */
  contributiPrevisti?: number;
  oneriDeducibili?: number;
  /** Detrazioni per familiari e altre voci inserite dall'utente (FR-032). */
  altreDetrazioni?: number;
  addizionali: AliquoteAddizionali | null;
  accontiVersati?: { irpef: number; addComunale: number };
};

export type ImpostaScaglione = {
  da: number;
  a: number | null;
  aliquota: number;
  imponibile: number;
  imposta: number;
};

export type Spiegazione = { voce: string; testo: string; regola: string };

export type RisultatoAnno = {
  anno: number;
  redditoLavoro: number;
  redditoProfessionale: number;
  redditoComplessivo: number;
  contributiDedotti: number;
  contributiPrevisti: number;
  oneriDeducibili: number;
  redditoImponibile: number;
  irpefLorda: { totale: number; perScaglione: ImpostaScaglione[] };
  detrazioneLavoro: number;
  ulterioreDetrazione: number;
  altreDetrazioni: number;
  irpefNetta: number;
  incapienza: number;
  scaglione: { aliquotaMarginale: number; sogliaSuccessiva: number | null; mancaAlProssimo: number | null };
  ritenute: number;
  /** IRPEF netta − ritenute: base dell'acconto storico dell'anno dopo (rigo "differenza"). */
  differenza: number;
  accontiVersati: number;
  /** Positivo = da versare, negativo = a credito. */
  conguaglioIrpef: number;
  addizionali: {
    regionale: { dovuta: number; trattenuta: number; conguaglio: number };
    comunale: { dovuta: number; trattenuta: number; conguaglio: number; accontoAnnoDopo: number };
  } | null;
  /** Conguaglio IRPEF + conguagli delle addizionali (senza l'acconto comunale dell'anno dopo). */
  conguaglioTotale: number;
  provvisorio: boolean;
  regoleDaVerificare: string[];
  datiMancanti: string[];
  spiegazioni: Spiegazione[];
};

const e = formattaEuro;

function controllaImporto(valore: number, nome: string, ammettiNegativo = false) {
  if (!Number.isInteger(valore)) throw new ErroreIrpef(`${nome}: l'importo deve essere in centesimi interi.`);
  if (!ammettiNegativo && valore < 0) throw new ErroreIrpef(`${nome}: l'importo non può essere negativo.`);
}

function controllaInput(input: InputAnno) {
  if (input.cu.length === 0)
    throw new ErroreIrpef(
      'Inserisci almeno una Certificazione Unica: il calcolo parte dal reddito da dipendente.',
    );
  input.cu.forEach((c, i) => {
    const n = input.cu.length > 1 ? ` (CU ${i + 1})` : '';
    controllaImporto(c.redditoLavoro, `Reddito di lavoro${n}`);
    controllaImporto(c.ritenuteIrpef, `Ritenute IRPEF${n}`);
    controllaImporto(c.addRegionale, `Addizionale regionale${n}`);
    controllaImporto(c.addComunaleAcconto, `Acconto addizionale comunale${n}`);
    controllaImporto(c.addComunaleSaldo, `Saldo addizionale comunale${n}`);
    if (c.addComunaleAccontoAnnoDopo != null) controllaImporto(c.addComunaleAccontoAnnoDopo, `Punto 29${n}`);
    if (
      c.giorniLavoro != null &&
      (!Number.isInteger(c.giorniLavoro) || c.giorniLavoro < 1 || c.giorniLavoro > 365)
    )
      throw new ErroreIrpef(`I giorni di lavoro${n} vanno da 1 a 365.`);
  });
  controllaImporto(input.redditoProfessionale, 'Reddito professionale', true);
  controllaImporto(input.ritenuteSubite ?? 0, 'Ritenute subite');
  controllaImporto(input.contributiPrevisti ?? 0, 'Contributi previsti');
  controllaImporto(input.oneriDeducibili ?? 0, 'Oneri deducibili');
  controllaImporto(input.altreDetrazioni ?? 0, 'Altre detrazioni');
  controllaImporto(input.accontiVersati?.irpef ?? 0, 'Acconti IRPEF versati');
  controllaImporto(input.accontiVersati?.addComunale ?? 0, 'Acconti addizionale comunale versati');
  for (const v of input.versamentiPrevidenza ?? []) {
    controllaImporto(v.importo, 'Versamento previdenziale');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.data))
      throw new ErroreIrpef('Data del versamento previdenziale non valida.');
  }
}

/** Imposta per scaglioni, arrotondata scaglione per scaglione. */
export function impostaPerScaglioni(imponibile: number, scaglioni: Scaglione[]): ImpostaScaglione[] {
  const righe: ImpostaScaglione[] = [];
  let da = 0;
  for (const s of scaglioni) {
    const a = s.finoA === null ? imponibile : Math.min(imponibile, s.finoA);
    if (a > da)
      righe.push({
        da,
        a: s.finoA,
        aliquota: s.aliquota,
        imponibile: a - da,
        imposta: perAliquota(a - da, s.aliquota),
      });
    if (s.finoA === null || imponibile <= s.finoA) break;
    da = s.finoA;
  }
  return righe;
}

/** Aliquota che si paga sul prossimo euro, e quanto manca allo scaglione dopo. */
export function scaglioneDi(imponibile: number, scaglioni: Scaglione[]): RisultatoAnno['scaglione'] {
  const s = scaglioni.find((x) => x.finoA === null || imponibile < x.finoA)!;
  return {
    aliquotaMarginale: s.aliquota,
    sogliaSuccessiva: s.finoA,
    mancaAlProssimo: s.finoA === null ? null : s.finoA - Math.max(imponibile, 0),
  };
}

/** Detrazione per lavoro dipendente sul reddito complessivo R (art. 13 TUIR), prima del ragguaglio. */
export function detrazioneLavoroPiena(
  R: number,
  p: RegoleIrpef['detrazioneLavoro']['valore'],
): { importo: number; formula: string } {
  let importo: number;
  let formula: string;
  if (R <= p.primaSoglia) {
    importo = p.importoFisso;
    formula = `importo fisso di ${e(p.importoFisso)} fino a ${e(p.primaSoglia)}`;
  } else if (R <= p.secondaSoglia) {
    const c = coefficiente4(p.secondaSoglia - R, p.secondaSoglia - p.primaSoglia);
    importo = p.base + perCoefficiente(p.aggiunta, c);
    formula = `${e(p.base)} + ${e(p.aggiunta)} × ${coefficienteInTesto(c)}`;
  } else if (R <= p.terzaSoglia) {
    const c = coefficiente4(p.terzaSoglia - R, p.terzaSoglia - p.secondaSoglia);
    importo = perCoefficiente(p.base, c);
    formula = `${e(p.base)} × ${coefficienteInTesto(c)} (cioè (${e(p.terzaSoglia)} − reddito) / ${e(p.terzaSoglia - p.secondaSoglia)})`;
  } else {
    importo = 0;
    formula = `nessuna detrazione oltre ${e(p.terzaSoglia)} di reddito complessivo`;
  }
  const m = p.maggiorazione;
  if (R > m.oltre && R <= m.finoA) {
    importo += m.importo;
    formula += ` + ${e(m.importo)} di maggiorazione (reddito tra ${e(m.oltre)} e ${e(m.finoA)})`;
  }
  return { importo, formula };
}

/** Ulteriore detrazione (L. 207/2024) sul reddito complessivo R. */
export function ulterioreDetrazione(R: number, p: RegoleIrpef['ulterioreDetrazione']['valore']): number {
  if (R <= p.oltre || R > p.azzeraA) return 0;
  if (R <= p.pienaFinoA) return p.importo;
  return perCoefficiente(p.importo, coefficiente4(p.azzeraA - R, p.azzeraA - p.pienaFinoA));
}

function addizionaleRegionale(imponibile: number, scaglioni: Scaglione[]): number {
  return somma(impostaPerScaglioni(Math.max(imponibile, 0), scaglioni).map((r) => r.imposta));
}

function addizionaleComunale(imponibile: number, c: AliquoteAddizionali['comunale']): number {
  if (imponibile <= 0) return 0;
  if (c.soglia != null && imponibile <= c.soglia) return 0;
  return perAliquota(imponibile, c.aliquota);
}

/** IRPEF netta sul solo reddito della CU (serve a stimare cosa ha trattenuto il datore). */
function nettaSoloCu(R: number, regole: RegoleIrpef, giorni: number): number {
  const lorda = somma(impostaPerScaglioni(R, regole.scaglioni.valore).map((r) => r.imposta));
  const det = divisioneArrotondata(
    detrazioneLavoroPiena(R, regole.detrazioneLavoro.valore).importo * giorni,
    365,
  );
  return Math.max(0, lorda - det - ulterioreDetrazione(R, regole.ulterioreDetrazione.valore));
}

export function calcolaAnno(input: InputAnno): RisultatoAnno {
  const regole = regoleIrpefPerAnno(input.anno);
  controllaInput(input);

  const regoleUsate: Regola<unknown>[] = [];
  const usa = <T>(r: Regola<T>): T => {
    regoleUsate.push(r as Regola<unknown>);
    return r.valore;
  };
  const datiMancanti: string[] = [];
  const spiegazioni: Spiegazione[] = [];
  const spiega = (voce: string, testo: string, regola: string) => spiegazioni.push({ voce, testo, regola });

  // 1. Reddito complessivo
  const redditoLavoro = somma(input.cu.map((c) => c.redditoLavoro));
  const redditoProfessionale = input.redditoProfessionale;
  const redditoComplessivo = Math.max(0, redditoLavoro + redditoProfessionale);
  spiega(
    'redditoComplessivo',
    redditoProfessionale >= 0
      ? `Sommi il reddito da dipendente (${e(redditoLavoro)}) e quello della partita IVA (${e(redditoProfessionale)}, incassi meno spese pagate nell'anno): ${e(redditoComplessivo)}. È il numero su cui si calcolano le detrazioni da lavoro dipendente.`
      : `La partita IVA ha chiuso in perdita (${e(redditoProfessionale)}): la perdita si toglie dal reddito da dipendente (${e(redditoLavoro)}) e il reddito complessivo scende a ${e(redditoComplessivo)}.`,
    'Art. 8 TUIR (somma dei redditi, perdite da lavoro autonomo scomputate) e art. 54 TUIR (principio di cassa)',
  );

  // 2. Reddito imponibile
  const deducibili = (input.versamentiPrevidenza ?? []).filter(
    (v) => v.data.startsWith(`${input.anno}-`) && v.tipo !== 'integrativo',
  );
  const contributiDedotti = somma(deducibili.map((v) => v.importo));
  const integrativiVersati = somma(
    (input.versamentiPrevidenza ?? [])
      .filter((v) => v.data.startsWith(`${input.anno}-`) && v.tipo === 'integrativo')
      .map((v) => v.importo),
  );
  const contributiPrevisti = input.contributiPrevisti ?? 0;
  const oneriDeducibili = input.oneriDeducibili ?? 0;
  const redditoImponibile = Math.max(
    0,
    redditoComplessivo - contributiDedotti - contributiPrevisti - oneriDeducibili,
  );
  spiega(
    'redditoImponibile',
    `Dal reddito complessivo togli i contributi previdenziali obbligatori pagati nell'anno (${e(contributiDedotti)}` +
      (contributiPrevisti > 0
        ? `, più ${e(contributiPrevisti)} previsti entro il 31 dicembre e non ancora pagati`
        : '') +
      `)` +
      (oneriDeducibili > 0 ? ` e gli altri oneri deducibili (${e(oneriDeducibili)})` : '') +
      `: restano ${e(redditoImponibile)}, su cui si calcolano scaglioni e addizionali.` +
      (integrativiVersati > 0
        ? ` Il contributo integrativo (${e(integrativiVersati)}) non si deduce: l'hai incassato dai clienti e lo giri all'ENPAP.`
        : ' Il contributo integrativo non si deduce mai: lo pagano i clienti.') +
      " I contributi si deducono nell'anno in cui li paghi, non in quello del reddito a cui si riferiscono.",
    'Art. 10 c. 1 lett. e TUIR (contributi previdenziali obbligatori deducibili per cassa)',
  );

  // 3. IRPEF lorda
  const scaglioni = usa(regole.scaglioni);
  const perScaglione = impostaPerScaglioni(redditoImponibile, scaglioni);
  const lorda = somma(perScaglione.map((r) => r.imposta));
  spiega(
    'irpefLorda',
    perScaglione.length === 0
      ? 'Reddito imponibile zero: nessuna imposta.'
      : `L'imposta si calcola a fette: ${perScaglione
          .map((r) => `${e(r.imponibile)} al ${percentualeInTesto(r.aliquota)} = ${e(r.imposta)}`)
          .join(
            '; ',
          )}. Totale ${e(lorda)}. Ogni aliquota si applica solo alla fetta di reddito del suo scaglione.`,
    regole.scaglioni.fonte,
  );

  // 4. Detrazioni (sul reddito complessivo, non sull'imponibile)
  const giorni = Math.min(365, somma(input.cu.map((c) => c.giorniLavoro ?? 365)));
  const piena = detrazioneLavoroPiena(redditoComplessivo, usa(regole.detrazioneLavoro));
  const detrazioneLavoro = divisioneArrotondata(piena.importo * giorni, 365);
  const parametriUlteriore = usa(regole.ulterioreDetrazione);
  const ulteriorePiena = ulterioreDetrazione(redditoComplessivo, parametriUlteriore);
  const ulteriore = usa(regole.ulterioreRagguagliata)
    ? divisioneArrotondata(ulteriorePiena * giorni, 365)
    : ulteriorePiena;
  const altreDetrazioni = input.altreDetrazioni ?? 0;
  const fruite = input.cu.every((c) => c.detrazioniLavoroFruite != null)
    ? somma(input.cu.map((c) => c.detrazioniLavoroFruite ?? 0))
    : null;
  spiega(
    'detrazioneLavoro',
    `La detrazione per lavoro dipendente dipende dal reddito complessivo (${e(redditoComplessivo)}), quindi anche dalla partita IVA: ${piena.formula} = ${e(piena.importo)}` +
      (giorni < 365 ? `, rapportata a ${giorni} giorni di lavoro su 365: ${e(detrazioneLavoro)}` : '') +
      '.' +
      (fruite != null
        ? ` In busta paga te ne avevano riconosciuti ${e(fruite)}: ${
            fruite > detrazioneLavoro
              ? `la differenza (${e(fruite - detrazioneLavoro)}) la restituisci nel conguaglio.`
              : "non c'è nulla da restituire."
          }`
        : ' Se il datore te ne ha riconosciuta di più in busta paga, la differenza torna da pagare nel conguaglio.') +
      " I contributi ENPAP non la fanno aumentare: abbassano l'imponibile, non il reddito complessivo.",
    regole.detrazioneLavoro.fonte,
  );
  spiega(
    'ulterioreDetrazione',
    ulteriore > 0
      ? `Ulteriore detrazione per i dipendenti: ${e(ulteriore)} (piena fino a ${e(parametriUlteriore.pienaFinoA)}, poi scende fino a zero a ${e(parametriUlteriore.azzeraA)}).`
      : `Ulteriore detrazione: zero, perché spetta solo con reddito complessivo tra ${e(parametriUlteriore.oltre)} e ${e(parametriUlteriore.azzeraA)}.`,
    regole.ulterioreDetrazione.fonte,
  );

  // 5. IRPEF netta, ritenute, conguaglio
  const totaleDetrazioni = detrazioneLavoro + ulteriore + altreDetrazioni;
  const irpefNetta = Math.max(0, lorda - totaleDetrazioni);
  const incapienza = Math.max(0, totaleDetrazioni - lorda);
  spiega(
    'irpefNetta',
    `IRPEF lorda ${e(lorda)} meno detrazioni ${e(totaleDetrazioni)}` +
      (altreDetrazioni > 0
        ? ` (di cui ${e(altreDetrazioni)} di altre detrazioni inserite da te, non calcolate dall'app)`
        : '') +
      ` = ${e(irpefNetta)}.` +
      (incapienza > 0
        ? ` Le detrazioni superano l'imposta di ${e(incapienza)}: quella parte va persa (incapienza).`
        : ''),
    'Art. 11-13 TUIR',
  );

  const scaglione = scaglioneDi(redditoImponibile, scaglioni);
  spiega(
    'scaglione',
    `Sei nello scaglione al ${percentualeInTesto(scaglione.aliquotaMarginale)}: ogni euro in più di partita IVA paga ${percentualeInTesto(scaglione.aliquotaMarginale)} di IRPEF` +
      (scaglione.mancaAlProssimo != null
        ? `, finché non superi ${e(scaglione.sogliaSuccessiva!)} di imponibile (mancano ${e(scaglione.mancaAlProssimo)}). Oltre, solo la parte eccedente paga l'aliquota più alta.`
        : '. È lo scaglione più alto.') +
      (detrazioneLavoro > 0 && redditoComplessivo > regole.detrazioneLavoro.valore.secondaSoglia
        ? " In più, ogni euro abbassa un po' la detrazione per lavoro dipendente, quindi il costo reale è un po' più alto dell'aliquota."
        : '') +
      " A questo si aggiungono le addizionali e, l'anno dopo, i contributi ENPAP.",
    regole.scaglioni.fonte,
  );

  const ritenuteCu = somma(input.cu.map((c) => c.ritenuteIrpef));
  const ritenuteSubite = input.ritenuteSubite ?? 0;
  const ritenute = ritenuteCu + ritenuteSubite;
  const differenza = irpefNetta - ritenute;
  const accontiVersati = input.accontiVersati?.irpef ?? 0;
  const conguaglioIrpef = differenza - accontiVersati;
  spiega(
    'conguaglioIrpef',
    `IRPEF netta ${e(irpefNetta)} meno quanto già pagato: ${e(ritenuteCu)} trattenuti dal datore` +
      (ritenuteSubite > 0 ? `, ${e(ritenuteSubite)} di ritenute d'acconto sulle fatture` : '') +
      (accontiVersati > 0 ? `, ${e(accontiVersati)} di acconti versati` : '') +
      `. ${conguaglioIrpef >= 0 ? `Resta da versare ${e(conguaglioIrpef)}` : `Hai un credito di ${e(-conguaglioIrpef)}`} (saldo a giugno dell'anno dopo).`,
    'Art. 22 TUIR (scomputo delle ritenute) e istruzioni del Modello Redditi PF',
  );

  // 6. Addizionali
  let addizionali: RisultatoAnno['addizionali'] = null;
  if (!input.addizionali) {
    datiMancanti.push(
      "Aliquote delle addizionali regionale e comunale dell'anno: inseriscile in Dati dell'anno.",
    );
    spiega(
      'addizionali',
      'Mancano le aliquote delle addizionali della tua regione e del tuo comune: senza, il conguaglio non le comprende.',
      'Art. 50 D.Lgs. 446/1997 e D.Lgs. 360/1998',
    );
  } else {
    const a = input.addizionali;
    const dovute = usa(regole.addizionaliSoloConIrpefDovuta) ? irpefNetta > 0 : true;
    const regionale = dovute ? addizionaleRegionale(redditoImponibile, a.regionale) : 0;
    const comunale = dovute ? addizionaleComunale(redditoImponibile, a.comunale) : 0;
    const tratRegionale = somma(input.cu.map((c) => c.addRegionale));
    const tratComunale = somma(input.cu.map((c) => c.addComunaleAcconto + c.addComunaleSaldo));
    const quotaAcconto = usa(regole.acconti).addizionaleComunale;
    let accontoGiaTrattenuto: number;
    if (input.cu.every((c) => c.addComunaleAccontoAnnoDopo != null)) {
      accontoGiaTrattenuto = somma(input.cu.map((c) => c.addComunaleAccontoAnnoDopo ?? 0));
    } else {
      const giaSoloCu =
        nettaSoloCu(redditoLavoro, regole, giorni) > 0 ? addizionaleComunale(redditoLavoro, a.comunale) : 0;
      accontoGiaTrattenuto = perAliquota(giaSoloCu, quotaAcconto);
      datiMancanti.push(
        "Punto 29 della CU (acconto dell'addizionale comunale dell'anno dopo): l'app lo ha stimato. Inseriscilo per un acconto preciso.",
      );
    }
    const accontoAnnoDopo = Math.max(0, perAliquota(comunale, quotaAcconto) - accontoGiaTrattenuto);
    // acconto dell'addizionale comunale versato da te con F24 a giugno (oltre a quello del datore)
    const accontoComunaleVersato = input.accontiVersati?.addComunale ?? 0;
    addizionali = {
      regionale: { dovuta: regionale, trattenuta: tratRegionale, conguaglio: regionale - tratRegionale },
      comunale: {
        dovuta: comunale,
        trattenuta: tratComunale + accontoComunaleVersato,
        conguaglio: comunale - tratComunale - accontoComunaleVersato,
        accontoAnnoDopo,
      },
    };
    spiega(
      'addizionali',
      !dovute
        ? "L'IRPEF netta è zero, quindi le addizionali non sono dovute."
        : `Sull'imponibile di ${e(redditoImponibile)}: regionale ${e(regionale)} (già trattenuti ${e(tratRegionale)}), comunale ${e(comunale)} (già trattenuti ${e(tratComunale)}). ` +
            `Per l'anno dopo l'acconto comunale è il ${percentualeInTesto(quotaAcconto)} della comunale meno quanto trattiene già il datore: ${e(accontoAnnoDopo)}, da versare a giugno con il saldo.`,
      'Art. 50 D.Lgs. 446/1997 (regionale), art. 1 D.Lgs. 360/1998 (comunale); aliquote inserite da te',
    );
  }

  const conguaglioTotale =
    conguaglioIrpef + (addizionali ? addizionali.regionale.conguaglio + addizionali.comunale.conguaglio : 0);

  const regoleDaVerificare = [
    ...new Set(regoleUsate.filter((r) => r.stato === 'da_verificare').map((r) => r.fonte)),
  ];
  if (input.addizionali && !input.addizionali.verificate)
    regoleDaVerificare.push('Aliquote delle addizionali inserite da te, non ancora verificate');

  return {
    anno: input.anno,
    redditoLavoro,
    redditoProfessionale,
    redditoComplessivo,
    contributiDedotti,
    contributiPrevisti,
    oneriDeducibili,
    redditoImponibile,
    irpefLorda: { totale: lorda, perScaglione },
    detrazioneLavoro,
    ulterioreDetrazione: ulteriore,
    altreDetrazioni,
    irpefNetta,
    incapienza,
    scaglione,
    ritenute,
    differenza,
    accontiVersati,
    conguaglioIrpef,
    addizionali,
    conguaglioTotale,
    provvisorio: regoleDaVerificare.length > 0 || datiMancanti.length > 0,
    regoleDaVerificare,
    datiMancanti,
    spiegazioni,
  };
}
