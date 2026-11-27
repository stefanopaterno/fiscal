-- pgTAP (azzeramento del 27/11/2026): in prova, con la parola AZZERA, si cancella tutto tranne CU, anagrafica,
-- attività, aliquote delle addizionali e documenti di tipo CU; in produzione e senza conferma niente.
begin;
select plan(16);

insert into auth.users (id, email) values
  ('a6111111-1111-1111-1111-111111111111', 'azzera@example.test'),
  ('a6222222-2222-2222-2222-222222222222', 'altro-azzera@example.test');
insert into public.user_security (owner_id, in_prova) values
  ('a6111111-1111-1111-1111-111111111111', true), ('a6222222-2222-2222-2222-222222222222', true)
  on conflict (owner_id) do update set in_prova = excluded.in_prova;

create temp table t_claims (chi text, io text);
insert into t_claims select 'a', json_build_object('sub', 'a6111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
  'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text;
insert into t_claims select 'b', json_build_object('sub', 'a6222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
  'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text;
grant select on t_claims to authenticated;

-- L'altro utente ha una spesa che non deve sparire
select set_config('request.jwt.claims', (select io from t_claims where chi = 'b'), true);
set local role authenticated;
insert into public.spese (id, data, importo, categoria) values (gen_random_uuid(), '2027-03-01', 1000, 'software');

-- Dati dell'utente
select set_config('request.jwt.claims', (select io from t_claims where chi = 'a'), true);
insert into public.profilo_professionale (id, nome, cognome) values ('a6000000-0000-0000-0000-00000000000a', 'Mario', 'Prova');
update public.profilo_professionale set cognome = 'Prova2';
insert into public.attivita (id, nome, natura_iva) values ('a6000000-0000-0000-0000-00000000000b', 'Psicoterapia', 'esente_sanitaria');
insert into public.certificazioni_uniche (id, anno, reddito_lavoro) values ('a6000000-0000-0000-0000-00000000000c', 2026, 3800000);
insert into public.aliquote_addizionali (id, anno, regionale_scaglioni, comunale_aliquota)
  values ('a6000000-0000-0000-0000-00000000000d', 2026, '[{"fino_a": null, "aliquota": 0.0123}]', 0.008);
insert into public.clienti (id, tipo, nome, cognome) values ('a6000000-0000-0000-0000-00000000000e', 'persona_fisica', 'A', 'B');
insert into public.spese (id, data, importo, categoria) values (gen_random_uuid(), '2027-03-01', 5000, 'software');
insert into public.dati_anno (id, anno) values (gen_random_uuid(), 2026);
insert into public.dichiarazioni (id, anno, tipo) values (gen_random_uuid(), 2026, 'redditi');
update public.dichiarazioni set chiuso_il = current_date where anno = 2026;
insert into public.documenti (id, anno, tipo, file_percorso, file_nome, file_tipo, file_dimensione, file_impronta) values
  ('a6000000-0000-0000-0000-0000000000f1', 2026, 'cu', 'a6111111-1111-1111-1111-111111111111/cu.pdf', 'cu.pdf', 'application/pdf', 10, repeat('a', 64)),
  ('a6000000-0000-0000-0000-0000000000f2', 2027, 'altro', 'a6111111-1111-1111-1111-111111111111/altro.pdf', 'altro.pdf', 'application/pdf', 10, repeat('b', 64));

-- 1) Senza conferma o in produzione: niente
select throws_ok($$select public.azzera_dati_prova('azzera')$$, 'P0001', 'conferma_mancante', 'serve la parola AZZERA');
reset role;
update public.user_security set in_prova = false where owner_id = 'a6222222-2222-2222-2222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims', (select io from t_claims where chi = 'b'), true);
select throws_ok($$select public.azzera_dati_prova('AZZERA')$$, 'P0001', 'non_in_prova', 'in produzione non si azzera');
select set_config('request.jwt.claims', (select io from t_claims where chi = 'a'), true);

-- 2) Azzeramento
create temp table t_esito as select public.azzera_dati_prova('AZZERA') as e;
select is((select (e -> 'file' -> 'documenti') from t_esito), '["a6111111-1111-1111-1111-111111111111/altro.pdf"]'::jsonb,
  'file da togliere: solo il documento non CU');

-- Restano
select is((select count(*)::int from public.certificazioni_uniche), 1, 'CU tenuta');
select is((select count(*)::int from public.aliquote_addizionali), 1, 'addizionali tenute');
select is((select cognome from public.profilo_professionale), 'Prova2', 'anagrafica tenuta');
select is((select count(*)::int from public.attivita), 1, 'attività tenute');
select is((select count(*)::int from public.documenti), 1, 'documento CU tenuto');
select is((select tipo::text from public.documenti), 'cu', 'il documento rimasto è la CU');

-- Spariscono
select is((select count(*)::int from public.clienti), 0, 'rubrica cancellata');
select is((select count(*)::int from public.spese), 0, 'spese cancellate');
select is((select count(*)::int from public.dati_anno), 0, 'dati dell''anno cancellati');
select is((select count(*)::int from public.dichiarazioni), 0, 'dichiarazioni (anche chiuse) cancellate');
select is((select count(*)::int from public.eventi_anno), 0, 'registro chiusure cancellato');

-- L'altro utente non è toccato
select set_config('request.jwt.claims', (select io from t_claims where chi = 'b'), true);
select is((select count(*)::int from public.spese), 1, 'i dati di un altro utente restano');

-- Anonimo escluso
reset role;
set local role anon;
select throws_ok($$select public.azzera_dati_prova('AZZERA')$$, '42501', null, 'anonimo escluso');

select * from finish();
rollback;
