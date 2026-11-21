-- Specifica 003: configurazione della partita IVA e fatturazione (T010).
-- Modello: specs/003-configurazione-piva-fatture/data-model.md
-- Contratto: specs/003-configurazione-piva-fatture/contracts/database.md
-- Ogni tabella segue supabase/templates/nuova_tabella.sql (RLS forzata, proprietario, aal2).
-- Riferimenti tra tabelle senza "on delete restrict": il controllo predefinito (no action) avviene a fine
-- istruzione, così la chiusura dell'account cancella tutto a cascata; per l'utente valgono i trigger.
-- Importi in centesimi (bigint). I calcoli fiscali li fa il motore nel browser (src/engine/):
-- il database controlla la coerenza dei totali, la numerazione e l'immutabilità.

-- ---------------------------------------------------------------------------
-- 0) Tipi
-- ---------------------------------------------------------------------------
create type public.chi_paga_bollo as enum ('paziente', 'professionista');
create type public.natura_iva as enum ('esente_sanitaria', 'imponibile');
create type public.previdenza as enum ('enpap', 'gestione_separata', 'da_verificare');
create type public.tipo_cliente as enum ('persona_fisica', 'ente');
create type public.tipo_documento as enum ('fattura', 'nota_credito');
create type public.stato_fattura as enum ('bozza', 'emessa', 'annullata');
create type public.stato_sts as enum ('non_dovuto', 'da_inviare', 'inviata');
create type public.modalita_incasso as enum ('contanti', 'carta_pos', 'bonifico', 'altro');

-- ---------------------------------------------------------------------------
-- 1) Funzioni comuni: regole RLS e trigger di modifica
-- ---------------------------------------------------------------------------
create or replace function private.prima_della_modifica()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.owner_id := old.owner_id;
  new.versione := old.versione + 1;
  new.aggiornato_il := now();
  return new;
end;
$$;

-- Applica a una tabella le regole del modello nuova_tabella.sql.
create or replace function private.applica_regole_tabella(t text)
returns void language plpgsql set search_path = '' as $$
begin
  execute format('alter table public.%I enable row level security', t);
  execute format('alter table public.%I force row level security', t);
  execute format($p$create policy %I on public.%I for all to authenticated
    using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))$p$,
    t || '_proprietario', t);
  execute format($p$create policy %I on public.%I as restrictive for all to authenticated
    using ((select auth.jwt() ->> 'aal') = 'aal2' and private.accesso_completo_valido())
    with check ((select auth.jwt() ->> 'aal') = 'aal2' and private.accesso_completo_valido())$p$,
    t || '_richiede_aal2', t);
  execute format('revoke all on public.%I from anon', t);
  execute format('revoke all on public.%I from authenticated', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  execute format('create trigger %I before update on public.%I for each row execute function private.prima_della_modifica()',
    t || '_prima_della_modifica', t);
end;
$$;
revoke all on function private.applica_regole_tabella(text) from public, anon, authenticated;

-- Vero se la modifica arriva dall'app (utente), falso per amministrazione e cancellazioni a cascata
-- dell'account (le regole di immutabilità valgono per l'utente, non per la chiusura dell'account).
create or replace function private.da_utente()
returns boolean language sql stable set search_path = '' as $$
  select current_user in ('authenticated', 'anon');
$$;
grant execute on function private.da_utente() to authenticated;

-- Operazione in corso nella transazione (emissione o nota di credito), impostata solo dalle funzioni.
create or replace function private.operazione()
returns text language sql stable set search_path = '' as $$
  select coalesce(current_setting('fiscal.operazione', true), '');
$$;
grant execute on function private.operazione() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Profilo professionale (una riga per utente)
-- ---------------------------------------------------------------------------
create table public.profilo_professionale (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  nome          text,
  cognome       text,
  codice_fiscale text check (codice_fiscale is null or codice_fiscale ~ '^[A-Z0-9]{16}$'),
  partita_iva   text check (partita_iva is null or partita_iva ~ '^[0-9]{11}$'),
  inizio_attivita date,
  regime_fiscale text not null default 'ordinario' check (regime_fiscale = 'ordinario'),
  indirizzo     text,
  cap           text check (cap is null or cap ~ '^[0-9]{5}$'),
  comune        text,
  provincia     text check (provincia is null or provincia ~ '^[A-Z]{2}$'),
  pec           text,
  codice_destinatario text check (codice_destinatario is null or codice_destinatario ~ '^[A-Z0-9]{7}$'),
  iban          text,
  albo_ordine   text,
  albo_numero   text,
  enpap_matricola text,
  bollo_a_carico public.chi_paga_bollo not null default 'paziente',
  gia_incassata_predefinita boolean not null default false,
  soglia_attenzione_imponibile int not null default 10 check (soglia_attenzione_imponibile between 1 and 100)
);
select private.applica_regole_tabella('profilo_professionale');

-- ---------------------------------------------------------------------------
-- 3) Attività
-- ---------------------------------------------------------------------------
create table public.attivita (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  nome          text not null check (length(trim(nome)) > 0),
  codice_ateco  text,
  natura_iva    public.natura_iva not null,
  previdenza    public.previdenza not null default 'enpap',
  predefinita   boolean not null default false
);
create unique index attivita_una_predefinita on public.attivita (owner_id) where predefinita;
select private.applica_regole_tabella('attivita');

