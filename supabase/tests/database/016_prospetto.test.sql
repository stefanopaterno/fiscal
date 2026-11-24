-- pgTAP (specifica 009): vincoli di pacchetti, richieste del commercialista e modelli. RLS e aal2: 003_conformita.
-- Il file del pacchetto e la password non hanno colonne: non si salvano.
begin;
select plan(10);

insert into auth.users (id, email) values
  ('a9111111-1111-1111-1111-111111111111', 'prospetto@example.test'),
  ('a9222222-2222-2222-2222-222222222222', 'prospetto-altro@example.test');

create temp table t_claims as
select
  json_build_object('sub', 'a9111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', 'a9222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro;
grant select on t_claims to authenticated;

select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

select is(
  (select count(*)::int from information_schema.columns where table_name = 'pacchetti' and column_name ~* '(password|file|contenuto)'),
  0, 'nessuna colonna per il file o la password del pacchetto');
select lives_ok(
  $$insert into public.pacchetti (id, periodo_da, periodo_a, sezioni, regole) values ('9a000000-0000-0000-0000-000000000001', '2027-01-01', '2027-12-31', array['fatture','spese'], '2027')$$,
  'pacchetto registrato');
select throws_ok(
  $$insert into public.pacchetti (id, periodo_da, periodo_a, sezioni, regole) values (gen_random_uuid(), '2027-12-31', '2027-01-01', array['fatture'], '2027')$$,
  '23514', null, 'periodo al contrario rifiutato');
select throws_ok(
  $$insert into public.pacchetti (id, periodo_da, periodo_a, sezioni, regole) values (gen_random_uuid(), '2027-01-01', '2027-12-31', array[]::text[], '2027')$$,
  '23514', null, 'almeno una sezione');

select lives_ok(
  $$insert into public.richieste_commercialista (id, data, testo, pacchetto_id) values (gen_random_uuid(), '2027-11-30', 'Manca la ricevuta ENPAP di ottobre', '9a000000-0000-0000-0000-000000000001')$$,
  'richiesta aperta');
select throws_ok(
  $$insert into public.richieste_commercialista (id, data, testo, stato) values (gen_random_uuid(), '2027-11-30', 'Chiusa senza data', 'chiusa')$$,
  '23514', null, 'una richiesta chiusa ha la data di chiusura');

select lives_ok(
  $$insert into public.modelli_pacchetto (id, nome, sezioni) values (gen_random_uuid(), 'Solo spese', array['spese','spese_categorie'])$$,
  'modello salvato');
select throws_ok(
  $$insert into public.modelli_pacchetto (id, nome, sezioni) values (gen_random_uuid(), 'Solo spese', array['spese'])$$,
  '23505', null, 'nomi dei modelli unici');

select is(
  (select confdeltype from pg_constraint where conrelid = 'public.richieste_commercialista'::regclass and contype = 'f' and confrelid = 'public.pacchetti'::regclass),
  'n', 'cancellando un pacchetto la richiesta resta');

select set_config('request.jwt.claims', (select altro from t_claims), true);
select is((select count(*)::int from public.pacchetti), 0, 'un altro utente non vede i pacchetti');

select * from finish();
rollback;
