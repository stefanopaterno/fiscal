-- Specifica 004, FR-015 (T010): un anno chiuso è protetto dalle modifiche involontarie.
-- I dati dell'anno (CU, dati dell'anno, aliquote delle addizionali, spese e oneri pagati in quell'anno) non si
-- modificano finché l'anno è chiuso: per correggerli si riapre l'anno dalla Dichiarazione (conferma esplicita).
-- Chiusure e riaperture restano nel registro `eventi_anno`, senza contenuti. I versamenti non sono bloccati:
-- un saldo o un ravvedimento può arrivare dopo la chiusura.

create type public.azione_anno as enum ('chiuso', 'riaperto');

create table public.eventi_anno (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  anno          int  not null check (anno between 2000 and 2100),
  azione        public.azione_anno not null,
  avvenuto_il   timestamptz not null default now()
);
create index eventi_anno_anno on public.eventi_anno (owner_id, anno);
select private.applica_regole_tabella('eventi_anno');
revoke insert, update, delete on public.eventi_anno from authenticated;

create or replace function private.anno_chiuso(p_owner uuid, p_anno int)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.dichiarazioni d
                 where d.owner_id = p_owner and d.anno = p_anno and d.chiuso_il is not null);
$$;
grant execute on function private.anno_chiuso(uuid, int) to authenticated;

-- Registro di chiusure e riaperture (scritto dal database, l'utente lo legge soltanto)
create or replace function private.registra_chiusura_anno()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.chiuso_il is not null then
      insert into public.eventi_anno (owner_id, anno, azione) values (new.owner_id, new.anno, 'chiuso');
    end if;
  elsif new.chiuso_il is distinct from old.chiuso_il then
    insert into public.eventi_anno (owner_id, anno, azione)
    values (new.owner_id, new.anno, case when new.chiuso_il is null then 'riaperto' else 'chiuso' end::public.azione_anno);
  end if;
  return new;
end;
$$;
create trigger dichiarazioni_registra_chiusura after insert or update of chiuso_il on public.dichiarazioni
  for each row execute function private.registra_chiusura_anno();

-- Blocco delle modifiche: l'anno si ricava dalla colonna `anno` o dalla data del pagamento
create or replace function private.blocca_anno_chiuso()
returns trigger language plpgsql set search_path = '' as $$
declare
  riga jsonb := to_jsonb(coalesce(new, old));
  vecchia jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  anno_di constant text := tg_argv[0];
  a int;
  a_prima int;
begin
  -- amministrazione e cascate dell'account: nessun blocco (controllo in linea, senza funzioni dello schema
  -- privato, che i ruoli di servizio non possono usare)
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  -- in prova «Cancella i dati di prova» deve poter togliere tutto, anche negli anni chiusi
  if tg_op = 'DELETE' and private.in_prova(old.owner_id) then
    return old;
  end if;
  a := case when anno_di = 'anno' then (riga ->> 'anno')::int else extract(year from (riga ->> 'data')::date)::int end;
  a_prima := case when vecchia is null then null
                  when anno_di = 'anno' then (vecchia ->> 'anno')::int
                  else extract(year from (vecchia ->> 'data')::date)::int end;
  if private.anno_chiuso((riga ->> 'owner_id')::uuid, a)
     or (a_prima is not null and private.anno_chiuso((riga ->> 'owner_id')::uuid, a_prima)) then
    raise exception 'anno_chiuso' using errcode = 'P0001', detail = a::text;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger certificazioni_uniche_anno_chiuso before insert or update or delete on public.certificazioni_uniche
  for each row execute function private.blocca_anno_chiuso('anno');
create trigger dati_anno_anno_chiuso before insert or update or delete on public.dati_anno
  for each row execute function private.blocca_anno_chiuso('anno');
create trigger aliquote_addizionali_anno_chiuso before insert or update or delete on public.aliquote_addizionali
  for each row execute function private.blocca_anno_chiuso('anno');
create trigger spese_anno_chiuso before insert or update or delete on public.spese
  for each row execute function private.blocca_anno_chiuso('data');
create trigger oneri_personali_anno_chiuso before insert or update or delete on public.oneri_personali
  for each row execute function private.blocca_anno_chiuso('data');

-- Consensi (specifica 005): stesso controllo in linea del ruolo, così l'amministrazione può correggere i dati
create or replace function private.controlla_consenso()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if not exists (select 1 from public.clienti c where c.id = new.cliente_id and c.tipo = 'persona_fisica'
                 and c.owner_id = new.owner_id) then
    raise exception 'consenso_solo_pazienti' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then
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
