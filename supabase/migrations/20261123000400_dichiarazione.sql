-- Specifica 004: dati per la dichiarazione e scadenze.
-- dichiarazioni: una per anno (730 dell'anno di partenza o Modello Redditi), con il credito e il suo stato.
-- scadenze_utente: flag «fatta», proroghe e scadenze personali; checklist_anno: elementi segnati a mano.
-- Le date delle scadenze stanno nelle regole (src/engine/regole/scadenze/), non qui.
-- Regole di nuova_tabella.sql. Importi in centesimi. Nessun campo di note libere (test 007).

create type public.tipo_dichiarazione as enum ('730', 'redditi');
create type public.scelta_credito as enum ('compensazione', 'rimborso');
create type public.stato_credito as enum ('disponibile', 'richiesto', 'incassato', 'utilizzato');
create type public.stato_elemento_checklist as enum ('completato', 'non_applicabile');

create table public.dichiarazioni (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  anno          int  not null check (anno between 2000 and 2100),
  tipo          public.tipo_dichiarazione not null,
  -- dati del 730 (anno di partenza) o dell'esito del Modello Redditi
  imposta_netta       bigint check (imposta_netta >= 0),
  differenza          bigint,
  acconti_trattenuti  bigint check (acconti_trattenuti >= 0),
  credito             bigint not null default 0 check (credito >= 0),
  debito              bigint not null default 0 check (debito >= 0),
  rimborso_in_busta   boolean,
  -- credito residuo del Modello Redditi
  credito_scelta      public.scelta_credito,
  credito_stato       public.stato_credito,
  credito_usato       bigint not null default 0 check (credito_usato >= 0),
  credito_incassato_il date,
  chiuso_il           date,
  unique (owner_id, anno),
  check (credito_usato <= credito),
  check (credito_incassato_il is null or credito_stato = 'incassato')
);
select private.applica_regole_tabella('dichiarazioni');

create table public.scadenze_utente (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  anno          int  not null check (anno between 2000 and 2100),
  -- chiave della regola (es. saldo_acconto) o personale_<n> per le scadenze personali
  chiave        text not null check (chiave ~ '^[a-z0-9_]{2,60}$'),
  fatta_il      date,
  -- proroga di una scadenza delle regole, o data di una scadenza personale
  data          date,
  titolo        text check (length(trim(titolo)) between 1 and 80),
  esporta       boolean,
  unique (owner_id, anno, chiave),
  check (chiave not like 'personale\_%' or (data is not null and titolo is not null)),
  check (chiave like 'personale\_%' or titolo is null)
);
select private.applica_regole_tabella('scadenze_utente');

create table public.checklist_anno (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  anno          int  not null check (anno between 2000 and 2100),
  chiave        text not null check (chiave ~ '^[a-z0-9_]{2,40}$'),
  stato         public.stato_elemento_checklist not null,
  unique (owner_id, anno, chiave)
);
select private.applica_regole_tabella('checklist_anno');
