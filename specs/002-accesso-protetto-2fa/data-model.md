# Modello dati: Accesso protetto con 2FA

**Spec**: [spec.md](spec.md) | **Piano**: [plan.md](plan.md) | **Ricerca**: [research.md](research.md)

Tutte le tabelle stanno nello schema `public` (tranne le funzioni di supporto in `private`),
hanno **RLS attiva e forzata** e rispettano il contratto
[contracts/rls-policy-contract.md](contracts/rls-policy-contract.md). Gli identificativi sono UUID;
le date sono `timestamptz` in UTC. Nessuna tabella di questa funzione contiene dati fiscali.

## Entità fornite da Supabase (non create da noi)

- **Account utente** (`auth.users`), **secondo fattore** (`auth.mfa_factors`), **sessione**
  (`auth.sessions`): gestiti da Supabase Auth. Il progetto è configurato con un solo fattore
  per utente e registrazioni disattivate.

## Tabelle nuove

### `user_security` — impostazioni di sicurezza (1 riga per utente)

| Campo | Tipo | Note |
|---|---|---|
| `owner_id` | uuid PK, FK `auth.users`, default `auth.uid()` | proprietario |
| `blocco_minuti` | int not null default 5 | limiti: 1–60 (FR-010) |
| `accesso_completo_giorni` | int not null default 14 | limiti: 1–30 (FR-010, FR-019) |
| `sblocco_rapido_attivo` | bool not null default false | FR-020: disattivabile sempre |
| `frase_recupero_hash` | text null | argon2id; mai la frase; FR-023 |
| `frase_recupero_impostata_il` | timestamptz null | |
| `frase_recupero_tentativi` | int not null default 0 | azzerato dopo un successo |
| `frase_recupero_bloccata_fino` | timestamptz null | blocco di 24 ore dopo 5 errori |
| `codici_confermati_il` | timestamptz null | l'utente ha confermato di averli conservati (FR-008) |
| `aggiornato_il` | timestamptz not null default now() | |

La colonna `frase_recupero_hash` **non è leggibile** dal client: l'accesso alla tabella passa da
una vista `user_security_pubblica` che la esclude; la scrittura della frase avviene solo dalla
funzione Edge (service role).

### `recovery_codes` — codici di recupero monouso

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid PK | |
| `owner_id` | uuid FK | |
| `lotto` | int not null | si incrementa a ogni rigenerazione; i lotti vecchi si invalidano (FR-008, storia 6.2) |
| `codice_hmac` | bytea not null | HMAC-SHA256 con pepper dei segreti Edge; mai il codice in chiaro |
| `usato_il` | timestamptz null | uso singolo (storia 4.3) |
| `creato_il` | timestamptz not null default now() | |

Vincoli: `unique (owner_id, codice_hmac)`. Il client **non** può leggere questa tabella (nessuna
policy di lettura per `authenticated`): vede solo il conteggio dei codici residui tramite la
funzione `codici_recupero_residui()`.

### `recovery_requests` — richieste di ripristino con la frase

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid PK | |
| `owner_id` | uuid FK | |
| `stato` | enum `in_attesa`, `annullata`, `completata`, `scaduta` | vedi transizioni |
| `creata_il` | timestamptz not null default now() | |
| `esegui_dopo` | timestamptz not null | `creata_il + 48 ore` (D-07) |
| `chiusa_il` | timestamptz null | |
| `motivo_chiusura` | text null | `accesso_valido`, `annullata_dall_utente`, `completata`, `scaduta` |

Vincolo: al più una richiesta `in_attesa` per utente (indice univoco parziale).

**Transizioni**: `in_attesa` → `annullata` (accesso `aal2` valido o pulsante) · `in_attesa` →
`completata` (solo se `now() >= esegui_dopo` e azione "completa") · `in_attesa` → `scaduta` (oltre
7 giorni senza completamento, per evitare richieste dimenticate). Nessun'altra transizione.

### `security_events` — registro di sicurezza (senza contenuti)

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid PK | |
| `owner_id` | uuid FK | |
| `tipo` | text not null | `login_ok`, `login_fallito`, `mfa_configurato`, `codice_recupero_usato`, `codici_rigenerati`, `frase_avviata`, `frase_annullata`, `frase_completata`, `password_cambiata`, `sessione_chiusa`, `sblocco_rapido_attivato`/`disattivato` |
| `avvenuto_il` | timestamptz not null default now() | |
| `dispositivo` | text null | etichetta breve (es. "iPhone, Safari"), mai indirizzi IP completi |

Solo inserimenti dalle funzioni; il client può leggere i propri eventi, non modificarli né
cancellarli (nessuna policy di update/delete). Nessun dato fiscale né personale oltre
all'etichetta del dispositivo.

### `offline_conflicts` — non necessaria

I conflitti della coda offline si gestiscono nel client (le due versioni a fianco) e si risolvono
con una scrittura normale; non serve una tabella dedicata. Ogni **tabella fiscale futura** deve
avere `id uuid` generato dal client e `versione int not null default 1` per supportare la coda
(contratto in [contracts/rls-policy-contract.md](contracts/rls-policy-contract.md)).

## Funzioni di database (schema `public` o `private`)

| Funzione | Chi la chiama | Cosa fa |
|---|---|---|
| `private.accesso_completo_valido()` | policy restrittive | `true` se l'ultima verifica TOTP nel token è entro `accesso_completo_giorni` |
| `mie_sessioni()` | client (`aal2`) | elenca le sessioni dell'utente (id, creata, ultimo uso, browser) |
| `chiudi_mia_sessione(uuid)` | client (`aal2`) | cancella una sessione propria |
| `codici_recupero_residui()` | client (`aal2`) | numero di codici non usati |
| `ensure_rls()` (trigger di evento) | database | attiva la RLS su ogni nuova tabella di `public` |

## Stati lato client (non salvati nel database)

- **Stato di accesso**: `anonimo` → `password_ok (aal1)` → `completo (aal2)` ⇄ `bloccato`
  (sessione valida ma nascosta). Dettagli in [contracts/app-routes-and-lock.md](contracts/app-routes-and-lock.md).
- **Voce della coda**: `in_attesa` → `inviata` | `in_conflitto` → (scelta dell'utente) → `inviata`.
  Campi locali: `id` (UUID), `tabella`, `operazione`, `payload` (cifrato), `versione_base`,
  `creata_il`, `tentativi`.

## Relazioni

```text
auth.users 1─1 user_security
auth.users 1─N recovery_codes
auth.users 1─N recovery_requests   (al più 1 in_attesa)
auth.users 1─N security_events
auth.users 1─N auth.sessions       (lette/chiuse solo con le funzioni dedicate)
auth.users 1─≤1 auth.mfa_factors   (max_enrolled_factors = 1)
```
