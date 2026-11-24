-- Specifica 005: consenso informato dei pazienti.
-- Solo dati amministrativi del consenso (tipo, versione del testo, date, firmatari, modalità, copia firmata):
-- MAI dati clinici. Testo libero limitato a 200 caratteri e solo per motivi amministrativi (FR-010).
-- Ogni tabella con le regole standard (proprietario + aal2). Lo storico non si cancella: l'utente non ha il
-- permesso di eliminare consensi e revoche (FR-006); la cancellazione dell'account resta possibile (cascata).

create type public.modalita_consenso as enum ('carta', 'email', 'altro');
create type public.ruolo_firmatario as enum ('paziente', 'genitore', 'rappresentante_legale');
create type public.genere_modello as enum ('consenso', 'informativa');
create type public.azione_consenso as enum (
  'creato', 'modificato', 'revocato', 'allegato', 'modello_caricato', 'esportato', 'nome_mostrato');

-- Tipi di consenso: li crea l'utente, nessun tipo predefinito (FR-002)
create table public.tipi_consenso (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  nome          text not null check (length(trim(nome)) between 1 and 80),
  descrizione   text check (length(descrizione) <= 200),
  archiviato    boolean not null default false,
  unique (owner_id, nome)
);
select private.applica_regole_tabella('tipi_consenso');
revoke delete on public.tipi_consenso from authenticated;

-- Modelli (testi dell'utente) con versione e data di entrata in vigore (FR-008, FR-009)
create table public.modelli_consenso (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  genere        public.genere_modello not null default 'consenso',
  tipo_consenso_id uuid references public.tipi_consenso (id),
  titolo        text not null check (length(trim(titolo)) between 1 and 120),
  versione_testo text not null check (length(trim(versione_testo)) between 1 and 20),
  in_vigore_dal date not null,
  file_percorso text check (file_percorso is null or split_part(file_percorso, '/', 1) = owner_id::text),
  file_nome     text check (length(file_nome) <= 120),
  file_tipo     text check (length(file_tipo) <= 100),
  file_dimensione bigint check (file_dimensione > 0 and file_dimensione <= 10485760),
  file_impronta text check (file_impronta ~ '^[0-9a-f]{64}$'),
  check (genere = 'informativa' or tipo_consenso_id is not null),
  unique (owner_id, genere, tipo_consenso_id, versione_testo)
);
select private.applica_regole_tabella('modelli_consenso');
revoke delete on public.modelli_consenso from authenticated;

-- Consensi: un paziente (cliente persona fisica) può averne più di uno, anche dello stesso tipo (storico)
create table public.consensi (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  -- "no action" (controllo a fine istruzione): la chiusura dell'account cancella tutto a cascata
  cliente_id    uuid not null references public.clienti (id),
  tipo_consenso_id uuid not null references public.tipi_consenso (id),
  modello_id    uuid references public.modelli_consenso (id),
  versione_testo text not null check (length(trim(versione_testo)) between 1 and 20),
  data_firma    date not null,
  registrato_il date not null default current_date,
  modalita      public.modalita_consenso not null,
  motivazione   text check (length(motivazione) <= 200),
  revocato_il   date,
  motivazione_revoca text check (length(motivazione_revoca) <= 200),
  file_percorso text check (file_percorso is null or split_part(file_percorso, '/', 1) = owner_id::text),
  file_nome     text check (length(file_nome) <= 120),
  file_tipo     text check (length(file_tipo) <= 100),
  file_dimensione bigint check (file_dimensione > 0 and file_dimensione <= 10485760),
  file_impronta text check (file_impronta ~ '^[0-9a-f]{64}$'),
  check (data_firma <= registrato_il),
  check (revocato_il is null or revocato_il >= data_firma),
  check ((file_percorso is null) = (file_impronta is null))
);
create index consensi_cliente on public.consensi (owner_id, cliente_id);
select private.applica_regole_tabella('consensi');
revoke delete on public.consensi from authenticated;

-- Solo i pazienti (persone fisiche) hanno consensi; una revoca non si annulla
create or replace function private.controlla_consenso()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.clienti c where c.id = new.cliente_id and c.tipo = 'persona_fisica'
                 and c.owner_id = new.owner_id) then
    raise exception 'consenso_solo_pazienti' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and private.da_utente() then
    if old.revocato_il is not null and new.revocato_il is distinct from old.revocato_il then
      raise exception 'revoca_immutabile' using errcode = 'P0001';
    end if;
    if new.cliente_id <> old.cliente_id then
      raise exception 'paziente_immutabile' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger consensi_controllo before insert or update on public.consensi
  for each row execute function private.controlla_consenso();

-- Un paziente con consensi non si cancella mai (FR-017): né dalla rubrica né con «Cancella i dati di prova» o
-- il passaggio alla produzione (la riga resta, senza errori). Solo la chiusura dell'account lo toglie.
create or replace function private.tieni_pazienti_con_consensi()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.consensi k where k.cliente_id = old.id)
     and exists (select 1 from auth.users u where u.id = old.owner_id) then
    return null;
  end if;
  return old;
end;
$$;
create trigger clienti_tieni_con_consensi before delete on public.clienti
  for each row execute function private.tieni_pazienti_con_consensi();

-- Firmatari (FR-004): nome e ruolo, data di firma
create table public.firmatari_consenso (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  consenso_id   uuid not null references public.consensi (id) on delete cascade,
  nome          text not null check (length(trim(nome)) between 1 and 120),
  ruolo         public.ruolo_firmatario not null,
  data_firma    date not null
);
create index firmatari_consenso_consenso on public.firmatari_consenso (owner_id, consenso_id);
select private.applica_regole_tabella('firmatari_consenso');

-- Registro delle modifiche (FR-016, FR-018): nessun contenuto, solo cosa e quando
create table public.eventi_consensi (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  consenso_id   uuid,
  cliente_id    uuid,
  azione        public.azione_consenso not null,
  avvenuto_il   timestamptz not null default now()
);
create index eventi_consensi_cliente on public.eventi_consensi (owner_id, cliente_id);
select private.applica_regole_tabella('eventi_consensi');
revoke update, delete on public.eventi_consensi from authenticated;

-- Accordo sul trattamento dei dati con il fornitore del database (promemoria finché non è segnato)
alter table public.profilo_professionale add column dpa_firmato_il date;

-- Bucket privato delle copie firmate e dei modelli: <owner_id>/<id>/<nome>, solo il proprietario con aal2.
-- Mai indirizzi pubblici (FR-014): l'app scarica il file con la sessione e lo apre in locale.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('consensi', 'consensi', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp', 'message/rfc822'])
on conflict (id) do nothing;

create policy consensi_proprietario on storage.objects
  for all to authenticated
  using (
    bucket_id = 'consensi'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and private.accesso_completo_valido()
  )
  with check (
    bucket_id = 'consensi'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and private.accesso_completo_valido()
  );
