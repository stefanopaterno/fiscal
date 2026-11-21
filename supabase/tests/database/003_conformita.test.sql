-- pgTAP (T044, FR-015, SC-008): OGNI tabella di public rispetta il contratto
-- specs/002-accesso-protetto-2fa/contracts/rls-policy-contract.md.
-- Eccezioni: elenco esplicito e motivato. Oggi è VUOTO: nessuna tabella è esente.
begin;
select plan(5);

create temp table eccezioni (tabella text primary key, motivo text not null);
-- insert into eccezioni values ('nome_tabella', 'motivo');   -- nessuna eccezione

create temp view tabelle_da_controllare as
  select c.relname::text as tabella, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and c.relname not in (select tabella from eccezioni);

select is((select count(*)::int from eccezioni), 0, 'nessuna tabella è esente dalle regole');

select is(
  (select array_agg(tabella order by tabella) from tabelle_da_controllare where not (relrowsecurity and relforcerowsecurity)),
  null, 'tutte le tabelle hanno la RLS attiva e forzata');

select is(
  (select array_agg(t.tabella order by t.tabella) from tabelle_da_controllare t
   where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tabella
                     and p.permissive = 'PERMISSIVE' and p.qual like '%auth.uid()%')),
  null, 'tutte le tabelle hanno la policy del proprietario (auth.uid())');

select is(
  (select array_agg(t.tabella order by t.tabella) from tabelle_da_controllare t
   where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tabella
                     and p.permissive = 'RESTRICTIVE' and p.qual like '%aal2%'
                     and p.qual like '%accesso_completo_valido%')),
  null, 'tutte le tabelle hanno la policy restrittiva (aal2 + accesso completo valido)');

select is(
  (select array_agg(distinct table_name::text order by table_name::text) from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'),
  null, 'nessun privilegio per gli utenti non autenticati (anon)');

select * from finish();
rollback;
