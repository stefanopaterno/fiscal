import type { Regola } from '../tipi';

/**
 * Codici tributo F24 usati da Fiscal (specifica 014, research.md R-11; servono anche alle guide della 015).
 * Prima stavano solo nei testi delle scadenze: ora sono regole con fonte e stato, aggiornabili da file.
 * I codici non cambiano con l'anno d'imposta: lo stesso set vale per tutti gli anni con regole.
 */
export type ChiaveF24 =
  | 'irpef_saldo'
  | 'irpef_primo_acconto'
  | 'irpef_secondo_acconto'
  | 'addizionale_regionale'
  | 'addizionale_comunale_acconto'
  | 'addizionale_comunale_saldo'
  | 'bollo_t1'
  | 'bollo_t2'
  | 'bollo_t3'
  | 'bollo_t4'
  | 'iva_t1'
  | 'iva_t2'
  | 'iva_t3'
  | 'iva_acconto'
  | 'iva_saldo'
  | 'interessi_rateizzazione'
  | 'bollo_sanzione'
  | 'bollo_interessi'
  | 'ravv_irpef_sanzione'
  | 'ravv_irpef_interessi'
  | 'ravv_add_regionale_sanzione'
  | 'ravv_add_regionale_interessi'
  | 'ravv_add_comunale_sanzione'
  | 'ravv_add_comunale_interessi';

export type VoceF24 = { codice: string; descrizione: string };

export type RegoleF24 = { anno: number; codici: Record<ChiaveF24, Regola<VoceF24>> };

const RIS_IRPEF = 'Risoluzioni Agenzia delle Entrate sui codici tributo IRPEF (es. ris. 12/E/2007)';
const RIS_ADD = 'Codici tributo addizionali IRPEF (ris. Agenzia delle Entrate 368/E/2007 e 395/E/2007)';
const RIS_BOLLO = 'Risoluzione Agenzia delle Entrate 42/E del 9/4/2019: codici bollo fatture elettroniche';
const DIV_BOLLO = 'Codici di sanzione e interessi sul bollo delle fatture elettroniche (fonti divulgative concordi; da riscontrare sulle tabelle F24 dell\'Agenzia delle Entrate)';
const DIV_RAVV = 'Codici del ravvedimento operoso (fonti divulgative; da riscontrare sulle tabelle F24 dell\'Agenzia delle Entrate)';
const DIV_RAVV_ADD =
  'Codici del ravvedimento sulle addizionali: le fonti divulgative non concordano (alcune indicano 8901 anche per le addizionali); controllarli sul sito dell\'Agenzia delle Entrate prima di pagare';
const RIS_IVA = 'Codici tributo IVA per i contribuenti trimestrali (tabelle F24, Agenzia delle Entrate)';

const c = (codice: string, descrizione: string, fonte: string, stato: Regola<VoceF24>['stato'] = 'verificata'): Regola<VoceF24> => ({
  valore: { codice, descrizione },
  fonte,
  stato,
});

const CODICI: RegoleF24['codici'] = {
  irpef_saldo: c('4001', 'IRPEF saldo', RIS_IRPEF),
  irpef_primo_acconto: c('4033', 'IRPEF acconto prima rata', RIS_IRPEF),
  irpef_secondo_acconto: c('4034', 'IRPEF acconto seconda rata o unica soluzione', RIS_IRPEF),
  addizionale_regionale: c('3801', 'Addizionale regionale IRPEF', RIS_ADD),
  addizionale_comunale_acconto: c('3843', 'Addizionale comunale IRPEF acconto', RIS_ADD),
  addizionale_comunale_saldo: c('3844', 'Addizionale comunale IRPEF saldo', RIS_ADD),
  bollo_t1: c('2521', 'Bollo fatture elettroniche primo trimestre', RIS_BOLLO),
  bollo_t2: c('2522', 'Bollo fatture elettroniche secondo trimestre', RIS_BOLLO),
  bollo_t3: c('2523', 'Bollo fatture elettroniche terzo trimestre', RIS_BOLLO),
  bollo_t4: c('2524', 'Bollo fatture elettroniche quarto trimestre', RIS_BOLLO),
  iva_t1: c('6031', 'IVA primo trimestre', RIS_IVA, 'da_verificare'),
  iva_t2: c('6032', 'IVA secondo trimestre', RIS_IVA, 'da_verificare'),
  iva_t3: c('6033', 'IVA terzo trimestre', RIS_IVA, 'da_verificare'),
  iva_acconto: c('6035', 'IVA acconto (contribuenti trimestrali)', RIS_IVA, 'da_verificare'),
  iva_saldo: c('6099', 'IVA saldo annuale', RIS_IVA, 'da_verificare'),
  interessi_rateizzazione: c('1668', 'Interessi per pagamento dilazionato di imposte erariali', RIS_IRPEF, 'da_verificare'),
  bollo_sanzione: c('2525', 'Bollo fatture elettroniche: sanzione', DIV_BOLLO, 'da_verificare'),
  bollo_interessi: c('2526', 'Bollo fatture elettroniche: interessi', DIV_BOLLO, 'da_verificare'),
  ravv_irpef_sanzione: c('8901', 'IRPEF: sanzione per ravvedimento', DIV_RAVV, 'da_verificare'),
  ravv_irpef_interessi: c('1989', 'IRPEF: interessi per ravvedimento', DIV_RAVV, 'da_verificare'),
  ravv_add_regionale_sanzione: c('8902', 'Addizionale regionale: sanzione per ravvedimento', DIV_RAVV_ADD, 'da_verificare'),
  ravv_add_regionale_interessi: c('1994', 'Addizionale regionale: interessi per ravvedimento', DIV_RAVV_ADD, 'da_verificare'),
  ravv_add_comunale_sanzione: c('8926', 'Addizionale comunale: sanzione per ravvedimento', DIV_RAVV_ADD, 'da_verificare'),
  ravv_add_comunale_interessi: c('1998', 'Addizionale comunale: interessi per ravvedimento', DIV_RAVV_ADD, 'da_verificare'),
};

export const CHIAVI_F24 = Object.keys(CODICI) as ChiaveF24[];

/** Set base (senza aggiornamenti importati): stessi codici per ogni anno. */
export const baseF24 = (anno: number): RegoleF24 => ({ anno, codici: CODICI });
