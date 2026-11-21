# Contratto: pagine e navigazione

Tutte protette (aal2), dentro `Shell` con la `Navigazione` del mockup (barra laterale da 900 px, barra
in basso sul telefono). Ogni pagina, campo e importo ha il suo aiuto "?"; nomi e importi usano l'occhio.

| Percorso | Contenuto |
|---|---|
| `/app/impostazioni/attivita/` | profilo professionale (con indicatore "pronto a fatturare" e dati mancanti) e attività |
| `/app/clienti/` | elenco, ricerca, nuovo cliente o paziente (persona fisica / ente, sostituto d'imposta, opposizione STS, "pagato da") |
| `/app/fatture/` | elenco con filtri per anno, cliente, stato, tipo e totali (emesso, incassato, da incassare) |
| `/app/fatture/nuova/` | nuova fattura: cliente, attività, data, righe; calcolo in tempo reale con spiegazioni; "già incassata"; salva bozza / emetti |
| `/app/fatture/dettaglio/?id=` | fattura emessa: importi, incassi (aggiungi), nota di credito, stampa |
| `/app/fatture/stampa/?id=` | documento A4 da stampare o salvare in PDF |
| `/app/adempimenti/` | STS (elenco, CSV, segna inviate), riepilogo fattura elettronica, quota imponibile e pro-rata |

Barra in basso (telefono): Home · Fatture · Clienti · Adempimenti · Altro (impostazioni).
Barra laterale (PC): Home, Fatture, Clienti, Adempimenti, Impostazioni (attività, sicurezza).
