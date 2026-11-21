-- pgTAP (T062, US4): regole del recupero nel database.
-- Vedi contracts/edge-functions.md e data-model.md (recovery_codes, recovery_requests, user_security).
begin;
select plan(21);

-- 1) Le funzioni di recupero si usano solo dal server (service_role), mai dal browser
select ok(not has_function_privilege('authenticated', 'public.recupero_usa_codice(uuid, bytea)', 'execute'),
  'il browser (authenticated) non può usare i codici direttamente');
select ok(not has_function_privilege('anon', 'public.recupero_crea_richiesta(uuid)', 'execute'),
  'un anonimo non può avviare un ripristino');
select ok(has_function_privilege('service_role', 'public.recupero_usa_codice(uuid, bytea)', 'execute'),
  'il server (funzioni Edge) può usare le funzioni di recupero');
select ok(not has_table_privilege('authenticated', 'public.recovery_codes', 'select'),
  'il browser non legge mai i codici di recupero');

insert into auth.users (id, email) values ('66666666-6666-6666-6666-666666666666', 'recupero@example.test');

-- 2) Codici: validi una volta sola, lotto vecchio non più valido dopo la rigenerazione
select is(public.recupero_salva_codici('66666666-6666-6666-6666-666666666666',
  array['\x01'::bytea, '\x02'::bytea, '\x03'::bytea], false), 1, 'primo lotto = 1');
select is(public.recupero_codici_residui('66666666-6666-6666-6666-666666666666'), 3, 'tre codici validi');
select is((select esito from public.recupero_usa_codice('66666666-6666-6666-6666-666666666666', '\x01')), 'valido',
  'un codice valido è accettato');
select is((select esito from public.recupero_usa_codice('66666666-6666-6666-6666-666666666666', '\x01')), 'non_valido',
  'lo stesso codice non vale una seconda volta');
select is(public.recupero_salva_codici('66666666-6666-6666-6666-666666666666', array['\x04'::bytea], true), 2,
  'la rigenerazione crea il lotto 2');
select is((select esito from public.recupero_usa_codice('66666666-6666-6666-6666-666666666666', '\x02')), 'non_valido',
  'dopo la rigenerazione i codici vecchi non valgono più');

-- 3) Dopo 5 errori in 15 minuti scatta il blocco, anche con un codice giusto
select public.recupero_usa_codice('66666666-6666-6666-6666-666666666666', '\xff') from generate_series(1, 3);
select is((select esito from public.recupero_usa_codice('66666666-6666-6666-6666-666666666666', '\x04')), 'bloccato',
  'dopo 5 errori i tentativi sono bloccati');

-- 4) Frase: 5 errori → blocco di 24 ore
select public.recupero_imposta_frase('66666666-6666-6666-6666-666666666666', 'argon2id$finta');
select public.recupero_frase_errata('66666666-6666-6666-6666-666666666666') from generate_series(1, 4);
select is((select bloccata_fino from public.recupero_dati_frase('66666666-6666-6666-6666-666666666666')), null,
  'quattro errori: ancora nessun blocco');
select ok(public.recupero_frase_errata('66666666-6666-6666-6666-666666666666') > now() + interval '23 hours',
  'al quinto errore la frase è bloccata per 24 ore');

-- 5) Una sola richiesta in attesa, con 48 ore di attesa
select is((select stato::text from public.recupero_crea_richiesta('66666666-6666-6666-6666-666666666666')), 'in_attesa',
  'la richiesta parte in attesa');
select is((select count(*)::int from public.recovery_requests where owner_id = '66666666-6666-6666-6666-666666666666'
             and stato = 'in_attesa'), 1, 'una richiesta in attesa');
select public.recupero_crea_richiesta('66666666-6666-6666-6666-666666666666');
select is((select count(*)::int from public.recovery_requests where owner_id = '66666666-6666-6666-6666-666666666666'),
  1, 'avviarla di nuovo non crea una seconda richiesta');
select ok((select esegui_dopo from public.recovery_requests where owner_id = '66666666-6666-6666-6666-666666666666')
            >= now() + interval '47 hours 59 minutes', 'esegui_dopo è tra 48 ore');
select is(public.recupero_completa_richiesta('66666666-6666-6666-6666-666666666666'), 'in_attesa',
  'non si completa prima della scadenza');

-- 6) Un accesso valido con il codice (sessione aal2) annulla da solo il ripristino in attesa
insert into auth.sessions (id, user_id, aal, created_at, updated_at)
values ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', 'aal1', now(), now());
update auth.sessions set aal = 'aal2' where id = '77777777-7777-7777-7777-777777777777';
select is((select motivo_chiusura from public.recovery_requests where owner_id = '66666666-6666-6666-6666-666666666666'),
  'accesso_valido', 'un accesso con il codice annulla il ripristino in attesa');

-- 7) Dopo la scadenza dell'attesa il ripristino si completa e la frase non vale più
select public.recupero_crea_richiesta('66666666-6666-6666-6666-666666666666');
update public.recovery_requests set esegui_dopo = now() - interval '1 minute'
  where owner_id = '66666666-6666-6666-6666-666666666666' and stato = 'in_attesa';
select is(public.recupero_completa_richiesta('66666666-6666-6666-6666-666666666666'), 'completata',
  'dopo 48 ore il ripristino si completa');
select is((select hash from public.recupero_dati_frase('66666666-6666-6666-6666-666666666666')), null,
  'la frase usata non vale più');

select * from finish();
rollback;
