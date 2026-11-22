import { formattaEuro as e } from '../importi';
import { calcolaAnno, type InputAnno, type RisultatoAnno } from '../irpef/anno';
import { perAliquota } from '../irpef/aritmetica';
import { contributiEnpap } from '../irpef/enpap';
import { anniConRegoleIrpef, regoleIrpefPerAnno } from '../regole/irpef';
import { regoleSpesePerAnno } from '../regole/spese';
import type { BeneInput } from './ammortamento';
import { totaleSpeseAnno, type SpesaInput } from './deducibilita';
import { limiteVoce, oneriAnno, type OnereInput } from './oneri';

/**
 * Consigli per abbassare le tasse dell'anno (specifica 008, research R-04, R-05). Il risparmio viene
 * SEMPRE dal motore IRPEF della 001, confrontando l'anno con e senza la voce: nessuna aliquota scritta qui.
 * `input` è l'anno com'è oggi (spese e oneri già registrati compresi). Solo scelte su spese e versamenti,
 * mai sui tempi di incassi o fatture (FR-012).
 */
export type Ipotesi =
  | { tipo: 'spesa_professionale'; importo: number }
  | { tipo: 'deduzione'; importo: number }
  | { tipo: 'detrazione'; importo: number; aliquota: number };

const imposte = (r: RisultatoAnno) =>
  r.irpefNetta + (r.addizionali ? r.addizionali.regionale.dovuta + r.addizionali.comunale.dovuta : 0);

function applica(input: InputAnno, i: Ipotesi): InputAnno {
  if (i.tipo === 'spesa_professionale')
    return { ...input, redditoProfessionale: input.redditoProfessionale - i.importo };
  if (i.tipo === 'deduzione') return { ...input, oneriDeducibili: (input.oneriDeducibili ?? 0) + i.importo };
  return { ...input, altreDetrazioni: (input.altreDetrazioni ?? 0) + perAliquota(i.importo, i.aliquota) };
}

/** Contributo soggettivo ENPAP in meno con una spesa professionale (si paga l'anno dopo). */
function risparmioContributi(input: InputAnno, i: Ipotesi): number {
  if (i.tipo !== 'spesa_professionale' || !anniConRegoleIrpef().includes(input.anno)) return 0;
  const c = (reddito: number) =>
    contributiEnpap(input.anno, { redditoProfessionale: reddito, volumeAffari: 0 }).soggettivo;
  return c(input.redditoProfessionale) - c(input.redditoProfessionale - i.importo);
}

export type EsitoSimulazione = {
  importo: number;
  risparmioImposte: number;
  risparmioContributi: number;
  costoNetto: number;
  prima: RisultatoAnno;
  dopo: RisultatoAnno;
};

/** US4: effetto di una o più ipotesi, ciascuna rispetto all'anno di oggi. Non salva niente. */
export function simulaSpesa(
  input: InputAnno,
  ipotesi: Ipotesi[],
): { prima: RisultatoAnno; perOpzione: EsitoSimulazione[] } {
  const prima = calcolaAnno(structuredClone(input));
  return {
    prima,
    perOpzione: ipotesi.map((i) => {
      const dopo = calcolaAnno(applica(structuredClone(input), i));
      const risparmioImposte = imposte(prima) - imposte(dopo);
      return {
        importo: i.importo,
        risparmioImposte,
        risparmioContributi: risparmioContributi(input, i),
        costoNetto: i.importo - risparmioImposte,
        prima,
        dopo,
      };
    }),
  };
}

export type Consiglio = {
  codice: string;
  titolo: string;
  natura: 'comunque' | 'risparmio';
  vincolata: boolean;
  /** Quanto si può ancora usare quest'anno. */
  residuo: number;
  /** Risparmio d'imposta per ogni euro (frazione, su 100 € o sul residuo se minore). */
  risparmioPerEuro: number;
  risparmioMassimo: number;
  costoNetto: number;
  scadenza: string;
  avvertenze: string[];
  regola: string;
};

export type EsitoConsigli = {
  attivi: Consiglio[];
  esauriti: { codice: string; titolo: string }[];
  /** Voci non mostrate e perché (es. accantonamento non coperto). */
  nascosti: string[];
  risparmioTotale: number;
  motivoVuoto: string | null;
};

