-- My Fiscal - specifica 002: schema di sicurezza di base.
-- ATTENZIONE: scritta senza poterla eseguire (nessun Postgres disponibile al momento della stesura).
-- Va provata con `supabase start` + `supabase test db` PRIMA di applicarla al progetto remoto.
-- Vedi specs/002-accesso-protetto-2fa/data-model.md e contracts/rls-policy-contract.md.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- 1) Nessuna tabella senza RLS: ogni CREATE TABLE in public attiva la RLS.
-- ---------------------------------------------------------------------------
create or replace function private.ensure_rls()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      execute format('alter table if exists %s enable row level security', cmd.object_identity);
      execute format('alter table if exists %s force row level security', cmd.object_identity);
    end if;
  end loop;
end;
$$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end
  execute function private.ensure_rls();

-- ---------------------------------------------------------------------------
-- 2) Tabelle di sicurezza
-- ---------------------------------------------------------------------------
create table public.user_security (
  owner_id                     uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  blocco_minuti                int  not null default 5   check (blocco_minuti between 1 and 60),
  accesso_completo_giorni      int  not null default 14  check (accesso_completo_giorni between 1 and 30),
  sblocco_rapido_attivo        boolean not null default false,
  frase_recupero_hash          text,
  frase_recupero_impostata_il  timestamptz,
  frase_recupero_tentativi     int  not null default 0,
  frase_recupero_bloccata_fino timestamptz,
  codici_confermati_il         timestamptz,
  aggiornato_il                timestamptz not null default now()
);

create table public.recovery_codes (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  lotto        int  not null,
  codice_hmac  bytea not null,
  usato_il     timestamptz,
  creato_il    timestamptz not null default now(),
  unique (owner_id, codice_hmac)
);

create type public.stato_richiesta_recupero as enum ('in_attesa', 'annullata', 'completata', 'scaduta');

create table public.recovery_requests (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade default auth.uid(),
  stato            public.stato_richiesta_recupero not null default 'in_attesa',
  creata_il        timestamptz not null default now(),
  esegui_dopo      timestamptz not null,
  chiusa_il        timestamptz,
  motivo_chiusura  text
);
-- al più una richiesta in attesa per utente
create unique index recovery_requests_una_in_attesa
  on public.recovery_requests (owner_id) where stato = 'in_attesa';

create table public.security_events (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  tipo          text not null,
  avvenuto_il   timestamptz not null default now(),
  dispositivo   text
);

-- ---------------------------------------------------------------------------
-- 3) Funzione usata dalle policy: accesso completo ancora valido?
--    Legge l'orario dell'ultima verifica TOTP dal token (claim "amr").
--    DA PROVARE (spike S3): se "amr" non porta l'orario dopo il rinnovo del token,
--    ripiegare su auth.sessions.created_at della sessione (claim session_id).
-- ---------------------------------------------------------------------------
create or replace function private.accesso_completo_valido()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select max((e ->> 'timestamp')::bigint)
      from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) e
      where e ->> 'method' = 'totp'
    ),
    0
  ) >= extract(epoch from now())::bigint
       - 86400 * coalesce(
           (select us.accesso_completo_giorni from public.user_security us where us.owner_id = auth.uid()),
           14
         );
$$;
revoke all on function private.accesso_completo_valido() from public, anon;
grant execute on function private.accesso_completo_valido() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Riga di impostazioni creata in automatico per ogni nuovo utente
-- ---------------------------------------------------------------------------
create or replace function private.crea_user_security()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_security (owner_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger crea_user_security
  after insert on auth.users
  for each row execute function private.crea_user_security();

-- Se l'utente esiste già (creato prima di questa migrazione), crea la sua riga.
insert into public.user_security (owner_id)
select id from auth.users
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5) RLS e policy (modello del contratto rls-policy-contract.md)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['user_security', 'recovery_codes', 'recovery_requests', 'security_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);

    -- permissiva: solo righe proprie (in lettura)
    execute format($p$
      create policy %I on public.%I for select to authenticated
      using (owner_id = (select auth.uid()))
    $p$, t || '_proprietario_select', t);

    -- restrittiva: serve secondo fattore valido e accesso completo
    execute format($p$
      create policy %I on public.%I as restrictive for all to authenticated
      using ((select auth.jwt() ->> 'aal') = 'aal2' and private.accesso_completo_valido())
      with check ((select auth.jwt() ->> 'aal') = 'aal2' and private.accesso_completo_valido())
    $p$, t || '_richiede_aal2', t);
  end loop;
end;
$$;

-- Il client può leggere solo i campi non segreti di user_security e modificarne tre.
grant select (owner_id, blocco_minuti, accesso_completo_giorni, sblocco_rapido_attivo,
              frase_recupero_impostata_il, codici_confermati_il, aggiornato_il)
  on public.user_security to authenticated;
grant update (blocco_minuti, accesso_completo_giorni, sblocco_rapido_attivo)
  on public.user_security to authenticated;
create policy user_security_proprietario_update on public.user_security
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Lettura dei propri eventi di sicurezza e delle proprie richieste (mai modifiche dal client).
grant select on public.security_events    to authenticated;
grant select on public.recovery_requests  to authenticated;
-- recovery_codes: nessun privilegio al client (solo conteggio tramite funzione).

-- ---------------------------------------------------------------------------
-- 6) Funzioni richiamabili dal client (solo aal2 con accesso completo valido)
-- ---------------------------------------------------------------------------
create or replace function public.codici_recupero_residui()
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.jwt() ->> 'aal') is distinct from 'aal2' or not private.accesso_completo_valido() then
    raise exception 'accesso_negato' using errcode = '42501';
  end if;
  return (select count(*)::int from public.recovery_codes
          where owner_id = auth.uid() and usato_il is null
            and lotto = (select max(lotto) from public.recovery_codes where owner_id = auth.uid()));
end;
$$;

create or replace function public.mie_sessioni()
returns table (id uuid, creata_il timestamptz, ultimo_uso timestamptz, browser text, corrente boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.jwt() ->> 'aal') is distinct from 'aal2' or not private.accesso_completo_valido() then
    raise exception 'accesso_negato' using errcode = '42501';
  end if;
  return query
    select s.id, s.created_at, coalesce(s.refreshed_at, s.updated_at), s.user_agent,
           (s.id = (auth.jwt() ->> 'session_id')::uuid)
    from auth.sessions s
    where s.user_id = auth.uid()
    order by s.created_at desc;
end;
$$;

create or replace function public.chiudi_mia_sessione(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if (select auth.jwt() ->> 'aal') is distinct from 'aal2' or not private.accesso_completo_valido() then
    raise exception 'accesso_negato' using errcode = '42501';
  end if;
  if p_id = (auth.jwt() ->> 'session_id')::uuid then
    raise exception 'usa_il_logout' using errcode = '22023';
  end if;
  delete from auth.sessions where id = p_id and user_id = auth.uid();
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

revoke all on function public.codici_recupero_residui() from public, anon;
revoke all on function public.mie_sessioni()            from public, anon;
revoke all on function public.chiudi_mia_sessione(uuid) from public, anon;
grant execute on function public.codici_recupero_residui() to authenticated;
grant execute on function public.mie_sessioni()            to authenticated;
grant execute on function public.chiudi_mia_sessione(uuid) to authenticated;

-- aggiornamento automatico di aggiornato_il
create or replace function private.tocca_aggiornato_il()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.aggiornato_il := now();
  return new;
end;
$$;
create trigger user_security_tocca before update on public.user_security
  for each row execute function private.tocca_aggiornato_il();
