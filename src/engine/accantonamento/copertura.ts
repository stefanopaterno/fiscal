/**
 * Copertura delle scadenze (specifica 007, FR-005, FR-006, research R-03): il salvadanaio copre le scadenze in
 * ordine di data; per ognuna quanto è coperto e quanto manca, più l'eventuale eccedenza.
 */
export type Scadenza = { voce: string; data: string; importo: number };
export type ScadenzaCoperta = Scadenza & { coperto: number; manca: number };

export function copertura(saldo: number, scadenze: Scadenza[]): { scadenze: ScadenzaCoperta[]; mancaTotale: number; eccedenza: number; fabbisogno: number } {
  let resto = Math.max(0, saldo);
  const ordinate = [...scadenze].filter((s) => s.importo > 0).sort((a, b) => a.data.localeCompare(b.data));
  const out = ordinate.map((s) => {
    const coperto = Math.min(resto, s.importo);
    resto -= coperto;
    return { ...s, coperto, manca: s.importo - coperto };
  });
  return {
    scadenze: out,
    mancaTotale: out.reduce((t, s) => t + s.manca, 0),
    eccedenza: resto,
    fabbisogno: out.reduce((t, s) => t + s.importo, 0),
  };
}
