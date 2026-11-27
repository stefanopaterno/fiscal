-- pgTAP (specifica 014, data-model.md): registro dei parametri a sola aggiunta, un annullamento per riga, anni
-- chiusi protetti, RLS proprietario + aal2, anonimo escluso, approvazione in un'unica transazione.
begin;
select plan(20);

insert into auth.users (id, email) values
  ('a5111111-1111-1111-1111-111111111111', 'parametri@example.test'),
  ('a5222222-2222-2222-2222-222222222222', 'altro@example.test');
insert into public.user_security (owner_id, in_prova) values
  ('a5111111-1111-1111-1111-111111111111', false), ('a5222222-2222-2222-2222-222222222222', false)
  on conflict (owner_id) do update set in_prova = false;

create temp table t_claims (chi text, io text);
insert into t_claims select 'a', json_build_object('sub', 'a5111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
  'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text;
insert into t_claims select 'b', json_build_object('sub', 'a5222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
  'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text;
insert into t_claims select 'a1', json_build_object('sub', 'a5111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal1',
  'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint)))::text;
grant select on t_claims to authenticated, anon;

select set_config('request.jwt.claims', (select io from t_claims where chi = 'a'), true);
set local role authenticated;

-- 1) Approvazione in un'unica chiamata
select is(
  public.approva_parametri(
    '{"id":"a5000000-0000-0000-0000-0000000000c1","data_ricerca":"2027-01-10","versione_schema":1,"anni":[2027],"conteggi":{"cambia":2},"modifiche_programma":[{"titolo":"Nuova detrazione","descrizione":"x","fonte":{"titolo":"L","url":"https://www.gazzettaufficiale.it/x","data_atto":"2026-12-30"},"impronta":"abc","stato":"aperta"}]}'::jsonb,
    '[{"id":"a5000000-0000-0000-0000-0000000000b1","chiave":"irpef.scaglioni","anno":2027,"valore":[{"finoA":2800000,"aliquota":0.23},{"finoA":null,"aliquota":0.43}],"fonte":{"titolo":"Legge di Bilancio 2027","url":"https://www.gazzettaufficiale.it/x","data_atto":"2026-12-30"},"stato":"verificata","stato_norma":"in_vigore"},
      {"id":"a5000000-0000-0000-0000-0000000000b2","chiave":"addizionali.comunale.aliquota","anno":2027,"valore":0.008,"valore_precedente":0.006,"fonte":{"titolo":"Delibera","url":"https://www.comune.example.it/x","data_atto":"2026-12-20"},"stato":"verificata","stato_norma":"in_vigore"}]'::jsonb,
    '[{"anno":2027,"comunale_aliquota":0.008,"verificate":true}]'::jsonb),
  2, 'approvazione: due righe nel registro');
select is((select comunale_aliquota from public.aliquote_addizionali where anno = 2027), 0.008::numeric(6,5),
  'approvazione: addizionale comunale scritta');
select is((select count(*)::int from public.importazioni_parametri), 1, 'approvazione: importazione registrata');

-- 2) Sola aggiunta
select throws_ok($$update public.aggiornamenti_parametri set spiegazione = 'x'$$, 'P0001', 'registro_parametri', 'il registro non si modifica');
select throws_ok($$delete from public.aggiornamenti_parametri$$, 'P0001', 'registro_parametri', 'il registro non si cancella');
select throws_ok($$update public.importazioni_parametri set data_ricerca = '2027-02-01'$$, 'P0001', 'registro_parametri',
  'l''importazione non si modifica');
select lives_ok($$update public.importazioni_parametri set modifiche_programma = jsonb_set(modifiche_programma, '{0,stato}', '"fatta"')$$,
  'cambia solo lo stato delle modifiche al programma');
select throws_ok($$update public.importazioni_parametri set modifiche_programma = jsonb_set(modifiche_programma, '{0,stato}', '"boh"')$$,
  'P0001', 'registro_parametri', 'stato non ammesso');

