import { formattaEuro } from '../../importi';
import { percentualeInTesto } from '../../irpef/aritmetica';
import { origineParametro } from '../../parametri/origine';
import { lavorativo } from '../../scadenze/calendario';
import { regolePerAnno } from '..';
import { regoleAdempimenti, type RegoleAdempimenti } from '../adempimenti';
import { regoleF24, type RegoleF24 } from '../f24';
import { regoleIrpefPerAnno } from '../irpef';
import { regoleScadenze } from '../scadenze';
import type { Regola } from '../tipi';
import type { Testo } from './tipi';

/**
 * Segnaposto delle guide (specifica 015, data-model.md «Testo e segnaposto», research.md R-01). Ogni valore viene
 * dalle regole in vigore oggi (programma + registro della 014). Un segnaposto sconosciuto è un errore.
 */
export type ContestoGuide = { anno: number; oggi: string };
export type Risolto = { valore: string; regola: Regola<unknown>; chiaveParametro?: string };

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const dataEstesa = (iso: string) => `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

export class ErroreSegnaposto extends Error {}

/** Valore di un segnaposto (senza graffe), es. `f24.irpef_saldo`. */
export function risolvi(chiave: string, c: ContestoGuide): Risolto {
  const [tipo, nome, ...resto] = chiave.split('.');
  if (!nome || resto.length) throw new ErroreSegnaposto(`segnaposto non valido: ${chiave}`);
  switch (tipo) {
    case 'f24': {
      const r = regoleF24(c.anno, c.oggi).codici[nome as keyof RegoleF24['codici']];
      if (!r) break;
      return { valore: r.valore.codice, regola: r, chiaveParametro: `f24.${nome}` };
    }
    case 'scadenza': {
      // prossima occorrenza da oggi: quest'anno o il prossimo, spostata al primo giorno lavorativo
      for (const anno of [c.anno, c.anno + 1]) {
        const r = regoleScadenze(anno).scadenze.find((s) => s.valore.chiave === nome);
        if (!r) break;
        const data = lavorativo(`${anno}-${r.valore.data}`);
        if (data >= c.oggi || anno === c.anno + 1)
          return { valore: dataEstesa(data), regola: r, chiaveParametro: `scadenze.${nome}.data` };
      }
      break;
    }
    case 'fattura': {
      const f = regolePerAnno(c.anno, c.oggi) as unknown as Record<string, Regola<unknown> | undefined>;
      const mappa: Record<string, [string, 'pct' | 'euro', string]> = {
        aliquota_integrativo: ['aliquotaIntegrativo', 'pct', 'fattura.aliquota_integrativo'],
        aliquota_iva: ['aliquotaIva', 'pct', 'fattura.aliquota_iva'],
        soglia_bollo: ['sogliaBollo', 'euro', 'fattura.soglia_bollo'],
        importo_bollo: ['importoBollo', 'euro', 'fattura.importo_bollo'],
        aliquota_ritenuta: ['aliquotaRitenuta', 'pct', 'fattura.aliquota_ritenuta'],
      };
      const m = mappa[nome];
      const r = m ? f[m[0]] : undefined;
      if (!m || !r) break;
      return { valore: m[1] === 'pct' ? percentualeInTesto(r.valore as number) : formattaEuro(r.valore as number), regola: r, chiaveParametro: m[2] };
    }
    case 'enpap': {
      const e = regoleIrpefPerAnno(c.anno).enpap;
      if (nome === 'aliquota_soggettivo') return { valore: percentualeInTesto(e.aliquotaSoggettivo.valore), regola: e.aliquotaSoggettivo, chiaveParametro: 'enpap.aliquota_soggettivo' };
      break;
    }
    case 'adempimenti': {
      const a = regoleAdempimenti(c.anno, c.oggi);
      const mappa: Record<string, keyof Omit<RegoleAdempimenti, 'anno'>> = {
        codice_ateco: 'codiceAteco',
        natura_esente: 'naturaEsente',
        giorni_iscrizione_enpap: 'giorniIscrizioneEnpap',
        soglia_accorpamento_bollo: 'sogliaAccorpamentoBollo',
      };
      const k = mappa[nome];
      if (!k) break;
      const r = a[k] as Regola<unknown>;
      return {
        valore: k === 'sogliaAccorpamentoBollo' ? formattaEuro(r.valore as number) : String(r.valore),
        regola: r,
        chiaveParametro: `adempimenti.${nome}`,
      };
    }
  }
  throw new ErroreSegnaposto(`segnaposto sconosciuto: ${chiave}`);
}

export const SEGNAPOSTO = /\{\{([a-z0-9_.]+)\}\}/g;

export type Composto = {
  testo: string;
  /** Valori citati ancora «da verificare» (testo per l'utente). */
  daVerificare: string[];
  /** Valori citati che vengono da un aggiornamento importato (014). */
  aggiornati: string[];
};

/** Testo con i segnaposto sostituiti dai valori in vigore. */
export function componi(testo: Testo, c: ContestoGuide): Composto {
  const daVerificare: string[] = [];
  const aggiornati: string[] = [];
  const out = testo.replace(SEGNAPOSTO, (_, chiave: string) => {
    const r = risolvi(chiave, c);
    if (r.regola.stato === 'da_verificare') daVerificare.push(`${r.valore}: ${r.regola.fonte}`);
    if (r.chiaveParametro) {
      const contesto = r.chiaveParametro.startsWith('scadenze.') ? { anno: c.anno } : { anno: c.anno, data: c.oggi };
      if (origineParametro(r.chiaveParametro, contesto)?.tipo === 'aggiornamento') aggiornati.push(r.valore);
    }
    return r.valore;
  });
  return { testo: out, daVerificare, aggiornati };
}
