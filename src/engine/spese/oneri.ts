import { formattaEuro as e } from '../importi';
import { perAliquota } from '../irpef/aritmetica';
import { regoleSpesePerAnno, type VoceOnere } from '../regole/spese';
import type { ModalitaPagamento } from './deducibilita';

/**
 * Oneri personali deducibili e detraibili (specifica 008, research R-03): limite annuo, franchigia,
 * tracciabilità, residuo "fino a esaurimento" e tetto dell'art. 16-ter per i redditi oltre 75.000 €.
 */
export type OnereInput = { voce: string; importo: number; data: string; modalita: ModalitaPagamento };

export type ContestoOneri = {
  anno: number;
  /** Reddito complessivo dell'anno (per i limiti in % e l'art. 16-ter). */
  redditoComplessivo: number;
  figli: number;
  /** Previdenza complementare già versata tramite il datore (CU). */
  previdenzaInCu?: number;
};

export type EsitoVoce = {
  codice: string;
  nome: string;
  tipo: VoceOnere['tipo'];
  speso: number;
  /** Parte che dà vantaggio (deducibile, o base della detrazione). */
  utile: number;
  nonUtile: number;
  limite: number | null;
  residuo: number | null;
  esaurita: boolean;
  detrazione: number;
};

export type EsitoOneri = { deduzioni: number; detrazioni: number; perVoce: EsitoVoce[]; avvisi: string[] };

/** Limite annuo della voce in euro, al netto di quanto già usato fuori dall'app (CU). */
export function limiteVoce(v: VoceOnere, c: ContestoOneri): number | null {
  if (v.limite != null)
    return Math.max(0, v.limite - (v.codice === 'previdenza_complementare' ? (c.previdenzaInCu ?? 0) : 0));
  if (v.limiteSuReddito != null) return perAliquota(Math.max(0, c.redditoComplessivo), v.limiteSuReddito);
  return null;
}

export function oneriAnno(oneri: OnereInput[], c: ContestoOneri): EsitoOneri {
  const regole = regoleSpesePerAnno(c.anno);
  const avvisi: string[] = [];
  const perVoce: EsitoVoce[] = [];

  for (const v of regole.oneri) {
    const dellAnno = oneri.filter((o) => o.voce === v.codice && o.data.startsWith(`${c.anno}-`));
    const validi = dellAnno.filter((o) => !(v.richiedeTracciabilita && o.modalita === 'contanti'));
    if (validi.length < dellAnno.length)
      avvisi.push(
        `${v.nome}: i pagamenti in contanti potrebbero non dare diritto alla detrazione (serve un pagamento tracciabile).`,
      );
    const speso = dellAnno.reduce((t, o) => t + o.importo, 0);
    const valido = validi.reduce((t, o) => t + o.importo, 0);
    const limite = limiteVoce(v, c);
    const sopraFranchigia = Math.max(0, valido - (v.franchigia ?? 0));
    const utile = limite === null ? sopraFranchigia : Math.min(sopraFranchigia, limite);
    if (limite !== null && sopraFranchigia > limite)
      avvisi.push(
        `${v.nome}: superato il limite di ${e(limite)}, ${e(sopraFranchigia - limite)} non danno vantaggio.`,
      );
    perVoce.push({
      codice: v.codice,
      nome: v.nome,
      tipo: v.tipo,
      speso,
      utile,
      nonUtile: speso - utile,
      limite,
      residuo: limite === null ? null : Math.max(0, limite - utile),
      esaurita: limite !== null && utile >= limite && limite >= 0 && speso > 0,
      detrazione: 0,
    });
  }

  // Tetto dell'art. 16-ter sulle spese detraibili soggette (oltre 75.000 € di reddito complessivo)
  const t = regole.tetto16ter.valore;
  const soglia = [...t.soglie].reverse().find((s) => c.redditoComplessivo > s.oltre);
  if (soglia) {
    const coeff = t.coefficientiFigli[Math.min(c.figli, t.coefficientiFigli.length - 1)]!;
    let disponibile = perAliquota(soglia.base, coeff);
    const tetto = disponibile;
    for (const p of perVoce) {
      const v = regole.oneri.find((o) => o.codice === p.codice)!;
      if (v.tipo !== 'detrazione' || v.fuoriTetto16ter) continue;
      const ammessa = Math.min(p.utile, disponibile);
      if (ammessa < p.utile)
        avvisi.push(
          `${p.nome}: con un reddito oltre ${e(soglia.oltre)} le spese detraibili contano fino a ${e(tetto)} (art. 16-ter): ${e(p.utile - ammessa)} restano fuori.`,
        );
      p.nonUtile += p.utile - ammessa;
      p.utile = ammessa;
      disponibile -= ammessa;
    }
  }

  for (const p of perVoce) {
    const v = regole.oneri.find((o) => o.codice === p.codice)!;
    if (v.tipo === 'detrazione') p.detrazione = perAliquota(p.utile, v.aliquota ?? 0);
  }
  return {
    deduzioni: perVoce.filter((p) => p.tipo === 'deduzione').reduce((x, p) => x + p.utile, 0),
    detrazioni: perVoce.reduce((x, p) => x + p.detrazione, 0),
    perVoce,
    avvisi,
  };
}
