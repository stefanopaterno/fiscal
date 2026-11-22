import { formattaEuro as e } from '../importi';
import { ErroreIrpef, regoleIrpefPerAnno } from '../regole/irpef';
import { perAliquota, percentualeInTesto, somma } from './aritmetica';
import { calcolaAcconti, type Acconti } from './acconti';
import type { RisultatoAnno } from './anno';

/**
 * Piani di versamento a confronto (storia 5, research R-06). L'imposta non cambia: cambiano i tempi e i
 * costi. Tutti i piani usano la stessa ipotesi sull'IRPEF dell'anno dopo (la stima previsionale se c'è,
 * altrimenti la "differenza" di quest'anno), così il totale d'imposta è identico (SC-007).
 * Nessun piano sposta incassi o fatture (FR-029): solo scelte su tempi e metodo di versamento.
 */
export type TipoPiano = 'storico' | 'previsionale' | 'volontario' | 'rateizzazione' | 'differimento';

export type Versamento = {
  mese: string;
  voce: 'giugno' | 'acconto_irpef_2' | 'acconto_volontario' | 'saldo_anno_dopo' | 'enpap';
  /** Imposta (o contributi per la voce enpap); negativo = credito che torna. */
  importo: number;
  /** Interessi o maggiorazione su questo versamento. */
  costo: number;
  descrizione: string;
};

export type Piano = {
  tipo: TipoPiano;
  titolo: string;
  versamenti: Versamento[];
  picco: { mese: string; importo: number };
  costi: number;
  rischio: string | null;
  totaleImposta: number;
  totaleContributi: number;
  consigliato: boolean;
  spiegazione: string;
};

export type OpzioniPiani = {
  soggettoIsa: boolean;
  /** Stima dell'IRPEF dell'anno dopo meno le ritenute attese (metodo previsionale). */
  differenzaAttesa?: number | null;
  volontario?: { importo: number; mese: string } | null;
  numeroRate?: number;
  /** Contributi ENPAP sul reddito dell'anno, nel mese di scadenza (uguali in tutti i piani). */
  contributiEnpap?: { importo: number; mese: string } | null;
};

const meseDi = (anno: number, m: number) => `${anno}-${String(m).padStart(2, '0')}`;
const meseInTesto = (mese: string) => {
  const [a, m] = mese.split('-');
  const nomi = [
    'gennaio',
    'febbraio',
    'marzo',
    'aprile',
    'maggio',
    'giugno',
    'luglio',
    'agosto',
    'settembre',
    'ottobre',
    'novembre',
    'dicembre',
  ];
  return `${nomi[Number(m) - 1]} ${a}`;
};

function picco(versamenti: Versamento[]): Piano['picco'] {
  const perMese = new Map<string, number>();
  for (const v of versamenti) perMese.set(v.mese, (perMese.get(v.mese) ?? 0) + v.importo + v.costo);
  let max = { mese: '', importo: 0 };
  for (const [mese, importo] of [...perMese].sort()) if (importo > max.importo) max = { mese, importo };
  return max;
}

