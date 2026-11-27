import { GUIDE_APERTURA } from './apertura';
import { GUIDE_DICHIARAZIONI } from './dichiarazioni';
import { GUIDE_FATTURA } from './fattura';
import { GUIDE_PARTICOLARI } from './particolari';
import type { Frequenza, GruppoGuida, Guida, PertinenzaGuida } from './tipi';
import { GUIDE_VERSAMENTI } from './versamenti';

export type * from './tipi';
export { componi, ErroreSegnaposto, risolvi, SEGNAPOSTO, type Composto, type ContestoGuide } from './valori';

/** Guide agli adempimenti (specifica 015): indice, ricerca e controllo dell'età dei contenuti. */
export const GUIDE_ADEMPIMENTI: readonly Guida[] = [
  ...GUIDE_APERTURA,
  ...GUIDE_FATTURA,
  ...GUIDE_VERSAMENTI,
  ...GUIDE_DICHIARAZIONI,
  ...GUIDE_PARTICOLARI,
];

export const GRUPPI: { gruppo: GruppoGuida; titolo: string }[] = [
  { gruppo: 'apertura', titolo: 'Apertura' },
  { gruppo: 'fattura', titolo: 'Ogni fattura' },
  { gruppo: 'versamenti', titolo: 'Versamenti' },
  { gruppo: 'dichiarazioni', titolo: 'Dichiarazioni annuali' },
  { gruppo: 'particolari', titolo: 'Situazioni particolari' },
];

export const FREQUENZE: Record<Frequenza, string> = {
  una_volta: 'una volta',
  ogni_fattura: 'a ogni fattura',
  ogni_mese: 'ogni mese',
  ogni_trimestre: 'ogni trimestre',
  ogni_anno: 'ogni anno',
  se_serve: 'se serve',
};

export const PERTINENZE: Record<Exclude<PertinenzaGuida, 'sempre'>, string> = {
  iva: 'solo se emetti fatture con IVA',
  bollo: 'solo con fatture esenti sopra la soglia del bollo',
  sts: 'solo per le fatture ai pazienti',
};

const PER_ID = new Map(GUIDE_ADEMPIMENTI.map((g) => [g.id, g]));
export const guida = (id: string | null | undefined): Guida | undefined => (id ? PER_ID.get(id) : undefined);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Guide che contengono tutte le parole cercate in titolo, riga o parole chiave (FR-003). */
export function cercaGuide(testo: string): Guida[] {
  const parole = norm(testo).split(' ').filter(Boolean);
  if (!parole.length) return [...GUIDE_ADEMPIMENTI];
  return GUIDE_ADEMPIMENTI.filter((g) => {
    const dove = norm([g.titolo, g.riga, ...g.paroleChiave].join(' '));
    return parole.every((p) => dove.includes(p));
  });
}

/** Ultimo controllo più vecchio di 12 mesi (FR-015). */
export function daRicontrollare(g: Guida, oggi: string): boolean {
  const limite = `${Number(oggi.slice(0, 4)) - 1}${oggi.slice(4)}`;
  return g.ultimoControllo < limite;
}
