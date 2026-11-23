-- Specifica 010: archivio documenti e fatture ricevute (T004).
-- Modello: specs/010-archivio-documenti/data-model.md
-- Ogni tabella con le regole di nuova_tabella.sql (private.applica_regole_tabella). Nessun testo libero oltre
-- a `descrizione` (avviso sui dati clinici nell'app). I documenti NON sono dati di prova.

create type public.tipo_documento_archivio as enum (
  'fattura_ricevuta', 'scontrino', 'ricevuta', 'contratto', 'polizza', 'certificato', 'cu', 'dichiarazione', 'f24', 'altro');
create type public.stato_documento as enum ('da_classificare', 'archiviato');
create type public.voce_collegata as enum (
  'fattura', 'spesa', 'onere', 'versamento_previdenza', 'versamento_imposta', 'bene');
create type public.azione_documento as enum (
  'caricato', 'collegato', 'scollegato', 'sostituito', 'cestinato', 'ripristinato', 'eliminato');

create table public.documenti (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  tipo          public.tipo_documento_archivio not null default 'altro',
  stato         public.stato_documento not null default 'archiviato',
  anno          int  not null check (anno between 2000 and 2100),
  data          date,
  emittente     text check (length(emittente) <= 120),
  importo       bigint check (importo >= 0),
  descrizione   text check (length(descrizione) <= 200),
  scadenza      date,
  file_percorso text not null check (length(file_percorso) <= 300),
  file_nome     text not null check (length(file_nome) between 1 and 120),
  file_tipo     text not null check (length(file_tipo) <= 100),
  file_dimensione bigint not null check (file_dimensione > 0 and file_dimensione <= 20971520),
  file_impronta text not null check (file_impronta ~ '^[0-9a-f]{64}$'),
  versione_file int not null default 1 check (versione_file >= 1),
  fattura       jsonb,
  non_spesa     boolean not null default false,
  eliminato_il  timestamptz,
  -- il percorso del file deve stare nella cartella del proprietario
  check (split_part(file_percorso, '/', 1) = owner_id::text),
  unique (owner_id, file_impronta)
);
-- doppioni delle fatture: stesso fornitore, numero e data (FR-017)
create unique index documenti_fattura_unica on public.documenti (
  owner_id, (coalesce(fattura ->> 'partita_iva', fattura ->> 'codice_fiscale')), (fattura ->> 'numero'), (fattura ->> 'data'))
  where fattura is not null and eliminato_il is null
    and coalesce(fattura ->> 'partita_iva', fattura ->> 'codice_fiscale') is not null
    and fattura ->> 'numero' is not null and fattura ->> 'data' is not null;
create index documenti_anno on public.documenti (owner_id, anno);
select private.applica_regole_tabella('documenti');

create table public.documenti_versioni (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  documento_id  uuid not null references public.documenti (id) on delete cascade,
  versione_file int not null check (versione_file >= 1),
  file_percorso text not null check (split_part(file_percorso, '/', 1) = owner_id::text),
  file_impronta text not null check (file_impronta ~ '^[0-9a-f]{64}$'),
  file_dimensione bigint not null check (file_dimensione > 0),
  sostituito_il timestamptz not null default now()
);
select private.applica_regole_tabella('documenti_versioni');

create table public.collegamenti_documenti (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  documento_id  uuid not null references public.documenti (id) on delete cascade,
  voce          public.voce_collegata not null,
  voce_id       uuid not null,
  unique (documento_id, voce, voce_id)
);
create index collegamenti_documenti_voce on public.collegamenti_documenti (owner_id, voce, voce_id);
select private.applica_regole_tabella('collegamenti_documenti');

-- Registro delle azioni (FR-013): nessun contenuto, resta anche dopo l'eliminazione del documento
create table public.eventi_documenti (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  documento_id  uuid not null,
  azione        public.azione_documento not null,
  avvenuto_il   timestamptz not null default now()
);
create index eventi_documenti_documento on public.eventi_documenti (owner_id, documento_id);
select private.applica_regole_tabella('eventi_documenti');

-- Bucket privato dei documenti: <owner_id>/<documento_id>/<versione>-<nome>, solo il proprietario con aal2
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documenti', 'documenti', false, 20971520,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp',
              'text/xml', 'application/xml', 'application/pkcs7-mime'])
on conflict (id) do nothing;

create policy documenti_proprietario on storage.objects
  for all to authenticated
  using (
    bucket_id = 'documenti'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and private.accesso_completo_valido()
  )
  with check (
    bucket_id = 'documenti'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and private.accesso_completo_valido()
  );
