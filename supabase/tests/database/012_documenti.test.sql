-- pgTAP (T003, specifica 010): vincoli dell'archivio documenti.
-- Modello: specs/010-archivio-documenti/data-model.md (documenti.file_impronta unico, chiave della fattura
-- unica, documenti.file_dimensione, documenti.file_percorso nella cartella del proprietario,
-- collegamenti_documenti unico). RLS e aal2 per tutte le tabelle: 003_conformita.
begin;
select plan(12);

insert into auth.users (id, email) values
  ('d1111111-1111-1111-1111-111111111111', 'documenti@example.test'),
  ('d2222222-2222-2222-2222-222222222222', 'documenti-altro@example.test');

create temp table t_claims as
select
  json_build_object('sub', 'd1111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', 'd2222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro;
grant select on t_claims to authenticated;

create or replace function pg_temp.impronta(t text) returns text language sql as $$ select encode(sha256(t::bytea), 'hex') $$;

select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;

select lives_ok(
  $$insert into public.documenti (id, tipo, stato, anno, file_percorso, file_nome, file_tipo, file_dimensione, file_impronta, fattura)
    values ('d0000000-0000-0000-0000-000000000001', 'fattura_ricevuta', 'da_classificare', 2027,
      'd1111111-1111-1111-1111-111111111111/d0000000-0000-0000-0000-000000000001/1-f.xml', 'f.xml', 'text/xml', 1000,
      pg_temp.impronta('a'), '{"partita_iva":"01234567890","numero":"FP-7","data":"2027-03-15"}')$$,
  'una fattura ricevuta si archivia');
select throws_ok(
  $$insert into public.documenti (id, anno, file_percorso, file_nome, file_tipo, file_dimensione, file_impronta)
    values (gen_random_uuid(), 2027, 'd1111111-1111-1111-1111-111111111111/x/1-g.pdf', 'g.pdf', 'application/pdf', 10, pg_temp.impronta('a'))$$,
  '23505', null, 'lo stesso file non si carica due volte');
select throws_ok(
  $$insert into public.documenti (id, tipo, anno, file_percorso, file_nome, file_tipo, file_dimensione, file_impronta, fattura)
    values (gen_random_uuid(), 'fattura_ricevuta', 2027, 'd1111111-1111-1111-1111-111111111111/y/1-h.xml', 'h.xml', 'text/xml', 10,
      pg_temp.impronta('b'), '{"partita_iva":"01234567890","numero":"FP-7","data":"2027-03-15"}')$$,
  '23505', null, 'la stessa fattura (fornitore, numero, data) non si importa due volte');
select throws_ok(
  $$insert into public.documenti (id, anno, file_percorso, file_nome, file_tipo, file_dimensione, file_impronta)
    values (gen_random_uuid(), 2027, 'd2222222-2222-2222-2222-222222222222/z/1-i.pdf', 'i.pdf', 'application/pdf', 10, pg_temp.impronta('c'))$$,
  '23514', null, 'il file deve stare nella cartella del proprietario');
select throws_ok(
  $$insert into public.documenti (id, anno, file_percorso, file_nome, file_tipo, file_dimensione, file_impronta)
    values (gen_random_uuid(), 2027, 'd1111111-1111-1111-1111-111111111111/z/1-l.pdf', 'l.pdf', 'application/pdf', 30000000, pg_temp.impronta('d'))$$,
  '23514', null, 'file oltre 20 MB rifiutato');

-- Nel cestino la stessa fattura si può reimportare
update public.documenti set eliminato_il = now() where id = 'd0000000-0000-0000-0000-000000000001';
select lives_ok(
  $$insert into public.documenti (id, tipo, anno, file_percorso, file_nome, file_tipo, file_dimensione, file_impronta, fattura)
    values ('d0000000-0000-0000-0000-000000000002', 'fattura_ricevuta', 2027, 'd1111111-1111-1111-1111-111111111111/w/1-m.xml', 'm.xml', 'text/xml', 10,
      pg_temp.impronta('e'), '{"partita_iva":"01234567890","numero":"FP-7","data":"2027-03-15"}')$$,
  'con la vecchia nel cestino la fattura si può reimportare');

-- Collegamenti
select lives_ok(
  $$insert into public.collegamenti_documenti (id, documento_id, voce, voce_id)
    values (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', 'spesa', '5e000000-0000-0000-0000-000000000001')$$,
  'documento collegato a una spesa');
select throws_ok(
  $$insert into public.collegamenti_documenti (id, documento_id, voce, voce_id)
    values (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', 'spesa', '5e000000-0000-0000-0000-000000000001')$$,
  '23505', null, 'lo stesso collegamento non si ripete');

-- Registro
select lives_ok(
  $$insert into public.eventi_documenti (id, documento_id, azione) values (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', 'caricato')$$,
  'azione registrata');

-- Eliminazione definitiva: collegamenti e versioni spariscono, il registro resta
delete from public.documenti where id = 'd0000000-0000-0000-0000-000000000002';
select is((select count(*)::int from public.collegamenti_documenti), 0, 'eliminando il documento spariscono i collegamenti');
select is((select count(*)::int from public.eventi_documenti), 1, 'il registro resta');

-- Isolamento
select set_config('request.jwt.claims', (select altro from t_claims), true);
select is((select count(*)::int from public.documenti), 0, 'un altro utente non vede i documenti');

select * from finish();
rollback;
