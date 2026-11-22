-- pgTAP (specifica 003, FR-027..FR-030): modalità prova e passaggio irreversibile alla produzione.
begin;
select plan(17);

insert into auth.users (id, email) values ('41111111-1111-1111-1111-111111111111', 'prova@example.test');

create temp table t_claims as
select
  json_build_object('sub', '41111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as recente,
  json_build_object('sub', '41111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint - 3600)))::text as vecchio;
grant select on t_claims to authenticated;

create or replace function pg_temp.fattura(p_id uuid, p_data date) returns void language sql as $$
  insert into public.fatture (id, data, cliente_id, attivita_id, totale_compensi, totale_integrativo,
    importo_esente, bollo, bollo_addebitato, totale, netto)
  values (p_id, p_data, 'c4000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001',
    8000, 320, 8320, 200, true, 8520, 8520);
  insert into public.righe_fattura (id, fattura_id, descrizione, compenso, natura, integrativo)
  values (gen_random_uuid(), p_id, 'Prestazione professionale psicologica', 8000, 'esente_sanitaria', 320);
$$;

select set_config('request.jwt.claims', (select vecchio from t_claims), true);
set local role authenticated;

select is((select in_prova from public.user_security), true, 'un account nuovo parte in modalità prova');

insert into public.profilo_professionale (id, nome, cognome, codice_fiscale, partita_iva, inizio_attivita,
  indirizzo, cap, comune, provincia)
values (gen_random_uuid(), 'Anna', 'Bianchi', 'BNCNNA80' || 'A41H501X', '12345678903', '2027-01-02',
  'Via Roma 1', '00100', 'Roma', 'RM');
insert into public.attivita (id, nome, natura_iva, predefinita)
values ('a4000000-0000-0000-0000-000000000001', 'Psicologo', 'esente_sanitaria', true);
insert into public.clienti (id, tipo, nome, cognome, indirizzo, cap, comune, provincia)
values ('c4000000-0000-0000-0000-000000000001', 'persona_fisica', 'Luca', 'Verdi', 'Via Po 3', '10100', 'Torino', 'TO');

-- In prova si può emettere anche prima dell'inizio attività, e la fattura è segnata come prova
select pg_temp.fattura('f4000000-0000-0000-0000-000000000001', '2026-11-22');
select is((select numero from public.emetti_fattura('f4000000-0000-0000-0000-000000000001')), 1,
  'in prova si emette anche prima dell''inizio attività');
select is((select fotografia ->> 'prova' from public.fatture where id = 'f4000000-0000-0000-0000-000000000001'), 'true',
  'la fattura emessa in prova è segnata come prova');
insert into public.incassi (id, fattura_id, data, importo, modalita, tracciabile)
values (gen_random_uuid(), 'f4000000-0000-0000-0000-000000000001', '2026-11-22', 8520, 'bonifico', true);

-- In prova una fattura emessa si cancella (con i suoi incassi e le sue note di credito)
select public.crea_nota_di_credito('f4000000-0000-0000-0000-000000000001', gen_random_uuid(), '2026-11-23');
select lives_ok($$select public.elimina_fattura_prova('f4000000-0000-0000-0000-000000000001')$$,
  'in prova si cancella una fattura emessa');
select is((select count(*)::int from public.fatture), 0, 'cancellate anche la nota di credito collegata');
select is((select count(*)::int from public.incassi), 0, 'cancellati anche gli incassi');

-- Cancella tutto: le prove sì, le anagrafiche solo se richiesto
select pg_temp.fattura('f4000000-0000-0000-0000-000000000002', '2026-11-22');
select public.emetti_fattura('f4000000-0000-0000-0000-000000000002');
select is((select fatture from public.cancella_dati_prova(false)), 1, 'cancella i dati di prova');
select is((select count(*)::int from public.clienti), 1, 'senza richiesta le anagrafiche restano');

-- Passaggio alla produzione: serve la parola di conferma e un codice inserito da poco
select pg_temp.fattura('f4000000-0000-0000-0000-000000000003', '2026-11-22');
select public.emetti_fattura('f4000000-0000-0000-0000-000000000003');
select throws_ok($$select public.passa_a_produzione('produzione', true)$$, 'P0001', 'conferma_mancante',
  'serve la parola PRODUZIONE');
select throws_ok($$select public.passa_a_produzione('PRODUZIONE', true)$$, 'P0001', 'verifica_recente',
  'serve password e codice inseriti da poco');

reset role;
select set_config('request.jwt.claims', (select recente from t_claims), true);
set local role authenticated;
select lives_ok($$select public.passa_a_produzione('PRODUZIONE', true)$$, 'passaggio alla produzione');
select is((select in_prova from public.user_security), false, 'ora sei in produzione');
select is((select count(*)::int from public.fatture), 0, 'le fatture di prova sono state cancellate');
select is((select count(*)::int from public.clienti), 1, 'le anagrafiche tenute restano');

-- In produzione: niente più cancellazioni né ritorno alla prova
select throws_ok($$select public.cancella_dati_prova(true)$$, 'P0001', 'non_in_prova',
  'in produzione non si cancellano i dati');
select pg_temp.fattura('f4000000-0000-0000-0000-000000000004', '2026-11-22');
select throws_ok($$select public.emetti_fattura('f4000000-0000-0000-0000-000000000004')$$, 'P0001',
  'data_anteriore_inizio', 'in produzione torna il controllo sulla data di inizio attività');

reset role;
select throws_ok(
  $$update public.user_security set in_prova = true where owner_id = '41111111-1111-1111-1111-111111111111'$$,
  'P0001', 'produzione_irreversibile', 'nemmeno l''amministratore può tornare alla prova');

select * from finish();
rollback;
