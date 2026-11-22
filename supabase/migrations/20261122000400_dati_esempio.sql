-- Specifica 003, FR-032: «Carica dati d'esempio», solo in modalità prova.
-- Riempie l'account di prova con dati FINTI e realistici del 2026 (clienti, fatture, incassi, versamenti
-- ENPAP), così si vede l'app piena senza scrivere niente. Nessun dato clinico, nessun dato personale reale.
-- - Gira come funzione del database chiamata dall'app (sessione aal2): niente script esterni, niente
--   chiave di servizio. È security definer solo per scrivere il registro privato dei dati d'esempio:
--   per questo controlla da sé prova, aal2 e accesso completo e lavora solo su auth.uid().
-- - I totali delle fatture seguono le stesse regole del motore src/engine/fattura/calcola.ts (regole 2026:
--   integrativo ENPAP 2%, IVA 22%, bollo 2 € oltre 77,47 € di parte esente, ritenuta 20% sul compenso),
--   con arrotondamento commerciale al centesimo. L'emissione usa le funzioni vere (emetti_fattura,
--   crea_nota_di_credito): numerazione, stato STS e fotografia sono quelli di una fattura fatta a mano.
-- - Non crea CU, dati dell'anno né aliquote delle addizionali: quelli li inserisce l'utente.
-- - cancella_dati_prova (e quindi passa_a_produzione) toglie anche clienti e versamenti d'esempio,
--   e attività e profilo creati dall'esempio se l'utente non li ha modificati.

