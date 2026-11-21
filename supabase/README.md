# Supabase di Fiscal

Contenuto:
- `config.toml`: impostazioni del progetto (registrazioni chiuse, un solo secondo fattore, JWT 15 min,
  limiti di tentativi, funzioni Edge).
- `migrations/`: schema e regole di accesso (sicurezza di base, registro eventi, recupero).
- `functions/`: funzioni Edge del recupero (`recovery-codes`, `recovery-code`, `recovery-phrase`) e parti comuni.
- `tests/database/`: test pgTAP (regole per riga, tabelle future, conformità, recupero, eventi).
- `templates/nuova_tabella.sql`: modello per ogni tabella futura.

**Nessun segreto in questa cartella**: il repository è pubblico. I segreti stanno solo nei
"secrets" delle funzioni su Supabase (progetto vero) o in `functions/.env` (solo locale, ignorato da git).

**Stato (2026-11-21)**: migrazioni 0100 e 0200 applicate al progetto vero; 0300 (recupero) da applicare.
Funzioni Edge da distribuire (vedi sotto).

## Prove in locale

```text
supabase start
supabase test db                                   # regole del database
node scripts/env-funzioni-locali.mjs               # segreti di prova (pepe casuale, posta finta Mailpit)
supabase functions serve --env-file supabase/functions/.env   # in un altro terminale
npm run test:integration                           # accesso, estraneo, recupero
npm run build:e2e && npm run test:e2e              # percorsi nel browser
```

## Segreti delle funzioni (progetto vero)

Da impostare UNA volta con `supabase secrets set NOME=valore` (mai scriverli in un file del repository):

| Segreto | Cosa è | Esempio di valore |
|---|---|---|
| `RECOVERY_PEPPER` | "pepe" segreto dei codici di recupero (32 byte casuali). Se cambia, i codici esistenti smettono di valere | generato con `openssl rand -base64 32` |
| `ORIGINI_CONSENTITE` | siti che possono chiamare le funzioni | `https://fiscal.soarlyai.com` |
| `AVVISO_SMTP_HOST` | server di posta per l'avviso di ripristino | `smtp.gmail.com` |
| `AVVISO_SMTP_PORT` | porta (Supabase blocca 25 e 587: usare 465) | `465` |
| `AVVISO_SMTP_SECURE` | connessione cifrata | `true` |
| `AVVISO_SMTP_USER` | utente della casella che spedisce | il tuo indirizzo Gmail |
| `AVVISO_SMTP_PASS` | password per le app della casella (non la password normale) | da Google → Sicurezza → Password per le app |
| `AVVISO_MITTENTE` | mittente mostrato | `Fiscal <il tuo indirizzo>` |

Senza SMTP funzionante la frase di recupero **non** avvia nessun ripristino (risposta "avviso non inviabile"):
i codici di recupero invece funzionano lo stesso.

## Distribuzione sul progetto vero (azione dell'utente, T074)

```text
supabase db push --remote                      # migrazione 0300 (recupero)
supabase secrets set RECOVERY_PEPPER=... ORIGINI_CONSENTITE=https://fiscal.soarlyai.com AVVISO_SMTP_HOST=smtp.gmail.com AVVISO_SMTP_PORT=465 AVVISO_SMTP_SECURE=true AVVISO_SMTP_USER=... AVVISO_SMTP_PASS=... AVVISO_MITTENTE=...
supabase functions deploy                     # distribuisce le tre funzioni sul progetto collegato
```

## Ripristino da amministratore (ultima risorsa, T075)

Solo se si sono persi **tutti**: telefono con Google Authenticator, codici di recupero e frase di recupero.
Lo fa solo il proprietario, entrando nel pannello Supabase con la **verifica in due passaggi del proprio
account Supabase**:

1. Aprire https://supabase.com/dashboard → progetto Soarlyai → **Authentication → Users**.
2. Aprire il proprio utente → sezione **Multi-Factor Authentication** (fattori) → eliminare il fattore TOTP.
3. Entrare in Fiscal con e-mail e password: l'app chiede di collegare un telefono nuovo e mostra nuovi
   codici di recupero. Impostare anche una nuova frase dalle impostazioni di sicurezza.

È lo stesso testo che l'app mostra nella pagina di recupero ("Hai perso tutto?"). Chi ha accesso
amministrativo al progetto può fare questo passaggio: per questo l'account Supabase deve avere la 2FA e
nessun altro membro.
