-- Specifica 014: aggiornamento dei parametri fiscali da file (data-model.md).
-- Il programma resta la base; qui stanno solo le variazioni approvate dall'utente, con decorrenza, fonte e stato,
-- in un registro a sola aggiunta: un annullamento è una nuova riga, mai una modifica. Anni chiusi protetti.
-- Le regole di immutabilità valgono per l'utente dell'app: i ruoli di servizio (cancellazione dell'account a
-- cascata, amministrazione) escono subito dai trigger senza toccare lo schema private (vedi 20261124000600).

create type public.azione_parametro as enum ('approvato', 'annullato');

-- ---------------------------------------------------------------------------
-- 1) Importazioni (un file importato e approvato, anche solo in parte)
-- ---------------------------------------------------------------------------
create table public.importazioni_parametri (
  id              uuid primary key,
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione        int  not null default 1,
  creato_il       timestamptz not null default now(),
  aggiornato_il   timestamptz not null default now(),
  data_ricerca    date not null,
  versione_schema int  not null check (versione_schema = 1),
  anni            int[] not null check (cardinality(anni) between 1 and 10),
  conteggi        jsonb not null default '{}'::jsonb check (jsonb_typeof(conteggi) = 'object'),
  modifiche_programma jsonb not null default '[]'::jsonb
    check (jsonb_typeof(modifiche_programma) = 'array' and jsonb_array_length(modifiche_programma) <= 50)
);
select private.applica_regole_tabella('importazioni_parametri');
create index importazioni_parametri_owner on public.importazioni_parametri (owner_id, creato_il desc);

-- Solo lo stato delle modifiche al programma cambia (aperta → fatta / non_riguarda); niente cancellazioni
-- fuori dalla modalità prova.
create or replace function private.importazioni_parametri_immutabili()
returns trigger language plpgsql set search_path = '' as $$
declare
  vecchie jsonb;
  nuove jsonb;
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    if not private.in_prova(old.owner_id) then
      raise exception 'registro_parametri' using errcode = 'P0001',
        detail = 'Le importazioni dei parametri non si cancellano.';
    end if;
    return old;
  end if;
  -- stesse modifiche, a parte lo stato
  select coalesce(jsonb_agg(m - 'stato' order by o), '[]'::jsonb) into vecchie
    from jsonb_array_elements(old.modifiche_programma) with ordinality as e(m, o);
  select coalesce(jsonb_agg(m - 'stato' order by o), '[]'::jsonb) into nuove
    from jsonb_array_elements(new.modifiche_programma) with ordinality as e(m, o);
  if vecchie is distinct from nuove
     or (to_jsonb(new) - array['versione', 'aggiornato_il', 'modifiche_programma'])
        is distinct from (to_jsonb(old) - array['versione', 'aggiornato_il', 'modifiche_programma'])
     or exists (select 1 from jsonb_array_elements(new.modifiche_programma) m
                where coalesce(m ->> 'stato', 'aperta') not in ('aperta', 'fatta', 'non_riguarda')) then
    raise exception 'registro_parametri' using errcode = 'P0001',
      detail = 'Di un''importazione cambia solo lo stato delle modifiche al programma.';
  end if;
  return new;
end;
$$;
create trigger importazioni_parametri_immutabili before update or delete on public.importazioni_parametri
  for each row execute function private.importazioni_parametri_immutabili();

-- ---------------------------------------------------------------------------
-- 2) Registro degli aggiornamenti (sola aggiunta)
-- ---------------------------------------------------------------------------
create table public.aggiornamenti_parametri (
  id                uuid primary key,
  owner_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione          int  not null default 1,
  creato_il         timestamptz not null default now(),
  aggiornato_il     timestamptz not null default now(),
  importazione_id   uuid references public.importazioni_parametri (id) on delete cascade,
  azione            public.azione_parametro not null,
  annulla_id        uuid references public.aggiornamenti_parametri (id) on delete cascade,
  chiave            text not null check (chiave ~ '^[a-z0-9_.]{3,120}$'),
  anno              int check (anno between 2000 and 2100),
  dal               date check (dal between date '2000-01-01' and date '2100-12-31'),
  valore            jsonb,
  valore_precedente jsonb,
  fonte             jsonb check (fonte is null or (jsonb_typeof(fonte) = 'object'
                      and length(fonte ->> 'titolo') between 1 and 200
                      and (fonte ->> 'url') ~ '^https://' and length(fonte ->> 'url') <= 500)),
  stato             text not null check (stato in ('verificata', 'da_verificare')),
  stato_norma       text not null check (stato_norma in ('in_vigore', 'approvata_non_pubblicata', 'proposta')),
  -- cosa cambia, in parole semplici (testo normativo pubblico, mai dati clinici)
  spiegazione       text check (length(spiegazione) <= 500),
  -- esattamente uno tra anno e dal
  check ((anno is null) <> (dal is null)),
  -- un annullamento indica la riga annullata e non porta valori; un'approvazione porta valore e fonte
  check ((azione = 'annullato') = (annulla_id is not null)),
  check (azione = 'annullato' or (valore is not null and fonte is not null))
);
select private.applica_regole_tabella('aggiornamenti_parametri');
create index aggiornamenti_parametri_owner_chiave on public.aggiornamenti_parametri (owner_id, chiave);
-- una riga si annulla una volta sola
create unique index aggiornamenti_parametri_annulla_unico on public.aggiornamenti_parametri (annulla_id)
  where annulla_id is not null;