-- ---------------------------------------------------------------------------
-- 1) Registro privato di cosa è stato creato come esempio (non esposto dall'API)
-- ---------------------------------------------------------------------------
create table private.dati_esempio (
  owner_id  uuid not null references auth.users (id) on delete cascade,
  tabella   text not null check (tabella in ('profilo_professionale', 'attivita', 'clienti', 'versamenti_previdenza')),
  riga_id   uuid not null,
  creato_il timestamptz not null default now(),
  primary key (tabella, riga_id)
);
create index dati_esempio_owner on private.dati_esempio (owner_id);
revoke all on private.dati_esempio from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Codici finti ma formalmente validi (nessun codice scritto per esteso nel repository)
-- ---------------------------------------------------------------------------
-- Carattere di controllo del codice fiscale (DM 23/12/1976), come src/engine/validazioni/codice-fiscale.ts
create or replace function private.cf_controllo(p_15 text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  dispari constant int[] := array[1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16,
                                   10, 22, 25, 24, 23];
  c text;
  v int;
  somma int := 0;
begin
  for i in 1..15 loop
    c := substr(p_15, i, 1);
    v := case when c ~ '[0-9]' then c::int else ascii(c) - 65 end;
    -- posizioni 1, 3, 5… (dispari, contando da 1): tabella dei dispari; le altre: valore diretto
    somma := somma + case when i % 2 = 1 then dispari[v + 1] else v end;
  end loop;
  return chr(65 + somma % 26);
end;
$$;

-- Tre lettere da cognome o nome: consonanti, poi vocali, poi X (per il nome con 4+ consonanti: 1ª, 3ª, 4ª)
create or replace function private.cf_lettere(p_testo text, p_nome boolean)
returns text language plpgsql immutable set search_path = '' as $$
declare
  t text := regexp_replace(upper(p_testo), '[^A-Z]', '', 'g');
  consonanti text := regexp_replace(t, '[AEIOU]', '', 'g');
  vocali text := regexp_replace(t, '[^AEIOU]', '', 'g');
begin
  if p_nome and length(consonanti) >= 4 then
    return substr(consonanti, 1, 1) || substr(consonanti, 3, 1) || substr(consonanti, 4, 1);
  end if;
  return substr(consonanti || vocali || 'XXX', 1, 3);
end;
$$;

create or replace function private.cf_esempio(p_cognome text, p_nome text, p_nascita date, p_donna boolean,
  p_comune text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  base text;
begin
  base := private.cf_lettere(p_cognome, false) || private.cf_lettere(p_nome, true)
    || to_char(p_nascita, 'YY')
    || substr('ABCDEHLMPRST', extract(month from p_nascita)::int, 1)
    || lpad((extract(day from p_nascita)::int + case when p_donna then 40 else 0 end)::text, 2, '0')
    || p_comune;
  return base || private.cf_controllo(base);
end;
$$;

-- Partita IVA: 10 cifre + cifra di controllo (come src/engine/validazioni/partita-iva.ts).
-- Le basi usate qui finiscono con l'ufficio "000", che non esiste: nessuna partita IVA vera.
create or replace function private.piva_esempio(p_10 text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  d int;
  somma int := 0;
begin
  for i in 1..10 loop
    d := substr(p_10, i, 1)::int;
    somma := somma + case when i % 2 = 1 then d else (case when d * 2 > 9 then d * 2 - 9 else d * 2 end) end;
  end loop;
  return p_10 || ((10 - somma % 10) % 10)::text;
end;
$$;

revoke all on function private.cf_controllo(text) from public, anon, authenticated;
revoke all on function private.cf_lettere(text, boolean) from public, anon, authenticated;
revoke all on function private.cf_esempio(text, text, date, boolean, text) from public, anon, authenticated;
revoke all on function private.piva_esempio(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Calcolo della fattura, stesse regole del motore (src/engine/fattura/calcola.ts, regole 2026)
-- ---------------------------------------------------------------------------
-- Percentuale in punti base (es. 200 = 2%) con arrotondamento commerciale: 0,5 centesimi per eccesso
create or replace function private.percentuale(p_centesimi bigint, p_punti_base int)
returns bigint language sql immutable set search_path = '' as $$
  select (p_centesimi * p_punti_base + 5000) / 10000;
$$;
revoke all on function private.percentuale(bigint, int) from public, anon, authenticated;

-- Inserisce una bozza con le sue righe e i totali calcolati. p_righe: [{d, q, p, n}] con
-- d = descrizione, q = quantità, p = prezzo unitario in centesimi, n = natura (esente_sanitaria | imponibile).
create or replace function private.esempio_bozza(p_owner uuid, p_id uuid, p_data date, p_cliente public.clienti,
  p_attivita uuid, p_righe jsonb, p_profilo public.profilo_professionale)
returns void language plpgsql set search_path = '' as $$
declare
  pb_integrativo constant int := 200;   -- 2% (regole 2026)
  pb_iva constant int := 2200;          -- 22%
  soglia_bollo constant bigint := 7747; -- 77,47 €
  importo_bollo constant bigint := 200; -- 2,00 €
  pb_ritenuta constant int := 2000;     -- 20%
  r jsonb;
  pos int := 0;
  q int;
  prezzo bigint;
  compenso bigint;
  integrativo bigint;
  natura public.natura_iva;
  stima bigint;
  t_compensi bigint := 0;
  t_integrativo bigint := 0;
  t_imponibile bigint := 0;
  t_esente bigint := 0;
  v_iva bigint;
  v_bollo bigint;
  addebitato boolean;
  v_ritenuta bigint;
  v_totale bigint;
  diciture text[] := '{}';
begin
  insert into public.fatture (id, owner_id, data, cliente_id, attivita_id, fotografia)
  values (p_id, p_owner, p_data, p_cliente.id, p_attivita, '{}'::jsonb);

  for r in select value from jsonb_array_elements(p_righe) loop
    pos := pos + 1;
    q := coalesce((r ->> 'q')::int, 1);
    prezzo := (r ->> 'p')::bigint;
    natura := coalesce(r ->> 'n', 'esente_sanitaria')::public.natura_iva;
    if p_profilo.integrativo_compreso then
      -- scorporo: compenso unitario tale che compenso + integrativo = prezzo (scorporaIntegrativo)
      stima := round(prezzo * 10000.0 / (10000 + pb_integrativo));
      compenso := null;
      for c in 0..2 loop
        if compenso is null then
          declare
            cand bigint := stima + (array[0, -1, 1])[c + 1];
          begin
            if cand >= 0 and cand + private.percentuale(cand, pb_integrativo) = prezzo then
              compenso := cand;
            end if;
          end;
        end if;
      end loop;
      compenso := coalesce(compenso, stima);
      integrativo := private.percentuale(compenso, pb_integrativo) * q;
    else
      compenso := prezzo;
      integrativo := private.percentuale(compenso * q, pb_integrativo);
    end if;
    insert into public.righe_fattura (id, owner_id, fattura_id, posizione, descrizione, quantita, compenso,
      natura, integrativo, iva)
    values (gen_random_uuid(), p_owner, p_id, pos, coalesce(r ->> 'd', 'Prestazione professionale psicologica'),
      q, compenso, natura, integrativo, 0);
    t_compensi := t_compensi + compenso * q;
    t_integrativo := t_integrativo + integrativo;
    if natura = 'imponibile' then
      t_imponibile := t_imponibile + compenso * q + integrativo;
    else
      t_esente := t_esente + compenso * q + integrativo;
    end if;
  end loop;

  v_iva := private.percentuale(t_imponibile, pb_iva);
  v_bollo := case when t_esente > soglia_bollo then importo_bollo else 0 end;
  addebitato := v_bollo > 0 and p_profilo.bollo_a_carico = 'paziente';
  -- integrativo fuori dalla base della ritenuta (regole 2026)
  v_ritenuta := case when p_cliente.sostituto_imposta then private.percentuale(t_compensi, pb_ritenuta) else 0 end;
  v_totale := t_imponibile + v_iva + t_esente + case when addebitato then v_bollo else 0 end;

  if t_esente > 0 then
    diciture := array_append(diciture, 'Operazione esente da IVA ai sensi dell''art. 10, comma 1, n. 18 del DPR 633/1972');
  end if;
  if v_bollo > 0 then
    diciture := array_append(diciture, 'Imposta di bollo di 2,00 € ai sensi dell''art. 13 della Tariffa allegata al DPR 642/1972');
  end if;
  if p_cliente.opposizione_sts then
    diciture := array_append(diciture,
      'Opposizione del paziente alla trasmissione dei dati al Sistema Tessera Sanitaria (art. 3 DM 31/07/2015)');
  end if;

  update public.fatture set
    totale_compensi = t_compensi,
    totale_integrativo = t_integrativo,
    imponibile_iva = t_imponibile,
    iva = v_iva,
    importo_esente = t_esente,
    bollo = v_bollo,
    bollo_addebitato = addebitato,
    ritenuta = v_ritenuta,
    totale = v_totale,
    netto = v_totale - v_ritenuta,
    dicitura = nullif(array_to_string(diciture, E'\n'), ''),
    fotografia = jsonb_build_object(
      'regole', jsonb_build_object('anno', 2026, 'aliquota_integrativo', 0.02, 'aliquota_iva', 0.22,
        'soglia_bollo', soglia_bollo, 'importo_bollo', importo_bollo, 'aliquota_ritenuta', 0.2,
        'da_verificare', jsonb_build_array('aliquotaIntegrativo', 'integrativoFuoriRitenuta')),
      'pagato_da', p_cliente.pagato_da,
      'esempio', true)
  where id = p_id;
end;
$$;
revoke all on function private.esempio_bozza(uuid, uuid, date, public.clienti, uuid, jsonb,
  public.profilo_professionale) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Carica i dati d'esempio
-- ---------------------------------------------------------------------------
create or replace function public.carica_dati_esempio()
returns table (clienti int, fatture int, incassi int, versamenti int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  io uuid := auth.uid();
  p public.profilo_professionale;
  att_esente uuid;
  att_imponibile uuid;
  chiavi text[] := '{}';
  ids uuid[] := '{}';
  cl public.clienti;
  r record;
  inc jsonb;
  id_fattura uuid;
  id_per_ordine uuid[] := '{}';
  netto_f bigint;
  gia bigint;
  importo bigint;
  n_clienti int := 0;
  n_fatture int := 0;
  n_incassi int := 0;
  n_versamenti int := 0;
begin
  -- Le regole che la RLS applicherebbe all'utente (qui la funzione scrive con i diritti del proprietario)
  if io is null or (select auth.jwt() ->> 'aal') is distinct from 'aal2' or not private.accesso_completo_valido() then
    raise exception 'accesso_negato' using errcode = '42501';
  end if;
  perform private.richiedi_prova();

  if exists (select 1 from private.dati_esempio m join public.clienti c on c.id = m.riga_id
             where m.owner_id = io and m.tabella = 'clienti') then
    raise exception 'esempio_gia_caricato' using errcode = 'P0001',
      detail = 'I dati d''esempio sono già caricati. Per ricaricarli, prima cancella i dati di prova.';
  end if;
  if exists (select 1 from public.fatture f where f.owner_id = io and f.anno = 2026 and f.numero is not null) then
    raise exception 'esempio_fatture_presenti' using errcode = 'P0001',
      detail = 'Hai già fatture del 2026: gli esempi le mescolerebbero con le tue. Cancella i dati di prova e riprova.';
  end if;

  -- Profilo: si usa quello dell'utente; se manca se ne crea uno d'esempio. Mai sovrascritto.
  select * into p from public.profilo_professionale where owner_id = io;
  if p.id is null then
    insert into public.profilo_professionale (id, owner_id, nome, cognome, codice_fiscale, partita_iva,
      inizio_attivita, indirizzo, cap, comune, provincia, albo_ordine)
    values (gen_random_uuid(), io, 'Laura', 'Esempio',
      private.cf_esempio('Esempio', 'Laura', date '1986-05-10', true, 'H501'), private.piva_esempio('1234567000'),
      date '2026-01-01', 'Via dell''Esempio 1', '00100', 'Roma', 'RM', 'Ordine degli Psicologi (esempio)')
    returning * into p;
    insert into private.dati_esempio (owner_id, tabella, riga_id) values (io, 'profilo_professionale', p.id);
  elsif coalesce(trim(p.nome), '') = '' or coalesce(trim(p.cognome), '') = '' or p.codice_fiscale is null
     or p.partita_iva is null or p.inizio_attivita is null or coalesce(trim(p.indirizzo), '') = ''
     or p.cap is null or coalesce(trim(p.comune), '') = '' or p.provincia is null then
    raise exception 'configurazione_incompleta' using errcode = 'P0001',
      detail = 'Hai iniziato a compilare i dati della partita IVA: completali prima di caricare gli esempi.';
  end if;

  -- Attività: si riusano quelle esistenti della stessa natura, altrimenti se ne crea una d'esempio
  select a.id into att_esente from public.attivita a
    where a.owner_id = io and a.natura_iva = 'esente_sanitaria' order by a.predefinita desc, a.creato_il limit 1;
  if att_esente is null then
    insert into public.attivita (id, owner_id, nome, codice_ateco, natura_iva, previdenza, predefinita)
    values (gen_random_uuid(), io, 'Psicologo', null, 'esente_sanitaria', 'enpap',
      not exists (select 1 from public.attivita a where a.owner_id = io and a.predefinita))
    returning id into att_esente;
    insert into private.dati_esempio (owner_id, tabella, riga_id) values (io, 'attivita', att_esente);
  end if;
  select a.id into att_imponibile from public.attivita a
    where a.owner_id = io and a.natura_iva = 'imponibile' order by a.predefinita desc, a.creato_il limit 1;
  if att_imponibile is null then
    insert into public.attivita (id, owner_id, nome, codice_ateco, natura_iva, previdenza, predefinita)
    values (gen_random_uuid(), io, 'Formazione e consulenze', null, 'imponibile', 'enpap', false)
    returning id into att_imponibile;
    insert into private.dati_esempio (owner_id, tabella, riga_id) values (io, 'attivita', att_imponibile);
  end if;

  -- Clienti finti: 10 persone (una si oppone al Sistema Tessera Sanitaria, un minore pagato dalla madre)
  -- e 2 enti (uno sostituto d'imposta). Nomi, indirizzi e codici sono di fantasia.
  for r in
    select * from (values
      ('p1',  'Marco',     'Bellini',   date '1985-06-02', false, 'H501', 'Via dei Tigli 4',       '00100', 'Roma',    'RM', false, null::text),
      ('p2',  'Chiara',    'Fontana',   date '1990-11-23', true,  'F205', 'Viale dei Pini 18',     '20100', 'Milano',  'MI', false, null),
      ('p3',  'Luca',      'Ferraro',   date '1979-01-30', false, 'L219', 'Corso delle Querce 7',  '10100', 'Torino',  'TO', false, null),
      ('p4',  'Giulia',    'Marchetti', date '1995-04-09', true,  'H501', 'Via delle Viole 22',    '00100', 'Roma',    'RM', false, null),
      ('p5',  'Davide',    'Rinaldi',   date '1982-09-15', false, 'F839', 'Via del Mare 3',        '80100', 'Napoli',  'NA', false, null),
      ('p6',  'Sara',      'Colombo',   date '1992-07-01', true,  'A944', 'Via dei Glicini 9',     '40100', 'Bologna', 'BO', false, null),
      ('p7',  'Paolo',     'Gentile',   date '1975-12-12', false, 'D612', 'Piazza degli Ulivi 2',  '50100', 'Firenze', 'FI', false, null),
      ('p8',  'Elena',     'Moretti',   date '1987-02-27', true,  'H501', 'Via dei Gelsi 15',      '00100', 'Roma',    'RM', true,  null),
      ('p9',  'Andrea',    'Barbieri',  date '2010-05-20', false, 'H501', 'Via delle Betulle 6',   '00100', 'Roma',    'RM', false, 'Roberta Barbieri (madre)'),
      ('p10', 'Francesca', 'Lombardi',  date '1998-10-05', true,  'A944', 'Via degli Aceri 11',    '40100', 'Bologna', 'BO', false, null)
    ) as t(chiave, nome, cognome, nascita, donna, belfiore, indirizzo, cap, comune, provincia, opposizione, pagato_da)
  loop
    insert into public.clienti (id, owner_id, tipo, nome, cognome, codice_fiscale, indirizzo, cap, comune,
      provincia, opposizione_sts, pagato_da)
    values (gen_random_uuid(), io, 'persona_fisica', r.nome, r.cognome,
      private.cf_esempio(r.cognome, r.nome, r.nascita, r.donna, r.belfiore), r.indirizzo, r.cap, r.comune,
      r.provincia, r.opposizione, r.pagato_da)
    returning * into cl;
    chiavi := chiavi || r.chiave;
    ids := ids || cl.id;
  end loop;
  for r in
    select * from (values
      ('e1', 'Cooperativa Sociale Il Girasole (esempio)', '7654321000', true,  'Via dell''Industria 40', '20100', 'Milano', 'MI', 'amministrazione@girasole.example'),
      ('e2', 'Associazione Culturale Aurora (esempio)',   '1112223000', false, 'Via della Cultura 5',     '50100', 'Firenze', 'FI', 'aurora@pec.example')
    ) as t(chiave, denominazione, base_piva, sostituto, indirizzo, cap, comune, provincia, pec)
  loop
    insert into public.clienti (id, owner_id, tipo, denominazione, codice_fiscale, partita_iva, indirizzo, cap,
      comune, provincia, pec, codice_destinatario, sostituto_imposta)
    values (gen_random_uuid(), io, 'ente', r.denominazione, private.piva_esempio(r.base_piva),
      private.piva_esempio(r.base_piva), r.indirizzo, r.cap, r.comune, r.provincia, r.pec, '0000000', r.sostituto)
    returning * into cl;
    chiavi := chiavi || r.chiave;
    ids := ids || cl.id;
  end loop;
  insert into private.dati_esempio (owner_id, tabella, riga_id) select io, 'clienti', unnest(ids);
  n_clienti := cardinality(ids);

  -- Fatture del 2026 in ordine di data (la numerazione segue le date, come in emetti_fattura).
  -- tipo: fattura (emessa), nota (storno della fattura indicata in rif), bozza.
  -- righe: [{d, q, p, n}] (descrizione e natura predefinite: prestazione psicologica esente).
  -- incassi: [{g = giorni dopo la data, m = modalità, i = importo; senza i: quanto resta}]
  for r in
    select * from (values
      ( 1, date '2026-01-08', 'fattura', 'p1',  '[{"p":7000}]', '[{"g":0,"m":"carta_pos"}]', null::int),
      ( 2, date '2026-01-12', 'fattura', 'p2',  '[{"p":8000}]', '[{"g":2,"m":"bonifico"}]', null),
      ( 3, date '2026-01-19', 'fattura', 'p3',  '[{"q":4,"p":7500}]', '[{"g":3,"m":"bonifico"}]', null),
      ( 4, date '2026-01-26', 'fattura', 'p4',  '[{"p":9000}]', '[{"g":0,"m":"contanti"}]', null),
      ( 5, date '2026-02-03', 'fattura', 'p5',  '[{"p":8000}]', '[{"g":0,"m":"carta_pos"}]', null),
      ( 6, date '2026-02-09', 'fattura', 'p1',  '[{"q":2,"p":7000}]', '[{"g":4,"m":"bonifico"}]', null),
      ( 7, date '2026-02-16', 'fattura', 'p6',  '[{"p":7000}]', '[{"g":0,"m":"contanti"}]', null),
      ( 8, date '2026-02-23', 'fattura', 'e1',  '[{"d":"Consulenza psicologica organizzativa al personale","p":60000,"n":"imponibile"}]', '[{"g":30,"m":"bonifico"}]', null),
      ( 9, date '2026-03-02', 'fattura', 'p7',  '[{"p":9000}]', '[{"g":0,"m":"carta_pos"}]', null),
      (10, date '2026-03-09', 'fattura', 'p8',  '[{"p":8000}]', '[{"g":0,"m":"contanti"}]', null),
      (11, date '2026-03-12', 'fattura', 'p2',  '[{"p":8000}]', '[]', null),
      (12, date '2026-03-12', 'nota',    null,  null, '[]', 11),
      (13, date '2026-03-12', 'fattura', 'p10', '[{"p":8000}]', '[{"g":0,"m":"carta_pos"}]', null),
      (14, date '2026-03-23', 'fattura', 'p9',  '[{"q":4,"p":7000}]', '[{"g":5,"m":"bonifico"}]', null),
      (15, date '2026-04-06', 'fattura', 'p3',  '[{"q":4,"p":7500}]', '[{"g":2,"m":"bonifico"}]', null),
      (16, date '2026-04-14', 'fattura', 'p4',  '[{"p":9000}]', '[{"g":0,"m":"carta_pos"}]', null),
      (17, date '2026-04-20', 'fattura', 'p5',  '[{"p":8000}]', '[{"g":1,"m":"bonifico"}]', null),
      (18, date '2026-04-27', 'fattura', 'e2',  '[{"d":"Laboratorio formativo sulla comunicazione","p":40000,"n":"imponibile"}]', '[{"g":15,"m":"bonifico"}]', null),
      (19, date '2026-05-04', 'fattura', 'p6',  '[{"q":2,"p":7000}]', '[{"g":0,"m":"carta_pos"}]', null),
      (20, date '2026-05-11', 'fattura', 'p1',  '[{"q":2,"p":7000}]', '[{"g":3,"m":"bonifico"}]', null),
      (21, date '2026-05-18', 'fattura', 'p7',  '[{"p":9000}]', '[{"g":0,"m":"contanti"}]', null),
      (22, date '2026-05-25', 'fattura', 'p10', '[{"p":8000}]', '[{"g":0,"m":"carta_pos"}]', null),
      (23, date '2026-06-03', 'fattura', 'p2',  '[{"q":4,"p":8000}]', '[{"g":2,"m":"bonifico"}]', null),
      (24, date '2026-06-10', 'fattura', 'p8',  '[{"q":2,"p":8000}]', '[{"g":0,"m":"contanti"}]', null),
      (25, date '2026-06-17', 'fattura', 'p9',  '[{"q":4,"p":7000}]', '[{"g":4,"m":"bonifico"}]', null),
      (26, date '2026-06-24', 'fattura', 'e1',  '[{"d":"Formazione del personale sulla gestione dello stress","p":80000,"n":"imponibile"}]', '[{"g":45,"m":"bonifico"}]', null),
      (27, date '2026-07-01', 'fattura', 'p3',  '[{"q":4,"p":7500}]', '[{"g":3,"m":"bonifico"}]', null),
      (28, date '2026-07-08', 'fattura', 'p4',  '[{"p":9000}]', '[{"g":0,"m":"carta_pos"}]', null),
      (29, date '2026-07-15', 'fattura', 'p5',  '[{"p":8000},{"d":"Colloquio aggiuntivo","p":5000}]', '[{"g":0,"m":"carta_pos"}]', null),
      (30, date '2026-07-22', 'fattura', 'p6',  '[{"p":7000}]', '[{"g":0,"m":"contanti","i":4000}]', null),
      (31, date '2026-09-07', 'fattura', 'p1',  '[{"q":2,"p":7000}]', '[{"g":2,"m":"bonifico"}]', null),
      (32, date '2026-09-14', 'fattura', 'p7',  '[{"p":9000}]', '[{"g":0,"m":"carta_pos"}]', null),
      (33, date '2026-09-21', 'fattura', 'p10', '[{"q":4,"p":8000}]', '[{"g":5,"m":"bonifico","i":16000},{"g":33,"m":"bonifico","i":8000}]', null),
      (34, date '2026-09-28', 'fattura', 'p2',  '[{"p":8000}]', '[{"g":0,"m":"carta_pos"}]', null),
      (35, date '2026-10-05', 'fattura', 'p9',  '[{"q":4,"p":7000}]', '[{"g":3,"m":"bonifico"}]', null),
      (36, date '2026-10-12', 'fattura', 'p3',  '[{"q":4,"p":7500}]', '[{"g":2,"m":"bonifico"}]', null),
      (37, date '2026-10-19', 'fattura', 'e2',  '[{"d":"Incontro formativo per volontari","p":30000,"n":"imponibile"}]', '[]', null),
      (38, date '2026-10-26', 'fattura', 'p8',  '[{"p":8000}]', '[{"g":0,"m":"contanti"}]', null),
      (39, date '2026-11-02', 'fattura', 'p4',  '[{"p":9000}]', '[{"g":1,"m":"bonifico","i":5000}]', null),
      (40, date '2026-11-09', 'fattura', 'p5',  '[{"p":8000}]', '[]', null),
      (41, date '2026-11-16', 'fattura', 'p6',  '[{"q":2,"p":7000}]', '[]', null),
      (42, date '2026-11-18', 'fattura', 'e1',  '[{"d":"Supervisione all''équipe educativa","p":50000,"n":"imponibile"}]', '[]', null),
      (43, date '2026-11-20', 'fattura', 'p1',  '[{"p":7000}]', '[]', null),
      (44, date '2026-11-24', 'bozza',   'p2',  '[{"p":8000}]', '[]', null),
      (45, date '2026-11-26', 'bozza',   'p7',  '[{"q":4,"p":9000}]', '[]', null)
    ) as t(ordine, data, tipo, cliente, righe, incassi, rif)
    order by ordine
  loop
    id_fattura := gen_random_uuid();
    if r.tipo = 'nota' then
      -- storno totale di una fattura emessa per errore (stessa sequenza, la fattura diventa annullata)
      perform public.crea_nota_di_credito(id_per_ordine[r.rif], id_fattura, r.data);
    else
      select * into cl from public.clienti c where c.id = ids[array_position(chiavi, r.cliente)];
      perform private.esempio_bozza(io, id_fattura, r.data, cl,
        case when r.righe::jsonb -> 0 ->> 'n' = 'imponibile' then att_imponibile else att_esente end,
        r.righe::jsonb, p);
      if r.tipo = 'fattura' then
        perform public.emetti_fattura(id_fattura);
      end if;
    end if;
    id_per_ordine := id_per_ordine || id_fattura;
    n_fatture := n_fatture + 1;

    select f.netto into netto_f from public.fatture f where f.id = id_fattura;
    gia := 0;
    for inc in select value from jsonb_array_elements(r.incassi::jsonb) loop
      importo := coalesce((inc ->> 'i')::bigint, netto_f - gia);
      insert into public.incassi (id, owner_id, fattura_id, data, importo, modalita, tracciabile)
      values (gen_random_uuid(), io, id_fattura, r.data + (inc ->> 'g')::int, importo,
        (inc ->> 'm')::public.modalita_incasso, inc ->> 'm' <> 'contanti');
      gia := gia + importo;
      n_incassi := n_incassi + 1;
    end loop;
  end loop;

  -- Versamenti ENPAP finti del 2026 (deducibili nell'anno in cui si pagano; l'integrativo no)
  for r in
    select * from (values
      (date '2026-03-01', 26000, 'soggettivo'),
      (date '2026-06-01', 26000, 'soggettivo'),
      (date '2026-09-01', 26000, 'soggettivo'),
      (date '2026-03-01', 6000,  'integrativo'),
      (date '2026-03-01', 1300,  'maternita')
    ) as t(data, importo, tipo)
  loop
    id_fattura := gen_random_uuid();
    insert into public.versamenti_previdenza (id, owner_id, data, importo, tipo, cassa, anno_reddito)
    values (id_fattura, io, r.data, r.importo, r.tipo::public.tipo_contributo, 'enpap', 2026);
    insert into private.dati_esempio (owner_id, tabella, riga_id) values (io, 'versamenti_previdenza', id_fattura);
    n_versamenti := n_versamenti + 1;
  end loop;

  return query select n_clienti, n_fatture, n_incassi, n_versamenti;
end;
$$;
revoke all on function public.carica_dati_esempio() from public, anon;
grant execute on function public.carica_dati_esempio() to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Pulizia: cancella_dati_prova toglie anche i dati d'esempio
-- ---------------------------------------------------------------------------
-- Chiamata da cancella_dati_prova dopo aver tolto fatture e incassi. Toglie sempre clienti e versamenti
-- d'esempio (sono finti, non devono arrivare in produzione); attività e profilo creati dall'esempio solo
-- se l'utente non li ha mai modificati (versione 1): se li ha completati con i suoi dati, restano.
-- Restituisce quanti clienti e attività ha tolto. Le CU e gli altri dati dell'utente non si toccano.
create or replace function private.cancella_dati_esempio()
returns int language plpgsql security definer set search_path = '' as $$
declare
  io uuid := auth.uid();
  n int;
  tolti int := 0;
begin
  -- security definer: le regole di accesso non valgono, quindi le controlla da sé (come carica_dati_esempio)
  if io is null or (select auth.jwt() ->> 'aal') is distinct from 'aal2' or not private.accesso_completo_valido() then
    raise exception 'accesso_negato' using errcode = '42501';
  end if;
  perform private.richiedi_prova();
  delete from public.versamenti_previdenza v using private.dati_esempio m
    where m.owner_id = io and m.tabella = 'versamenti_previdenza' and v.id = m.riga_id and v.owner_id = io;
  delete from public.clienti c using private.dati_esempio m
    where m.owner_id = io and m.tabella = 'clienti' and c.id = m.riga_id and c.owner_id = io
      and not exists (select 1 from public.fatture f where f.cliente_id = c.id);
  get diagnostics n = row_count;
  tolti := tolti + n;
  delete from public.attivita a using private.dati_esempio m
    where m.owner_id = io and m.tabella = 'attivita' and a.id = m.riga_id and a.owner_id = io and a.versione = 1
      and not exists (select 1 from public.fatture f where f.attivita_id = a.id);
  get diagnostics n = row_count;
  tolti := tolti + n;
  delete from public.profilo_professionale pp using private.dati_esempio m
    where m.owner_id = io and m.tabella = 'profilo_professionale' and pp.id = m.riga_id and pp.owner_id = io
      and pp.versione = 1;
  delete from private.dati_esempio m where m.owner_id = io;
  return tolti;
end;
$$;
revoke all on function private.cancella_dati_esempio() from public, anon;
grant execute on function private.cancella_dati_esempio() to authenticated;

-- Stessa firma e comportamento della 20261122000100, più la pulizia dei dati d'esempio
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
  perform set_config('fiscal.operazione', '', true);
  return query select n_fatture, n_incassi, n_anagrafiche;
end;
$$;
