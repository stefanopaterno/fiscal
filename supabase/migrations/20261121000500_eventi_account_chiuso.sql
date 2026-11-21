-- Correzione della 002 (trovata dal test di integrazione delle fatture, specifica 003):
-- cancellando un account, la chiusura a cascata delle sue sessioni registrava l'evento "sessione_chiusa"
-- per un utente già cancellato → violazione del riferimento e cancellazione dell'account non riuscita.
-- Ora l'evento si registra solo se l'utente esiste ancora.
create or replace function private.registra_evento(p_owner uuid, p_tipo text, p_dispositivo text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.security_events (owner_id, tipo, dispositivo)
  select p_owner, p_tipo, p_dispositivo
  where exists (select 1 from auth.users u where u.id = p_owner);
$$;
revoke all on function private.registra_evento(uuid, text, text) from public, anon, authenticated;
