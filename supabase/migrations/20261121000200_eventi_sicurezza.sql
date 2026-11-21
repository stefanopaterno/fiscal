-- Fiscal - specifica 002, T039: registro di sicurezza scritto dal database.
-- Gli eventi contengono solo il tipo, l'orario e un'etichetta breve del dispositivo (mai IP, mai contenuti).
-- Vedi data-model.md, security_events.tipo.

-- Etichetta breve del dispositivo dal "user agent" del browser (es. "iPhone · Safari").
create or replace function private.etichetta_dispositivo(ua text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
           when ua is null or ua = '' then null
           else concat_ws(' · ',
             case
               when ua ilike '%iphone%' then 'iPhone'
               when ua ilike '%ipad%' then 'iPad'
               when ua ilike '%android%' then 'Android'
               when ua ilike '%macintosh%' or ua ilike '%mac os x%' then 'Mac'
               when ua ilike '%windows%' then 'Windows'
               when ua ilike '%linux%' then 'Linux'
               else 'Altro dispositivo'
             end,
             case
               when ua ilike '%edg/%' then 'Edge'
               when ua ilike '%firefox/%' or ua ilike '%fxios/%' then 'Firefox'
               when ua ilike '%chrome/%' or ua ilike '%crios/%' then 'Chrome'
               when ua ilike '%safari/%' then 'Safari'
               else null
             end)
         end;
$$;

create or replace function private.registra_evento(p_owner uuid, p_tipo text, p_dispositivo text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.security_events (owner_id, tipo, dispositivo) values (p_owner, p_tipo, p_dispositivo);
$$;
revoke all on function private.registra_evento(uuid, text, text) from public, anon, authenticated;

-- Accesso riuscito (nuova sessione) e sessione chiusa
create or replace function private.evento_sessione()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.registra_evento(new.user_id, 'login_ok', private.etichetta_dispositivo(new.user_agent));
    return new;
  else
    perform private.registra_evento(old.user_id, 'sessione_chiusa', private.etichetta_dispositivo(old.user_agent));
    return old;
  end if;
end;
$$;

drop trigger if exists fiscal_evento_sessione on auth.sessions;
create trigger fiscal_evento_sessione
  after insert or delete on auth.sessions
  for each row execute function private.evento_sessione();

-- Secondo fattore configurato (passa da "unverified" a "verified")
create or replace function private.evento_fattore()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status::text = 'verified' and (tg_op = 'INSERT' or old.status::text is distinct from 'verified') then
    perform private.registra_evento(new.user_id, 'mfa_configurato');
  end if;
  return new;
end;
$$;

drop trigger if exists fiscal_evento_fattore on auth.mfa_factors;
create trigger fiscal_evento_fattore
  after insert or update of status on auth.mfa_factors
  for each row execute function private.evento_fattore();

-- Cambio password
create or replace function private.evento_password()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    perform private.registra_evento(new.id, 'password_cambiata');
  end if;
  return new;
end;
$$;

drop trigger if exists fiscal_evento_password on auth.users;
create trigger fiscal_evento_password
  after update of encrypted_password on auth.users
  for each row execute function private.evento_password();

-- Sblocco rapido attivato o disattivato
create or replace function private.evento_sblocco_rapido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sblocco_rapido_attivo is distinct from old.sblocco_rapido_attivo then
    perform private.registra_evento(
      new.owner_id,
      case when new.sblocco_rapido_attivo then 'sblocco_rapido_attivato' else 'sblocco_rapido_disattivato' end);
  end if;
  return new;
end;
$$;

drop trigger if exists fiscal_evento_sblocco_rapido on public.user_security;
create trigger fiscal_evento_sblocco_rapido
  after update of sblocco_rapido_attivo on public.user_security
  for each row execute function private.evento_sblocco_rapido();
