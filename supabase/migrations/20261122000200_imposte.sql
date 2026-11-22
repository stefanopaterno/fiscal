-- Specifica 001: dati per il motore IRPEF (T008).
-- Modello: specs/001-motore-irpef-cumulo/data-model.md
-- Contratto: specs/001-motore-irpef-cumulo/contracts/database.md
-- Ogni tabella con le regole di nuova_tabella.sql (private.applica_regole_tabella della 003).
-- Importi in centesimi. Nessun calcolo nel database: i calcoli li fa il motore (src/engine/irpef/).
-- Le aliquote delle addizionali dipendono dalla residenza: sono dati personali e stanno solo qui.

create type public.tipo_contributo as enum ('soggettivo', 'integrativo', 'maternita');
create type public.cassa_previdenza as enum ('enpap', 'gestione_separata');
create type public.voce_imposta as enum (
  'irpef_acconto_1', 'irpef_acconto_2', 'irpef_saldo',
  'add_regionale', 'add_comunale_saldo', 'add_comunale_acconto');

-- Scaglioni regionali validi: [{ "fino_a": centesimi | null, "aliquota": 0.0123 }, ...],
-- almeno uno, limiti crescenti, ultimo senza limite, aliquote tra 0 e 5%.
create or replace function private.scaglioni_validi(s jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  n int;
  prec numeric := 0;
  el jsonb;
  i int := 0;
begin
  if s is null or jsonb_typeof(s) <> 'array' then return false; end if;
  n := jsonb_array_length(s);
  if n = 0 then return false; end if;
  for el in select value from jsonb_array_elements(s) loop
    i := i + 1;
    if jsonb_typeof(el -> 'aliquota') <> 'number'
       or (el ->> 'aliquota')::numeric < 0 or (el ->> 'aliquota')::numeric > 0.05 then
      return false;
    end if;
    if i < n then
      if jsonb_typeof(el -> 'fino_a') <> 'number' or (el ->> 'fino_a')::numeric <= prec then return false; end if;
      prec := (el ->> 'fino_a')::numeric;
    elsif coalesce(jsonb_typeof(el -> 'fino_a'), 'null') <> 'null' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;
grant execute on function private.scaglioni_validi(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Certificazioni Uniche (una o più per anno)
-- ---------------------------------------------------------------------------
create table public.certificazioni_uniche (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  anno          int  not null check (anno between 2000 and 2100),
  sostituto     text check (length(sostituto) <= 120),
  reddito_lavoro                bigint not null default 0 check (reddito_lavoro >= 0),
  giorni_lavoro                 int    not null default 365 check (giorni_lavoro between 1 and 365),
  ritenute_irpef                bigint not null default 0 check (ritenute_irpef >= 0),
  addizionale_regionale         bigint not null default 0 check (addizionale_regionale >= 0),
  addizionale_comunale_acconto  bigint not null default 0 check (addizionale_comunale_acconto >= 0),
  addizionale_comunale_saldo    bigint not null default 0 check (addizionale_comunale_saldo >= 0),
  addizionale_comunale_acconto_anno_dopo bigint check (addizionale_comunale_acconto_anno_dopo >= 0),
  detrazioni_lavoro_fruite      bigint check (detrazioni_lavoro_fruite >= 0),
  detrazioni_familiari_fruite   bigint check (detrazioni_familiari_fruite >= 0),
  contributi_previdenziali      bigint check (contributi_previdenziali >= 0)
);
create index certificazioni_uniche_anno on public.certificazioni_uniche (owner_id, anno);
select private.applica_regole_tabella('certificazioni_uniche');

-- ---------------------------------------------------------------------------
-- Dati dell'anno (una riga per anno)
-- ---------------------------------------------------------------------------
create table public.dati_anno (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  anno          int  not null check (anno between 2000 and 2100),
  spese_professionali           bigint not null default 0 check (spese_professionali >= 0),
  reddito_professionale_manuale bigint,
  altre_detrazioni              bigint not null default 0 check (altre_detrazioni >= 0),
  oneri_deducibili              bigint not null default 0 check (oneri_deducibili >= 0),
  soggetto_isa                  boolean not null default false,
  reddito_atteso                bigint check (reddito_atteso >= 0),
  anno_concluso                 boolean not null default false,
  unique (owner_id, anno)
);
select private.applica_regole_tabella('dati_anno');

-- ---------------------------------------------------------------------------
-- Aliquote delle addizionali (per anno, dati di residenza)
-- ---------------------------------------------------------------------------
create table public.aliquote_addizionali (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  anno          int  not null check (anno between 2000 and 2100),
  regionale_scaglioni       jsonb not null check (private.scaglioni_validi(regionale_scaglioni)),
  comunale_aliquota         numeric(6,5) not null default 0 check (comunale_aliquota between 0 and 0.009),
  comunale_soglia_esenzione bigint check (comunale_soglia_esenzione >= 0),
  verificate                boolean not null default false,
  unique (owner_id, anno)
);
select private.applica_regole_tabella('aliquote_addizionali');

-- ---------------------------------------------------------------------------
-- Versamenti previdenziali (deducibili nell'anno della data, integrativo mai)
-- ---------------------------------------------------------------------------
create table public.versamenti_previdenza (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  data          date not null,
  importo       bigint not null check (importo > 0),
  tipo          public.tipo_contributo not null,
  cassa         public.cassa_previdenza not null default 'enpap',
  anno_reddito  int  not null check (anno_reddito between 2000 and 2100)
);
create index versamenti_previdenza_data on public.versamenti_previdenza (owner_id, data);
select private.applica_regole_tabella('versamenti_previdenza');

-- ---------------------------------------------------------------------------
-- Versamenti di imposte (acconti e saldi realmente pagati)
-- ---------------------------------------------------------------------------
create table public.versamenti_imposte (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  data          date not null,
  anno_imposta  int  not null check (anno_imposta between 2000 and 2100),
  voce          public.voce_imposta not null,
  importo       bigint not null check (importo > 0)
);
create index versamenti_imposte_anno on public.versamenti_imposte (owner_id, anno_imposta);
select private.applica_regole_tabella('versamenti_imposte');
