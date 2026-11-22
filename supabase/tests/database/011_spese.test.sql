-- pgTAP (T004, specifica 008): vincoli delle spese, dei beni, degli oneri e delle impostazioni.
-- Modello: specs/008-spese-deducibili-consigli/data-model.md (spese.importo, spese.iva_detraibile,
-- spese.percentuale + spese.motivazione, beni.data_dismissione, impostazioni_spese.figli_a_carico,
-- una riga di impostazioni_spese per utente). RLS e aal2 per tutte le tabelle: 003_conformita.
begin;
select plan(16);

insert into auth.users (id, email) values
  ('a8111111-1111-1111-1111-111111111111', 'spese@example.test'),
  ('a8222222-2222-2222-2222-222222222222', 'spese-altro@example.test');

create temp table t_claims as
select
  json_build_object('sub', 'a8111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', 'a8222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro;
grant select on t_claims to authenticated;

select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

select has_table('public', 'spese', 'esiste spese');

select lives_ok(
  $$insert into public.spese (id, data, importo, categoria, modalita) values ('5e000000-0000-0000-0000-000000000001', '2027-03-10', 120000, 'formazione', 'carta')$$,
  'una spesa valida si salva');
select is((select tracciabile from public.spese where id = '5e000000-0000-0000-0000-000000000001'), true, 'pagamento con carta tracciabile');
select throws_ok(
  $$insert into public.spese (id, data, importo, categoria) values (gen_random_uuid(), '2027-03-10', 0, 'software')$$,
  '23514', null, 'importo zero rifiutato');
select throws_ok(
  $$insert into public.spese (id, data, importo, iva_detraibile, categoria) values (gen_random_uuid(), '2027-03-10', 100, 200, 'software')$$,
  '23514', null, 'IVA detraibile oltre l''importo rifiutata');
select throws_ok(
  $$insert into public.spese (id, data, importo, categoria, percentuale) values (gen_random_uuid(), '2027-03-10', 100, 'internet', 0.5)$$,
  '23514', null, 'percentuale personalizzata senza motivazione rifiutata');
select lives_ok(
  $$insert into public.spese (id, data, importo, categoria, percentuale, motivazione) values (gen_random_uuid(), '2027-03-10', 100, 'internet', 0.5, 'uso anche per casa')$$,
  'percentuale personalizzata con motivazione');

select lives_ok(
  $$insert into public.beni (id, descrizione, categoria, costo, data_acquisto) values ('be000000-0000-0000-0000-000000000001', 'Computer', 'computer', 150000, '2027-02-01')$$,
  'un bene valido si salva');
select throws_ok(
  $$insert into public.beni (id, descrizione, categoria, costo, data_acquisto, data_dismissione) values (gen_random_uuid(), 'Sedia', 'arredi', 60000, '2027-02-01', '2026-01-01')$$,
  '23514', null, 'dismissione prima dell''acquisto rifiutata');
insert into public.spese (id, data, importo, categoria, bene_id) values (gen_random_uuid(), '2027-02-01', 150000, 'altro', 'be000000-0000-0000-0000-000000000001');
select throws_ok(
  $$delete from public.beni where id = 'be000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'un bene con spese collegate non si cancella');

select lives_ok(
  $$insert into public.oneri_personali (id, data, importo, voce) values (gen_random_uuid(), '2027-12-01', 516457, 'previdenza_complementare')$$,
  'un onere valido si salva');

select lives_ok(
  $$insert into public.impostazioni_spese (id, figli_a_carico) values (gen_random_uuid(), 1)$$,
  'impostazioni salvate');
select throws_ok(
  $$insert into public.impostazioni_spese (id) values (gen_random_uuid())$$,
  '23505', null, 'una sola riga di impostazioni per utente');
select throws_ok(
  $$insert into public.impostazioni_spese (id, figli_a_carico) values (gen_random_uuid(), 11)$$,
  '23514', null, 'figli a carico fuori intervallo rifiutati');

select set_config('request.jwt.claims', (select altro from t_claims), true);
select is((select count(*)::int from public.spese), 0, 'un altro utente non vede le spese');
select lives_ok(
  $$insert into public.impostazioni_spese (id) values (gen_random_uuid())$$,
  'l''unicità delle impostazioni vale per utente');

select * from finish();
rollback;
