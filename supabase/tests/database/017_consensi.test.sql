-- pgTAP (specifica 005): consensi dei pazienti. Solo il proprietario, storico non cancellabile, solo persone
-- fisiche, revoca non annullabile, paziente con consensi mai cancellato, registro senza modifiche.
-- RLS e aal2 su tutte le tabelle: 003_conformita.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('c5111111-1111-1111-1111-111111111111', 'consensi@example.test'),
  ('c5222222-2222-2222-2222-222222222222', 'consensi-altro@example.test');

create temp table t_claims as
select
  json_build_object('sub', 'c5111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', 'c5222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro;
grant select on t_claims to authenticated;

select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

insert into public.clienti (id, tipo, nome, cognome, codice_fiscale) values
  ('c5000000-0000-0000-0000-00000000000a', 'persona_fisica', 'Mario', 'Rossi', 'RSSMRA08A01H501U'),
  ('c5000000-0000-0000-0000-00000000000b', 'persona_fisica', 'Anna', 'Verdi', 'VRDNNA90A41H501X');
insert into public.clienti (id, tipo, denominazione, partita_iva) values
  ('c5000000-0000-0000-0000-00000000000e', 'ente', 'Scuola Prova', '01234567890');
insert into public.tipi_consenso (id, nome) values ('c5000000-0000-0000-0000-0000000000f1', 'Percorso individuale');

select lives_ok(
  $$insert into public.consensi (id, cliente_id, tipo_consenso_id, versione_testo, data_firma, modalita)
    values ('c5000000-0000-0000-0000-000000000c01', 'c5000000-0000-0000-0000-00000000000a',
            'c5000000-0000-0000-0000-0000000000f1', '1.0', current_date - 10, 'carta')$$,
  'il consenso di un paziente si registra');
select throws_ok(
  $$insert into public.consensi (id, cliente_id, tipo_consenso_id, versione_testo, data_firma, modalita)
    values (gen_random_uuid(), 'c5000000-0000-0000-0000-00000000000e', 'c5000000-0000-0000-0000-0000000000f1', '1.0', current_date, 'carta')$$,
  'P0001', 'consenso_solo_pazienti', 'un ente non ha consensi');
select throws_ok(
  $$insert into public.consensi (id, cliente_id, tipo_consenso_id, versione_testo, data_firma, registrato_il, modalita)
    values (gen_random_uuid(), 'c5000000-0000-0000-0000-00000000000b', 'c5000000-0000-0000-0000-0000000000f1', '1.0', current_date, current_date - 1, 'carta')$$,
  '23514', null, 'la firma non può essere dopo la registrazione');
select throws_ok(
  $$insert into public.consensi (id, cliente_id, tipo_consenso_id, versione_testo, data_firma, modalita, motivazione)
    values (gen_random_uuid(), 'c5000000-0000-0000-0000-00000000000b', 'c5000000-0000-0000-0000-0000000000f1', '1.0', current_date, 'carta', repeat('x', 201))$$,
  '23514', null, 'la motivazione resta breve (niente racconti)');
select lives_ok(
  $$insert into public.firmatari_consenso (id, consenso_id, nome, ruolo, data_firma)
    values (gen_random_uuid(), 'c5000000-0000-0000-0000-000000000c01', 'Luigi Rossi', 'genitore', current_date - 10)$$,
  'un firmatario si aggiunge');

-- Revoca: si registra una volta, poi non si annulla
select lives_ok(
  $$update public.consensi set revocato_il = current_date where id = 'c5000000-0000-0000-0000-000000000c01'$$,
  'la revoca si registra');
select throws_ok(
  $$update public.consensi set revocato_il = null where id = 'c5000000-0000-0000-0000-000000000c01'$$,
  'P0001', 'revoca_immutabile', 'una revoca non si annulla');

-- Storico: l'utente non cancella consensi, tipi, modelli, eventi
select throws_ok($$delete from public.consensi$$, '42501', null, 'i consensi non si cancellano');
select throws_ok($$delete from public.tipi_consenso$$, '42501', null, 'i tipi non si cancellano (si archiviano)');
insert into public.eventi_consensi (id, consenso_id, azione) values (gen_random_uuid(), 'c5000000-0000-0000-0000-000000000c01', 'creato');
select throws_ok($$update public.eventi_consensi set azione = 'modificato'$$, '42501', null, 'il registro non si modifica');

-- Un paziente con consensi non si cancella (resta, senza errore); uno senza sì
delete from public.clienti where id in ('c5000000-0000-0000-0000-00000000000a', 'c5000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.clienti where id = 'c5000000-0000-0000-0000-00000000000a'), 1,
  'il paziente con consensi resta in rubrica');
select is((select count(*)::int from public.clienti where id = 'c5000000-0000-0000-0000-00000000000b'), 0,
  'il paziente senza consensi si cancella');

-- Un altro utente non vede nulla
select set_config('request.jwt.claims', (select altro from t_claims), true);
select is((select count(*)::int from public.consensi), 0, 'un altro utente non vede i consensi');
reset role;

-- La chiusura dell'account cancella tutto a cascata
delete from auth.users where id = 'c5111111-1111-1111-1111-111111111111';
select is((select count(*)::int from public.consensi where owner_id = 'c5111111-1111-1111-1111-111111111111'), 0,
  'chiudendo l''account i consensi spariscono con lui');

select * from finish();
rollback;
