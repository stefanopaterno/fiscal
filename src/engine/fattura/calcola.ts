import { regolePerAnno, type RegoleFatturazione } from '../regole';

/**
 * Calcolo della fattura (specifica 003, research R-02, contratto motore-fattura).
 * Tutti gli importi sono in CENTESIMI interi. Arrotondamento commerciale al centesimo (0,5 per eccesso),
 * fatto una sola volta per voce con aritmetica intera.
 */
export type Natura = 'esente_sanitaria' | 'imponibile';

export type RigaInput = { compenso: number; quantita?: number; natura: Natura };

export type InputFattura = {
  anno: number;
  /** Data della fattura (AAAA-MM-GG): sceglie i parametri in vigore quel giorno (specifica 014). */
  data?: string;
  righe: RigaInput[];
  sostitutoImposta: boolean;
  bolloACarico: 'paziente' | 'professionista';
  opposizioneSts?: boolean;
  /**
   * Il prezzo scritto comprende già il contributo integrativo ENPAP (scorporo): il paziente paga il prezzo
   * e il contributo resta a carico del professionista. In fattura il contributo compare comunque.
   */
  integrativoCompreso?: boolean;
};

/** Riga calcolata: con l'integrativo compreso `compenso` è quello scorporato (unitario). */
export type RigaCalcolata = RigaInput & { totaleCompenso: number; integrativo: number; prezzo: number };

export type RisultatoFattura = {
  righe: RigaCalcolata[];
  totaleCompensi: number;
  totaleIntegrativo: number;
  imponibileIva: number;
  iva: number;
  importoEsente: number;
  bollo: number;
  bolloAddebitato: boolean;
  ritenuta: number;
  totale: number;
  netto: number;
  diciture: string[];
  spiegazioni: string[];
  regoleDaVerificare: string[];
};

/** Percentuale di un importo in centesimi, arrotondata al centesimo (0,5 per eccesso), senza errori di virgola. */
export function percentuale(centesimi: number, aliquota: number): number {
  const puntiBase = Math.round(aliquota * 10000); // es. 0,04 → 400
  const prodotto = centesimi * puntiBase; // intero
  const quoziente = Math.floor(prodotto / 10000);
  const resto = prodotto - quoziente * 10000;
  return resto * 2 >= 10000 ? quoziente + 1 : quoziente;
}

/**
 * Scorporo: dal prezzo comprensivo ricava il compenso unitario tale che compenso + integrativo = prezzo.
 * Se nessun compenso al centesimo dà esattamente il prezzo, usa il più vicino (scarto di 1 centesimo).
 */
export function scorporaIntegrativo(
  prezzo: number,
  aliquota: number,
): { compenso: number; integrativo: number } {
  const puntiBase = Math.round(aliquota * 10000);
  const stima = Math.round((prezzo * 10000) / (10000 + puntiBase));
  for (const c of [stima, stima - 1, stima + 1]) {
    if (c >= 0 && c + percentuale(c, aliquota) === prezzo)
      return { compenso: c, integrativo: percentuale(c, aliquota) };
  }
  return { compenso: stima, integrativo: percentuale(stima, aliquota) };
}

