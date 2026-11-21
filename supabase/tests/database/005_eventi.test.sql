-- pgTAP (T031): i trigger di sicurezza scrivono in security_events il tipo atteso,
-- con la sola etichetta del dispositivo e nessun altro contenuto (data-model.md, security_events.tipo).
begin;
select plan(9);

-- La tabella degli eventi ha solo le colonne previste (nessun contenuto)
select columns_are('public', 'security_events',
  array['id', 'owner_id', 'tipo', 'avvenuto_il', 'dispositivo'],
  'security_events ha solo id, owner_id, tipo, avvenuto_il, dispositivo');

insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'eventi@example.test');

-- Accesso riuscito: nuova sessione
insert into auth.sessions (id, user_id, user_agent, created_at, updated_at)
values ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
        now(), now());
select is((select tipo from public.security_events where owner_id = '33333333-3333-3333-3333-333333333333' order by avvenuto_il, tipo limit 1),
  'login_ok', 'nuova sessione → login_ok');
select is((select dispositivo from public.security_events where tipo = 'login_ok' and owner_id = '33333333-3333-3333-3333-333333333333'),
  'iPhone · Safari', 'etichetta del dispositivo breve, senza indirizzo IP');

-- Secondo fattore configurato: da unverified a verified
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'telefono', 'totp', 'unverified', now(), now());
select is((select count(*)::int from public.security_events where owner_id = '33333333-3333-3333-3333-333333333333' and tipo = 'mfa_configurato'), 0, 'fattore non ancora verificato: nessun evento');
update auth.mfa_factors set status = 'verified' where id = '55555555-5555-5555-5555-555555555555';
select is((select count(*)::int from public.security_events where owner_id = '33333333-3333-3333-3333-333333333333' and tipo = 'mfa_configurato'), 1, 'fattore verificato → mfa_configurato');

-- Cambio password
update auth.users set encrypted_password = 'nuova-impronta' where id = '33333333-3333-3333-3333-333333333333';
select is((select count(*)::int from public.security_events where owner_id = '33333333-3333-3333-3333-333333333333' and tipo = 'password_cambiata'), 1, 'cambio password → password_cambiata');

-- Sblocco rapido attivato e disattivato
update public.user_security set sblocco_rapido_attivo = true where owner_id = '33333333-3333-3333-3333-333333333333';
update public.user_security set sblocco_rapido_attivo = false where owner_id = '33333333-3333-3333-3333-333333333333';
select is((select array_agg(tipo order by tipo) from public.security_events where owner_id = '33333333-3333-3333-3333-333333333333' and tipo like 'sblocco_rapido_%'),
  array['sblocco_rapido_attivato', 'sblocco_rapido_disattivato'], 'sblocco rapido attivato e disattivato');

-- Sessione chiusa
delete from auth.sessions where id = '44444444-4444-4444-4444-444444444444';
select is((select count(*)::int from public.security_events where owner_id = '33333333-3333-3333-3333-333333333333' and tipo = 'sessione_chiusa'), 1, 'sessione cancellata → sessione_chiusa');

-- Un aggiornamento che non cambia la password non crea eventi
update auth.users set email_confirmed_at = now() where id = '33333333-3333-3333-3333-333333333333';
select is((select count(*)::int from public.security_events where owner_id = '33333333-3333-3333-3333-333333333333' and tipo = 'password_cambiata'), 1, 'altre modifiche all''utente: nessun evento in più');

select * from finish();
rollback;
