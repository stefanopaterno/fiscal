# Ricerca e decisioni: Configurazione della partita IVA e fatturazione

**Data**: 2026-11-21 | **Spec**: [spec.md](spec.md) | **Piano**: [plan.md](plan.md)

Stato: **D** decisione di progetto, **F** regola fiscale da fonte (con stato di verifica), **V** da verificare.

## R-01 — Regole di fatturazione per anno (F, V)

Nel motore, un set per anno (`src/engine/regole/2027.ts`), ognuna con fonte e stato `verificata` / `da_verificare`:

| Regola | 2026 | 2027 | Fonte | Stato |
|---|---|---|---|---|
| Contributo integrativo ENPAP | 2% | 4% | Regolamento ENPAP (aumento deliberato, decorrenza 2027) | da verificare |
| IVA ordinaria | 22% | 22% | DPR 633/72 art. 16 | verificata |
| Esenzione prestazioni sanitarie | art. 10 n. 18 | art. 10 n. 18 | DPR 633/72 art. 10 c. 1 n. 18 | verificata |
| Imposta di bollo | 2,00 € oltre 77,47 € | idem | DPR 642/72 tariffa art. 13; DM 17/06/2014 | verificata |
| Ritenuta d'acconto | 20% sul compenso | idem | DPR 600/73 art. 25 | verificata |
| Integrativo escluso dalla base della ritenuta | sì | sì | prassi casse professionali (es. ris. AdE) | da verificare |
| Integrativo soggetto a IVA solo se la prestazione è imponibile | sì | sì | segue la natura dell'operazione principale | da verificare |

## R-02 — Calcolo della fattura (D)

Tutti gli importi in **centesimi interi**. Arrotondamento **commerciale al centesimo** (0,5 per eccesso)
applicato una volta per voce:
1. **Compensi** per riga (inseriti dall'utente).
2. **Contributo integrativo per riga** = compenso × aliquota dell'anno, arrotondato; segue la natura della riga.
3. **Imponibile IVA** = somma (compenso + integrativo) delle righe imponibili.
4. **IVA** = imponibile IVA × 22%, arrotondata sul totale (non per riga).
5. **Importo esente** = somma (compenso + integrativo) delle righe esenti.
6. **Bollo** = 2,00 € se importo esente > 77,47 € (soglia esclusa: 77,47 non lo fa scattare). A carico del
   paziente: voce separata che entra nel totale, fuori campo IVA (art. 15 DPR 633/72). A carico del
   professionista: non entra nel totale, è segnato come costo (specifica 008).
7. **Ritenuta** (solo se il cliente è sostituto d'imposta) = 20% della somma dei compensi (escluso
   integrativo e bollo), arrotondata.
8. **Totale documento** = imponibile IVA + IVA + importo esente + bollo addebitato.
9. **Netto a pagare** = totale documento − ritenuta.

Esempio (SC-001): seduta esente 80,00 € a persona fisica nel 2027 → integrativo 3,20 €; esente 83,20 €;
bollo 2,00 € (83,20 > 77,47); totale 85,20 €; nessuna ritenuta; netto 85,20 €.

## R-03 — Quota imponibile e pro-rata (F)

Quota = imponibili / (imponibili + esenti) dell'anno (operazioni attive). Pro-rata di detraibilità
(art. 19-bis DPR 633/72): percentuale **arrotondata all'unità superiore se la parte decimale supera 0,5,
altrimenti inferiore**. Soglia di attenzione configurabile (valore iniziale 10%): avvisa, non blocca.

## R-04 — Numerazione (D)

Funzione di database `emetti_fattura(id)` (sicurezza dell'invocante, quindi soggetta alla RLS):
prende un lucchetto consultivo per utente e anno (`pg_advisory_xact_lock`), assegna `max(numero)+1`
tra i documenti emessi dell'anno (fatture e note di credito, una sola sequenza), cambia lo stato da
bozza a emessa. Vincolo `unique (owner_id, anno, numero)`. Le bozze non hanno numero. Data non
anteriore all'inizio attività e configurazione completa controllate nella stessa funzione.

## R-05 — Immutabilità (D)

Trigger `before update/delete` sulle fatture e righe emesse: vietato modificare o cancellare, salvo il
passaggio di stato a `annullata` fatto da `crea_nota_di_credito`. Le correzioni passano da nota di
credito e nuova fattura (FR-013). La fattura conserva una **fotografia** dei dati del professionista,
del cliente e delle impostazioni usate (bollo a carico di chi, aliquote), così le modifiche successive
non la cambiano (FR-008, edge case "modifica della configurazione").

## R-06 — Incassi (D)

Tabella separata `incassi` (data, importo, modalità: contanti, carta/POS, bonifico, altro; tracciabile
sì/no). Il reddito per cassa (FR-019) è una vista per anno di incasso. Incassi parziali ammessi; residuo
calcolato. "Già incassata" nello stesso passaggio dell'emissione (impostazione, valore iniziale: no).

## R-07 — Documento PDF (D)

Pagina `/app/fatture/stampa/?id=` con stile di stampa A4: il browser la salva in PDF ("Stampa → Salva
come PDF"). Nessuna libreria in più, generazione nel browser (costituzione). Diciture obbligatorie per
tipo controllate da un test (SC-005).

## R-08 — Sistema Tessera Sanitaria e fattura elettronica (D)

Prima versione: **preparazione** dei dati, non invio. STS: elenco delle spese sanitarie a persone fisiche
non opposte, con stato da inviare/inviata e file CSV scaricabile con i campi da riportare; l'opposizione
del paziente aggiunge la dicitura prevista ed esclude la spesa. Fattura elettronica: riepilogo testuale
copiabile per le fatture a enti e aziende (cedente, cliente, righe, natura IVA N4 per le esenti, bollo
virtuale, ritenuta RT01). Il file XML conforme è rinviato (decisione dell'utente).

## R-09 — Validazione di codice fiscale e partita IVA (F)

Codice fiscale: 16 caratteri, struttura e carattere di controllo (DM 23/12/1976), con omocodie.
Partita IVA: 11 cifre con cifra di controllo (algoritmo di Luhn modificato). Solo controllo formale,
nessuna verifica online.

## R-10 — Navigazione (D)

Componente `Navigazione` del mockup: barra laterale a partire da 900 px, barra in basso sul telefono
(Home, Fatture, Clienti, Adempimenti, Altro). Le pagine della 002 vi vengono incluse.

## R-11 — Offline (D)

Senza rete si possono preparare bozze (coda della 002). L'**emissione** richiede la rete, perché il
numero è assegnato dal database: la bozza resta pronta e si emette appena torna la connessione.
