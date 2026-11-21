-- pgTAP: regole di accesso per riga (specs/002.../contracts/rls-policy-contract.md).
-- Si esegue con `supabase test db` (serve Docker). Scritto senza poterlo eseguire: da verificare.
begin;
select plan(14);

-- 1) Ogni tabella di public ha RLS attiva e forzata
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and not (c.relrowsecurity and c.relforcerowsecurity)),
  0, 'ogni tabella di public ha RLS attiva e forzata');

-- 2) Ogni tabella ha la policy restrittiva aal2
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and not exists (select 1 from pg_policies p
                      where p.schemaname = 'public' and p.tablename = c.relname
                        and p.permissive = 'RESTRICTIVE' and p.qual like '%aal2%')),
  0, 'ogni tabella di public ha una policy restrittiva aal2');

-- 3) Nessun privilegio per anon sulle tabelle di public
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'),
  0, 'anon non ha privilegi sulle tabelle di public');

-- 4) Il trigger di evento ensure_rls esiste
select is((select count(*)::int from pg_event_trigger where evtname = 'ensure_rls'), 1, 'trigger ensure_rls presente');

-- Dati di prova: due utenti (il trigger crea la riga user_security)
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'proprietario@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'altro@example.test');

insert into public.security_events (owner_id, tipo)
values ('11111111-1111-1111-1111-111111111111', 'login_ok');

-- Orario TOTP recente per i token di prova
create temp table t_claims as
select
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as aal2_ok,
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal1',
    'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint)))::text as aal1,
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 86400 * 20)))::text as aal2_scaduto,
  json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro_utente;
grant select on t_claims to anon, authenticated;

-- Anonimo
set local role anon;
select throws_ok($$select * from public.security_events$$, '42501', null, 'anonimo: lettura rifiutata');

-- Proprietario con sola password (aal1)
reset role;
select set_config('request.jwt.claims', (select aal1 from t_claims), true);
set local role authenticated;
select is((select count(*)::int from public.security_events), 0, 'proprietario aal1: 0 righe');

-- Proprietario aal2 con accesso completo scaduto (20 giorni > 14)
reset role;
select set_config('request.jwt.claims', (select aal2_scaduto from t_claims), true);
set local role authenticated;
select is((select count(*)::int from public.security_events), 0, 'accesso completo scaduto: 0 righe');

-- Altro utente aal2
reset role;
select set_config('request.jwt.claims', (select altro_utente from t_claims), true);
set local role authenticated;
select is((select count(*)::int from public.security_events), 0, 'altro utente: 0 righe');

-- Proprietario aal2 valido
reset role;
select set_config('request.jwt.claims', (select aal2_ok from t_claims), true);
set local role authenticated;
select is((select count(*)::int from public.security_events), 1, 'proprietario aal2 valido: vede la sua riga');
select is((select blocco_minuti from public.user_security), 5, 'proprietario aal2: legge le proprie impostazioni');

-- Il client non può leggere l'impronta della frase né i codici di recupero
select throws_ok($$select frase_recupero_hash from public.user_security$$, '42501', null, 'frase_recupero_hash non leggibile');
select throws_ok($$select * from public.recovery_codes$$, '42501', null, 'recovery_codes non leggibile dal client');

-- Il client non può scrivere eventi di sicurezza
select throws_ok($$insert into public.security_events (tipo) values ('finto')$$, '42501', null, 'eventi non scrivibili dal client');

-- Il client può modificare solo i tre campi consentiti
select lives_ok($$update public.user_security set blocco_minuti = 10$$, 'modifica del tempo di blocco consentita');

reset role;
select * from finish();
rollback;
