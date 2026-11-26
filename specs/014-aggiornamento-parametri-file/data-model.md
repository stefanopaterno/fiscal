# Data Model: Aggiornamento dei parametri fiscali da file

## Nel codice (`src/engine/parametri/`)

### ParametroCatalogo

| Campo | Tipo | Note |
|---|---|---|
| chiave | string | stabile, es. `irpef.scaglioni`, `fattura.importo_bollo`, `spese.categoria.telefonia.percentuale` |
| area | `irpef` \| `acconti` \| `enpap` \| `fatturazione` \| `spese` \| `scadenze` \| `f24` \| `addizionali` | raggruppa UI e richiesta |
| nome, spiegazione | string | italiano semplice (011) |
| unita | `percentuale` \| `euro` \| `data` \| `mese_giorno` \| `scaglioni` \| `si_no` \| `testo` \| `codice` \| `oggetto` | unità **del file** |
| decorrenza | `anno` \| `data` \| `anno_solare` | R-03 |
| limiti | per unità: min/max, crescente, lunghezza | plausibilità |
| sogliaAnomalia | number | variazione oltre cui serve conferma in più |
| fonti | `{ nome, url }[]` | dove cercare (anche nella richiesta) |
| leggi | `(regoleAnno) => Regola<T>` | valore base dal set dell'anno |
| applica | `(regoleAnno, Regola<T>) => regoleAnno` | sovrascrittura immutabile |
| daFile / aFile | conversioni | unità del file ↔ unità delle regole |

Il catalogo copre ogni `Regola<>` usata dal motore; quelle escluse sono elencate con il motivo (es. regole booleane
di interpretazione come `addizionaliSoloConIrpefDovuta`: cambiarle è un cambio di logica, flusso 012).

### VoceFile (dal file, dopo la lettura)

`chiave`, `anno?`, `dal?`, `valore` (unità del file), `fonte { titolo, riferimento, url, data_atto }`,
`stato_proposto`, `stato_norma` (`in_vigore` \| `approvata_non_pubblicata` \| `proposta`), `nota`.

### EsitoVoce

`gruppo` (`cambia` \| `conferma` \| `scartata` \| `bloccata` \| `programma`), `motivi[]`, `statoFinale`,
`prima`, `dopo`, `impatto?` (centesimi, con segno), `anomala`, `fileVecchio`.

## Nel database (migrazione `20261126000100_parametri.sql`)

Tutte le tabelle con `private.applica_regole_tabella(...)` (RLS proprietario + aal2, colonne standard `id`,
`owner_id`, `versione`, `creato_il`, `aggiornato_il`).

### importazioni_parametri

| Colonna | Tipo | Vincoli |
|---|---|---|
| data_ricerca | date | not null |
| versione_schema | int | = 1 |
| anni | int[] | not null |
| conteggi | jsonb | `{cambia, conferma, scartata, bloccata, rifiutata, programma}` |
| modifiche_programma | jsonb | array di `{titolo, descrizione, dal, fonte, impronta, stato}`; `stato` in (`aperta`,`fatta`,`non_riguarda`) |

Aggiornabile solo `modifiche_programma[*].stato` (trigger); il resto immutabile.

### aggiornamenti_parametri (registro, sola aggiunta)

| Colonna | Tipo | Vincoli |
|---|---|---|
| importazione_id | uuid null | → importazioni_parametri |
| azione | enum `azione_parametro` (`approvato`, `annullato`) | not null |
| annulla_id | uuid null | → aggiornamenti_parametri; obbligatorio se `annullato`, null altrimenti; un solo annullamento per riga |
| chiave | text | not null, ≤ 120 |
| anno | int null | 2000–2100 |
| dal | date null | esattamente uno tra `anno` e `dal` |
| valore | jsonb | unità delle regole (frazioni, centesimi); null se `annullato` |
| valore_precedente | jsonb | valore in vigore al momento dell'approvazione |
| fonte | jsonb | `{titolo, riferimento, url, data_atto}` |
| stato | enum `stato_verifica` (`verificata`, `da_verificare`) | |
| stato_norma | text | `in_vigore` \| `approvata_non_pubblicata` \| `proposta` |
| spiegazione | text | ≤ 500; dalla `nota` del file (testo normativo pubblico; il nome evita «nota», vietato dal test 007 sui dati clinici) |

**Trigger**:
- `before update or delete` → errore («il registro dei parametri non si modifica: annulla con una nuova riga»),
  salvo la pulizia della modalità prova (stessa guardia usata dalle altre tabelle).
- `before insert` → anno di riferimento (`anno` o `extract(year from dal)`, per un annullamento quello della riga
  annullata) chiuso secondo `private.anno_chiuso` → errore.
- Controllo del ruolo in linea prima di chiamare `private.*` (nota della 2026-11-24 sul `service_role`).

### aliquote_addizionali (esistente)

Aggiornata dall'importazione per le chiavi `addizionali.*`; `verificate` impostato come da R-08. Lo storico sta nel
registro (`valore_precedente`).

## Stati

```text
VoceFile ──valida──▶ cambia/conferma ──approva──▶ riga "approvato" ──annulla──▶ riga "annullato"
                 └─▶ scartata | bloccata | programma (mai nel registro)
            cambia/conferma ──rifiuta──▶ solo conteggio "rifiutata" nell'importazione
```

## Risoluzione (pura)

`valoreInVigore(chiave, contesto)`:
1. righe `approvato` della chiave non annullate;
2. filtro: `anno = contesto.anno` (decorrenza `anno`/`anno_solare`) oppure `dal ≤ contesto.data` (decorrenza `data`;
   senza data nel contesto: 1° gennaio dell'anno per i consumatori per anno, oggi per le nuove fatture);
3. massimo per (decorrenza, `creato_il`);
4. nessuna riga → valore base dal set dell'anno (o riportato, R-07).