create or replace function private.aggiornamenti_parametri_regole()
returns trigger language plpgsql set search_path = '' as $$
declare
  annata int;
  annullata public.aggiornamenti_parametri;
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'registro_parametri' using errcode = 'P0001',
      detail = 'Il registro dei parametri non si modifica: per tornare indietro annulla l''aggiornamento.';
  end if;
  if tg_op = 'DELETE' then
    if not private.in_prova(old.owner_id) then
      raise exception 'registro_parametri' using errcode = 'P0001',
        detail = 'Il registro dei parametri non si cancella: per tornare indietro annulla l''aggiornamento.';
    end if;
    return old;
  end if;
  -- INSERT
  if new.azione = 'annullato' then
    select * into annullata from public.aggiornamenti_parametri a
      where a.id = new.annulla_id and a.owner_id = new.owner_id;
    if annullata.id is null or annullata.azione <> 'approvato' then
      raise exception 'registro_parametri' using errcode = 'P0001',
        detail = 'Si può annullare solo un aggiornamento approvato.';
    end if;
    if annullata.chiave <> new.chiave
       or annullata.anno is distinct from new.anno or annullata.dal is distinct from new.dal then
      raise exception 'registro_parametri' using errcode = 'P0001',
        detail = 'L''annullamento deve riguardare lo stesso parametro e la stessa decorrenza.';
    end if;
  end if;
  annata := coalesce(new.anno, extract(year from new.dal)::int);
  if private.anno_chiuso(new.owner_id, annata) then
    raise exception 'anno_chiuso' using errcode = 'P0001',
      detail = format('Il %s è chiuso: i suoi parametri non cambiano. Riapri l''anno dalla Dichiarazione se una norma retroattiva lo richiede.', annata);
  end if;
  return new;
end;
$$;
create trigger aggiornamenti_parametri_regole before insert or update or delete on public.aggiornamenti_parametri
  for each row execute function private.aggiornamenti_parametri_regole();

-- ---------------------------------------------------------------------------
-- 3) Approvazione in una sola transazione: importazione, righe e addizionali
-- ---------------------------------------------------------------------------
-- p_importazione: { id, data_ricerca, versione_schema, anni, conteggi, modifiche_programma }
-- p_righe: [{ id, chiave, anno, dal, valore, valore_precedente, fonte, stato, stato_norma, spiegazione }]
-- p_addizionali: [{ anno, regionale_scaglioni?, comunale_aliquota?, comunale_soglia_esenzione?, verificate }]
create or replace function public.approva_parametri(p_importazione jsonb, p_righe jsonb, p_addizionali jsonb)
returns int language plpgsql security invoker set search_path = '' as $$
declare
  r jsonb;
  a jsonb;
  n int := 0;
  esistente public.aliquote_addizionali;
