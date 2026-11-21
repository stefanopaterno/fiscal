-- Fiscal - specifica 002, storia US4: regole del recupero nel database.
-- Le funzioni "recupero_*" si eseguono SOLO dal server (funzioni Edge con service_role), mai dal browser.
-- Vedi contracts/edge-functions.md e data-model.md.

-- Codici: salva un nuovo lotto di impronte HMAC (i lotti precedenti smettono di valere)
create or replace function public.recupero_salva_codici(p_owner uuid, p_hmac bytea[], p_rigenera boolean)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lotto int;
begin
  select coalesce(max(lotto), 0) + 1 into v_lotto from public.recovery_codes where owner_id = p_owner;
  insert into public.recovery_codes (owner_id, lotto, codice_hmac)
  select p_owner, v_lotto, h from unnest(p_hmac) as h;
  perform private.registra_evento(p_owner, case when p_rigenera then 'codici_rigenerati' else 'codici_generati' end);
  return v_lotto;
end;
$$;

create or replace function public.recupero_codici_residui(p_owner uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.recovery_codes
  where owner_id = p_owner and usato_il is null
    and lotto = (select max(lotto) from public.recovery_codes where owner_id = p_owner);
$$;

-- Codici: usa un codice. Esito: 'valido' | 'non_valido' | 'bloccato' (5 errori in 15 minuti)
create or replace function public.recupero_usa_codice(p_owner uuid, p_hmac bytea)
returns table (esito text, residui int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_errori int;
  v_id uuid;
begin
  select count(*) into v_errori from public.security_events
  where owner_id = p_owner and tipo = 'codice_recupero_errato' and avvenuto_il > now() - interval '15 minutes';
  if v_errori >= 5 then
    return query select 'bloccato'::text, public.recupero_codici_residui(p_owner);
    return;
  end if;

  select c.id into v_id from public.recovery_codes c
  where c.owner_id = p_owner and c.codice_hmac = p_hmac and c.usato_il is null
    and c.lotto = (select max(lotto) from public.recovery_codes where owner_id = p_owner)
  for update;

  if v_id is null then
    perform private.registra_evento(p_owner, 'codice_recupero_errato');
    return query select 'non_valido'::text, public.recupero_codici_residui(p_owner);
    return;
  end if;

  update public.recovery_codes set usato_il = now() where id = v_id;
  perform private.registra_evento(p_owner, 'codice_recupero_usato');
  return query select 'valido'::text, public.recupero_codici_residui(p_owner);
end;
$$;

-- Frase: salva l'impronta argon2id (mai la frase)
create or replace function public.recupero_imposta_frase(p_owner uuid, p_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_security
  set frase_recupero_hash = p_hash, frase_recupero_impostata_il = now(),
      frase_recupero_tentativi = 0, frase_recupero_bloccata_fino = null
  where owner_id = p_owner;
$$;

create or replace function public.recupero_dati_frase(p_owner uuid)
returns table (hash text, bloccata_fino timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select frase_recupero_hash, frase_recupero_bloccata_fino from public.user_security where owner_id = p_owner;
$$;

-- Frase sbagliata: al quinto errore blocco di 24 ore. Restituisce la fine del blocco (o null).
create or replace function public.recupero_frase_errata(p_owner uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tentativi int;
  v_blocco timestamptz;
begin
  update public.user_security set frase_recupero_tentativi = frase_recupero_tentativi + 1
  where owner_id = p_owner returning frase_recupero_tentativi into v_tentativi;
  perform private.registra_evento(p_owner, 'frase_errata');
  if v_tentativi >= 5 then
    v_blocco := now() + interval '24 hours';
    update public.user_security set frase_recupero_bloccata_fino = v_blocco, frase_recupero_tentativi = 0
    where owner_id = p_owner;
  end if;
  return v_blocco;
end;
$$;

create or replace function public.recupero_frase_corretta(p_owner uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_security set frase_recupero_tentativi = 0 where owner_id = p_owner;
$$;

-- Richieste di ripristino: le richieste in attesa da più di 7 giorni scadono
create or replace function private.recupero_scadi_vecchie(p_owner uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.recovery_requests
  set stato = 'scaduta', chiusa_il = now(), motivo_chiusura = 'scaduta'
  where owner_id = p_owner and stato = 'in_attesa' and creata_il < now() - interval '7 days';
$$;

create or replace function public.recupero_crea_richiesta(p_owner uuid)
returns setof public.recovery_requests
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.recupero_scadi_vecchie(p_owner);
  if not exists (select 1 from public.recovery_requests where owner_id = p_owner and stato = 'in_attesa') then
    insert into public.recovery_requests (owner_id, esegui_dopo) values (p_owner, now() + interval '48 hours');
    perform private.registra_evento(p_owner, 'frase_avviata');
  end if;
  return query select * from public.recovery_requests where owner_id = p_owner and stato = 'in_attesa';
end;
$$;

create or replace function public.recupero_stato_richiesta(p_owner uuid)
returns setof public.recovery_requests
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.recupero_scadi_vecchie(p_owner);
  return query select * from public.recovery_requests where owner_id = p_owner and stato = 'in_attesa';
end;
$$;

create or replace function public.recupero_annulla_richiesta(p_owner uuid, p_motivo text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.recovery_requests set stato = 'annullata', chiusa_il = now(), motivo_chiusura = p_motivo
  where owner_id = p_owner and stato = 'in_attesa';
  get diagnostics n = row_count;
  if n > 0 then
    perform private.registra_evento(p_owner, 'frase_annullata');
  end if;
  return n > 0;
end;
$$;

-- Completa il ripristino solo dopo l'attesa. Esito: 'completata' | 'in_attesa' | 'nessuna'
create or replace function public.recupero_completa_richiesta(p_owner uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_richiesta public.recovery_requests;
begin
  perform private.recupero_scadi_vecchie(p_owner);
  select * into v_richiesta from public.recovery_requests
  where owner_id = p_owner and stato = 'in_attesa' for update;
  if not found then
    return 'nessuna';
  end if;
  if v_richiesta.esegui_dopo > now() then
    return 'in_attesa';
  end if;
  update public.recovery_requests set stato = 'completata', chiusa_il = now(), motivo_chiusura = 'completata'
  where id = v_richiesta.id;
  update public.user_security
  set frase_recupero_hash = null, frase_recupero_impostata_il = null, frase_recupero_tentativi = 0
  where owner_id = p_owner;
  perform private.registra_evento(p_owner, 'frase_completata');
  return 'completata';
end;
$$;

-- Solo il server esegue le funzioni di recupero
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.recupero_salva_codici(uuid, bytea[], boolean)',
    'public.recupero_codici_residui(uuid)',
    'public.recupero_usa_codice(uuid, bytea)',
    'public.recupero_imposta_frase(uuid, text)',
    'public.recupero_dati_frase(uuid)',
    'public.recupero_frase_errata(uuid)',
    'public.recupero_frase_corretta(uuid)',
    'public.recupero_crea_richiesta(uuid)',
    'public.recupero_stato_richiesta(uuid)',
    'public.recupero_annulla_richiesta(uuid, text)',
    'public.recupero_completa_richiesta(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
revoke all on function private.recupero_scadi_vecchie(uuid) from public, anon, authenticated;

-- Il browser (aal2) registra che l'utente ha conservato i codici
create or replace function public.conferma_codici_conservati()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.jwt() ->> 'aal') is distinct from 'aal2' or not private.accesso_completo_valido() then
    raise exception 'accesso_negato' using errcode = '42501';
  end if;
  update public.user_security set codici_confermati_il = now() where owner_id = auth.uid();
end;
$$;
revoke all on function public.conferma_codici_conservati() from public, anon;
grant execute on function public.conferma_codici_conservati() to authenticated;

-- Un accesso completo (sessione che passa ad aal2) annulla da solo il ripristino in attesa
create or replace function private.annulla_ripristino_su_accesso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.aal::text = 'aal2' and old.aal::text is distinct from 'aal2' then
    perform public.recupero_annulla_richiesta(new.user_id, 'accesso_valido');
  end if;
  return new;
end;
$$;

drop trigger if exists fiscal_annulla_ripristino on auth.sessions;
create trigger fiscal_annulla_ripristino
  after update of aal on auth.sessions
  for each row execute function private.annulla_ripristino_su_accesso();
