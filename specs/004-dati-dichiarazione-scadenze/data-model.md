# Modello dati: Dichiarazione e scadenze

Tabelle col modello RLS della 002. Importi in centesimi. Nessun campo di note libere.

### `dichiarazioni` (una per utente e anno)
anno; tipo `730` (anno di partenza) o `redditi`; imposta_netta, differenza, acconti_trattenuti, credito, debito,
rimborso_in_busta; credito_scelta (`compensazione`/`rimborso`), credito_stato (`disponibile`/`richiesto`/`incassato`/
`utilizzato`), credito_usato ≤ credito, credito_incassato_il solo se incassato; chiuso_il.

### `scadenze_utente` (una per utente, anno e chiave)
chiave della regola o `personale_<n>`; fatta_il; data (proroga o data della scadenza personale); titolo (solo per le
personali, 1–80 caratteri); esporta.

### `checklist_anno` (una per utente, anno e chiave)
stato `completato` o `non_applicabile` impostato a mano.
