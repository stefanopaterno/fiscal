-- Specifica 006, FR-011 (T008): obiettivo di netto dell'anno, accanto all'obiettivo di fatturato.
alter table public.ipotesi_previsione add column obiettivo_netto bigint check (obiettivo_netto > 0);
