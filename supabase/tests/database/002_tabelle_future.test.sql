-- pgTAP (T040, storia 2 scenario 3): una tabella nuova creata SENZA regole
-- riceve comunque la RLS dal trigger ensure_rls e risulta "non conforme" finché non ha le policy.
begin;
select plan(4);

create table public.prova_senza_regole (id uuid primary key default gen_random_uuid(), testo text);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.prova_senza_regole'::regclass),
  'ensure_rls ha attivato la RLS sulla tabella nuova');
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.prova_senza_regole'::regclass),
  'ensure_rls ha forzato la RLS anche per il proprietario della tabella');

-- Senza policy, un utente autenticato con aal2 non vede nulla (RLS attiva = tutto chiuso)
insert into public.prova_senza_regole (testo) values ('dato');
grant select on public.prova_senza_regole to authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', gen_random_uuid(), 'role', 'authenticated', 'aal', 'aal2')::text, true);
set local role authenticated;
select is((select count(*)::int from public.prova_senza_regole), 0, 'senza policy nessuno vede le righe');
reset role;

-- Il controllo di conformità la segnala come non conforme (manca la policy restrittiva aal2)
select ok(
  'prova_senza_regole' = any (
    select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
                      and p.permissive = 'RESTRICTIVE' and p.qual like '%aal2%')),
  'il controllo di conformità segnala la tabella senza regole');

select * from finish();
rollback;
