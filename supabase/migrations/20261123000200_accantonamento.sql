-- Specifica 007: accantonamento consigliato (T004).
-- Modello: specs/007-accantonamento-consigliato/data-model.md
-- Ogni tabella con le regole di nuova_tabella.sql (private.applica_regole_tabella della 003).
-- Importi in centesimi. Scadenze, fabbisogno e quote li calcola il motore (src/engine/accantonamento/).
-- Nessun testo libero: niente dati clinici.

create type public.tipo_movimento_salvadanaio as enum ('accantonamento', 'scadenza_pagata', 'rettifica', 'interessi');
create type public.metodo_accantonamento as enum ('marginale', 'media');

-- ---------------------------------------------------------------------------
-- Salvadanaio: movimenti (positivo = messo da parte, negativo = prelevato)
-- ---------------------------------------------------------------------------
create table public.salvadanaio (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  data          date not null,
  importo       bigint not null check (importo <> 0),
  tipo          public.tipo_movimento_salvadanaio not null,
  -- l'accantonamento di un incasso chiude il suo promemoria; se l'incasso si cancella (anche con i dati
  -- di prova) sparisce anche il movimento collegato
  incasso_id    uuid unique references public.incassi (id) on delete cascade,
  rimandato     boolean not null default false,
  check (incasso_id is null or tipo = 'accantonamento'),
  check (tipo <> 'accantonamento' or importo > 0 or incasso_id is not null),
  check (tipo <> 'scadenza_pagata' or importo < 0)
);
create index salvadanaio_data on public.salvadanaio (owner_id, data);
select private.applica_regole_tabella('salvadanaio');

-- ---------------------------------------------------------------------------
-- Impostazioni dell'accantonamento (una riga per utente)
-- ---------------------------------------------------------------------------
create table public.impostazioni_accantonamento (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  margine       numeric(4,3) not null default 0.100 check (margine >= 0 and margine <= 0.5),
  metodo        public.metodo_accantonamento not null default 'marginale',
  avvisi        boolean not null default true,
  tasso_lordo   numeric(5,4) check (tasso_lordo >= 0 and tasso_lordo <= 0.2),
  vincolato_fino date,
  percentuale_mese jsonb check (percentuale_mese is null or jsonb_typeof(percentuale_mese) = 'object')
);
select private.applica_regole_tabella('impostazioni_accantonamento');