-- ---------------------------------------------------------------------------
-- 4) Clienti e pazienti (solo dati per la fattura, nessun dato clinico: FR-017)
-- ---------------------------------------------------------------------------
create table public.clienti (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  tipo          public.tipo_cliente not null,
  nome          text,
  cognome       text,
  denominazione text,
  codice_fiscale text check (codice_fiscale is null or codice_fiscale ~ '^[A-Z0-9]{11,16}$'),
  partita_iva   text check (partita_iva is null or partita_iva ~ '^[0-9]{11}$'),
  indirizzo     text,
  cap           text,
  comune        text,
  provincia     text,
  nazione       text not null default 'IT',
  pec           text,
  codice_destinatario text,
  sostituto_imposta boolean not null default false,
  opposizione_sts   boolean not null default false,
  pagato_da     text,
  check ((tipo = 'persona_fisica' and nome is not null and cognome is not null)
      or (tipo = 'ente' and denominazione is not null))
);
select private.applica_regole_tabella('clienti');

-- ---------------------------------------------------------------------------
-- 5) Fatture e note di credito
-- ---------------------------------------------------------------------------
create table public.fatture (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  tipo          public.tipo_documento not null default 'fattura',
  stato         public.stato_fattura not null default 'bozza',
  data          date not null,
  anno          int generated always as (extract(year from data)::int) stored,
  numero        int check (numero > 0),
  cliente_id    uuid not null references public.clienti (id),
  attivita_id   uuid not null references public.attivita (id),
  fattura_rif_id uuid references public.fatture (id),
  fotografia    jsonb not null default '{}'::jsonb,
  totale_compensi    bigint not null default 0 check (totale_compensi >= 0),
  totale_integrativo bigint not null default 0 check (totale_integrativo >= 0),
  imponibile_iva     bigint not null default 0 check (imponibile_iva >= 0),
  iva                bigint not null default 0 check (iva >= 0),
  importo_esente     bigint not null default 0 check (importo_esente >= 0),
  bollo              bigint not null default 0 check (bollo >= 0),
  bollo_addebitato   boolean not null default false,
  ritenuta           bigint not null default 0 check (ritenuta >= 0),
  totale             bigint not null default 0,
  netto              bigint not null default 0,
  dicitura      text,
  stato_sts     public.stato_sts not null default 'non_dovuto',
  unique (owner_id, anno, numero),
  -- Le bozze non hanno numero; le fatture emesse o annullate sì (FR-003)
  check ((stato = 'bozza') = (numero is null)),
  -- Coerenza dei totali calcolati dal motore (contracts/motore-fattura.md)
  check (totale = imponibile_iva + iva + importo_esente + case when bollo_addebitato then bollo else 0 end),
  check (netto = totale - ritenuta),
  check ((tipo = 'nota_credito') = (fattura_rif_id is not null))
);
create index fatture_per_anno on public.fatture (owner_id, anno, numero);
select private.applica_regole_tabella('fatture');

create table public.righe_fattura (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  fattura_id    uuid not null references public.fatture (id) on delete cascade,
  posizione     int not null default 1,
  descrizione   text not null check (length(trim(descrizione)) > 0),
  quantita      int not null default 1 check (quantita >= 1),
  compenso      bigint not null check (compenso >= 0),
  natura        public.natura_iva not null,
  integrativo   bigint not null default 0 check (integrativo >= 0),
  iva           bigint not null default 0 check (iva >= 0)
);
create index righe_per_fattura on public.righe_fattura (fattura_id);
select private.applica_regole_tabella('righe_fattura');

