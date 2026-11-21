-- pgTAP (T023, specifica 003, SC-007, FR-017): nessuna tabella ha campi per dati clinici
-- (note libere, diagnosi, anamnesi, terapie). Le fatture contengono solo i dati per la fattura.
begin;
select plan(1);

select is(
  (select array_agg(table_name || '.' || column_name order by table_name, column_name)
   from information_schema.columns
   where table_schema = 'public'
     and column_name ~* '(nota|note|diagnos|anamnes|terapi|clinic|sintom|patolog|farmac)'),
  null,
  'nessuna colonna per note o dati clinici nelle tabelle dell''utente');

select * from finish();
rollback;
