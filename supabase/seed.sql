-- SOLO stack locale (supabase start / db reset): NON viene applicato al progetto vero con `db push`.
-- Tabella di prova per la coda senza rete e la visibilità tra dispositivi (US3, SC-005).
-- Conforme al contratto: specs/002-accesso-protetto-2fa/contracts/rls-policy-contract.md
-- (data-model.md, prove_sincronizzazione).

create table if not exists public.prove_sincronizzazione (
  id            uuid primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versione      int  not null default 1,
  testo         text not null,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

alter table public.prove_sincronizzazione enable row level security;
alter table public.prove_sincronizzazione force row level security;

drop policy if exists "prove_sincronizzazione_proprietario" on public.prove_sincronizzazione;
create policy "prove_sincronizzazione_proprietario" on public.prove_sincronizzazione
  for all to authenticated
  using      (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "prove_sincronizzazione_richiede_aal2" on public.prove_sincronizzazione;
create policy "prove_sincronizzazione_richiede_aal2" on public.prove_sincronizzazione
  as restrictive for all to authenticated
  using      ((select auth.jwt() ->> 'aal') = 'aal2' and private.accesso_completo_valido())
  with check ((select auth.jwt() ->> 'aal') = 'aal2' and private.accesso_completo_valido());

revoke all on public.prove_sincronizzazione from anon;
revoke all on public.prove_sincronizzazione from authenticated;
grant select, insert, update, delete on public.prove_sincronizzazione to authenticated;

create or replace function private.prove_sincronizzazione_prima_della_modifica()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.owner_id := old.owner_id;
  new.versione := old.versione + 1;
  new.aggiornato_il := now();
  return new;
end;
$$;
drop trigger if exists prove_sincronizzazione_prima_della_modifica on public.prove_sincronizzazione;
create trigger prove_sincronizzazione_prima_della_modifica before update on public.prove_sincronizzazione
  for each row execute function private.prove_sincronizzazione_prima_della_modifica();
