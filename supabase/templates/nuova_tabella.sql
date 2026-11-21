-- MODELLO per ogni nuova tabella con dati dell'utente (T043).
-- Contratto: specs/002-accesso-protetto-2fa/contracts/rls-policy-contract.md
-- Come usarlo: copiare in una nuova migrazione (supabase migration new <nome>), sostituire
-- NOME_TABELLA, aggiungere le colonne proprie. Il test 003_conformita.test.sql fallisce se manca qualcosa.

create table public.NOME_TABELLA (
  id            uuid primary key,                       -- generato dal dispositivo (coda offline idempotente)
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,                -- aumenta a ogni modifica (conflitti tra dispositivi)
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
  -- , altre colonne della tabella
);

alter table public.NOME_TABELLA enable row level security;
alter table public.NOME_TABELLA force row level security;

-- 1) Il proprietario vede e modifica solo le proprie righe (permissiva)
create policy "NOME_TABELLA_proprietario" on public.NOME_TABELLA
  for all to authenticated
  using      (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- 2) Senza secondo fattore e accesso completo valido non si legge nulla (restrittiva)
create policy "NOME_TABELLA_richiede_aal2" on public.NOME_TABELLA
  as restrictive for all to authenticated
  using      ((select auth.jwt() ->> 'aal') = 'aal2' and private.accesso_completo_valido())
  with check ((select auth.jwt() ->> 'aal') = 'aal2' and private.accesso_completo_valido());

-- 3) Nessun privilegio per gli utenti non autenticati; al client solo le operazioni necessarie
revoke all on public.NOME_TABELLA from anon;
revoke all on public.NOME_TABELLA from authenticated;
grant select, insert, update, delete on public.NOME_TABELLA to authenticated;

-- 4) owner_id non modificabile dopo l'inserimento, versione e data di modifica automatiche
create or replace function private.NOME_TABELLA_prima_della_modifica()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.owner_id := old.owner_id;
  new.versione := old.versione + 1;
  new.aggiornato_il := now();
  return new;
end;
$$;
create trigger NOME_TABELLA_prima_della_modifica before update on public.NOME_TABELLA
  for each row execute function private.NOME_TABELLA_prima_della_modifica();
