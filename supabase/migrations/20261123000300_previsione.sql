-- Specifica 006: previsione mensile delle tasse.
-- Ipotesi per anno (metodo, obiettivo, pesi dei mesi, scenari) e fotografie della previsione a fine mese.
-- Regole di nuova_tabella.sql (private.applica_regole_tabella della 003). Importi in centesimi.
-- I calcoli li fa il motore (src/engine/previsione/). Nessun testo libero: niente dati clinici.

create type public.metodo_previsione as enum ('andamento', 'stagionalita', 'impegni', 'obiettivo');

create table public.ipotesi_previsione (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  anno          int  not null check (anno between 2000 and 2100),
  metodo        public.metodo_previsione,
  obiettivo     bigint check (obiettivo > 0),
  pesi          numeric(4,3)[] not null default array_fill(1::numeric, array[12])
                check (array_length(pesi, 1) = 12 and 0 <= all (pesi) and 1 >= all (pesi)),
  prudente      numeric(4,3) not null default 0.200 check (prudente >= 0 and prudente <= 0.9),
  ottimistico   numeric(4,3) not null default 0.200 check (ottimistico >= 0 and ottimistico <= 2),
  unique (owner_id, anno)
);
select private.applica_regole_tabella('ipotesi_previsione');

create table public.previsioni_salvate (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  anno          int  not null check (anno between 2000 and 2100),
  mese          text not null check (mese ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  metodo        public.metodo_previsione,
  compensi_reali    bigint not null check (compensi_reali >= 0),
  compensi_previsti bigint not null check (compensi_previsti >= 0),
  reddito       bigint not null,
  imposte       bigint not null check (imposte >= 0),
  contributi    bigint not null check (contributi >= 0),
  totale        bigint not null check (totale >= 0),
  aliquota_marginale numeric(4,3) not null check (aliquota_marginale >= 0 and aliquota_marginale < 1),
  unique (owner_id, anno, mese)
);
create index previsioni_salvate_anno on public.previsioni_salvate (owner_id, anno);
select private.applica_regole_tabella('previsioni_salvate');
