# Piano: Dati per la dichiarazione e scadenze

**Spec**: [spec.md](spec.md) | **Data**: 2026-11-23

## Scelte

- **Regole delle scadenze** `src/engine/regole/scadenze/index.ts`: data (mese-giorno), descrizione, categoria,
  pertinenza (sempre, partita IVA, IVA, bollo, Tessera Sanitaria), fonte dell'importo, anno di riferimento, fonte e
  stato di verifica (FR-008, FR-009, FR-019). Nessuna data nella logica.
- **Calendario** `src/engine/scadenze/calendario.ts`: festività nazionali con Pasquetta, slittamento al primo giorno
  lavorativo (FR-011), stato e giorni mancanti, proroghe e scadenze personali (FR-032, FR-033), promemoria con
  anticipo (FR-010), file `.ics` senza importi né nomi (FR-030).
- **Esito** `src/engine/dichiarazione/esito.ts`: dall'IRPEF lorda al saldo, voce per voce, con il messaggio
  "abbassa il saldo di giugno, non è un rimborso" e il credito residuo (FR-020…FR-024).
- **Checklist** `src/engine/dichiarazione/checklist.ts`: elementi derivati dai dati dell'app o da fornire, segnabili
  come completati o non applicabili, progresso (FR-001, FR-002, FR-007, FR-034).
- **Anno di partenza**: guida ai righi del 730-3 nelle regole (`src/engine/regole/dichiarazione/`), stato «da
  verificare» (FR-028); gli acconti trattenuti in busta paga valgono come versati nell'anno dopo se non ci sono
  versamenti di acconto registrati (FR-029).
- **Riepilogo** per quadri del Modello Redditi (RC, RE, RR, RP, RN, RV, RX), stampabile, con le sezioni incomplete
  (FR-014).
- **Dati** (migrazione `20261123000400_dichiarazione.sql`): `dichiarazioni`, `scadenze_utente`, `checklist_anno`.
- **Pagine** sotto «Dichiarazione»: checklist ed esito, scadenze, anno di partenza, riepilogo; promemoria in home.

## Rinviato

- Notifiche da job schedulati (prossima release, come da specifica).
- Precompilazione dei dati stabili da un anno all'altro (FR-006) e protezione dei dati di un anno chiuso con
  registro delle modifiche (FR-015): oggi la chiusura è registrata e mostrata, senza blocco delle modifiche.
- Utilizzi del credito in compensazione voce per voce (FR-023): si registra l'importo usato.
