# Modello dati: Archivio documenti e fatture ricevute

**Spec**: [spec.md](spec.md) | **Ricerca**: [research.md](research.md)

Tabelle dal modello RLS della 002 (`private.applica_regole_tabella`). Importi in centesimi. Nessun campo di
testo libero oltre a `descrizione` (≤ 200, con avviso sui dati clinici). Le colonne con "note" nel nome sono
vietate dal test 007.

### `documenti`

| Campo | Tipo | Vincoli |
|---|---|---|
| tipo | enum `fattura_ricevuta` / `scontrino` / `ricevuta` / `contratto` / `polizza` / `certificato` / `cu` / `dichiarazione` / `f24` / `altro` | |
| stato | enum `da_classificare` / `archiviato` | fatture importate nascono `da_classificare` |
| anno | int 2000–2100 | |
| data | date null | data del documento |
| emittente | text ≤ 120 null | |
| importo | bigint null ≥ 0 | |
| descrizione | text ≤ 200 null | |
| scadenza | date null | polizze, certificati (FR-009) |
| file_percorso | text | `<owner_id>/<id>/<versione_file>-<nome>` |
| file_nome | text ≤ 120 | nome generato dall'app, mai l'originale |
| file_tipo | text | mime |
| file_dimensione | bigint > 0, ≤ 20 MB | |
| file_impronta | text | SHA-256 esadecimale, `unique (owner_id, file_impronta)` |
| versione_file | int ≥ 1 | |
| fattura | jsonb null | dati letti: fornitore, partita_iva, codice_fiscale, numero, data, totale, iva, identificativo_sdi |
| non_spesa | boolean | "non è una spesa dell'attività" |
| eliminato_il | timestamptz null | cestino (FR-007) |

Indice unico parziale sulle fatture: (owner_id, fornitore partita IVA o CF, numero, data) dove `fattura` non è
null ed `eliminato_il` è null (FR-017).

### `documenti_versioni` (FR-007: versioni precedenti di un file sostituito)

| Campo | Tipo |
|---|---|
| documento_id | uuid → documenti (cascade) |
| versione_file | int |
| file_percorso, file_impronta, file_dimensione | come sopra |
| sostituito_il | timestamptz |

### `collegamenti_documenti` (FR-004)

| Campo | Tipo | Vincoli |
|---|---|---|
| documento_id | uuid → documenti (cascade) | |
| voce | enum `fattura` / `spesa` / `onere` / `versamento_previdenza` / `versamento_imposta` / `bene` | |
| voce_id | uuid | `unique (documento_id, voce, voce_id)` |

### `eventi_documenti` (FR-013, solo azioni)

| Campo | Tipo |
|---|---|
| documento_id | uuid (senza vincolo: resta dopo l'eliminazione) |
| azione | enum `caricato` / `collegato` / `scollegato` / `sostituito` / `cestinato` / `ripristinato` / `eliminato` |
| avvenuto_il | timestamptz |

Bucket Storage `documenti`: privato, 20 MB, PDF, immagini, XML, `.p7m`; policy proprietario + aal2.
