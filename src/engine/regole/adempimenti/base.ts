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
      'Classificazione ATECO 2025 (in vigore dal 1/4/2025): 86.93.00 «Attività di psicologi e psicoterapeuti, esclusi i medici», prima 86.90.30 (fonti divulgative; da riscontrare sulla tabella ISTAT)',
    stato: 'da_verificare',
  },
  naturaEsente: {
    valore: 'N4',
    fonte: 'Specifiche tecniche della fattura elettronica (FatturaPA): natura N4 «esenti» per le operazioni dell\'art. 10 DPR 633/1972',
    stato: 'verificata',
  },
  giorniIscrizioneEnpap: {
    valore: 90,
    fonte:
      'Regolamento ENPAP per le attività di previdenza, art. 2: iscrizione entro 90 giorni dal sorgere dei requisiti (le fonti divergono tra inizio attività e primo compenso)',
    stato: 'da_verificare',
  },
  sogliaAccorpamentoBollo: {
    valore: 5_000_00,
    fonte: 'DM 17/6/2014 art. 6 come modificato: bollo del trimestre sotto 5.000 € pagabile con il trimestre successivo (fonti divulgative; da riscontrare)',
    stato: 'da_verificare',
  },
};

export const baseAdempimenti = (anno: number): RegoleAdempimenti => ({ anno, ...BASE });