-- Immutabilità (R-05, FR-013): una fattura emessa o annullata non cambia, salvo
-- - lo stato del Sistema Tessera Sanitaria (adempimento successivo);
-- - il passaggio emessa → annullata fatto da crea_nota_di_credito.
-- Una bozza diventa emessa solo con emetti_fattura.
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
    if old.stato <> 'bozza' then
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
create trigger fatture_immutabili before update or delete on public.fatture
  for each row execute function private.fatture_immutabili();

create or replace function private.righe_immutabili()
returns trigger language plpgsql set search_path = '' as $$
declare
  stato_padre public.stato_fattura;
begin
  if not private.da_utente() or private.operazione() = 'nota_credito' then
    return coalesce(new, old);
  end if;
  -- Durante la cancellazione di una bozza la fattura non esiste più: nessun controllo
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
create trigger righe_immutabili before insert or update or delete on public.righe_fattura
  for each row execute function private.righe_immutabili();

-- ---------------------------------------------------------------------------
-- 6) Incassi (R-06, FR-010): anche parziali, mai oltre il netto, solo su fatture emesse
-- ---------------------------------------------------------------------------
create table public.incassi (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  fattura_id    uuid not null references public.fatture (id),
  data          date not null,
  importo       bigint not null check (importo > 0),
  modalita      public.modalita_incasso not null,
  tracciabile   boolean not null,
  check (not (modalita = 'contanti' and tracciabile))
);
create index incassi_per_fattura on public.incassi (fattura_id);
select private.applica_regole_tabella('incassi');

create or replace function private.incassi_controlla()
returns trigger language plpgsql set search_path = '' as $$
declare
  f record;
  gia bigint;
begin
  -- Lucchetto sulla fattura: due incassi contemporanei non superano insieme il netto
  select stato, tipo, netto into f from public.fatture where id = new.fattura_id for update;
  if f is null or f.stato <> 'emessa' or f.tipo <> 'fattura' then
    raise exception 'non_emessa' using errcode = 'P0001',
      detail = 'Si registra un incasso solo su una fattura emessa.';
  end if;
  select coalesce(sum(importo), 0) into gia from public.incassi
    where fattura_id = new.fattura_id and id <> new.id;
  if gia + new.importo > f.netto then
    raise exception 'oltre_il_netto' using errcode = 'P0001',
      detail = format('Restano da incassare %s centesimi.', f.netto - gia);
  end if;
  return new;
end;
$$;
create trigger incassi_controlla before insert or update on public.incassi
  for each row execute function private.incassi_controlla();

-- ---------------------------------------------------------------------------
-- 7) Emissione (R-04, FR-002, FR-003, FR-004): numero progressivo unico per anno, senza salti
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
begin
  select * into f from public.fatture where id = p_id for update;
  if f.id is null or f.stato <> 'bozza' then
    raise exception 'non_bozza' using errcode = 'P0001', detail = 'Si emettono solo le bozze.';
  end if;

  select * into p from public.profilo_professionale where owner_id = f.owner_id;
  if p.id is null or coalesce(trim(p.nome), '') = '' or coalesce(trim(p.cognome), '') = ''
     or p.codice_fiscale is null or p.partita_iva is null or p.inizio_attivita is null
     or coalesce(trim(p.indirizzo), '') = '' or p.cap is null or coalesce(trim(p.comune), '') = ''
     or p.provincia is null then
    raise exception 'configurazione_incompleta' using errcode = 'P0001',
      detail = 'Completa la configurazione della partita IVA prima di emettere.';
  end if;
  if f.data < p.inizio_attivita then
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

  -- Una sola sequenza per anno (fatture e note di credito): lucchetto per utente e anno
  perform pg_advisory_xact_lock(hashtextextended(f.owner_id::text || ':' || f.anno::text, 0));
  select coalesce(max(x.numero), 0) + 1, max(x.data) into prossimo, ultima
    from public.fatture x where x.owner_id = f.owner_id and x.anno = f.anno and x.numero is not null;
  if ultima is not null and f.data < ultima then
    raise exception 'data_anteriore_ultima' using errcode = 'P0001',
      detail = format('L''ultima fattura emessa è del %s: la numerazione segue l''ordine delle date.', ultima);
  end if;

  select * into c from public.clienti where id = f.cliente_id;
  select * into a from public.attivita where id = f.attivita_id;

  -- Sistema Tessera Sanitaria: spese sanitarie a persone fisiche non opposte (FR-014)
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
      'emessa_il', now())
  where x.id = p_id;
  perform set_config('fiscal.operazione', '', true);

  return query select f.anno, prossimo;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Nota di credito (FR-012): storno totale, stessa sequenza, la fattura diventa annullata.
