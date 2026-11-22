# Modello dati: Spese deducibili e consigli

**Spec**: [spec.md](spec.md) | **Ricerca**: [research.md](research.md)

Tabelle dal modello RLS della 002 (`private.applica_regole_tabella`): `id` dal dispositivo, `owner_id`,
`versione`, date, RLS forzata, proprietario + restrittiva aal2. Importi in **centesimi** (`bigint`).
Nessun dato clinico (le spese sanitarie personali sono solo importi e categoria, senza descrizione medica).

### `spese` (spese professionali, FR-001, FR-002, FR-014)

| Campo | Tipo | Vincoli |
|---|---|---|
| data | date | data del pagamento (principio di cassa) |
| importo | bigint > 0 | pagato, IVA indetraibile compresa |
| iva_detraibile | bigint ≥ 0, ≤ importo | default 0 (attività esente) |
| fornitore | text ≤ 120 | |
| descrizione | text ≤ 200 | facoltativa |
| categoria | text | codice del catalogo delle regole (R-01), es. `formazione` |
| percentuale | numeric(5,4) null | sostituisce quella della categoria; richiede `motivazione` |
| motivazione | text ≤ 300 | obbligatoria se `percentuale` è valorizzata |
| modalita | enum `carta` / `bonifico` / `contanti` / `altro` | |
| tracciabile | boolean generata | `modalita <> 'contanti'` |
| ha_giustificativo | boolean | default false ("senza giustificativo") |
| rimborsata | boolean | default false: rimborso analitico dal cliente ⇒ non deducibile |
| bene_id | uuid null → `beni` | se la spesa è l'acquisto di un bene durevole |

### `beni` (registro dei beni durevoli, FR-003)

| Campo | Tipo | Vincoli |
|---|---|---|
| descrizione | text ≤ 120 | es. "Computer portatile" |
| categoria | text | codice delle regole (es. `computer`, `arredi`, `attrezzature`) |
| costo | bigint > 0 | |
| data_acquisto | date | entrata in funzione |
| coefficiente | numeric(5,4) null | sostituisce quello della categoria (con motivazione) |
| data_dismissione | date null | ≥ data_acquisto |
| valore_cessione | bigint null ≥ 0 | |

### `oneri_personali` (FR-004)

| Campo | Tipo | Vincoli |
|---|---|---|
| data | date | |
| importo | bigint > 0 | |
| voce | text | codice delle regole (R-03), es. `previdenza_complementare`, `spese_sanitarie` |
| modalita | enum come `spese.modalita` | |
| ha_giustificativo | boolean | |

Nessun campo di testo libero: sulle spese sanitarie potrebbe finire un dato clinico (test 007).

### `impostazioni_spese` (una riga per utente)

| Campo | Tipo | Vincoli |
|---|---|---|
| categorie_attive | text[] | categorie disattivate di default attivate dall'utente (FR-026) |
| figli_a_carico | int 0–10 | per il coefficiente dell'art. 16-ter (dato personale: solo qui) |
| accantonamento_coperto | boolean | default false: conferma finché manca la 007 (FR-027) |
| margine_ufficio | numeric(4,3) | default 0.20 |
| rapporto_ufficio | numeric(4,3) | default 0.15 |

### Modifiche ad altre tabelle

- `certificazioni_uniche.previdenza_complementare` bigint null ≥ 0 (versata tramite il datore, R-08).

Simulazioni e ipotesi di studio: **non salvate**. Giustificativi: bucket privato `giustificativi`
(`<owner_id>/<id spesa o onere>`), policy proprietario + aal2.
