/**
 * Controllo formale della partita IVA italiana (specifica 003, FR-002, research R-09):
 * 11 cifre e cifra di controllo. "00000000000" è formalmente corretta ma non assegnabile.
 */
export function partitaIvaValida(valore: string): boolean {
  const p = valore.trim();
  if (!/^\d{11}$/.test(p) || /^0{11}$/.test(p)) return false;
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    const d = Number(p[i]);
    if (i % 2 === 0) somma += d;
    else {
      const doppio = d * 2;
      somma += doppio > 9 ? doppio - 9 : doppio;
    }
  }
  return (10 - (somma % 10)) % 10 === Number(p[10]);
}
