-- Specifica 009, US4 (T007): impronte delle righe di ogni pacchetto per il confronto riga per riga.
-- Solo impronte SHA-256 abbreviate (chiave e riga), mai contenuti: nessun nome né importo nello storico.
alter table public.pacchetti
  add column impronte jsonb not null default '{}' check (jsonb_typeof(impronte) = 'object'),
  add column giustificativi int not null default 0 check (giustificativi >= 0);
