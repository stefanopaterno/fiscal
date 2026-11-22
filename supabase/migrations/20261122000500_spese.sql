-- Specifica 008: spese deducibili, beni durevoli, oneri personali e impostazioni (T005).
-- Modello: specs/008-spese-deducibili-consigli/data-model.md
-- Contratto: specs/008-spese-deducibili-consigli/contracts/database.md
-- Ogni tabella con le regole di nuova_tabella.sql (private.applica_regole_tabella della 003).
-- Importi in centesimi. I calcoli li fa il motore (src/engine/spese/). Nessun dato clinico.
-- Le spese NON sono dati di prova: cancella_dati_prova non le tocca.

create type public.modalita_pagamento as enum ('carta', 'bonifico', 'contanti', 'altro');

-- ---------------------------------------------------------------------------
-- Beni durevoli (registro)
-- ---------------------------------------------------------------------------
create table public.beni (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  descrizione   text not null check (length(trim(descrizione)) between 1 and 120),
  categoria     text not null check (categoria ~ '^[a-z_]{2,40}$'),
  costo         bigint not null check (costo > 0),
  data_acquisto date not null,
  coefficiente  numeric(5,4) check (coefficiente > 0 and coefficiente <= 1),
  motivazione   text check (length(motivazione) <= 300),
  data_dismissione date,
  valore_cessione  bigint check (valore_cessione >= 0),
  check (data_dismissione is null or data_dismissione >= data_acquisto),
  check (coefficiente is null or length(trim(coalesce(motivazione, ''))) > 0)
);
select private.applica_regole_tabella('beni');

-- ---------------------------------------------------------------------------
-- Spese professionali
-- ---------------------------------------------------------------------------
create table public.spese (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  data          date not null,
  importo       bigint not null check (importo > 0),
  iva_detraibile bigint not null default 0 check (iva_detraibile >= 0),
  fornitore     text check (length(fornitore) <= 120),
  descrizione   text check (length(descrizione) <= 200),
  categoria     text not null check (categoria ~ '^[a-z_0-9]{2,40}$'),
  percentuale   numeric(5,4) check (percentuale >= 0 and percentuale <= 1),
  motivazione   text check (length(motivazione) <= 300),
  modalita      public.modalita_pagamento not null default 'carta',
  tracciabile   boolean generated always as (modalita <> 'contanti') stored,
  ha_giustificativo boolean not null default false,
  rimborsata    boolean not null default false,
  bene_id       uuid references public.beni (id),
  check (iva_detraibile <= importo),
  check (percentuale is null or length(trim(coalesce(motivazione, ''))) > 0)
);
create index spese_data on public.spese (owner_id, data);
select private.applica_regole_tabella('spese');

-- ---------------------------------------------------------------------------
-- Oneri personali deducibili e detraibili
-- ---------------------------------------------------------------------------
create table public.oneri_personali (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  data          date not null,
  importo       bigint not null check (importo > 0),
  voce          text not null check (voce ~ '^[a-z_0-9]{2,40}$'),
  modalita      public.modalita_pagamento not null default 'bonifico',
  ha_giustificativo boolean not null default false
);
-- nessun testo libero: sulle spese sanitarie potrebbe finire un dato clinico (test 007)
create index oneri_personali_data on public.oneri_personali (owner_id, data);
select private.applica_regole_tabella('oneri_personali');

-- ---------------------------------------------------------------------------
-- Impostazioni delle spese (una riga per utente)
-- ---------------------------------------------------------------------------
create table public.impostazioni_spese (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  categorie_attive text[] not null default '{}',
  figli_a_carico int not null default 0 check (figli_a_carico between 0 and 10),
  accantonamento_coperto boolean not null default false,
  margine_ufficio  numeric(4,3) not null default 0.200 check (margine_ufficio >= 0 and margine_ufficio < 1),
  rapporto_ufficio numeric(4,3) not null default 0.150 check (rapporto_ufficio > 0 and rapporto_ufficio <= 1)
);
select private.applica_regole_tabella('impostazioni_spese');

-- ---------------------------------------------------------------------------
-- Previdenza complementare versata tramite il datore (CU), per il residuo del limite
-- ---------------------------------------------------------------------------
alter table public.certificazioni_uniche
  add column previdenza_complementare bigint check (previdenza_complementare >= 0);

-- ---------------------------------------------------------------------------
-- Giustificativi: bucket privato, percorso <owner_id>/<id>, solo il proprietario con aal2
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('giustificativi', 'giustificativi', false, 10485760,
        array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy giustificativi_proprietario on storage.objects
  for all to authenticated
  using (
    bucket_id = 'giustificativi'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and private.accesso_completo_valido()
  )
  with check (
    bucket_id = 'giustificativi'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and private.accesso_completo_valido()
  );
