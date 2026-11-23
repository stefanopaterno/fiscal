import { anniConRegole, regolePerAnno } from '../regole';
import { regoleAccantonamento } from '../regole/accantonamento';
import { regoleDocumenti } from '../regole/documenti';
import { anniConRegoleIrpef, regoleIrpefPerAnno } from '../regole/irpef';
import { anniConRegoleSpese, regoleSpesePerAnno } from '../regole/spese';

/**
 * Regole "da verificare" di tutti i set (specifica 012, FR-009, US4): si raccolgono da sole, così ogni
 * nuova regola provvisoria entra nell'elenco senza doverla ricordare a mano.
 */
export type RegolaAperta = { ambito: string; anno: number; percorso: string; valore: string; fonte: string };

function cerca(nodo: unknown, percorso: string, trovate: Omit<RegolaAperta, 'ambito' | 'anno'>[]) {
  if (nodo == null || typeof nodo !== 'object') return;
  const o = nodo as Record<string, unknown>;
  if ('valore' in o && 'fonte' in o && 'stato' in o) {
    if (o.stato === 'da_verificare')
      trovate.push({ percorso, valore: testoValore(o.valore), fonte: String(o.fonte) });
    return;
  }
  for (const [k, v] of Object.entries(o)) {
    const nome = Array.isArray(o) ? (codiceDi(v) ?? k) : k;
    cerca(v, percorso ? `${percorso}.${nome}` : nome, trovate);
  }
}

const codiceDi = (v: unknown) =>
  v && typeof v === 'object' && 'codice' in v ? String((v as { codice: unknown }).codice) : null;

function testoValore(v: unknown): string {
  if (v === null) return 'non ancora noto';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : `${Math.round(v * 10000) / 100}%`;
  if (typeof v === 'string' || typeof v === 'boolean') return String(v);
  return 'vedi fonte';
}

export function regoleAperte(): RegolaAperta[] {
  const out: RegolaAperta[] = [];
  const aggiungi = (ambito: string, anno: number, set: unknown) => {
    const t: Omit<RegolaAperta, 'ambito' | 'anno'>[] = [];
    cerca(set, '', t);
    out.push(...t.map((r) => ({ ambito, anno, ...r })));
  };
  for (const a of anniConRegoleIrpef()) aggiungi('IRPEF ed ENPAP', a, regoleIrpefPerAnno(a));
  for (const a of anniConRegole()) aggiungi('Fatturazione', a, regolePerAnno(a));
  for (const a of anniConRegoleSpese()) aggiungi('Spese e oneri', a, regoleSpesePerAnno(a));
  const ultimo = Math.max(...anniConRegoleIrpef());
  aggiungi('Accantonamento', ultimo, regoleAccantonamento(ultimo));
  aggiungi('Documenti', ultimo, regoleDocumenti(ultimo));
  return out;
}
