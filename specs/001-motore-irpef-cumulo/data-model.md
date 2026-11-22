# Modello dati: Motore IRPEF sul cumulo CU + P.IVA

**Spec**: [spec.md](spec.md) | **Ricerca**: [research.md](research.md)

Tabelle dal modello RLS della 002 (`supabase/templates/nuova_tabella.sql`): `id` generato dal dispositivo,
`owner_id`, `versione`, date, RLS forzata, proprietario + restrittiva aal2. Importi in **centesimi** (`bigint`).
Le aliquote delle addizionali sono dati personali (residenza): stanno solo nel database, mai nel repository.

### `certificazioni_uniche` (una o più per anno, FR-001)

| Campo | Tipo | Vincoli |
|---|---|---|
| anno | int | anno del reddito |
| sostituto | text | nome del datore (facoltativo) |
| reddito_lavoro | bigint ≥ 0 | punto 1 CU (reddito di lavoro dipendente) |
| giorni_lavoro | int 1–365 | per il ragguaglio delle detrazioni, default 365 |
| ritenute_irpef | bigint ≥ 0 | punto 21 |
| addizionale_regionale | bigint ≥ 0 | punto 22 |
| addizionale_comunale_acconto | bigint ≥ 0 | punto 26 |
| addizionale_comunale_saldo | bigint ≥ 0 | punto 27 |
| detrazioni_lavoro_fruite | bigint ≥ 0 | solo informativo (spiegazione) |
| detrazioni_familiari_fruite | bigint ≥ 0 | confronto con FR-032 |
| contributi_previdenziali | bigint ≥ 0 | già esclusi dal reddito_lavoro (informativo) |

### `dati_anno` (una riga per anno, FR-002, FR-028, FR-032)

| Campo | Tipo | Vincoli |
|---|---|---|
| anno | int | `unique (owner_id, anno)` |
| spese_professionali | bigint ≥ 0 | finché non c'è la 008 |
| reddito_professionale_manuale | bigint null | se valorizzato sostituisce quello dalle fatture (anni senza 003) |
| altre_detrazioni | bigint ≥ 0 | FR-032, inserite dall'utente |
| oneri_deducibili | bigint ≥ 0 | oltre ai contributi ENPAP (FR-023) |
| soggetto_isa | boolean | default false (R-05) |
| reddito_atteso | bigint null | metodo previsionale (FR-028) |
| anno_concluso | boolean | default false: per anni in corso contano anche i contributi previsti |

### `aliquote_addizionali` (per anno, FR-008)

| Campo | Tipo | Vincoli |
|---|---|---|
| anno | int | `unique (owner_id, anno)` |
| regionale_scaglioni | jsonb | `[{ "fino_a": centesimi|null, "aliquota": 0.0123 }]`, almeno uno, ultimo `fino_a` null |
| comunale_aliquota | numeric(6,5) | 0–0.009 |
| comunale_soglia_esenzione | bigint null | |
| verificate | boolean | default false: verificate dall'utente sui siti ufficiali |

### `versamenti_previdenza` (FR-005)

| Campo | Tipo | Vincoli |
|---|---|---|
| data | date | anno di deducibilità = anno della data |
| importo | bigint > 0 | |
| tipo | enum `soggettivo` / `integrativo` / `maternita` | integrativo mai deducibile |
| cassa | enum `enpap` / `gestione_separata` | |
| anno_reddito | int | a quale reddito si riferisce |

### `versamenti_imposte` (FR-031)

| Campo | Tipo | Vincoli |
|---|---|---|
| data | date | |
| anno_imposta | int | |
| voce | enum `irpef_acconto_1` / `irpef_acconto_2` / `irpef_saldo` / `add_regionale` / `add_comunale_saldo` / `add_comunale_acconto` | |
| importo | bigint > 0 | eccedenze = credito |

Scenari: **non salvati** (FR-014). Regole fiscali: nel codice (`src/engine/regole/irpef/`), non nel database.

### Tipi del motore (contracts/motore-irpef.md)

`InputAnno` → `calcolaAnno` → `RisultatoAnno`; `confrontaScenario(base, variazione)`;
`calcolaAcconti(risultatoAnnoPrima, metodo)`; `pianiVersamento(...)`.
