-- Specifica 009: prospetto per il commercialista.
-- pacchetti: storico dei pacchetti generati (il file e la password NON si salvano: la password la mostra l'app una
-- volta sola); richieste_commercialista: domande e richieste con lo stato; modelli_pacchetto: sezioni preferite.
-- Regole di nuova_tabella.sql. Importi in centesimi. Nessun dato clinico.

create type public.stato_richiesta as enum ('aperta', 'chiusa');

create table public.pacchetti (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  periodo_da    date not null,
  periodo_a     date not null,
  sezioni       text[] not null check (cardinality(sezioni) between 1 and 20),
  usa_codici    boolean not null default false,
  allegati      int not null default 0 check (allegati >= 0),
  destinatario  text check (length(trim(destinatario)) between 1 and 80),
  avvisi        int not null default 0 check (avvisi >= 0),
  regole        text not null check (length(regole) <= 120),
  totali        jsonb not null default '{}' check (jsonb_typeof(totali) = 'object'),
  check (periodo_a >= periodo_da)
);
create index pacchetti_creato on public.pacchetti (owner_id, creato_il);
select private.applica_regole_tabella('pacchetti');

create table public.richieste_commercialista (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  data          date not null,
  -- la richiesta del commercialista (per esempio «manca la ricevuta ENPAP di ottobre»): niente dati dei pazienti
  testo         text not null check (length(trim(testo)) between 1 and 300),
  stato         public.stato_richiesta not null default 'aperta',
  chiusa_il     date,
  pacchetto_id  uuid references public.pacchetti (id) on delete set null,
  check ((stato = 'chiusa') = (chiusa_il is not null))
);
select private.applica_regole_tabella('richieste_commercialista');

create table public.modelli_pacchetto (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  nome          text not null check (length(trim(nome)) between 1 and 40),
  sezioni       text[] not null check (cardinality(sezioni) between 1 and 20),
  usa_codici    boolean not null default false,
  allegati      boolean not null default false,
  unique (owner_id, nome)
);
select private.applica_regole_tabella('modelli_pacchetto');
