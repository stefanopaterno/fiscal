-- pgTAP (test di sicurezza 2026-11, migrazione 20261124000600): le regole di scrittura che valgono
-- per l'utente non devono rompersi per i ruoli di servizio (cancellazione account a cascata / diritto
-- all'oblio, correzioni dell'amministrazione), che non hanno accesso allo schema `private`.
-- Simuliamo quel ruolo con un ruolo `bypassrls` SENZA usage su `private`: `reset role` non basta,
-- perché il superutente dei test ha comunque accesso a `private` e quindi non coglierebbe il difetto.
begin;
select plan(6);

insert into auth.users (id, email) values ('39111111-1111-1111-1111-111111111111', 'servizio@example.test');
update public.user_security set in_prova = false, produzione_dal = now()
  where owner_id = '39111111-1111-1111-1111-111111111111';

create temp table t_claims as select
  json_build_object('sub', '39111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io;
grant select on t_claims to authenticated;
select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

insert into public.attivita (id, nome, natura_iva, previdenza, predefinita)
  values ('a9000000-0000-0000-0000-000000000001', 'Psicologo', 'esente_sanitaria', 'enpap', true);
insert into public.clienti (id, tipo, nome, cognome)
  values ('c9000000-0000-0000-0000-000000000001', 'persona_fisica', 'Mario', 'Rossi');
insert into public.fatture (id, tipo, data, cliente_id, attivita_id,
    totale_compensi, totale_integrativo, imponibile_iva, iva, importo_esente, bollo, bollo_addebitato,
    ritenuta, totale, netto)
  values ('f9000000-0000-0000-0000-000000000001', 'fattura', '2027-01-10',
    'c9000000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-000000000001',
    8000, 320, 0, 0, 8320, 200, true, 0, 8520, 8520);
insert into public.righe_fattura (id, fattura_id, descrizione, quantita, compenso, natura, integrativo, iva)
  values ('b9000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-000000000001',
    'Seduta', 1, 8000, 'esente_sanitaria', 320, 0);

-- Fix #2: il registro dei documenti è append-only anche per l'owner
select ok(not has_table_privilege('authenticated', 'public.eventi_documenti', 'UPDATE'),
  'l''utente non può modificare il registro dei documenti');
select ok(not has_table_privilege('authenticated', 'public.eventi_documenti', 'DELETE'),
  'l''utente non può cancellare dal registro dei documenti');

reset role;
-- `service_role` è il ruolo di servizio reale di Supabase: vede tutte le righe (bypassrls), scrive con
-- la chiave segreta/cascate dell'account, e NON ha usage su `private` (concesso solo ad `authenticated`).
-- È esattamente il ruolo che il test di sicurezza ha segnalato.
set local role service_role;

-- Fix #1: le trigger di immutabilità non toccano lo schema `private` per i ruoli di servizio
select lives_ok($$delete from public.righe_fattura where id = 'b9000000-0000-0000-0000-000000000001'$$,
  'un ruolo di servizio cancella una riga senza errori di schema private');
select lives_ok($$delete from public.fatture where id = 'f9000000-0000-0000-0000-000000000001'$$,
  'un ruolo di servizio cancella una fattura (cascata account / correzione) senza errori di schema private');
select is((select count(*)::int from public.fatture where id = 'f9000000-0000-0000-0000-000000000001'), 0,
  'la fattura è stata davvero cancellata dal ruolo di servizio');

-- Fix #3: la validazione degli scaglioni non tocca lo schema `private` per i ruoli di servizio
select lives_ok(
  $$insert into public.aliquote_addizionali (id, owner_id, anno, regionale_scaglioni, comunale_aliquota)
    values ('e9000000-0000-0000-0000-000000000001', '39111111-1111-1111-1111-111111111111', 2027,
            '[{"fino_a":null,"aliquota":0.0173}]'::jsonb, 0)$$,
  'un ruolo di servizio salva le aliquote senza errori di schema private');

reset role;
select * from finish();
rollback;
