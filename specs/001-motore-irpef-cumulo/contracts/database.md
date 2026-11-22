# Contratto: database della 001

Tabelle di [data-model.md](../data-model.md), tutte conformi al test `003_conformita` (RLS, aal2).
Nessuna funzione di calcolo nel database: i calcoli sono nel motore (principio I). Il reddito
professionale arriva dalla vista `reddito_cassa` (003) e dalle ritenute delle fatture incassate.

Test pgTAP `009_imposte.test.sql`: vincoli (un `dati_anno` e un `aliquote_addizionali` per anno,
importi non negativi, scaglioni regionali validi), proprietà e aal2 (automatico con 003).
