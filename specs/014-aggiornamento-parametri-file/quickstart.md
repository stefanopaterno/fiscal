# Quickstart: verificare l'aggiornamento dei parametri da file

## Prerequisiti

- Stack Supabase locale avviato e `supabase db reset` (migrazione `20261126000100_parametri.sql` applicata).
- Account di prova con 2FA, profilo con regione e comune, dati d'esempio 2027 (migrazione 0600).
- `npm run dev`; file di prova in `tests/fixtures/parametri/` (valido, con errori, malevolo, anno chiuso).

## Test automatici

| Comando | Cosa dimostra |
|---|---|
| `npx vitest run tests/unit/parametri` | catalogo completo, conversioni, validatore, risolutore, anteprima |
| `npx vitest run` | **non regressione**: con registro vuoto tutti i risultati esistenti sono identici |
| `supabase test db` (file `020_parametri.test.sql`) | RLS, sola aggiunta, blocco anni chiusi, annullamento unico |
| `npx playwright test tests/e2e/parametri.spec.ts` | flusso completo nell'interfaccia |

## Scenari manuali (corrispondono alle User Story)

1. **Richiesta** (US1): Impostazioni → Parametri fiscali → Prepara → anno 2027 → Copia. Atteso: prompt in cima,
   sezione «Da controllare per primi» con scaglioni e ENPAP, regione e comune presenti, nessun importo o nome.
   Struttura come [contracts/richiesta-template.md](contracts/richiesta-template.md).
2. **Anteprima** (US2): Importa → incolla `valido.json` (cambia `irpef.scaglioni` 2027 e conferma
   `fattura.aliquota_integrativo`). Atteso: 1 «cambia» con impatto in euro uguale alla differenza mostrata dal
   simulatore della 001; 1 «conferma». Nessun valore cambia ancora.
3. **Errori** (US2): `errori.json` → chiave sconosciuta, aliquota 0,23 (scambiata per frazione), scaglioni non
   crescenti, fonte non ufficiale «verificata». Atteso: 3 scartate con motivo, 1 declassata a «da verificare».
4. **Approvazione per data** (US3): approva `fattura.importo_bollo` = 2,50 € dal 2027-03-01 (file di prova).
   Atteso: fattura emessa il 15/02 invariata; bozza del 02/03 con bollo 2,50 €.
5. **Approvazione per anno** (US3): approva gli scaglioni 2027. Atteso: Tasse 2027 cambia, Tasse 2026 identica;
   spiegazione del calcolo con «da aggiornamento del …».
6. **Annullamento** (US4): annulla lo scaglione. Atteso: calcolo uguale al punto 2 prima dell'approvazione,
   cronologia con due righe.
7. **Anno chiuso** (US2/US4): chiudi il 2026 dalla Dichiarazione, importa `anno-chiuso.json`. Atteso: voce
   «bloccata»; inserimento diretto via API rifiutato dal database.
8. **Programma** (US5): `programma.json` con una nuova detrazione. Atteso: voce in «Novità» come «da fare nel
   programma», nessun calcolo cambiato; reimportando non si duplica.
9. **File malevolo**: `malevolo.json` con HTML e istruzioni nel testo. Atteso: testo mostrato come testo, nessuna
   azione, voci non valide scartate.
10. **Promemoria** (US6): data di prova 10/01/2027 con parametri «da verificare». Atteso: avviso in home.
