# Contratto: regole di accesso per riga (obbligatorie per ogni tabella)

**Piano**: [../plan.md](../plan.md) | **Ricerca**: [../research.md](../research.md) (D-02, D-03, D-16)

Questo contratto vale per **tutte** le tabelle presenti e future del progetto, comprese quelle
delle altre specifiche (fatture, spese, CU, pazienti...). Una migrazione che lo viola non passa i
test e non va accettata (FR-015, SC-008).

## Colonne standard di ogni tabella con dati dell'utente

| Colonna | Regola |
|---|---|
| `id uuid primary key` | **generato dal client** (UUID) per rendere idempotente la coda offline |
| `owner_id uuid not null default auth.uid()` | proprietario; mai modificabile dopo l'inserimento |
| `versione int not null default 1` | incrementata a ogni modifica (rilevamento conflitti) |
| `creato_il`, `aggiornato_il timestamptz` | gestiti da trigger |

## Modello di migrazione (da copiare per ogni tabella nuova)

```sql
alter table public.<tabella> enable row level security;
alter table public.<tabella> force row level security;

-- 1) Il proprietario vede e modifica solo le proprie righe (permissiva)
create policy "<tabella>_proprietario" on public.<tabella>
  for all to authenticated
  using      (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- 2) Senza secondo fattore valido e accesso completo non si legge nulla (restrittiva)
create policy "<tabella>_richiede_aal2" on public.<tabella>
  as restrictive for all to authenticated
  using      ((select auth.jwt()->>'aal') = 'aal2' and private.accesso_completo_valido())
  with check ((select auth.jwt()->>'aal') = 'aal2' and private.accesso_completo_valido());

-- 3) Nessun privilegio per anonimi
revoke all on public.<tabella> from anon;
```

Note:
- Non esistono policy per `anon`: un utente non autenticato ottiene 0 righe e nessuna scrittura.
- Le funzioni `security definer` vivono nello schema `private` (non esposto dall'API) tranne quelle
  elencate in [edge-functions.md](edge-functions.md), e hanno `set search_path = ''`.
- La chiave di servizio non compare mai nel client: le sole scritture "privilegiate" sono nelle
  funzioni Edge.

## Controlli automatici obbligatori

1. **Trigger di evento `ensure_rls`**: a ogni `CREATE TABLE` in `public` attiva la RLS, così una
   tabella dimenticata non è mai aperta (scenario 3 della storia 2).
2. **Test pgTAP "ogni tabella conforme"**: per ogni tabella di `public` (esclusa una lista
   esplicita e motivata di eccezioni, vuota all'inizio) verifica: RLS attiva e forzata; esistono la
   policy del proprietario e la policy restrittiva `aal2`; nessun privilegio per `anon`.
3. **Test pgTAP di comportamento**, per ogni tabella, con questi cinque attori:

| Attore | Lettura | Scrittura |
|---|---|---|
| Anonimo | 0 righe | rifiutata |
| Altro utente autenticato (`aal2`) | 0 righe | rifiutata |
| Proprietario `aal1` (solo password) | 0 righe | rifiutata |
| Proprietario `aal2` ma accesso completo scaduto | 0 righe | rifiutata |
| Proprietario `aal2` valido | righe proprie | riuscita |

4. **Test di integrazione**: con la sola chiave pubblica e l'indirizzo del progetto (come farebbe
   un estraneo) nessuna tabella restituisce dati (SC-002).
5. **Scansione segreti** su repository e cartella `out/` (SC-003).

## Eccezioni

Nessuna tabella è esente. Le tabelle di Supabase (`auth.*`, `storage.*`) non sono esposte
direttamente: si accede solo con le funzioni elencate. Il bucket dei documenti (specifica 010)
dovrà avere policy equivalenti sullo schema `storage`, definite nel piano di quella funzione.