-- 3) Vincoli di forma
select throws_ok($$insert into public.aggiornamenti_parametri (id, azione, chiave, anno, dal, valore, fonte, stato, stato_norma)
  values (gen_random_uuid(), 'approvato', 'irpef.scaglioni', 2027, '2027-01-01', '1', '{"titolo":"t","url":"https://x.it","data_atto":"2027-01-01"}', 'verificata', 'in_vigore')$$,
  '23514', null, 'esattamente uno tra anno e dal');
select throws_ok($$insert into public.aggiornamenti_parametri (id, azione, chiave, anno, valore, fonte, stato, stato_norma)
  values (gen_random_uuid(), 'approvato', 'irpef.scaglioni', 2027, '1', '{"titolo":"t","url":"http://x.it","data_atto":"2027-01-01"}', 'verificata', 'in_vigore')$$,
  '23514', null, 'fonte solo https');
select throws_ok($$insert into public.aggiornamenti_parametri (id, azione, chiave, anno, valore, fonte, stato, stato_norma)
  values (gen_random_uuid(), 'approvato', 'Irpef Scaglioni!', 2027, '1', '{"titolo":"t","url":"https://x.it","data_atto":"2027-01-01"}', 'verificata', 'in_vigore')$$,
  '23514', null, 'chiave con caratteri non ammessi');

-- 4) Annullamento: una volta sola, ripristina le addizionali
select lives_ok($$select public.annulla_parametro('a5000000-0000-0000-0000-0000000000e1', 'a5000000-0000-0000-0000-0000000000b2')$$,
  'annullamento registrato');
select is((select comunale_aliquota from public.aliquote_addizionali where anno = 2027), 0.006::numeric(6,5),
  'annullamento: addizionale comunale ripristinata');
select throws_ok($$select public.annulla_parametro(gen_random_uuid(), 'a5000000-0000-0000-0000-0000000000b2')$$,
  '23505', null, 'una riga si annulla una volta sola');
select throws_ok($$select public.annulla_parametro(gen_random_uuid(), 'a5000000-0000-0000-0000-0000000000e1')$$,
  'P0001', 'registro_parametri', 'non si annulla un annullamento');

-- 5) Anno chiuso
insert into public.dichiarazioni (id, anno, tipo) values ('a5000000-0000-0000-0000-0000000000d1', 2026, 'redditi');
update public.dichiarazioni set chiuso_il = current_date where anno = 2026;
select throws_ok($$insert into public.aggiornamenti_parametri (id, azione, chiave, dal, valore, fonte, stato, stato_norma)
  values (gen_random_uuid(), 'approvato', 'fattura.importo_bollo', '2026-03-01', '250', '{"titolo":"t","url":"https://x.it","data_atto":"2026-01-01"}', 'verificata', 'in_vigore')$$,
  'P0001', 'anno_chiuso', 'anno chiuso: niente aggiornamenti (per data)');
select throws_ok($$insert into public.aggiornamenti_parametri (id, azione, chiave, anno, valore, fonte, stato, stato_norma)
  values (gen_random_uuid(), 'approvato', 'irpef.scaglioni', 2026, '1', '{"titolo":"t","url":"https://x.it","data_atto":"2026-01-01"}', 'verificata', 'in_vigore')$$,
  'P0001', 'anno_chiuso', 'anno chiuso: niente aggiornamenti (per anno)');

-- 6) RLS: un altro utente non vede nulla; aal1 non vede nulla; anonimo escluso
select set_config('request.jwt.claims', (select io from t_claims where chi = 'b'), true);
select is((select count(*)::int from public.aggiornamenti_parametri), 0, 'altro utente: registro invisibile');
select set_config('request.jwt.claims', (select io from t_claims where chi = 'a1'), true);
select is((select count(*)::int from public.aggiornamenti_parametri), 0, 'senza secondo fattore: registro invisibile');
reset role;
set local role anon;
select throws_ok($$select count(*) from public.aggiornamenti_parametri$$, '42501', null, 'anonimo escluso');

select * from finish();
rollback;
