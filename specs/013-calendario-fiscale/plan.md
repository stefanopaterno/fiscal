# Plan: Calendario fiscale (disegno informativo in home)

## Approccio

Componente statico, nessun dato e nessun motore (il contenuto è la rotta tipica dell'assetto dell'utente). Si apre come layer sopra a tutto da un pulsante in home.

- **Contenuto e layer**: `src/features/calendario/CalendarioFiscale.tsx`.
  - `CalendarioFiscale`: pulsante in home (area toccabile 44 px) + `Dialog` modale di Fluent che apre/chiude lo stato locale.
  - `Diagramma`: il flusso con spina temporale verticale, blocchi, frecce, punti-decisione a rami, scadenze F24 in evidenza, nota «niente acconti 2027», legenda e piede con gli avvisi (date salvo proroghe, ENPAP da verificare).
- **Aggancio**: `src/features/home/Cruscotto.tsx` rende `<CalendarioFiscale />` dopo il suggerimento della guida.
- **Stile**: solo token di Fluent (`makeStyles`), così tema chiaro/scuro sono automatici; verde = incassi/accantonamento, arancio = scadenze, brand = controlli, tratteggio = da verificare. Rami su due colonne, una sola colonna sotto i 480 px; il contenuto del dialog scorre in verticale, mai in orizzontale.

## Conformità alla costituzione (principi I–VII)

- **I, II**: nessuna logica fiscale nuova; il disegno non calcola. Le voci non confermate (ENPAP primo anno) sono marcate «da verificare».
- **IV**: modulo piccolo e indipendente, aggiunto alla home senza toccare dati o schema.
- **VI**: Fluent UI 9, italiano semplice, tema chiaro/scuro, 44 px, nessuno scroll orizzontale.
- **VII**: nessun dato personale; contenuto statico nel codice (nessuna residenza, nessun importo, nessun paziente).

## Test

- e2e `tests/e2e/calendario.spec.ts`: dalla home si apre il layer, si vedono le scadenze del 2028 e la nota «niente acconti 2027», si chiude.
- Il test di impaginazione (`layout.spec.ts`) copre già la home: il pulsante rispetta i 44 px e non introduce scroll orizzontale.