const euro = (centesimi: number) =>
  (centesimi / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const percento = (aliquota: number) => `${Math.round(aliquota * 10000) / 100}%`;

function regoleNonVerificate(r: RegoleFatturazione): string[] {
  const voci: Array<[string, { stato: string }]> = [
    ['aliquotaIntegrativo', r.aliquotaIntegrativo],
    ['aliquotaIva', r.aliquotaIva],
    ['sogliaBollo', r.sogliaBollo],
    ['importoBollo', r.importoBollo],
    ['aliquotaRitenuta', r.aliquotaRitenuta],
    ['integrativoFuoriRitenuta', r.integrativoFuoriRitenuta],
  ];
  return voci.filter(([, v]) => v.stato === 'da_verificare').map(([nome]) => nome);
}

export function calcolaFattura(input: InputFattura): RisultatoFattura {
  const regole = regolePerAnno(input.anno, input.data);
  if (input.righe.length === 0) throw new Error('La fattura deve avere almeno una riga.');

  const aliquotaIntegrativo = regole.aliquotaIntegrativo.valore;
  const righe: RigaCalcolata[] = input.righe.map((riga) => {
    const quantita = riga.quantita ?? 1;
    if (!Number.isInteger(riga.compenso) || riga.compenso < 0) {
      throw new Error('Il compenso deve essere un importo in centesimi non negativo.');
    }
    if (!Number.isInteger(quantita) || quantita < 1) throw new Error('La quantità deve essere almeno 1.');
    if (input.integrativoCompreso) {
      const u = scorporaIntegrativo(riga.compenso, aliquotaIntegrativo);
      return {
        ...riga,
        compenso: u.compenso,
        quantita,
        prezzo: riga.compenso,
        totaleCompenso: u.compenso * quantita,
        // contributo per prestazione × quantità: il totale torna esatto (4 sedute da 80 € = 320 €)
        integrativo: u.integrativo * quantita,
      };
    }
    const totaleCompenso = riga.compenso * quantita;
    return {
      ...riga,
      quantita,
      prezzo: riga.compenso,
      totaleCompenso,
      integrativo: percentuale(totaleCompenso, aliquotaIntegrativo),
    };
  });

  const somma = (f: (r: RigaCalcolata) => number) => righe.reduce((s, r) => s + f(r), 0);
  const totaleCompensi = somma((r) => r.totaleCompenso);
  const totaleIntegrativo = somma((r) => r.integrativo);
  const imponibileIva = somma((r) => (r.natura === 'imponibile' ? r.totaleCompenso + r.integrativo : 0));
  const importoEsente = somma((r) =>
    r.natura === 'esente_sanitaria' ? r.totaleCompenso + r.integrativo : 0,
  );
  const iva = percentuale(imponibileIva, regole.aliquotaIva.valore);

  const bollo = importoEsente > regole.sogliaBollo.valore ? regole.importoBollo.valore : 0;
  const bolloAddebitato = bollo > 0 && input.bolloACarico === 'paziente';

  const baseRitenuta = regole.integrativoFuoriRitenuta.valore
    ? totaleCompensi
    : totaleCompensi + totaleIntegrativo;
  const ritenuta = input.sostitutoImposta ? percentuale(baseRitenuta, regole.aliquotaRitenuta.valore) : 0;

  const totale = imponibileIva + iva + importoEsente + (bolloAddebitato ? bollo : 0);
  const netto = totale - ritenuta;

  const diciture: string[] = [];
  if (importoEsente > 0) diciture.push(regole.diciture.esenzione);
  if (bollo > 0) diciture.push(regole.diciture.bollo);
  if (input.opposizioneSts) diciture.push(regole.diciture.opposizioneSts);

  const spiegazioni: string[] = [
    input.integrativoCompreso
      ? `Contributo integrativo ENPAP ${percento(aliquotaIntegrativo)} compreso nel prezzo: dal prezzo togli il contributo (${euro(totaleIntegrativo)}) e il tuo compenso è ${euro(totaleCompensi)}. Il paziente paga il prezzo pieno; il contributo compare in fattura e lo versi all'ENPAP, quindi è a carico tuo.`
      : `Contributo integrativo ENPAP ${percento(aliquotaIntegrativo)} sui compensi: ${euro(totaleIntegrativo)}. È un contributo che chiedi in più al paziente e versi all'ENPAP: non è tuo reddito.`,
  ];
  if (importoEsente > 0) {
    spiegazioni.push(
      `Le prestazioni sanitarie da psicologo sono esenti IVA: ${euro(importoEsente)} senza IVA.`,
    );
  }
  if (imponibileIva > 0) {
    spiegazioni.push(
      `Le attività non sanitarie hanno l'IVA al ${percento(regole.aliquotaIva.valore)} su compenso e contributo: ${euro(iva)} da versare allo Stato.`,
    );
  }
  if (bollo > 0) {
    spiegazioni.push(
      bolloAddebitato
        ? `Bollo da ${euro(bollo)}: serve perché la parte esente supera ${euro(regole.sogliaBollo.valore)}; lo paga il paziente.`
        : `Bollo da ${euro(bollo)}: serve perché la parte esente supera ${euro(regole.sogliaBollo.valore)}; lo paghi tu ed è una spesa dell'attività.`,
    );
  } else if (importoEsente > 0) {
    spiegazioni.push(`Nessun bollo: la parte esente non supera ${euro(regole.sogliaBollo.valore)}.`);
  }
  if (ritenuta > 0) {
    spiegazioni.push(
      `Ritenuta d'acconto ${percento(regole.aliquotaRitenuta.valore)} sul compenso: ${euro(ritenuta)}. Il cliente la trattiene e la versa allo Stato per te; la recuperi nella dichiarazione dei redditi.`,
    );
  }

  return {
    righe,
    totaleCompensi,
    totaleIntegrativo,
    imponibileIva,
    iva,
    importoEsente,
    bollo,
    bolloAddebitato,
    ritenuta,
    totale,
    netto,
    diciture,
    spiegazioni,
    regoleDaVerificare: regoleNonVerificate(regole),
  };
}
