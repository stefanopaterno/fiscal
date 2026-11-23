import { ErroreIrpef } from '../irpef';
import type { Regola } from '../tipi';

/**
 * Regole di conservazione dei documenti per anno (specifica 010, FR-008, FR-014, research R-05).
 * `aNorma`: serve la conservazione digitale a norma fuori dall'app (servizio gratuito dell'Agenzia delle
 * Entrate o conservatore accreditato); l'archivio di Fiscal è solo una copia comoda.
 */
export type TipoDocumento =
  | 'fattura_ricevuta'
  | 'scontrino'
  | 'ricevuta'
  | 'contratto'
  | 'polizza'
  | 'certificato'
  | 'cu'
  | 'dichiarazione'
  | 'f24'
  | 'altro';

export type Conservazione = { anni: number; aNorma: boolean; spiegazione: string };

export type RegoleDocumenti = { anno: number; conservazione: Record<TipoDocumento, Regola<Conservazione>> };

const CC = 'Art. 2220 c.c. e art. 22 DPR 600/1973: scritture e documenti contabili per 10 anni';
const d = (anni: number, aNorma: boolean, spiegazione: string, fonte: string): Regola<Conservazione> => ({
  valore: { anni, aNorma, spiegazione },
  fonte,
  stato: 'da_verificare',
});

const CONSERVAZIONE: RegoleDocumenti['conservazione'] = {
  fattura_ricevuta: d(
    10,
    true,
    'Le fatture elettroniche si conservano a norma in digitale: attiva il servizio gratuito dell\'Agenzia delle Entrate in "Fatture e Corrispettivi" (adesione) o usa un conservatore. Questa copia in Fiscal non basta.',
    `${CC}; DMEF 17/6/2014 sulla conservazione digitale (le fonti divulgative citano anche 15 anni nel servizio dell'Agenzia)`,
  ),
  scontrino: d(10, false, 'Conserva lo scontrino (anche in foto leggibile) per i controlli.', CC),
  ricevuta: d(10, false, 'Conserva la ricevuta per i controlli.', CC),
  contratto: d(10, false, 'Conserva il contratto finché è in corso e per 10 anni dopo.', CC),
  polizza: d(10, false, 'Conserva la polizza e controlla la scadenza.', CC),
  certificato: d(10, false, 'Conserva il certificato finché serve.', CC),
  cu: d(
    10,
    false,
    "Conserva la CU con la dichiarazione dell'anno.",
    'Art. 43 DPR 600/1973: termini di accertamento',
  ),
  dichiarazione: d(
    10,
    false,
    'Conserva la dichiarazione e le ricevute di invio.',
    'Art. 43 DPR 600/1973: termini di accertamento',
  ),
  f24: d(10, false, 'Conserva le quietanze dei versamenti.', 'Art. 43 DPR 600/1973: termini di accertamento'),
  altro: d(10, false, 'In dubbio, conserva per 10 anni.', CC),
};

const PER_ANNO: Record<number, RegoleDocumenti> = {
  2026: { anno: 2026, conservazione: CONSERVAZIONE },
  2027: { anno: 2027, conservazione: CONSERVAZIONE },
};

export function regoleDocumenti(anno: number): RegoleDocumenti {
  const r = PER_ANNO[anno] ?? PER_ANNO[Math.max(...Object.keys(PER_ANNO).map(Number))];
  if (!r) throw new ErroreIrpef('Regole dei documenti mancanti.');
  return r;
}
