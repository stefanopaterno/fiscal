/**
 * Regole del blocco e dello sblocco rapido (US5, FR-010, FR-019, FR-020). Solo logica, senza browser:
 * i test le provano con un orologio simulato.
 */

export const MAX_RIFIUTI_SBLOCCO = 3;

const limita = (valore: number, minimo: number, massimo: number) =>
  Math.min(massimo, Math.max(minimo, valore));

/** Blocco dopo `bloccoMinuti` di inattività (data-model: 1–60, valore iniziale 5). */
export function deveBloccare(input: {
  ultimaAttivita: number;
  adesso: number;
  bloccoMinuti: number;
}): boolean {
  const minuti = limita(Math.round(input.bloccoMinuti) || 1, 1, 60);
  return input.adesso - input.ultimaAttivita >= minuti * 60_000;
}

export type EsitoSblocco =
  | { ok: true }
  | {
      ok: false;
      motivo: 'disattivato' | 'non_supportato' | 'nuovo_dispositivo' | 'scaduto' | 'troppi_rifiuti';
    };

/**
 * Lo sblocco rapido (Face ID, impronta, PIN del dispositivo) riapre una sessione GIÀ valida su QUESTO dispositivo.
 * Mai oltre i giorni di accesso completo (data-model: 1–30, valore iniziale 14), mai su un dispositivo nuovo,
 * mai dopo troppi rifiuti. In quei casi servono password e codice a 6 cifre.
 */
export function puoSbloccareRapido(input: {
  attivo: boolean;
  prfDisponibile: boolean;
  sessioneCifrata: boolean;
  orarioUltimoCodice: number | undefined; // secondi, dal claim amr "totp" del token
  accessoCompletoGiorni: number;
  rifiuti: number;
  adesso: number;
}): EsitoSblocco {
  if (!input.attivo) return { ok: false, motivo: 'disattivato' };
  if (!input.prfDisponibile) return { ok: false, motivo: 'non_supportato' };
  if (!input.sessioneCifrata) return { ok: false, motivo: 'nuovo_dispositivo' };
  if (input.rifiuti >= MAX_RIFIUTI_SBLOCCO) return { ok: false, motivo: 'troppi_rifiuti' };
  const giorni = limita(Math.round(input.accessoCompletoGiorni) || 1, 1, 30);
  if (!input.orarioUltimoCodice || input.adesso - input.orarioUltimoCodice * 1000 > giorni * 86_400_000) {
    return { ok: false, motivo: 'scaduto' };
  }
  return { ok: true };
}
