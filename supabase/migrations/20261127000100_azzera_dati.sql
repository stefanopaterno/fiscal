-- Azzera i dati di prova tranne CU, anagrafica, attività e aliquote delle addizionali (richiesta dell'utente
-- del 27/11/2026). Solo in modalità prova (in produzione le fatture emesse non si cancellano per legge), con
-- accesso completo (aal2) e la parola di conferma AZZERA.
--
-- Restano: certificazioni_uniche, aliquote_addizionali, profilo_professionale, attivita, documenti di tipo «cu»,
-- impostazioni (spese, accantonamento) e tutto ciò che riguarda l'account e la sicurezza.
-- Si cancella tutto il resto. Profilo e attività creati dai dati d'esempio e mai modificati si tolgono anche
-- loro (non sono dati dell'utente), come fa già «Cancella i dati di prova».
--
-- security definer: serve per cancellare anche i registri a sola aggiunta (eventi_*) e per passare le regole di
-- immutabilità, che valgono per l'utente dell'app (guardia sul ruolo nei trigger). Per questo la funzione
-- controlla da sé accesso, prova e proprietario, e filtra ogni cancellazione su owner_id = auth.uid().
-- Restituisce i percorsi dei file da togliere dallo storage (li toglie l'app, con le regole dello storage).

create or replace function public.azzera_dati_prova(p_conferma text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  file_documenti text[];
  file_consensi text[];
  file_giustificativi text[];
  conteggi jsonb := '{}'::jsonb;
  n int;
begin
  if io is null or (select auth.jwt() ->> 'aal') is distinct from 'aal2' or not private.accesso_completo_valido() then
    raise exception 'accesso_negato' using errcode = '42501';
  end if;
  perform private.richiedi_prova();
  if p_conferma is distinct from 'AZZERA' then
    raise exception 'conferma_mancante' using errcode = 'P0001', detail = 'Scrivi AZZERA in maiuscolo per confermare.';
  end if;

  -- File da togliere dallo storage (prima di cancellare le righe che li indicano)
  select coalesce(array_agg(p), '{}') into file_documenti from (
    select d.file_percorso as p from public.documenti d where d.owner_id = io and d.tipo <> 'cu'
    union all
    select v.file_percorso from public.documenti_versioni v join public.documenti d on d.id = v.documento_id
      where d.owner_id = io and d.tipo <> 'cu'
  ) x;
  select coalesce(array_agg(p), '{}') into file_consensi from (
    select c.file_percorso as p from public.consensi c where c.owner_id = io and c.file_percorso is not null
    union all
    select m.file_percorso from public.modelli_consenso m where m.owner_id = io and m.file_percorso is not null
  ) x;
  select coalesce(array_agg(io::text || '/' || id::text), '{}') into file_giustificativi from (
    select s.id from public.spese s where s.owner_id = io and s.ha_giustificativo
    union all
    select o.id from public.oneri_personali o where o.owner_id = io and o.ha_giustificativo
  ) x;

  perform set_config('fiscal.operazione', 'cancella_prova', true);

  -- Anni chiusi per primi: altrimenti i loro dati restano protetti
  delete from public.eventi_anno where owner_id = io;
  delete from public.checklist_anno where owner_id = io;
  delete from public.scadenze_utente where owner_id = io;
  delete from public.richieste_commercialista where owner_id = io;
  delete from public.pacchetti where owner_id = io;
  delete from public.modelli_pacchetto where owner_id = io;
  delete from public.dichiarazioni where owner_id = io;
  get diagnostics n = row_count; conteggi := conteggi || jsonb_build_object('dichiarazioni', n);

  -- Fatture, incassi, salvadanaio
  delete from public.salvadanaio where owner_id = io;
  delete from public.incassi where owner_id = io;
  get diagnostics n = row_count; conteggi := conteggi || jsonb_build_object('incassi', n);
  delete from public.righe_fattura r using public.fatture f where r.fattura_id = f.id and f.owner_id = io;
  delete from public.fatture where owner_id = io and fattura_rif_id is not null;
  delete from public.fatture where owner_id = io;
  get diagnostics n = row_count; conteggi := conteggi || jsonb_build_object('fatture', n);

  -- Consensi e rubrica
  delete from public.eventi_consensi where owner_id = io;
  delete from public.firmatari_consenso where owner_id = io;
  delete from public.consensi where owner_id = io;
  get diagnostics n = row_count; conteggi := conteggi || jsonb_build_object('consensi', n);
  delete from public.modelli_consenso where owner_id = io;
  delete from public.tipi_consenso where owner_id = io;
  delete from public.clienti where owner_id = io;
  get diagnostics n = row_count; conteggi := conteggi || jsonb_build_object('clienti', n);

  -- Spese, beni, oneri, versamenti, dati dell'anno, previsioni
  delete from public.spese where owner_id = io;
  get diagnostics n = row_count; conteggi := conteggi || jsonb_build_object('spese', n);
  delete from public.beni where owner_id = io;
  delete from public.oneri_personali where owner_id = io;
  delete from public.versamenti_previdenza where owner_id = io;
  delete from public.versamenti_imposte where owner_id = io;
  get diagnostics n = row_count; conteggi := conteggi || jsonb_build_object('versamenti_imposte', n);
  delete from public.dati_anno where owner_id = io;
  delete from public.previsioni_salvate where owner_id = io;
  delete from public.ipotesi_previsione where owner_id = io;

  -- Documenti (tranne le CU) e registro dei parametri
  delete from public.eventi_documenti e using public.documenti d where e.documento_id = d.id and d.owner_id = io and d.tipo <> 'cu';
  delete from public.collegamenti_documenti where owner_id = io;
  delete from public.documenti_versioni v using public.documenti d where v.documento_id = d.id and d.owner_id = io and d.tipo <> 'cu';
  delete from public.documenti where owner_id = io and tipo <> 'cu';
  get diagnostics n = row_count; conteggi := conteggi || jsonb_build_object('documenti', n);
  delete from public.aggiornamenti_parametri where owner_id = io and annulla_id is not null;
  delete from public.aggiornamenti_parametri where owner_id = io;
  delete from public.importazioni_parametri where owner_id = io;

  -- Profilo e attività d'esempio mai modificati (non sono dati dell'utente) e segni dei dati d'esempio
  perform private.cancella_dati_esempio();

  perform set_config('fiscal.operazione', '', true);
  return jsonb_build_object(
    'conteggi', conteggi,
    'file', jsonb_build_object(
      'documenti', to_jsonb(file_documenti),
      'consensi', to_jsonb(file_consensi),
      'giustificativi', to_jsonb(file_giustificativi)
    )
  );
end;
$$;
revoke all on function public.azzera_dati_prova(text) from public, anon;
grant execute on function public.azzera_dati_prova(text) to authenticated;
