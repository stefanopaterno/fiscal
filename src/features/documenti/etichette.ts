import type { TipoDocumento } from '@/engine/regole/documenti';

/** Nomi dei tipi di documento in parole semplici. */
export const ETICHETTA_TIPO: Record<TipoDocumento, string> = {
  fattura_ricevuta: 'Fattura ricevuta',
  scontrino: 'Scontrino',
  ricevuta: 'Ricevuta',
  contratto: 'Contratto',
  polizza: 'Polizza',
  certificato: 'Certificato',
  cu: 'Certificazione Unica',
  dichiarazione: 'Dichiarazione',
  f24: 'F24',
  altro: 'Altro',
};
