-- pgTAP (specifica 003, FR-032): «Carica dati d'esempio» solo in prova, una volta sola, totali coerenti,
-- isolamento tra utenti e pulizia con cancella_dati_prova (le CU dell'utente restano).
begin;
select plan(33);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'esempio@example.test'),
  ('a2222222-2222-2222-2222-222222222222', 'esempio-altro@example.test'),
  ('a3333333-3333-3333-3333-333333333333', 'esempio-produzione@example.test');
update public.user_security set in_prova = false, produzione_dal = now()
  where owner_id = 'a3333333-3333-3333-3333-333333333333';

create temp table t_claims as
select
  json_build_object('sub', 'a1111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as io,
  json_build_object('sub', 'a1111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'aal', 'aal1')::text as io_aal1,
  json_build_object('sub', 'a2222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as altro,
  json_build_object('sub', 'a3333333-3333-3333-3333-333333333333', 'role', 'authenticated', 'aal', 'aal2',
    'amr', json_build_array(json_build_object('method', 'totp', 'timestamp', extract(epoch from now())::bigint)))::text as produzione;
grant select on t_claims to authenticated;

-- In produzione è rifiutato
select set_config('request.jwt.claims', (select produzione from t_claims), true);
set local role authenticated;
select throws_ok($$select * from public.carica_dati_esempio()$$, 'P0001', 'non_in_prova',
  'in produzione i dati d''esempio non si caricano');
select is((select count(*)::int from public.clienti), 0, 'in produzione nessun cliente creato');

-- Senza secondo fattore è rifiutato
reset role;
select set_config('request.jwt.claims', (select io_aal1 from t_claims), true);
set local role authenticated;
select throws_ok($$select * from public.carica_dati_esempio()$$, '42501', 'accesso_negato',
  'senza il secondo fattore è rifiutato');

-- In prova: caricamento
reset role;
select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;
-- una CU dell'utente: non va mai toccata
insert into public.certificazioni_uniche (id, anno, reddito_lavoro, ritenute_irpef)
values ('c1000000-0000-0000-0000-0000000000a1', 2027, 3000000, 600000);

create temp table t_esito as select * from public.carica_dati_esempio();
select is((select clienti from t_esito), 12, '12 clienti creati');
select is((select fatture from t_esito), 45, '45 documenti creati (42 fatture, 1 nota di credito, 2 bozze)');
select is((select incassi from t_esito), 37, '37 incassi creati');
select is((select versamenti from t_esito), 5, '5 versamenti ENPAP creati');

select is((select count(*)::int from public.clienti where tipo = 'persona_fisica'), 10, '10 persone');
select is((select count(*)::int from public.clienti where tipo = 'ente' and sostituto_imposta), 1,
  'un ente sostituto d''imposta');
select is((select count(*)::int from public.clienti where opposizione_sts), 1, 'un paziente opposto al STS');
select is((select count(*)::int from public.profilo_professionale), 1, 'profilo d''esempio creato');
select is((select count(*)::int from public.attivita), 2, 'due attività (sanitaria esente e imponibile)');
select is((select count(*)::int from public.attivita where predefinita and natura_iva = 'esente_sanitaria'), 1,
  'Psicologo è l''attività predefinita');

-- Stati e numerazione
select is((select count(*)::int from public.fatture where stato = 'bozza'), 2, 'due bozze senza numero');
select is((select count(*)::int from public.fatture where tipo = 'nota_credito' and stato = 'emessa'), 1,
  'una nota di credito emessa');
select is((select count(*)::int from public.fatture f join public.fatture n on n.fattura_rif_id = f.id
           where f.stato = 'annullata'), 1, 'la fattura stornata è annullata');
select is(
  (select array_agg(numero order by numero) from public.fatture where numero is not null),
  (select array_agg(g) from generate_series(1, 43) g),
  'numerazione 2027 da 1 a 43 senza salti');
select is(
  (select count(*)::int from (select numero, data, lag(data) over (order by numero) as prima
                              from public.fatture where numero is not null) x where data < prima),
  0, 'i numeri seguono l''ordine delle date');
select is((select count(*)::int from public.fatture where numero is not null and (fotografia ->> 'prova')::boolean
           and fotografia ? 'professionista' and fotografia ? 'cliente' and fotografia ? 'regole'), 43,
  'ogni documento emesso ha la fotografia completa ed è segnato come prova');
select is((select count(*)::int from public.fatture where stato_sts = 'da_inviare'), 35,
  'sedute a persone non opposte: da inviare al STS (fatture e nota di credito)');

-- Totali coerenti con il motore (vincoli della tabella e righe)
select is((select count(*)::int from public.fatture
           where totale <> imponibile_iva + iva + importo_esente + case when bollo_addebitato then bollo else 0 end
              or netto <> totale - ritenuta), 0, 'totale e netto coerenti');
select is((select count(*)::int from public.fatture f
           where f.totale_compensi <> (select sum(r.compenso * r.quantita) from public.righe_fattura r where r.fattura_id = f.id)
              or f.totale_integrativo <> (select sum(r.integrativo) from public.righe_fattura r where r.fattura_id = f.id)),
  0, 'somma delle righe = totale compensi e integrativo');
select is((select count(*)::int from public.fatture
           where (importo_esente > 7747) <> (bollo = 200) or (bollo > 0 and not bollo_addebitato)), 0,
  'bollo di 2 € solo oltre 77,47 € di parte esente, a carico del paziente');
select is((select count(*)::int from public.fatture f join public.clienti c on c.id = f.cliente_id
           where (c.sostituto_imposta and f.ritenuta <> (f.totale_compensi * 2000 + 5000) / 10000)
              or (not c.sostituto_imposta and f.ritenuta <> 0)), 0, 'ritenuta del 20% sul solo compenso');
select is((select row(totale_compensi, totale_integrativo, imponibile_iva, iva, ritenuta, totale, netto)::text
           from public.fatture where tipo = 'fattura' and totale_compensi = 60000),
  '(60000,2400,62400,13728,12000,76128,64128)', 'consulenza da 600 € all''ente: totali al centesimo');

-- Incassi: mai oltre il netto, cinque fatture da incassare
select is((select count(*)::int from public.fatture f where f.tipo = 'fattura' and f.stato = 'emessa'
           and not exists (select 1 from public.incassi i where i.fattura_id = f.id)), 5, 'cinque fatture da incassare');
select is((select count(*)::int from public.incassi where modalita = 'contanti' and tracciabile), 0,
  'i contanti non sono tracciabili');

-- Una seconda volta no
select throws_ok($$select * from public.carica_dati_esempio()$$, 'P0001', 'esempio_gia_caricato',
  'non si caricano due volte');

-- Isolamento: l'altro utente non vede nulla
reset role;
select set_config('request.jwt.claims', (select altro from t_claims), true);
set local role authenticated;
select is((select count(*)::int from public.fatture) + (select count(*)::int from public.clienti)
          + (select count(*)::int from public.versamenti_previdenza), 0, 'un altro utente non vede gli esempi');

-- Senza il codice del telefono (aal1) la pulizia dei dati d'esempio è rifiutata
reset role;
select set_config('request.jwt.claims', (select io_aal1 from t_claims), true);
set local role authenticated;
select throws_ok($$select public.cancella_dati_prova(false)$$, '42501', null,
  'senza secondo fattore la pulizia degli esempi è rifiutata');

-- Pulizia: cancella_dati_prova toglie tutto l'esempio, la CU resta
reset role;
select set_config('request.jwt.claims', (select io from t_claims), true);
set local role authenticated;
select is((select anagrafiche from public.cancella_dati_prova(false)), 14,
  'cancellati anche i 12 clienti e le 2 attività d''esempio');
select is((select count(*)::int from public.fatture) + (select count(*)::int from public.incassi)
          + (select count(*)::int from public.clienti) + (select count(*)::int from public.attivita)
          + (select count(*)::int from public.profilo_professionale)
          + (select count(*)::int from public.versamenti_previdenza), 0, 'non resta nulla dell''esempio');
select is((select count(*)::int from public.certificazioni_uniche), 1, 'la CU dell''utente resta');

select * from finish();
rollback;
