# Piano: Consenso informato dei pazienti

**Spec**: [spec.md](spec.md) | **Data**: 2026-11-24

- **Database** (`supabase/migrations/20261124000200_consensi.sql`, pgTAP 017): `tipi_consenso`, `modelli_consenso`,
  `consensi`, `firmatari_consenso`, `eventi_consensi` con le regole standard (proprietario + aal2). L'utente non
  può cancellare consensi, tipi, modelli né eventi (FR-006, FR-016); la revoca non si annulla; solo le persone
  fisiche hanno consensi. Un paziente con consensi non viene mai cancellato (né dalla rubrica né con «Cancella i
  dati di prova» o il passaggio alla produzione): un trigger lascia la riga; solo la chiusura dell'account lo toglie
  (FR-017). Motivazioni lunghe al massimo 200 caratteri. Bucket privato `consensi` (10 MB, PDF e immagini), solo il
  proprietario con aal2; i file si scaricano con la sessione, mai con indirizzi condivisibili (FR-014). Colonna
  `profilo_professionale.dpa_firmato_il` per il promemoria del DPA.
- **Motore** (`src/engine/consensi/`): data di nascita dal codice fiscale (con omocodia e secolo), iniziali e anno,
  stato del paziente (mancante, incompleto, revocato, da rinnovare, presente) con il motivo; promemoria 18 anni
  (60 giorni) e revisione a 12 mesi facoltativa (SC-002).
- **Nomi riservati ovunque** (`src/features/consensi/nomi.tsx`, FR-013, FR-018): le persone compaiono come
  iniziali e anno in rubrica, fatture, home, adempimenti e consensi; il pulsante con la persona nella barra in alto
  mostra i nomi completi per 20 secondi dopo Face ID/impronta/PIN (sblocco rapido) o, in mancanza, password e codice;
  tornano nascosti cambiando pagina o mettendo l'app in background. Ogni visualizzazione va nel registro senza
  contenuti. Il nome completo resta su fattura stampata, file SDI/STS e modulo di modifica dell'anagrafica.
- **Pagine**: `/app/consensi/` (pazienti per stato, avviso DPA, maggiorenni in arrivo), `/app/consensi/paziente/`
  (registrazione con firmatari e copia facoltativa, storico, revoca, firmatari aggiunti dopo, registro, richiesta di
  accesso del paziente in JSON con cosa conservare), `/app/consensi/modelli/` (tipi dell'utente, modelli PDF con
  versione e data, pazienti con versione precedente). Voce di menu «Consensi».
- **Collegamenti**: avviso non bloccante in Nuova fattura (FR-011); promemoria in home e nelle Scadenze (FR-012,
  SC-007); tappa nel tour e guida passo passo nell'aiuto.
- **Dati clinici** (FR-010): solo campi amministrativi; le motivazioni sono controllate con le stesse parole
  dell'archivio documenti; il pacchetto per il commercialista non include consensi.

## Verifica dei principi I–VII
Logica nel motore puro e testata (I, II); nessun dato clinico e dati sanitari con RLS, aal2, bucket privato e
regione UE (VII); spiegazioni nei fumetti con fonte «da verificare» (III, VI); interfaccia Fluent responsiva (V).

## Rinviato
- Cifratura dei soli campi identificativi dei pazienti (costituzione, vincolo «Dati dei pazienti»): oggi in chiaro
  con RLS, rischio residuo accettato dall'utente.
- Durata del consenso, obbligo di entrambi i genitori e tempi di conservazione: da verificare con l'Ordine.
- Funzionamento senza rete: i consensi richiedono la connessione (come l'archivio documenti).
