-- pgTAP (T009, specifica 003): numerazione, immutabilità, note di credito e incassi.
-- Modello: specs/003-configurazione-piva-fatture/data-model.md (fatture.numero, fatture.stato, incassi.importo)
-- Contratto: specs/003-configurazione-piva-fatture/contracts/database.md
begin;
select plan(30);

-- Utenti di prova (il trigger crea la riga user_security)
insert into auth.users (id, email) values
  ('31111111-1111-1111-1111-111111111111', 'professionista@example.test'),
  ('32222222-2222-2222-2222-222222222222', 'altro@example.test');

create temp table t_claims as
select
  json_build_object('sub', '31111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', '32222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro;
grant select on t_claims to authenticated;

-- Bozza da 80 € esente con i totali del motore (2027): righe e totali coerenti
create or replace function pg_temp.bozza(p_id uuid, p_data date) returns void language sql as $$
  insert into public.fatture (id, tipo, data, cliente_id, attivita_id,
    totale_compensi, totale_integrativo, imponibile_iva, iva, importo_esente, bollo, bollo_addebitato,
    ritenuta, totale, netto)
  values (p_id, 'fattura', p_data, 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
    8000, 320, 0, 0, 8320, 200, true, 0, 8520, 8520);
  insert into public.righe_fattura (id, fattura_id, descrizione, quantita, compenso, natura, integrativo, iva)
  values (gen_random_uuid(), p_id, 'Seduta di psicoterapia', 1, 8000, 'esente_sanitaria', 320, 0);
$$;

select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

-- Struttura
select has_function('public', 'emetti_fattura', array['uuid'], 'esiste emetti_fattura(uuid)');
select has_function('public', 'crea_nota_di_credito', array['uuid', 'uuid', 'date'], 'esiste crea_nota_di_credito');

-- Dati di base: attività, cliente (paziente), una bozza da 80 € esente con totali del motore (2027)
insert into public.attivita (id, nome, natura_iva, previdenza, predefinita)
values ('a0000000-0000-0000-0000-000000000001', 'Psicologo', 'esente_sanitaria', 'enpap', true);

select throws_ok(
  $$insert into public.attivita (id, nome, natura_iva, previdenza, predefinita)
    values ('a0000000-0000-0000-0000-000000000002', 'Altra', 'imponibile', 'enpap', true)$$,
  '23505', null, 'una sola attività predefinita per utente');

insert into public.clienti (id, tipo, nome, cognome, codice_fiscale, sostituto_imposta, opposizione_sts)
values ('c0000000-0000-0000-0000-000000000001', 'persona_fisica', 'Mario', 'Rossi', null, false, false);


select pg_temp.bozza('f0000000-0000-0000-0000-000000000001', '2027-01-10');

-- Configurazione mancante
select throws_ok($$select public.emetti_fattura('f0000000-0000-0000-0000-000000000001')$$,
  'P0001', 'configurazione_incompleta', 'senza profilo professionale completo non si emette');

insert into public.profilo_professionale (id, nome, cognome, codice_fiscale, partita_iva, inizio_attivita,
  indirizzo, cap, comune, provincia)
values ('b0000000-0000-0000-0000-000000000001', 'Anna', 'Bianchi', 'BNCNNA80' || 'A41H501X', '12345678903',
  '2027-01-02', 'Via Roma 1', '00100', 'Roma', 'RM');

-- Vincolo dei totali: totale = imponibile + IVA + esente + bollo addebitato
select throws_ok(
  $$insert into public.fatture (id, tipo, data, cliente_id, attivita_id, totale_compensi, importo_esente, totale, netto)
    values (gen_random_uuid(), 'fattura', '2027-01-10', 'c0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000001', 8000, 8320, 9999, 9999)$$,
  '23514', null, 'totali incoerenti rifiutati');

-- Le bozze non hanno numero
select is((select numero from public.fatture where id = 'f0000000-0000-0000-0000-000000000001'), null,
  'una bozza non ha numero');

-- Prima emissione: numero 1, stato emessa, STS da inviare (paziente non opposto)
select is((select numero from public.emetti_fattura('f0000000-0000-0000-0000-000000000001')), 1,
  'la prima fattura dell''anno ha numero 1');
select is((select stato::text from public.fatture where id = 'f0000000-0000-0000-0000-000000000001'), 'emessa',
  'dopo l''emissione la fattura è emessa');
select is((select stato_sts::text from public.fatture where id = 'f0000000-0000-0000-0000-000000000001'), 'da_inviare',
  'prestazione sanitaria a paziente non opposto: da inviare al Sistema Tessera Sanitaria');
select is((select fotografia -> 'professionista' ->> 'partita_iva' from public.fatture
           where id = 'f0000000-0000-0000-0000-000000000001'), '12345678903',
  'la fattura conserva la fotografia dei dati del professionista');

select throws_ok($$select public.emetti_fattura('f0000000-0000-0000-0000-000000000001')$$,
  'P0001', 'non_bozza', 'una fattura già emessa non si riemette');

-- Una bozza cancellata non consuma numeri
select pg_temp.bozza('f0000000-0000-0000-0000-000000000002', '2027-01-15');
delete from public.fatture where id = 'f0000000-0000-0000-0000-000000000002';
select is((select count(*)::int from public.righe_fattura where fattura_id = 'f0000000-0000-0000-0000-000000000002'), 0,
  'cancellando la bozza si cancellano le sue righe');
select pg_temp.bozza('f0000000-0000-0000-0000-000000000003', '2027-01-20');
select is((select numero from public.emetti_fattura('f0000000-0000-0000-0000-000000000003')), 2,
  'nessun salto: dopo una bozza cancellata il numero successivo è 2');

-- Data anteriore all'inizio attività o all'ultima fattura emessa
select pg_temp.bozza('f0000000-0000-0000-0000-000000000004', '2027-01-01');
select throws_ok($$select public.emetti_fattura('f0000000-0000-0000-0000-000000000004')$$,
  'P0001', 'data_anteriore_inizio', 'data anteriore all''inizio attività rifiutata');
update public.fatture set data = '2027-01-12' where id = 'f0000000-0000-0000-0000-000000000004';
select throws_ok($$select public.emetti_fattura('f0000000-0000-0000-0000-000000000004')$$,
  'P0001', 'data_anteriore_ultima', 'data anteriore all''ultima fattura emessa rifiutata');
delete from public.fatture where id = 'f0000000-0000-0000-0000-000000000004';

-- Fattura senza righe
insert into public.fatture (id, tipo, data, cliente_id, attivita_id)
values ('f0000000-0000-0000-0000-000000000005', 'fattura', '2027-02-01', 'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001');
select throws_ok($$select public.emetti_fattura('f0000000-0000-0000-0000-000000000005')$$,
  'P0001', 'fattura_vuota', 'una fattura senza righe non si emette');
delete from public.fatture where id = 'f0000000-0000-0000-0000-000000000005';

-- Immutabilità delle fatture emesse
select throws_ok($$update public.fatture set totale = 1, netto = 1, importo_esente = 1, bollo_addebitato = false
                   where id = 'f0000000-0000-0000-0000-000000000001'$$,
  'P0001', 'fattura_immutabile', 'gli importi di una fattura emessa non si modificano');
select throws_ok($$delete from public.fatture where id = 'f0000000-0000-0000-0000-000000000001'$$,
  'P0001', 'fattura_immutabile', 'una fattura emessa non si cancella');
select throws_ok($$update public.righe_fattura set descrizione = 'altro'
                   where fattura_id = 'f0000000-0000-0000-0000-000000000001'$$,
  'P0001', 'fattura_immutabile', 'le righe di una fattura emessa non si modificano');
select throws_ok($$update public.fatture set stato = 'annullata' where id = 'f0000000-0000-0000-0000-000000000003'$$,
  'P0001', 'fattura_immutabile', 'si annulla solo con una nota di credito');
select pg_temp.bozza('f0000000-0000-0000-0000-000000000006', '2027-02-10');
select throws_ok($$update public.fatture set stato = 'emessa', numero = 99 where id = 'f0000000-0000-0000-0000-000000000006'$$,
  'P0001', 'fattura_immutabile', 'si emette solo con emetti_fattura');
delete from public.fatture where id = 'f0000000-0000-0000-0000-000000000006';

-- Invio al Sistema Tessera Sanitaria: l'unico cambiamento ammesso dopo l'emissione
select is(public.segna_sts_inviate(array['f0000000-0000-0000-0000-000000000003'::uuid]), 1,
  'segna inviata una spesa al Sistema Tessera Sanitaria');

-- Incassi
insert into public.incassi (id, fattura_id, data, importo, modalita, tracciabile)
values (gen_random_uuid(), 'f0000000-0000-0000-0000-000000000003', '2027-01-20', 5000, 'carta_pos', true);
select throws_ok(
  $$insert into public.incassi (id, fattura_id, data, importo, modalita, tracciabile)
    values (gen_random_uuid(), 'f0000000-0000-0000-0000-000000000003', '2027-02-01', 3521, 'bonifico', true)$$,
  'P0001', 'oltre_il_netto', 'gli incassi non superano il netto della fattura');
select throws_ok(
  $$insert into public.incassi (id, fattura_id, data, importo, modalita, tracciabile)
    values (gen_random_uuid(), 'f0000000-0000-0000-0000-000000000003', '2027-02-01', 100, 'contanti', true)$$,
  '23514', null, 'i contanti non sono un pagamento tracciabile');
insert into public.incassi (id, fattura_id, data, importo, modalita, tracciabile)
values (gen_random_uuid(), 'f0000000-0000-0000-0000-000000000003', '2028-01-05', 3520, 'bonifico', true);
select is((select incassato from public.reddito_cassa where anno = 2027), 5000::bigint,
  'reddito per cassa: conta l''anno dell''incasso, non della fattura');

-- Nota di credito: stessa sequenza, la fattura originale diventa annullata
select throws_ok(
  $$select public.crea_nota_di_credito('f0000000-0000-0000-0000-000000000009', gen_random_uuid(), '2027-03-01')$$,
  'P0001', 'non_emessa', 'nota di credito solo per fatture emesse');
select is((select numero from public.crea_nota_di_credito('f0000000-0000-0000-0000-000000000001',
            'e0000000-0000-0000-0000-000000000001', '2027-03-01')), 3,
  'la nota di credito prende il numero successivo della stessa sequenza');
select is((select stato::text from public.fatture where id = 'f0000000-0000-0000-0000-000000000001'), 'annullata',
  'la fattura stornata per intero risulta annullata, ma resta consultabile');
select is((select importo_esente from public.riepilogo_iva where anno = 2027), 8320::bigint,
  'riepilogo IVA: la nota di credito toglie gli importi della fattura annullata');

-- Un altro utente non vede nulla
reset role;
select set_config('request.jwt.claims', (select altro from t_claims), true);
set local role authenticated;
select is((select count(*)::int from public.fatture), 0, 'un altro utente non vede le fatture');

select * from finish();
rollback;
