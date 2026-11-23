-- pgTAP (specifica 006): vincoli delle ipotesi di previsione e delle previsioni salvate.
-- Modello: specs/006-previsione-mensile-tasse/data-model.md (ipotesi_previsione.pesi 12 valori 0–1,
-- una riga di ipotesi per anno, previsioni_salvate una per mese). RLS e aal2: 003_conformita.
begin;
select plan(9);

insert into auth.users (id, email) values
  ('a6111111-1111-1111-1111-111111111111', 'previsione@example.test'),
  ('a6222222-2222-2222-2222-222222222222', 'previsione-altro@example.test');

create temp table t_claims as
select
  json_build_object('sub', 'a6111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', 'a6222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro;
grant select on t_claims to authenticated;

select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

select lives_ok(
  $$insert into public.ipotesi_previsione (id, anno, metodo, obiettivo) values (gen_random_uuid(), 2027, 'obiettivo', 3000000)$$,
  'ipotesi salvata con pesi predefiniti');
select is((select array_length(pesi, 1) from public.ipotesi_previsione where anno = 2027), 12, 'dodici pesi');
select throws_ok(
  $$insert into public.ipotesi_previsione (id, anno) values (gen_random_uuid(), 2027)$$,
  '23505', null, 'una sola ipotesi per anno');
select throws_ok(
  $$insert into public.ipotesi_previsione (id, anno, pesi) values (gen_random_uuid(), 2028, array[1,1,1]::numeric[])$$,
  '23514', null, 'pesi diversi da dodici rifiutati');
select throws_ok(
  $$insert into public.ipotesi_previsione (id, anno, pesi) values (gen_random_uuid(), 2029, array[1,1,1,1,1,1,1,1.5,1,1,1,1]::numeric[])$$,
  '23514', null, 'peso oltre il 100% rifiutato');

select lives_ok(
  $$insert into public.previsioni_salvate (id, anno, mese, metodo, compensi_reali, compensi_previsti, reddito, imposte, contributi, totale, aliquota_marginale)
    values (gen_random_uuid(), 2027, '2027-03', 'obiettivo', 300000, 900000, 1200000, 400000, 144000, 544000, 0.33)$$,
  'previsione del mese salvata');
select throws_ok(
  $$insert into public.previsioni_salvate (id, anno, mese, compensi_reali, compensi_previsti, reddito, imposte, contributi, totale, aliquota_marginale)
    values (gen_random_uuid(), 2027, '2027-03', 0, 0, 0, 0, 0, 0, 0.33)$$,
  '23505', null, 'una previsione per mese');
select throws_ok(
  $$insert into public.previsioni_salvate (id, anno, mese, compensi_reali, compensi_previsti, reddito, imposte, contributi, totale, aliquota_marginale)
    values (gen_random_uuid(), 2027, '2027-13', 0, 0, 0, 0, 0, 0, 0.33)$$,
  '23514', null, 'mese non valido rifiutato');

select set_config('request.jwt.claims', (select altro from t_claims), true);
select is((select count(*)::int from public.previsioni_salvate), 0, 'un altro utente non vede le previsioni');

select * from finish();
rollback;
