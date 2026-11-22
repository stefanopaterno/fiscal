-- Specifica 003 (FR-031): scelta del professionista sul contributo integrativo ENPAP.
-- false = in aggiunta al prezzo (lo paga il paziente); true = compreso nel prezzo (scorporo, a carico del
-- professionista). In entrambi i casi il contributo compare in fattura e si versa all'ENPAP.
alter table public.profilo_professionale
  add column integrativo_compreso boolean not null default false;
