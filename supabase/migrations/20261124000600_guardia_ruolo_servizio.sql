-- Test di sicurezza 2026-11: alcune regole di scrittura toccavano lo schema `private` PRIMA di
-- controllare il ruolo. `usage on schema private` è concesso solo a `authenticated`, quindi quando una
-- scrittura arriva da un ruolo di servizio — la cancellazione dell'account a cascata da auth.users
-- (diritto all'oblio) o una correzione dell'amministrazione con la chiave di servizio — il trigger
-- falliva con «permission denied for schema private» (SQLSTATE 42501) e l'operazione si bloccava.
-- Le regole di immutabilità valgono per l'utente dell'app, non per i ruoli di servizio: usiamo la
-- stessa guardia in linea già presente nelle trigger di anni chiusi e consensi, così i ruoli di
-- servizio escono subito senza mai toccare lo schema `private`. Comportamento invariato per l'utente.

-- 1) Fatture emesse: immutabilità solo per l'utente ----------------------------------------------
create or replace function private.fatture_immutabili()
returns trigger language plpgsql set search_path = '' as $$
declare
  -- anno è calcolato dalla data: nei trigger "before" non è ancora valorizzato (la data resta confrontata)
  liberi text[] := array['versione', 'aggiornato_il', 'stato_sts', 'anno'];
begin
  if current_user not in ('authenticated', 'anon') then
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

-- 2) Righe di fattura: immutabilità solo per l'utente --------------------------------------------
create or replace function private.righe_immutabili()
returns trigger language plpgsql set search_path = '' as $$
declare
  stato_padre public.stato_fattura;
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  if private.operazione() in ('nota_credito', 'cancella_prova') then
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

-- 3) Registro dei documenti: append-only, come eventi_consensi ed eventi_anno ---------------------
-- L'owner poteva modificare o cancellare la propria cronologia dei documenti. La blocchiamo in
-- scrittura: resta inserimento (dal client) e lettura.
revoke update, delete on public.eventi_documenti from authenticated;

-- 4) Aliquote addizionali: validazione degli scaglioni fuori dallo schema `private` ---------------
-- Il CHECK chiamava private.scaglioni_validi, quindi dipendeva dallo schema `private` a ogni
-- scrittura (stessa fragilità dei punti 1-2 per i ruoli di servizio). Lo spostiamo in una trigger
-- con la guardia di ruolo in linea: per l'utente la validazione è identica, i ruoli di servizio la saltano.
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.aliquote_addizionali'::regclass and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%scaglioni_validi%';
  if c is not null then execute format('alter table public.aliquote_addizionali drop constraint %I', c); end if;
end $$;

create or replace function private.valida_scaglioni_addizionali()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if not private.scaglioni_validi(new.regionale_scaglioni) then
    raise exception 'scaglioni_non_validi' using errcode = 'P0001',
      detail = 'Gli scaglioni dell''addizionale regionale non sono validi.';
  end if;
  return new;
end;
$$;

create trigger aliquote_addizionali_scaglioni before insert or update on public.aliquote_addizionali
  for each row execute function private.valida_scaglioni_addizionali();
