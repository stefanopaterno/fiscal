# Modello dati: Configurazione della partita IVA e fatturazione

**Spec**: [spec.md](spec.md) | **Piano**: [plan.md](plan.md)

Tutte le tabelle seguono il contratto RLS della 002 (`supabase/templates/nuova_tabella.sql`): `id` uuid
generato dal dispositivo, `owner_id`, `versione`, `creato_il`, `aggiornato_il`, RLS forzata, policy del
proprietario e restrittiva aal2. Importi in **centesimi** (`bigint`), mai decimali.

### `profilo_professionale` (1 riga per utente)

| Campo | Tipo | Vincoli |
|---|---|---|
| nome, cognome | text | obbligatori per emettere |
| codice_fiscale | text | 16 caratteri, controllo formale (R-09) |
| partita_iva | text | 11 cifre, controllo formale |
| inizio_attivita | date | le fatture non possono avere data anteriore (FR-004) |
| regime_fiscale | text | `ordinario` (unico valore ammesso ora) |
| indirizzo, cap, comune, provincia | text | sede o domicilio fiscale |
| pec, codice_destinatario | text | facoltativi per emettere a pazienti |
| iban | text | facoltativo |
| albo_ordine, albo_numero | text | iscrizione all'Albo |
| enpap_matricola | text | facoltativo |
| bollo_a_carico | enum `paziente` / `professionista` | valore iniziale `paziente` (FR-008) |
| integrativo_compreso | boolean | default false: contributo integrativo in aggiunta; true = compreso nel prezzo (FR-031) |
| gia_incassata_predefinita | boolean | valore iniziale false (FR-010) |
| soglia_attenzione_imponibile | int (percento 1–100) | valore iniziale 10 (FR-025) |

### `attivita`

| Campo | Tipo | Vincoli |
|---|---|---|
| nome | text | es. "Psicologo", "Consulenza" |
| codice_ateco | text | |
| natura_iva | enum `esente_sanitaria` / `imponibile` | |
| previdenza | enum `enpap` / `gestione_separata` / `da_verificare` | |
| predefinita | boolean | una sola predefinita per utente |

### `clienti`

| Campo | Tipo | Vincoli |
|---|---|---|
| tipo | enum `persona_fisica` / `ente` | |
| nome, cognome / denominazione | text | |
| codice_fiscale | text null | controllo formale se presente |
| partita_iva | text null | per gli enti |
| indirizzo, cap, comune, provincia, nazione | text | |
| pec, codice_destinatario | text null | per gli enti |
| sostituto_imposta | boolean | ritenuta solo se vero (FR-009) |
| opposizione_sts | boolean | esclude dall'invio STS (FR-014) |
| pagato_da | text null | solo nome (FR-017) |

Nessun campo per note cliniche o altro (FR-017, SC-007).

### `fatture`

| Campo | Tipo | Vincoli |
|---|---|---|
| tipo | enum `fattura` / `nota_credito` | |
| stato | enum `bozza` / `emessa` / `annullata` | transizioni: bozza→emessa (emetti_fattura), emessa→annullata (nota di credito) |
| anno | int | |
| numero | int null | null in bozza; `unique (owner_id, anno, numero)` |
| data | date | ≥ inizio attività |
| cliente_id | uuid → clienti | |
| attivita_id | uuid → attivita | |
| fattura_rif_id | uuid null → fatture | per le note di credito |
| fotografia | jsonb | dati di professionista, cliente, regole e impostazioni usate all'emissione |
| totale_compensi, totale_integrativo, imponibile_iva, iva, importo_esente, bollo, bollo_addebitato, ritenuta, totale, netto | bigint (centesimi) | calcolati dal motore; vincolo: totale = imponibile_iva + iva + importo_esente + (bollo se addebitato) |
| dicitura | text | esenzione, bollo, opposizione STS |
| stato_sts | enum `non_dovuto` / `da_inviare` / `inviata` | |

Immutabilità: trigger impedisce modifiche e cancellazioni di righe in stato `emessa`/`annullata`, salvo
`stato` emessa→annullata e `stato_sts` (adempimento successivo).

### `righe_fattura`

| Campo | Tipo | Vincoli |
|---|---|---|
| fattura_id | uuid → fatture (cascade per le bozze) | |
| descrizione | text | nessun dato clinico (avviso in interfaccia) |
| quantita | int ≥ 1 | |
| compenso | bigint centesimi ≥ 0 | |
| natura | enum `esente_sanitaria` / `imponibile` | |
| integrativo, iva | bigint centesimi | calcolati |

### `incassi`

| Campo | Tipo | Vincoli |
|---|---|---|
| fattura_id | uuid → fatture | solo fatture emesse |
| data | date | anno di cassa |
| importo | bigint centesimi > 0 | somma ≤ netto della fattura |
| modalita | enum `contanti` / `carta_pos` / `bonifico` / `altro` | |
| tracciabile | boolean | contanti = false |

### Viste e funzioni

- `reddito_cassa_anno(anno)`: incassi dell'anno (FR-019).
- `riepilogo_iva_anno(anno)`: imponibili, esenti, quota imponibile, pro-rata (FR-024).
- `emetti_fattura(id)`, `crea_nota_di_credito(id, importo)`, `registra_incasso(...)`: vedi [contracts/database.md](contracts/database.md).