export function pianiVersamento(base: RisultatoAnno, op: OpzioniPiani): Piano[] {
  const regole = regoleIrpefPerAnno(base.anno);
  const pa = regole.acconti.valore;
  const rate = regole.rateizzazione.valore;
  const diff = regole.differimento.valore;
  const annoDopo = base.anno + 1;
  const giugno = meseDi(annoDopo, pa.mesePrimo);
  const novembre = meseDi(annoDopo, pa.meseSecondo);
  const giugnoDueAnni = meseDi(annoDopo + 1, pa.mesePrimo);

  // Voci di giugno senza il primo acconto: saldo IRPEF, saldi delle addizionali, acconto comunale.
  const saldi =
    base.conguaglioIrpef +
    (base.addizionali ? base.addizionali.regionale.conguaglio + base.addizionali.comunale.conguaglio : 0) +
    (base.addizionali?.comunale.accontoAnnoDopo ?? 0);
  const ipotesi = Math.max(0, op.differenzaAttesa ?? base.differenza);
  const totaleImposta = saldi + ipotesi;

  const storico = calcolaAcconti(base, { metodo: 'storico', soggettoIsa: op.soggettoIsa });
  const enpap: Versamento[] = op.contributiEnpap
    ? [
        {
          mese: op.contributiEnpap.mese,
          voce: 'enpap',
          importo: op.contributiEnpap.importo,
          costo: 0,
          descrizione: 'Contributi ENPAP (saldo)',
        },
      ]
    : [];

  /** Giugno, novembre e l'eventuale saldo dell'anno dopo per un certo insieme di acconti. */
  const base3 = (acc: Acconti, credito = 0): Versamento[] => {
    let residuo = credito;
    const scala = (importo: number) => {
      const usato = Math.min(Math.max(importo, 0), residuo);
      residuo -= usato;
      return importo - usato;
    };
    const g = scala(saldi + acc.primo);
    const n = scala(acc.secondo);
    const finale = ipotesi - acc.totale - residuo;
    const out: Versamento[] = [
      {
        mese: giugno,
        voce: 'giugno',
        importo: g,
        costo: 0,
        descrizione: `Saldo ${base.anno}, addizionali e primo acconto ${annoDopo}`,
      },
      {
        mese: novembre,
        voce: 'acconto_irpef_2',
        importo: n,
        costo: 0,
        descrizione: `Secondo acconto ${annoDopo}`,
      },
    ];
    if (finale !== 0)
      out.push({
        mese: giugnoDueAnni,
        voce: 'saldo_anno_dopo',
        importo: finale,
        costo: 0,
        descrizione:
          finale > 0
            ? `Saldo ${annoDopo} (la parte non coperta dagli acconti)`
            : `Credito sul ${annoDopo} (acconti oltre l'imposta stimata)`,
      });
    return out.filter((v) => v.importo !== 0 || v.voce === 'giugno');
  };

  const piani: Omit<Piano, 'picco' | 'costi' | 'totaleImposta' | 'totaleContributi' | 'consigliato'>[] = [];

  piani.push({
    tipo: 'storico',
    titolo: 'Minimo di legge (metodo storico)',
    versamenti: base3(storico),
    rischio: null,
    spiegazione: `Paghi gli acconti calcolati sull'imposta ${base.anno}: è il metodo più sicuro, nessuna sanzione possibile. ${storico.spiegazione}`,
  });

  if (op.differenzaAttesa != null) {
    const prev = calcolaAcconti(base, {
      metodo: 'previsionale',
      differenzaAttesa: op.differenzaAttesa,
      soggettoIsa: op.soggettoIsa,
    });
    piani.push({
      tipo: 'previsionale',
      titolo: 'Metodo previsionale',
      versamenti: base3(prev),
      rischio:
        prev.totale < storico.totale
          ? `Versi ${e(storico.totale - prev.totale)} in meno del metodo storico: se l'imposta ${annoDopo} supera la tua stima, sulla differenza paghi interessi e una sanzione del 25% (ridotta con il ravvedimento).`
          : null,
      spiegazione: `Acconti calcolati sull'imposta che prevedi per il ${annoDopo} (${e(op.differenzaAttesa)}). Conviene solo se sei sicuro che il reddito scenderà.`,
    });
  }

  if (op.volontario && op.volontario.importo > 0) {
    const v = op.volontario;
    if (!/^\d{4}-\d{2}$/.test(v.mese) || v.mese >= giugno)
      throw new ErroreIrpef(`L'acconto volontario va versato prima di ${meseInTesto(giugno)}.`);
    piani.push({
      tipo: 'volontario',
      titolo: 'Acconto volontario anticipato',
      versamenti: [
        {
          mese: v.mese,
          voce: 'acconto_volontario',
          importo: v.importo,
          costo: 0,
          descrizione: 'Versamento volontario in acconto',
        },
        ...base3(storico, v.importo),
      ],
      rischio: null,
      spiegazione: `Versi ${e(v.importo)} a ${meseInTesto(v.mese)}: non è un costo in più ma un anticipo che scali da quanto devi a ${meseInTesto(giugno)}. Se supera il dovuto diventa un credito. Da confermare con il commercialista come indicarlo in F24.`,
    });
  }

  // Rateizzazione di giugno (saldo, addizionali, primo acconto); il secondo acconto non si rateizza.
  const n = Math.min(Math.max(op.numeroRate ?? rate.maxRate, 2), rate.maxRate);
  const totaleGiugno = Math.max(0, saldi + storico.primo);
  const rata = Math.floor(totaleGiugno / n);
  const prima = totaleGiugno - rata * (n - 1);
  const [, mesePrimoNum] = giugno.split('-').map(Number) as [number, number];
  const rateVers: Versamento[] = Array.from({ length: n }, (_, k) => {
    const importo = k === 0 ? prima : rata;
    return {
      mese: meseDi(annoDopo, mesePrimoNum + k),
      voce: 'giugno' as const,
      importo,
      costo: perAliquota(importo, rate.interessiPerRata[k] ?? 0),
      descrizione: `Rata ${k + 1} di ${n}`,
    };
  });
  const restoStorico = base3(storico).filter((x) => x.voce !== 'giugno');
  piani.push({
    tipo: 'rateizzazione',
    titolo: `Rateizzazione in ${n} rate`,
    versamenti: [...rateVers, ...restoStorico],
    rischio: null,
    spiegazione: `Saldo, addizionali e primo acconto (${e(totaleGiugno)}) divisi in ${n} rate mensili da ${meseInTesto(giugno)}, con interessi del 4% l'anno dalla seconda rata (${e(somma(rateVers.map((x) => x.costo)))} in tutto). Il secondo acconto di novembre non si può rateizzare.`,
  });

  // Differimento di 30 giorni con la maggiorazione.
  const luglio = meseDi(annoDopo, mesePrimoNum + 1);
  piani.push({
    tipo: 'differimento',
    titolo: 'Rinvio di 30 giorni con lo 0,40%',
    versamenti: [
      {
        mese: luglio,
        voce: 'giugno',
        importo: totaleGiugno,
        costo: perAliquota(totaleGiugno, diff.maggiorazione),
        descrizione: 'Versamento di giugno rinviato',
      },
      ...restoStorico,
    ],
    rischio: null,
    spiegazione: `Versi a ${meseInTesto(luglio)} invece che a giugno, con una maggiorazione del ${percentualeInTesto(diff.maggiorazione)}. Sposta il picco, non lo abbassa.`,
  });

  const completi: Piano[] = piani.map((p) => {
    const versamenti = [...p.versamenti, ...enpap];
    return {
      ...p,
      versamenti,
      picco: picco(versamenti),
      costi: somma(versamenti.map((x) => x.costo)),
      totaleImposta: somma(versamenti.filter((x) => x.voce !== 'enpap').map((x) => x.importo)),
      totaleContributi: somma(versamenti.filter((x) => x.voce === 'enpap').map((x) => x.importo)),
      consigliato: false,
    };
  });

  for (const p of completi)
    if (p.totaleImposta !== totaleImposta) throw new Error(`Piano ${p.tipo}: totale d'imposta incoerente`);

  // Consigliato: picco più basso tra i piani senza rischio; a parità, costi minori.
  const candidati = completi.filter((p) => p.rischio === null);
  const migliore = [...candidati].sort((a, b) => a.picco.importo - b.picco.importo || a.costi - b.costi)[0];
  if (migliore) {
    migliore.consigliato = true;
    const storicoP = completi.find((p) => p.tipo === 'storico')!;
    if (migliore.tipo !== 'storico')
      migliore.spiegazione += ` Consigliato: il mese più pesante scende da ${e(storicoP.picco.importo)} a ${e(migliore.picco.importo)}${migliore.costi > 0 ? ` con ${e(migliore.costi)} di costi` : ' senza costi'}.`;
  }
  return completi;
}
