-- Specifica 003, FR-027..FR-030: modalità prova e passaggio irreversibile alla produzione.
-- - Ogni account parte in prova: le fatture si possono cancellare (anche emesse), la data di inizio attività
--   non è controllata e ogni fattura emessa è segnata "prova" (sul documento: senza valore fiscale).
-- - passa_a_produzione() cancella le prove e chiude la modalità prova per sempre: lo impedisce un trigger,
--   anche all'amministratore. Servono la parola PRODUZIONE e password+codice inseriti da meno di 5 minuti.

alter table public.user_security
  add column in_prova boolean not null default true,
  add column produzione_dal timestamptz;

grant select (in_prova, produzione_dal) on public.user_security to authenticated;

create or replace function private.produzione_irreversibile()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.in_prova = false and new.in_prova = true then
    raise exception 'produzione_irreversibile' using errcode = 'P0001',
      detail = 'Il passaggio alla produzione non si può annullare.';
  end if;
  if old.produzione_dal is not null and new.produzione_dal is distinct from old.produzione_dal then
    raise exception 'produzione_irreversibile' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger user_security_produzione_irreversibile before update on public.user_security
  for each row execute function private.produzione_irreversibile();

-- Vero se l'utente è in prova (per chi non ha la riga, prudenza: produzione)
create or replace function private.in_prova(p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select us.in_prova from public.user_security us where us.owner_id = p_owner), false);
$$;
revoke all on function private.in_prova(uuid) from public, anon;
grant execute on function private.in_prova(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Immutabilità: in prova le fatture emesse si possono cancellare
-- ---------------------------------------------------------------------------
create or replace function private.fatture_immutabili()
returns trigger language plpgsql set search_path = '' as $$
declare
  -- anno è calcolato dalla data: nei trigger "before" non è ancora valorizzato (la data resta confrontata)
  liberi text[] := array['versione', 'aggiornato_il', 'stato_sts', 'anno'];
begin
  if not private.da_utente() then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    if old.stato <> 'bozza' and not private.in_prova(old.owner_id) then
      raise exception 'fattura_immutabile' using errcode = 'P0001',
        detail = 'Una fattura emessa non si cancella: si annulla con una nota di credito.';
    end if;
    return old;
  end if;
  if old.stato = 'bozza' then
    if new.stato <> 'bozza' and private.operazione() <> 'emissione' then
      raise exception 'fattura_immutabile' using errcode = 'P0001',
        detail = 'Una bozza diventa fattura solo con il comando Emetti.';
    end if;
    return new;
  end if;
  if old.stato = 'emessa' and new.stato = 'annullata' and private.operazione() = 'nota_credito' then
    liberi := liberi || array['stato'];
  end if;
  if (to_jsonb(new) - liberi) is distinct from (to_jsonb(old) - liberi) then
    raise exception 'fattura_immutabile' using errcode = 'P0001',
      detail = 'Una fattura emessa non si modifica: si corregge con nota di credito e nuova fattura.';
  end if;
  return new;
end;
$$;

create or replace function private.righe_immutabili()
returns trigger language plpgsql set search_path = '' as $$
declare
  stato_padre public.stato_fattura;
begin
  if not private.da_utente() or private.operazione() in ('nota_credito', 'cancella_prova') then
    return coalesce(new, old);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    select f.stato into stato_padre from public.fatture f where f.id = old.fattura_id;
    if stato_padre is not null and stato_padre <> 'bozza' then
      raise exception 'fattura_immutabile' using errcode = 'P0001',
        detail = 'Le righe di una fattura emessa non si modificano.';
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select f.stato into stato_padre from public.fatture f where f.id = new.fattura_id;
    if stato_padre is not null and stato_padre <> 'bozza' then
      raise exception 'fattura_immutabile' using errcode = 'P0001',
        detail = 'Non si aggiungono righe a una fattura emessa.';
    end if;
    return new;
  end if;
  return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- Emissione: in prova niente controllo sull'inizio attività, fattura segnata "prova"
-- ---------------------------------------------------------------------------
create or replace function public.emetti_fattura(p_id uuid)
returns table (anno int, numero int)
language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_column
declare
  f public.fatture;
  p public.profilo_professionale;
  c public.clienti;
  a public.attivita;
  prossimo int;
  ultima date;
  somma_compensi bigint;
  righe int;
  sts public.stato_sts;
  prova boolean;
begin
  select * into f from public.fatture where id = p_id for update;
  if f.id is null or f.stato <> 'bozza' then
    raise exception 'non_bozza' using errcode = 'P0001', detail = 'Si emettono solo le bozze.';
  end if;
  prova := private.in_prova(f.owner_id);

  select * into p from public.profilo_professionale where owner_id = f.owner_id;
  if p.id is null or coalesce(trim(p.nome), '') = '' or coalesce(trim(p.cognome), '') = ''
     or p.codice_fiscale is null or p.partita_iva is null or p.inizio_attivita is null
     or coalesce(trim(p.indirizzo), '') = '' or p.cap is null or coalesce(trim(p.comune), '') = ''
     or p.provincia is null then
    raise exception 'configurazione_incompleta' using errcode = 'P0001',
      detail = 'Completa la configurazione della partita IVA prima di emettere.';
  end if;
  if f.data < p.inizio_attivita and not prova then
    raise exception 'data_anteriore_inizio' using errcode = 'P0001',
      detail = format('La data non può essere prima dell''inizio attività (%s).', p.inizio_attivita);
  end if;

  select count(*), coalesce(sum(r.compenso * r.quantita), 0) into righe, somma_compensi
    from public.righe_fattura r where r.fattura_id = p_id;
  if righe = 0 then
    raise exception 'fattura_vuota' using errcode = 'P0001', detail = 'Aggiungi almeno una prestazione.';
  end if;
  if somma_compensi <> f.totale_compensi then
    raise exception 'totali_incoerenti' using errcode = 'P0001',
      detail = 'I totali non corrispondono alle righe: ricalcola la fattura.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(f.owner_id::text || ':' || f.anno::text, 0));
  select coalesce(max(x.numero), 0) + 1, max(x.data) into prossimo, ultima
    from public.fatture x where x.owner_id = f.owner_id and x.anno = f.anno and x.numero is not null;
  if ultima is not null and f.data < ultima then
    raise exception 'data_anteriore_ultima' using errcode = 'P0001',
      detail = format('L''ultima fattura emessa è del %s: la numerazione segue l''ordine delle date.', ultima);
  end if;

  select * into c from public.clienti where id = f.cliente_id;
  select * into a from public.attivita where id = f.attivita_id;

  if f.tipo = 'nota_credito' then
    select case when x.stato_sts = 'non_dovuto' then 'non_dovuto' else 'da_inviare' end::public.stato_sts
      into sts from public.fatture x where x.id = f.fattura_rif_id;
  elsif c.tipo = 'persona_fisica' and not c.opposizione_sts
        and exists (select 1 from public.righe_fattura r where r.fattura_id = p_id and r.natura = 'esente_sanitaria') then
    sts := 'da_inviare';
  else
    sts := 'non_dovuto';
  end if;

  perform set_config('fiscal.operazione', 'emissione', true);
  update public.fatture x set
    stato = 'emessa',
    numero = prossimo,
    stato_sts = sts,
    fotografia = x.fotografia || jsonb_build_object(
      'professionista', to_jsonb(p) - array['id', 'owner_id', 'versione', 'creato_il', 'aggiornato_il'],
      'cliente', to_jsonb(c) - array['id', 'owner_id', 'versione', 'creato_il', 'aggiornato_il'],
      'attivita', to_jsonb(a) - array['id', 'owner_id', 'versione', 'creato_il', 'aggiornato_il'],
      'emessa_il', now(),
      'prova', prova)
  where x.id = p_id;
  perform set_config('fiscal.operazione', '', true);

  return query select f.anno, prossimo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancellazioni in prova
-- ---------------------------------------------------------------------------
create or replace function private.richiedi_prova()
returns void language plpgsql stable set search_path = '' as $$
begin
  if not private.in_prova(auth.uid()) then
    raise exception 'non_in_prova' using errcode = 'P0001',
      detail = 'Sei in produzione: le fatture emesse non si cancellano più.';
  end if;
end;
$$;
grant execute on function private.richiedi_prova() to authenticated;

-- Una fattura di prova con i suoi incassi e le note di credito collegate (sicurezza dell'invocante)
create or replace function public.elimina_fattura_prova(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.richiedi_prova();
  perform set_config('fiscal.operazione', 'cancella_prova', true);
  delete from public.incassi where fattura_id = p_id
     or fattura_id in (select id from public.fatture where fattura_rif_id = p_id);
  delete from public.fatture where fattura_rif_id = p_id;
  delete from public.fatture where id = p_id;
  perform set_config('fiscal.operazione', '', true);
end;
$$;

-- Tutte le fatture e gli incassi; con p_anagrafiche anche clienti, attività e profilo
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
  perform set_config('fiscal.operazione', '', true);
  return query select n_fatture, n_incassi, n_anagrafiche;
end;
$$;

-- Imposta la produzione (solo dalla funzione pubblica qui sotto)
create or replace function private.imposta_produzione()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.user_security set in_prova = false, produzione_dal = now()
  where owner_id = auth.uid() and in_prova;
  if found then
    perform private.registra_evento(auth.uid(), 'passaggio_produzione');
  end if;
end;
$$;
revoke all on function private.imposta_produzione() from public, anon;
grant execute on function private.imposta_produzione() to authenticated;

create or replace function public.passa_a_produzione(p_conferma text, p_tieni_anagrafiche boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  ultimo_codice bigint;
begin
  perform private.richiedi_prova();
  if p_conferma is distinct from 'PRODUZIONE' then
    raise exception 'conferma_mancante' using errcode = 'P0001',
      detail = 'Scrivi PRODUZIONE in maiuscolo per confermare.';
  end if;
  select max((e ->> 'timestamp')::bigint) into ultimo_codice
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) e where e ->> 'method' = 'totp';
  if coalesce(ultimo_codice, 0) < extract(epoch from now())::bigint - 300 then
    raise exception 'verifica_recente' using errcode = 'P0001',
      detail = 'Per sicurezza inserisci di nuovo password e codice.';
  end if;
  perform public.cancella_dati_prova(not p_tieni_anagrafiche);
  perform private.imposta_produzione();
end;
$$;

revoke all on function public.elimina_fattura_prova(uuid) from public, anon;
revoke all on function public.cancella_dati_prova(boolean) from public, anon;
revoke all on function public.passa_a_produzione(text, boolean) from public, anon;
grant execute on function public.elimina_fattura_prova(uuid) to authenticated;
grant execute on function public.cancella_dati_prova(boolean) to authenticated;
grant execute on function public.passa_a_produzione(text, boolean) to authenticated;