-- Gli importi della nota sono positivi; il tipo nota_credito indica che si sottraggono.
-- ---------------------------------------------------------------------------
create or replace function public.crea_nota_di_credito(p_fattura uuid, p_id_nota uuid, p_data date default current_date)
returns table (anno int, numero int)
language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_column
declare
  f public.fatture;
  r record;
begin
  select * into f from public.fatture where id = p_fattura for update;
  if f.id is null or f.stato <> 'emessa' or f.tipo <> 'fattura' then
    raise exception 'non_emessa' using errcode = 'P0001',
      detail = 'Si crea una nota di credito solo per una fattura emessa e non già annullata.';
  end if;

  perform set_config('fiscal.operazione', 'nota_credito', true);
  insert into public.fatture (id, tipo, data, cliente_id, attivita_id, fattura_rif_id, fotografia,
    totale_compensi, totale_integrativo, imponibile_iva, iva, importo_esente, bollo, bollo_addebitato,
    ritenuta, totale, netto, dicitura)
  values (p_id_nota, 'nota_credito', p_data, f.cliente_id, f.attivita_id, f.id,
    jsonb_build_object('regole', f.fotografia -> 'regole', 'fattura_stornata',
      jsonb_build_object('anno', f.anno, 'numero', f.numero, 'data', f.data)),
    f.totale_compensi, f.totale_integrativo, f.imponibile_iva, f.iva, f.importo_esente, f.bollo,
    f.bollo_addebitato, f.ritenuta, f.totale, f.netto, f.dicitura);
  for r in select * from public.righe_fattura where fattura_id = f.id order by posizione loop
    insert into public.righe_fattura (id, fattura_id, posizione, descrizione, quantita, compenso, natura, integrativo, iva)
    values (gen_random_uuid(), p_id_nota, r.posizione, r.descrizione, r.quantita, r.compenso, r.natura, r.integrativo, r.iva);
  end loop;

  return query select e.anno, e.numero from public.emetti_fattura(p_id_nota) e;

  perform set_config('fiscal.operazione', 'nota_credito', true);
  update public.fatture set stato = 'annullata' where id = f.id;
  perform set_config('fiscal.operazione', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) Sistema Tessera Sanitaria: segna come inviate (FR-014)
-- ---------------------------------------------------------------------------
create or replace function public.segna_sts_inviate(p_ids uuid[])
returns int language sql security invoker set search_path = '' as $$
  with fatte as (
    update public.fatture set stato_sts = 'inviata'
    where id = any (p_ids) and stato_sts = 'da_inviare'
    returning 1
  )
  select count(*)::int from fatte;
$$;

revoke all on function public.emetti_fattura(uuid) from public, anon;
revoke all on function public.crea_nota_di_credito(uuid, uuid, date) from public, anon;
revoke all on function public.segna_sts_inviate(uuid[]) from public, anon;
grant execute on function public.emetti_fattura(uuid) to authenticated;
grant execute on function public.crea_nota_di_credito(uuid, uuid, date) to authenticated;
grant execute on function public.segna_sts_inviate(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Viste per anno (soggette alla RLS di chi le legge)
-- ---------------------------------------------------------------------------
-- Reddito per cassa (FR-019): conta l'anno dell'incasso. compensi_incassati è la parte di compenso
-- (senza integrativo, IVA e bollo) in proporzione a quanto incassato del netto.
create view public.reddito_cassa with (security_invoker = true) as
  select i.owner_id,
         extract(year from i.data)::int as anno,
         sum(i.importo)::bigint as incassato,
         sum(round(i.importo::numeric * (f.totale_compensi)::numeric / nullif(f.netto, 0)))::bigint
           as compensi_incassati
  from public.incassi i join public.fatture f on f.id = i.fattura_id
  group by i.owner_id, extract(year from i.data);

-- Riepilogo IVA (FR-020, FR-024): imponibili ed esenti delle fatture emesse, note di credito sottratte.
create view public.riepilogo_iva with (security_invoker = true) as
  select owner_id, anno,
         sum(case when tipo = 'nota_credito' then -imponibile_iva else imponibile_iva end)::bigint as imponibile_iva,
         sum(case when tipo = 'nota_credito' then -iva else iva end)::bigint as iva,
         sum(case when tipo = 'nota_credito' then -importo_esente else importo_esente end)::bigint as importo_esente
  from public.fatture
  where stato <> 'bozza'
  group by owner_id, anno;

revoke all on public.reddito_cassa, public.riepilogo_iva from anon, authenticated;
grant select on public.reddito_cassa, public.riepilogo_iva to authenticated;
