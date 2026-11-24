# Tasks: Calendario fiscale (disegno informativo in home)

- [X] T001 Componente `src/features/calendario/CalendarioFiscale.tsx`: pulsante in home (44 px) + `Dialog` modale (layer sopra a tutto) con `Diagramma` del flusso 2027 → regime (spina temporale, blocchi, frecce, punti-decisione a rami, scadenze F24 2028 in evidenza, nota «niente acconti 2027», legenda, piede con avvisi). Solo token Fluent, tema chiaro/scuro, nessuno scroll orizzontale.
- [X] T002 Aggancio in home: `src/features/home/Cruscotto.tsx` rende `<CalendarioFiscale />` dopo il suggerimento della guida.
- [X] T003 Test e2e `tests/e2e/calendario.spec.ts`: apertura del layer dalla home, scadenze 2028 e nota «niente acconti 2027» visibili, chiusura.
- [X] T004 Mockup approvato dall'utente (artifact) prima del codice; contenuto statico senza dati personali (principio VII).
