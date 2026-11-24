/**
 * Paziente e riservatezza (specifica 005, FR-013): data di nascita ricavata dal codice fiscale (serve solo a
 * distinguere minori e maggiorenni, nessun campo in più nell'anagrafica) e nome mostrato come iniziali e anno.
 */
export type Nascita = { anno: number; mese: number; giorno: number };

const MESI = 'ABCDEHLMPRST';
// Omocodia: le cifre del codice fiscale possono essere sostituite da queste lettere
const OMOCODIA = 'LMNPQRSTUV';
const cifra = (c: string) => (/\d/.test(c) ? c : String(OMOCODIA.indexOf(c)));

/**
 * Data di nascita dal codice fiscale di una persona (16 caratteri). Il secolo si sceglie in modo che la persona
 * non sia nata nel futuro rispetto a `oggi`. Restituisce null per codici non validi o delle società.
 */
export function nascitaDaCodiceFiscale(cf: string | null | undefined, oggi: string): Nascita | null {
  const c = (cf ?? '').trim().toUpperCase();
  if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(c)) return null;
  const aa = Number(cifra(c[6]!) + cifra(c[7]!));
  const mese = MESI.indexOf(c[8]!) + 1;
  let giorno = Number(cifra(c[9]!) + cifra(c[10]!));
  if (giorno > 40) giorno -= 40; // donne: giorno + 40
  if (giorno < 1 || giorno > 31) return null;
  const annoOggi = Number(oggi.slice(0, 4));
  let anno = 2000 + aa;
  const iso = (a: number) => `${a}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
  if (iso(anno) > oggi || anno > annoOggi) anno -= 100;
  return { anno, mese, giorno };
}

/** Età compiuta alla data indicata (AAAA-MM-GG). */
export function eta(n: Nascita, data: string): number {
  const [a, m, g] = data.split('-').map(Number) as [number, number, number];
  return a - n.anno - (m < n.mese || (m === n.mese && g < n.giorno) ? 1 : 0);
}

/** Data dei 18 anni. */
export function diciottoAnni(n: Nascita): string {
  // 29 febbraio: si diventa maggiorenni il 1° marzo negli anni non bisestili
  const anno = n.anno + 18;
  const bisestile = (anno % 4 === 0 && anno % 100 !== 0) || anno % 400 === 0;
  if (n.mese === 2 && n.giorno === 29 && !bisestile) return `${anno}-03-01`;
  return `${anno}-${String(n.mese).padStart(2, '0')}-${String(n.giorno).padStart(2, '0')}`;
}

type Anagrafica = {
  tipo: 'persona_fisica' | 'ente';
  nome?: string | null;
  cognome?: string | null;
  denominazione?: string | null;
  codice_fiscale?: string | null;
};

/** Iniziali (nome e cognome) e anno di nascita, es. «M.R. 2008». Gli enti restano con la denominazione. */
export function nomeRiservato(c: Anagrafica, oggi: string): string {
  if (c.tipo === 'ente') return (c.denominazione ?? '').trim();
  const iniziale = (t: string | null | undefined) => {
    const x = (t ?? '').trim();
    return x ? `${x[0]!.toUpperCase()}.` : '';
  };
  const n = nascitaDaCodiceFiscale(c.codice_fiscale, oggi);
  return `${iniziale(c.nome)}${iniziale(c.cognome)}${n ? ` ${n.anno}` : ''}`.trim() || 'Paziente';
}
