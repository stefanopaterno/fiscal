# Contratto: database della 008

Tabelle di [data-model.md](../data-model.md), conformi a `003_conformita` (RLS, aal2). Nessun calcolo nel
database. Bucket Storage `giustificativi` privato: policy select/insert/delete solo se il primo segmento del
percorso è `auth.uid()` e il token è aal2 con accesso completo valido.

Test pgTAP `011_spese.test.sql`: vincoli (importi, `iva_detraibile ≤ importo`, motivazione obbligatoria con
percentuale personalizzata, date dei beni, una sola riga di impostazioni), isolamento tra utenti,
cancellazione a cascata del bene collegato vietata finché ha spese collegate.
Le spese **non** sono dati di prova: non le cancella `cancella_dati_prova`.