begin
  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) > 200
     or (jsonb_array_length(p_righe) = 0
         and jsonb_array_length(coalesce(p_importazione -> 'modifiche_programma', '[]'::jsonb)) = 0) then
    raise exception 'registro_parametri' using errcode = 'P0001', detail = 'Nessuna voce da approvare.';
  end if;
  insert into public.importazioni_parametri (id, data_ricerca, versione_schema, anni, conteggi, modifiche_programma)
  values (
    (p_importazione ->> 'id')::uuid,
    (p_importazione ->> 'data_ricerca')::date,
    (p_importazione ->> 'versione_schema')::int,
    array(select jsonb_array_elements_text(p_importazione -> 'anni')::int),
    coalesce(p_importazione -> 'conteggi', '{}'::jsonb),
    coalesce(p_importazione -> 'modifiche_programma', '[]'::jsonb)
  );
  for r in select value from jsonb_array_elements(p_righe) loop
    insert into public.aggiornamenti_parametri
      (id, importazione_id, azione, chiave, anno, dal, valore, valore_precedente, fonte, stato, stato_norma, spiegazione)
    values (
      (r ->> 'id')::uuid, (p_importazione ->> 'id')::uuid, 'approvato', r ->> 'chiave',
      (r ->> 'anno')::int, (r ->> 'dal')::date, r -> 'valore', r -> 'valore_precedente', r -> 'fonte',
      r ->> 'stato', r ->> 'stato_norma', r ->> 'spiegazione'
    );
    n := n + 1;
  end loop;
  for a in select value from jsonb_array_elements(coalesce(p_addizionali, '[]'::jsonb)) loop
    select * into esistente from public.aliquote_addizionali x
      where x.owner_id = auth.uid() and x.anno = (a ->> 'anno')::int;
    if esistente.id is null then
      insert into public.aliquote_addizionali (id, anno, regionale_scaglioni, comunale_aliquota, comunale_soglia_esenzione, verificate)
      values (
        gen_random_uuid(), (a ->> 'anno')::int,
        coalesce(a -> 'regionale_scaglioni', '[{"fino_a": null, "aliquota": 0}]'::jsonb),
        coalesce((a ->> 'comunale_aliquota')::numeric, 0),
        (a ->> 'comunale_soglia_esenzione')::bigint,
        coalesce((a ->> 'verificate')::boolean, false)
      );
    else
      update public.aliquote_addizionali x set
        regionale_scaglioni = coalesce(a -> 'regionale_scaglioni', x.regionale_scaglioni),
        comunale_aliquota = case when a ? 'comunale_aliquota' then (a ->> 'comunale_aliquota')::numeric else x.comunale_aliquota end,
        comunale_soglia_esenzione = case when a ? 'comunale_soglia_esenzione' then (a ->> 'comunale_soglia_esenzione')::bigint else x.comunale_soglia_esenzione end,
        verificate = coalesce((a ->> 'verificate')::boolean, x.verificate)
      where x.id = esistente.id;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.approva_parametri(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.approva_parametri(jsonb, jsonb, jsonb) to authenticated;

-- Annullamento: nuova riga del registro, e per le addizionali ripristino del valore precedente.
create or replace function public.annulla_parametro(p_id uuid, p_riga uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  o public.aggiornamenti_parametri;
begin
  select * into o from public.aggiornamenti_parametri a where a.id = p_riga and a.owner_id = auth.uid();
  if o.id is null then
    raise exception 'registro_parametri' using errcode = 'P0001', detail = 'Aggiornamento non trovato.';
  end if;
  insert into public.aggiornamenti_parametri (id, importazione_id, azione, annulla_id, chiave, anno, dal, valore_precedente, fonte, stato, stato_norma)
  values (p_id, o.importazione_id, 'annullato', o.id, o.chiave, o.anno, o.dal, o.valore, o.fonte, o.stato, o.stato_norma);
  if o.chiave like 'addizionali.%' and o.valore_precedente is not null then
    update public.aliquote_addizionali x set
      regionale_scaglioni = case when o.chiave = 'addizionali.regionale.scaglioni' then o.valore_precedente else x.regionale_scaglioni end,
      comunale_aliquota = case when o.chiave = 'addizionali.comunale.aliquota' then (o.valore_precedente #>> '{}')::numeric else x.comunale_aliquota end,
      comunale_soglia_esenzione = case when o.chiave = 'addizionali.comunale.soglia_esenzione' then (o.valore_precedente #>> '{}')::bigint else x.comunale_soglia_esenzione end
    where x.owner_id = auth.uid() and x.anno = o.anno;
  end if;
end;
$$;
revoke all on function public.annulla_parametro(uuid, uuid) from public, anon;
grant execute on function public.annulla_parametro(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Modalità prova: anche il registro dei parametri si cancella con il resto della prova
-- ---------------------------------------------------------------------------
create or replace function public.cancella_dati_prova(p_anagrafiche boolean)
returns table (fatture int, incassi int, anagrafiche int)
language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_column
declare
  n_fatture int;
  n_incassi int;
  n_anagrafiche int := 0;
  n int;
begin
  perform private.richiedi_prova();
  perform set_config('fiscal.operazione', 'cancella_prova', true);
  delete from public.incassi where owner_id = auth.uid();
  get diagnostics n_incassi = row_count;
  delete from public.fatture where owner_id = auth.uid() and fattura_rif_id is not null;
  get diagnostics n_fatture = row_count;
  delete from public.fatture where owner_id = auth.uid();
  get diagnostics n = row_count;
  n_fatture := n_fatture + n;
  if p_anagrafiche then
    delete from public.clienti where owner_id = auth.uid();
    get diagnostics n = row_count;
    n_anagrafiche := n;
    delete from public.attivita where owner_id = auth.uid();
    get diagnostics n = row_count;
    n_anagrafiche := n_anagrafiche + n;
    delete from public.profilo_professionale where owner_id = auth.uid();
  end if;
  n_anagrafiche := n_anagrafiche + private.cancella_dati_esempio();
  -- specifica 014: registro dei parametri della prova
  delete from public.aggiornamenti_parametri where owner_id = auth.uid() and annulla_id is not null;
  delete from public.aggiornamenti_parametri where owner_id = auth.uid();
  delete from public.importazioni_parametri where owner_id = auth.uid();
  perform set_config('fiscal.operazione', '', true);
  return query select n_fatture, n_incassi, n_anagrafiche;
end;
$$;
