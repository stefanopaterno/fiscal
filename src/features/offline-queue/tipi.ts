/**
 * Tipi della coda degli inserimenti senza rete (contracts/app-routes-and-lock.md, research D-11).
 */
export type StatoVoce = 'in_attesa' | 'in_conflitto';

export type VoceCoda = {
  /** UUID generato sul dispositivo = chiave primaria nel database (invio idempotente). */
  id: string;
  tabella: string;
  operazione: 'inserisci' | 'modifica';
  /** Per le modifiche: la versione che l'utente stava vedendo. */
  versioneBase?: number;
  payload: Record<string, unknown>;
  creataIl: string;
  stato: StatoVoce;
  tentativi: number;
  /** In conflitto: la versione e i dati attuali sul server, per il confronto. */
  versioneServer?: number;
  datiServer?: unknown;
};

export type NuovaVoce = Pick<VoceCoda, 'id' | 'tabella' | 'operazione' | 'versioneBase' | 'payload'>;

export type EsitoInvio =
  | { esito: 'ok' }
  | { esito: 'rete' }
  | { esito: 'errore' }
  | { esito: 'conflitto'; versioneServer: number; datiServer?: unknown };

/** Chi invia davvero (Supabase nell'app, un server finto nei test). */
export interface Inviatore {
  invia(voce: VoceCoda): Promise<EsitoInvio>;
}

/** Dove si conservano le voci (IndexedDB cifrato nell'app, memoria nei test). */
export interface Archivio {
  tutte(): Promise<VoceCoda[]>;
  salva(voce: VoceCoda): Promise<void>;
  cancella(id: string): Promise<void>;
  svuota(): Promise<void>;
}
