/**
 * "Oggi" per i conti dell'app. In modalità prova l'utente può scegliere una data di prova (per esempio
 * il 22 novembre 2027) e tutta l'app ragiona come se fosse quel giorno: anno corrente, date proposte,
 * consigli e scadenze. La data di prova vale solo su questo dispositivo e si cancella da sola quando
 * l'account passa in produzione (FasciaProva). Blocco per inattività, codici e sicurezza usano SEMPRE
 * l'orario vero (Date.now), mai questa funzione.
 */
const CHIAVE = 'fiscal.dataProva';
export const EVENTO_DATA_PROVA = 'fiscal-data-prova';

const due = (n: number) => String(n).padStart(2, '0');
/** Data locale "aaaa-mm-gg" (non UTC: dopo mezzanotte toISOString darebbe il giorno prima). */
export const isoLocale = (d: Date) => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;

export function dataProva(): string | null {
  try {
    const v = typeof localStorage === 'undefined' ? null : localStorage.getItem(CHIAVE);
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function impostaDataProva(iso: string | null) {
  try {
    if (iso) localStorage.setItem(CHIAVE, iso);
    else localStorage.removeItem(CHIAVE);
  } catch {
    /* archivio del browser non disponibile: si usa la data vera */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_DATA_PROVA));
}

/** Oggi come "aaaa-mm-gg" (data di prova se impostata). */
export const oggiIso = (): string => dataProva() ?? isoLocale(new Date());

/** Oggi come Date a mezzogiorno locale (data di prova se impostata). */
export function oggiData(): Date {
  const [a, m, g] = oggiIso().split('-').map(Number) as [number, number, number];
  return new Date(a, m - 1, g, 12);
}

export const annoCorrente = (): number => Number(oggiIso().slice(0, 4));
