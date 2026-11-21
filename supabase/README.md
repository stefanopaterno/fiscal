# Supabase di My Fiscal

Contenuto: `config.toml` (impostazioni del progetto), `migrations/` (schema e regole di accesso),
`tests/database/` (test pgTAP). Nessun segreto in questa cartella: il repository è pubblico.

**Stato**: scritti ma **mai eseguiti** (nessun Postgres né Supabase CLI al momento della stesura).

## Passi da fare (nell'ordine)

1. Installare Docker Desktop e la Supabase CLI (`brew install supabase/tap/supabase`).
2. Provare in locale: `supabase start`, poi `supabase test db`. Correggere gli eventuali errori.
3. Nel pannello del progetto (https://supabase.com/dashboard) **prima** di disattivare le
   registrazioni: creare il proprio utente (Authentication > Users > Add user), con password
   lunga (12+ caratteri) e e-mail confermata.
4. Accedere alla CLI: `supabase login`, poi `supabase link --project-ref aldiyymgvngvdrroluus`.
5. Sostituire `site_url` in `config.toml` con l'indirizzo reale del sito, poi
   `supabase config push` (applica registrazioni disattivate, un solo fattore MFA, JWT a 15 min).
6. Applicare lo schema: `supabase db push`.
7. Verifiche nel pannello: regione del progetto (preferibilmente UE), 2FA sul tuo account
   Supabase, accordo sul trattamento dei dati (DPA), SMTP configurato per gli avvisi.
8. Prove tecniche S1 e S3 di `specs/002-accesso-protetto-2fa/research.md`.

Le funzioni Edge di recupero (`recovery-code`, `recovery-phrase`) non sono ancora scritte:
si fanno nella fase di implementazione, con i loro test.
