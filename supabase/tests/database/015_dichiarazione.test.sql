-- pgTAP (specifica 004): vincoli di dichiarazioni, scadenze dell'utente e checklist.
-- Modello: specs/004-dati-dichiarazione-scadenze/data-model.md. RLS e aal2: 003_conformita.
begin;
select plan(11);

insert into auth.users (id, email) values
  ('a4111111-1111-1111-1111-111111111111', 'dichiarazione@example.test'),
  ('a4222222-2222-2222-2222-222222222222', 'dichiarazione-altro@example.test');

create temp table t_claims as
select
  json_build_object('sub', 'a4111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', 'a4222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro;
grant select on t_claims to authenticated;

select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

select lives_ok(
  $$insert into public.dichiarazioni (id, anno, tipo, imposta_netta, differenza, acconti_trattenuti, credito)
    values (gen_random_uuid(), 2026, '730', 1200000, 0, 0, 30000)$$,
  'anno di partenza dal 730');
select throws_ok(
  $$insert into public.dichiarazioni (id, anno, tipo) values (gen_random_uuid(), 2026, 'redditi')$$,
  '23505', null, 'una dichiarazione per anno');
select throws_ok(
  $$insert into public.dichiarazioni (id, anno, tipo, credito, credito_usato) values (gen_random_uuid(), 2028, 'redditi', 100, 200)$$,
  '23514', null, 'credito usato oltre il credito rifiutato');
select throws_ok(
  $$insert into public.dichiarazioni (id, anno, tipo, credito, credito_stato, credito_incassato_il) values (gen_random_uuid(), 2029, 'redditi', 100, 'richiesto', '2029-10-01')$$,
  '23514', null, 'data di incasso solo se incassato');

select lives_ok(
  $$insert into public.scadenze_utente (id, anno, chiave, fatta_il) values (gen_random_uuid(), 2028, 'saldo_acconto', '2028-06-25')$$,
  'scadenza segnata come fatta');
select lives_ok(
  $$insert into public.scadenze_utente (id, anno, chiave, data, titolo) values (gen_random_uuid(), 2028, 'personale_1', '2028-05-10', 'Documenti al commercialista')$$,
  'scadenza personale');
select throws_ok(
  $$insert into public.scadenze_utente (id, anno, chiave, titolo) values (gen_random_uuid(), 2028, 'personale_2', 'Senza data')$$,
  '23514', null, 'scadenza personale senza data rifiutata');
select throws_ok(
  $$insert into public.scadenze_utente (id, anno, chiave, fatta_il) values (gen_random_uuid(), 2028, 'saldo_acconto', '2028-06-26')$$,
  '23505', null, 'una riga per scadenza e anno');

select lives_ok(
  $$insert into public.checklist_anno (id, anno, chiave, stato) values (gen_random_uuid(), 2027, 'conservazione', 'completato')$$,
  'elemento della checklist segnato');
select throws_ok(
  $$insert into public.checklist_anno (id, anno, chiave, stato) values (gen_random_uuid(), 2027, 'conservazione', 'non_applicabile')$$,
  '23505', null, 'una riga per elemento e anno');

select set_config('request.jwt.claims', (select altro from t_claims), true);
select is((select count(*)::int from public.dichiarazioni), 0, 'un altro utente non vede le dichiarazioni');

select * from finish();
rollback;
