-- pgTAP (T003, specifica 007): vincoli del salvadanaio e delle impostazioni dell'accantonamento.
-- Modello: specs/007-accantonamento-consigliato/data-model.md (salvadanaio.importo ≠ 0, salvadanaio.incasso_id
-- unico, impostazioni_accantonamento.margine 0–0,5, una riga di impostazioni per utente).
-- RLS e aal2 per tutte le tabelle: 003_conformita.
begin;
select plan(12);

insert into auth.users (id, email) values
  ('a7111111-1111-1111-1111-111111111111', 'accantona@example.test'),
  ('a7222222-2222-2222-2222-222222222222', 'accantona-altro@example.test');

create temp table t_claims as
select
  json_build_object('sub', 'a7111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', 'a7222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro;
grant select on t_claims to authenticated;

select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

select has_table('public', 'salvadanaio', 'esiste il salvadanaio');

select lives_ok(
  $$insert into public.salvadanaio (id, data, importo, tipo) values (gen_random_uuid(), '2027-03-10', 49200, 'accantonamento')$$,
  'un accantonamento si salva');
select throws_ok(
  $$insert into public.salvadanaio (id, data, importo, tipo) values (gen_random_uuid(), '2027-03-10', 0, 'rettifica')$$,
  '23514', null, 'importo zero rifiutato');
select throws_ok(
  $$insert into public.salvadanaio (id, data, importo, tipo) values (gen_random_uuid(), '2027-06-30', 100000, 'scadenza_pagata')$$,
  '23514', null, 'una scadenza pagata è un prelievo (negativo)');
select lives_ok(
  $$insert into public.salvadanaio (id, data, importo, tipo) values (gen_random_uuid(), '2027-06-30', -100000, 'scadenza_pagata')$$,
  'scadenza pagata come prelievo');
select lives_ok(
  $$insert into public.salvadanaio (id, data, importo, tipo) values (gen_random_uuid(), '2027-07-01', -500, 'rettifica')$$,
  'rettifica negativa');

-- il collegamento all'incasso: unico e cancellato insieme all'incasso
select is(
  (select count(*)::int from pg_constraint where conrelid = 'public.salvadanaio'::regclass and contype = 'u'),
  1, 'incasso_id è unico');
select is(
  (select confdeltype from pg_constraint where conrelid = 'public.salvadanaio'::regclass and contype = 'f'
     and confrelid = 'public.incassi'::regclass),
  'c', 'cancellando l''incasso si cancella il suo accantonamento');

select lives_ok(
  $$insert into public.impostazioni_accantonamento (id) values (gen_random_uuid())$$,
  'impostazioni salvate con i valori predefiniti');
select throws_ok(
  $$insert into public.impostazioni_accantonamento (id) values (gen_random_uuid())$$,
  '23505', null, 'una sola riga di impostazioni per utente');

select set_config('request.jwt.claims', (select altro from t_claims), true);
select throws_ok(
  $$insert into public.impostazioni_accantonamento (id, margine) values (gen_random_uuid(), 0.6)$$,
  '23514', null, 'margine oltre il 50% rifiutato');
select is((select count(*)::int from public.salvadanaio), 0, 'un altro utente non vede il salvadanaio');

select * from finish();
rollback;
