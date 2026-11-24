-- pgTAP (T007, specifica 001): vincoli delle tabelle del motore IRPEF.
-- Modello: specs/001-motore-irpef-cumulo/data-model.md (dati_anno.anno, aliquote_addizionali.anno,
-- certificazioni_uniche.giorni_lavoro, aliquote_addizionali.regionale_scaglioni,
-- aliquote_addizionali.comunale_aliquota, versamenti_previdenza.importo, versamenti_imposte.importo).
-- RLS e aal2 sono controllati per tutte le tabelle da 003_conformita.
begin;
select plan(17);

insert into auth.users (id, email) values
  ('91111111-1111-1111-1111-111111111111', 'imposte@example.test'),
  ('92222222-2222-2222-2222-222222222222', 'imposte-altro@example.test');

create temp table t_claims as
select
  json_build_object('sub', '91111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', '92222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro;
grant select on t_claims to authenticated;

select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

select has_table('public', 'certificazioni_uniche', 'esiste certificazioni_uniche');

-- CU
select lives_ok(
  $$insert into public.certificazioni_uniche (id, anno, reddito_lavoro, ritenute_irpef)
    values ('c1000000-0000-0000-0000-000000000001', 2026, 3800000, 844809)$$,
  'una CU valida si salva');
select lives_ok(
  $$insert into public.certificazioni_uniche (id, anno, reddito_lavoro, giorni_lavoro)
    values ('c1000000-0000-0000-0000-000000000002', 2026, 100000, 120)$$,
  'più CU nello stesso anno');
select throws_ok(
  $$insert into public.certificazioni_uniche (id, anno, giorni_lavoro) values (gen_random_uuid(), 2026, 366)$$,
  '23514', null, 'giorni di lavoro oltre 365 rifiutati');
select throws_ok(
  $$insert into public.certificazioni_uniche (id, anno, reddito_lavoro) values (gen_random_uuid(), 2026, -1)$$,
  '23514', null, 'reddito di lavoro negativo rifiutato');

-- Dati dell'anno: uno per anno
select lives_ok(
  $$insert into public.dati_anno (id, anno, reddito_professionale_manuale) values (gen_random_uuid(), 2027, -300000)$$,
  'reddito professionale manuale anche negativo');
select throws_ok(
  $$insert into public.dati_anno (id, anno) values (gen_random_uuid(), 2027)$$,
  '23505', null, 'un solo dati_anno per anno');
select throws_ok(
  $$insert into public.dati_anno (id, anno, spese_professionali) values (gen_random_uuid(), 2028, -5)$$,
  '23514', null, 'spese negative rifiutate');

-- Aliquote delle addizionali
select lives_ok(
  $$insert into public.aliquote_addizionali (id, anno, regionale_scaglioni, comunale_aliquota)
    values (gen_random_uuid(), 2027,
      '[{"fino_a": 1500000, "aliquota": 0.0123}, {"fino_a": 2800000, "aliquota": 0.0158}, {"fino_a": null, "aliquota": 0.0173}]',
      0.008)$$,
  'scaglioni regionali validi');
select throws_ok(
  $$insert into public.aliquote_addizionali (id, anno, regionale_scaglioni) values (gen_random_uuid(), 2027, '[{"fino_a": null, "aliquota": 0.01}]')$$,
  '23505', null, 'una sola riga di aliquote per anno');
select throws_ok(
  $$insert into public.aliquote_addizionali (id, anno, regionale_scaglioni) values (gen_random_uuid(), 2026, '[{"fino_a": 1500000, "aliquota": 0.0123}]')$$,
  'P0001', 'scaglioni_non_validi', 'ultimo scaglione con un limite rifiutato');
select throws_ok(
  $$insert into public.aliquote_addizionali (id, anno, regionale_scaglioni) values (gen_random_uuid(), 2026,
    '[{"fino_a": 2800000, "aliquota": 0.01}, {"fino_a": 1500000, "aliquota": 0.02}, {"fino_a": null, "aliquota": 0.03}]')$$,
  'P0001', 'scaglioni_non_validi', 'limiti non crescenti rifiutati');
select throws_ok(
  $$insert into public.aliquote_addizionali (id, anno, regionale_scaglioni, comunale_aliquota) values (gen_random_uuid(), 2025,
    '[{"fino_a": null, "aliquota": 0.0123}]', 0.012)$$,
  '23514', null, 'comunale oltre lo 0,9% rifiutata');

-- Versamenti
select throws_ok(
  $$insert into public.versamenti_previdenza (id, data, importo, tipo, anno_reddito) values (gen_random_uuid(), '2027-10-01', 0, 'soggettivo', 2026)$$,
  '23514', null, 'versamento previdenziale a zero rifiutato');
select throws_ok(
  $$insert into public.versamenti_imposte (id, data, anno_imposta, voce, importo) values (gen_random_uuid(), '2028-06-30', 2028, 'irpef_acconto_1', -1)$$,
  '23514', null, 'versamento di imposta negativo rifiutato');

-- Un altro utente non vede né modifica le CU
select set_config('request.jwt.claims', (select altro from t_claims), true);
select is((select count(*)::int from public.certificazioni_uniche), 0, 'un altro utente non vede le CU');
select lives_ok(
  $$insert into public.dati_anno (id, anno) values (gen_random_uuid(), 2027)$$,
  'l''unicità per anno vale per utente');

select * from finish();
rollback;
