import type { Regola } from '../tipi';

/**
 * Valori citati dalle guide agli adempimenti (specifica 015, research.md R-03). Non cambiano con l'anno d'imposta:
 * stesso set per ogni anno; si aggiornano dalla data con il file della 014.
 */
export type RegoleAdempimenti = {
  anno: number;
  codiceAteco: Regola<string>;
  naturaEsente: Regola<string>;
  giorniIscrizioneEnpap: Regola<number>;
  /** Sotto questa soglia (centesimi) il bollo di un trimestre si può pagare insieme al successivo. */
  sogliaAccorpamentoBollo: Regola<number>;
};

const BASE: Omit<RegoleAdempimenti, 'anno'> = {
  codiceAteco: {
    valore: '86.93.00',
    fonte:
      'ISTAT, struttura ATECO 2025: 86.93.00 «Attività di psicologi e psicoterapeuti, esclusi i medici» (prima 86.90.30); usata dall\'Agenzia delle Entrate dal 1/4/2025 (ISA DK20U)',
    stato: 'verificata',
  },
  naturaEsente: {
    valore: 'N4',
    fonte: 'Specifiche tecniche della fattura elettronica (FatturaPA): natura N4 «esenti» per le operazioni dell\'art. 10 DPR 633/1972',
    stato: 'verificata',
  },
  giorniIscrizioneEnpap: {
    valore: 90,
    fonte:
      'Regolamento ENPAP per le attività di previdenza: obbligo dal conseguimento di reddito professionale (art. 1 c. 2); iscrizione «entro 90 giorni dalla insorgenza dei requisiti» (art. 2 c. 2); sanzione 100 €, 20 € se entro il 30 marzo dell\'anno dopo',
    stato: 'verificata',
  },
  sogliaAccorpamentoBollo: {
    valore: 5_000_00,
    fonte:
      'Agenzia delle Entrate, guida «L\'imposta di bollo sulle fatture elettroniche»: primo trimestre fino a 5.000 € entro il 30 settembre; primo e secondo insieme fino a 5.000 € entro il 30 novembre',
    stato: 'verificata',
  },
};

export const baseAdempimenti = (anno: number): RegoleAdempimenti => ({ anno, ...BASE });