export function consigli(
  input: InputAnno,
  registrati: { spese: SpesaInput[]; oneri: OnereInput[]; beni: BeneInput[] },
  opzioni: {
    accantonamentoCoperto: boolean;
    oggi: string;
    figli: number;
    previdenzaInCu?: number;
    compensi?: number;
  },
): EsitoConsigli {
  const anno = input.anno;
  const regole = regoleSpesePerAnno(anno);
  const scadenza = `${anno}-${regole.scadenza.valore.pagamentoEntro}`;
  const vuoto = (motivo: string): EsitoConsigli => ({
    attivi: [],
    esauriti: [],
    nascosti: [],
    risparmioTotale: 0,
    motivoVuoto: motivo,
  });
  if (opzioni.oggi > scadenza)
    return vuoto(`Il ${anno} è finito: le spese contano nell'anno in cui le paghi, entro il 31 dicembre.`);

  const base = calcolaAnno(structuredClone(input));
  const candidati: {
    codice: string;
    titolo: string;
    natura: Consiglio['natura'];
    vincolata: boolean;
    residuo: number;
    ipotesi: (x: number) => Ipotesi;
    regola: string;
  }[] = [];
  const esauriti: EsitoConsigli['esauriti'] = [];
  const nascosti: string[] = [];

  // Spese professionali con un tetto annuo (es. formazione fino a 10.000 €)
  const spese = totaleSpeseAnno(registrati.spese, registrati.beni, {
    anno,
    compensi: opzioni.compensi ?? Math.max(0, input.redditoProfessionale),
  });
  for (const cat of regole.categorie.filter((c) => c.attivaDiDefault && c.tettoAnnuo != null)) {
    const usato = spese.perCategoria.find((c) => c.codice === cat.codice)?.deducibile ?? 0;
    const residuo = Math.max(0, cat.tettoAnnuo! - usato);
    if (residuo === 0) esauriti.push({ codice: cat.codice, titolo: cat.nome });
    else
      candidati.push({
        codice: cat.codice,
        titolo: cat.nome,
        natura: cat.natura,
        vincolata: false,
        residuo,
        ipotesi: (x) => ({ tipo: 'spesa_professionale', importo: x }),
        regola: cat.regola.fonte,
      });
  }

  // Oneri personali con un limite
  const contesto = {
    anno,
    redditoComplessivo: base.redditoComplessivo,
    figli: opzioni.figli,
    previdenzaInCu: opzioni.previdenzaInCu,
  };
  const oneri = oneriAnno(registrati.oneri, contesto);
  for (const v of regole.oneri) {
    let limite = limiteVoce(v, contesto);
    if (v.aliquotaMassimaVolontaria != null && anniConRegoleIrpef().includes(anno)) {
      const obbligatoria = regoleIrpefPerAnno(anno).enpap.aliquotaSoggettivo.valore;
      limite = perAliquota(
        Math.max(0, input.redditoProfessionale),
        Math.max(0, v.aliquotaMassimaVolontaria - obbligatoria),
      );
    }
    if (limite === null || limite === 0) continue;
    const usato = oneri.perVoce.find((p) => p.codice === v.codice)?.utile ?? 0;
    const residuo = Math.max(0, limite - usato);
    if (residuo === 0) {
      esauriti.push({ codice: v.codice, titolo: v.nome });
      continue;
    }
    if (v.vincolata && !opzioni.accantonamentoCoperto) {
      nascosti.push(
        `${v.nome}: compare quando confermi che l'accantonamento per le tasse è coperto (il denaro resta vincolato).`,
      );
      continue;
    }
    candidati.push({
      codice: v.codice,
      titolo: v.nome,
      natura: v.natura,
      vincolata: v.vincolata,
      residuo,
      ipotesi: (x) =>
        v.tipo === 'deduzione'
          ? { tipo: 'deduzione', importo: x }
          : { tipo: 'detrazione', importo: x, aliquota: v.aliquota ?? 0 },
      regola: v.regola.fonte,
    });
  }

  const risparmio = (i: Ipotesi) => imposte(base) - imposte(calcolaAnno(applica(structuredClone(input), i)));
  const attivi: Consiglio[] = candidati.map((c) => {
    const prova = Math.min(c.residuo, 100_00);
    const perEuro = Math.round((risparmio(c.ipotesi(prova)) / prova) * 10_000) / 10_000;
    const massimo = risparmio(c.ipotesi(c.residuo));
    const avvertenze = [
      `Deducibile non vuol dire gratis: spendendo ${e(c.residuo)} risparmi ${e(massimo)} di tasse, il costo netto è ${e(c.residuo - massimo)}.`,
    ];
    if (c.natura === 'risparmio')
      avvertenze.push('Conviene solo se ti serve davvero: non è una spesa da fare per forza.');
    if (c.vincolata)
      avvertenze.push('Il denaro resta vincolato fino alla pensione: valuta la liquidità che ti serve.');
    return {
      codice: c.codice,
      titolo: c.titolo,
      natura: c.natura,
      vincolata: c.vincolata,
      residuo: c.residuo,
      risparmioPerEuro: perEuro,
      risparmioMassimo: massimo,
      costoNetto: c.residuo - massimo,
      scadenza,
      avvertenze,
      regola: c.regola,
    };
  });
  attivi.sort((a, b) => b.risparmioPerEuro - a.risparmioPerEuro || b.risparmioMassimo - a.risparmioMassimo);
  const utili = attivi.filter((c) => c.risparmioMassimo > 0);
  return {
    attivi: utili,
    esauriti,
    nascosti,
    risparmioTotale: utili.reduce((t, c) => t + c.risparmioMassimo, 0),
    motivoVuoto:
      utili.length === 0 ? "Per ora non ci sono azioni che abbassano le tasse di quest'anno." : null,
  };
}
