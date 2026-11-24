-- pgTAP (specifica 004, FR-015): un anno chiuso non si modifica finché non viene riaperto; chiusure e riaperture
-- restano nel registro, che l'utente non può scrivere.
begin;
select plan(9);

insert into auth.users (id, email) values ('a4111111-1111-1111-1111-111111111111', 'anni@example.test');
insert into public.user_security (owner_id, in_prova) values ('a4111111-1111-1111-1111-111111111111', false)
  on conflict (owner_id) do update set in_prova = false;

create temp table t_claims as
select json_build_object('sub', 'a4111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
  'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io;
grant select on t_claims to authenticated;
select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

insert into public.dati_anno (id, anno) values ('a4000000-0000-0000-0000-000000000001', 2027);
insert into public.dichiarazioni (id, anno, tipo) values ('a4000000-0000-0000-0000-0000000000d1', 2027, 'redditi');

select lives_ok($$update public.dati_anno set oneri_deducibili = 100 where anno = 2027$$, 'anno aperto: si modifica');
update public.dichiarazioni set chiuso_il = current_date where anno = 2027;
select throws_ok($$update public.dati_anno set oneri_deducibili = 200 where anno = 2027$$,
  'P0001', 'anno_chiuso', 'anno chiuso: i dati dell''anno non si modificano');
select throws_ok($$insert into public.dati_anno (id, anno) values (gen_random_uuid(), 2027)$$,
  'P0001', 'anno_chiuso', 'anno chiuso: niente righe nuove');
select throws_ok($$insert into public.oneri_personali (id, data, importo, voce) values (gen_random_uuid(), '2027-05-10', 1000, 'spese_mediche')$$,
  'P0001', 'anno_chiuso', 'anno chiuso: niente oneri pagati in quell''anno');
select lives_ok($$insert into public.dati_anno (id, anno) values (gen_random_uuid(), 2028)$$, 'l''anno dopo resta libero');
select throws_ok($$insert into public.eventi_anno (anno, azione) values (2027, 'riaperto')$$, '42501', null,
  'il registro lo scrive solo il database');

update public.dichiarazioni set chiuso_il = null where anno = 2027;
select lives_ok($$update public.dati_anno set oneri_deducibili = 200 where anno = 2027$$, 'riaperto: si modifica di nuovo');
select is((select array_agg(azione::text order by avvenuto_il, creato_il) from public.eventi_anno where anno = 2027),
  array['chiuso', 'riaperto'], 'chiusura e riapertura registrate');
select is((select count(*)::int from public.eventi_anno), 2, 'nessun altro evento');

select * from finish();
rollback;
