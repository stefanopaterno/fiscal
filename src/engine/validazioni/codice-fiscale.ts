/**
 * Controllo formale del codice fiscale delle persone fisiche (specifica 003, FR-002, research R-09):
 * struttura, mese, giorno, omocodie e carattere di controllo (DM 23/12/1976). Nessuna verifica online.
 */
const DISPARI: Record<string, number> = {};
const PARI: Record<string, number> = {};
const VALORI_DISPARI = [
  1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23,
];
'0123456789'.split('').forEach((c, i) => {
  DISPARI[c] = VALORI_DISPARI[i]!;
  PARI[c] = i;
});
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => {
  DISPARI[c] = VALORI_DISPARI[i]!;
  PARI[c] = i;
});

const MESI = 'ABCDEHLMPRST';
const OMOCODIA = 'LMNPQRSTUV'; // lettere che sostituiscono le cifre 0-9
const POSIZIONI_NUMERICHE = [6, 7, 9, 10, 12, 13, 14];

const cifra = (c: string) => (/[0-9]/.test(c) ? Number(c) : OMOCODIA.indexOf(c));

export function codiceFiscaleValido(valore: string): boolean {
  const cf = valore.trim().toUpperCase();
  if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf))
    return false;
  for (const p of POSIZIONI_NUMERICHE) if (cifra(cf[p]!) < 0) return false;
  if (!MESI.includes(cf[8]!)) return false;
  const giorno = cifra(cf[9]!) * 10 + cifra(cf[10]!);
  if (!((giorno >= 1 && giorno <= 31) || (giorno >= 41 && giorno <= 71))) return false; // +40 per le donne
  let somma = 0;
  for (let i = 0; i < 15; i++) somma += i % 2 === 0 ? DISPARI[cf[i]!]! : PARI[cf[i]!]!;
  return String.fromCharCode(65 + (somma % 26)) === cf[15];
}
