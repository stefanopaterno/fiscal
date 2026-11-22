import { nomeCliente } from '@/engine/validazioni/cliente';
import type { Cliente, Fattura } from './dati';

/**
 * Logica della rubrica clienti (senza interfaccia): ricerca che ignora maiuscole e accenti, filtro per
 * tipo, gruppi per lettera iniziale (come la rubrica del telefono) e riepilogo delle fatture di ciascuno.
 */
export type FiltroTipo = 'tutti' | 'persona_fisica' | 'ente';

export type VoceRubrica = {
  cliente: Cliente;
  nome: string;
  iniziali: string;
  fatture: number;
  ultimaFattura: string | null;
};

export type GruppoRubrica = { lettera: string; voci: VoceRubrica[] };

/** "Così È" → "cosi e": per cercare senza badare ad accenti e maiuscole. */
export const normalizza = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function iniziali(c: Pick<Cliente, 'tipo' | 'nome' | 'cognome' | 'denominazione'>): string {
  if (c.tipo === 'ente') {
    const parole = (c.denominazione ?? '').trim().split(/\s+/).filter(Boolean);
    return parole
      .slice(0, 2)
      .map((p) => p[0]!)
      .join('')
      .toUpperCase();
  }
  return `${(c.nome ?? '').trim()[0] ?? ''}${(c.cognome ?? '').trim()[0] ?? ''}`.toUpperCase();
}

/** Lettera del gruppo: la prima del nome in rubrica (cognome o ragione sociale), "#" se non è una lettera. */
function lettera(nome: string): string {
  const l = normalizza(nome)[0]?.toUpperCase() ?? '#';
  return /[A-Z]/.test(l) ? l : '#';
}

export function rubrica(
  clienti: Cliente[],
  fatture: Pick<Fattura, 'cliente_id' | 'tipo' | 'stato' | 'data'>[],
  cerca: string,
  tipo: FiltroTipo,
): { gruppi: GruppoRubrica[]; trovati: number } {
  const perCliente = new Map<string, { n: number; ultima: string | null }>();
  for (const f of fatture) {
    if (f.tipo !== 'fattura' || f.stato === 'bozza') continue;
    const x = perCliente.get(f.cliente_id) ?? { n: 0, ultima: null };
    x.n += 1;
    if (!x.ultima || f.data > x.ultima) x.ultima = f.data;
    perCliente.set(f.cliente_id, x);
  }
  const q = normalizza(cerca);
  const voci: VoceRubrica[] = clienti
    .filter((c) => tipo === 'tutti' || c.tipo === tipo)
    .map((c) => ({
      cliente: c,
      nome: nomeCliente(c),
      iniziali: iniziali(c),
      fatture: perCliente.get(c.id)?.n ?? 0,
      ultimaFattura: perCliente.get(c.id)?.ultima ?? null,
    }))
    .filter(({ cliente: c, nome }) => {
      if (!q) return true;
      const campi = [nome, `${c.nome ?? ''} ${c.cognome ?? ''}`, c.codice_fiscale, c.partita_iva, c.comune];
      return campi.some((x) => x && normalizza(x).includes(q));
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));

  const gruppi: GruppoRubrica[] = [];
  for (const v of voci) {
    const l = lettera(v.nome);
    const ultimo = gruppi.at(-1);
    if (ultimo?.lettera === l) ultimo.voci.push(v);
    else gruppi.push({ lettera: l, voci: [v] });
  }
  return { gruppi, trovati: voci.length };
}
