# Guida di verifica: Accesso protetto con 2FA

**Piano**: [plan.md](plan.md) | **Modello**: [data-model.md](data-model.md) | **Contratti**: [contracts/](contracts/)

Serve a controllare, a funzione completata, che tutto funzioni. Non contiene codice di
implementazione: i dettagli stanno in `tasks.md` e nel codice.

## Prerequisiti

- Node.js 24 LTS e npm; Docker in esecuzione; Supabase CLI.
- Progetto Supabase configurato: registrazioni disattivate, un solo fattore MFA per utente,
  durata del token 15 minuti, SMTP configurato per l'avviso di ripristino.
- File locale **non versionato** `.env.local` con soli `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chiave pubblica). La chiave `service_role` e il pepper sono
  solo nei segreti di Supabase.

## 1. Prove tecniche iniziali (prima di tutto il resto)

Eseguire S1, S3, S5, S6, S4, S2 di [research.md](research.md) e annotare l'esito in fondo a
quel file. Se una prova fallisce, applicare il ripiego indicato prima di procedere.

## 2. Controlli automatici

```text
npm run typecheck        # TypeScript strict senza errori
npm test                 # Vitest: unitari
supabase start           # stack locale
supabase test db         # pgTAP: RLS e policy aal2 su ogni tabella
npm run test:integration # login, MFA, recupero, limiti, registrazione rifiutata
npm run test:e2e         # Playwright, schermo 360 px
npm run build            # esportazione statica in out/
npm run scan:secrets     # nessun segreto nel repository né in out/
```

**Esito atteso**: tutto verde; `out/index.html` e `out/robots.txt` identici ai file alla radice
(stessa impronta); `out/` non contiene `service_role` né dati personali.

## 3. Scenari da provare a mano (da telefono e da PC)

| # | Scenario | Esito atteso |
|---|---|---|
| 1 | Primo accesso: password, configurazione del secondo fattore con Google Authenticator | compaiono i codici di recupero una sola volta e viene chiesta la conferma |
| 2 | Accesso con sola password | nessun dato visibile; richiesto il codice (SC-001) |
| 3 | Accesso con password + codice | si arriva alla home in meno di 30 secondi (SC-004) |
| 4 | Chiamata diretta all'API con sola chiave pubblica, senza login | 0 righe su ogni tabella (SC-002) |
| 5 | Inattività di 5 minuti / app in background | l'app si blocca e nasconde gli importi (SC-007) |
| 6 | Sblocco rapido con Face ID o impronta entro 14 giorni | si rientra senza password e codice |
| 7 | Cambio password, nuovo dispositivo, rigenerazione codici | richiesto il login completo; lo sblocco rapido non è accettato |
| 8 | Perdita simulata del secondo fattore: uso di un codice di recupero | si rientra, si configura il nuovo fattore, nessun dato perso; il codice non si riusa (SC-006) |
| 9 | Perdita di fattore e codici: frase di recupero | parte l'attesa di 48 ore con avviso (banner + e-mail); un accesso valido la annulla |
| 10 | Frase errata 5 volte | blocco di 24 ore con avviso |
| 11 | Rete spenta durante un inserimento di prova | la voce resta "in attesa di invio"; alla riaccensione parte senza duplicati |
| 12 | Elenco sessioni: chiusura di quella del PC dal telefono | il PC deve rifare l'accesso (dopo la scadenza del token, max 15 minuti) |
| 13 | Tentativo di registrazione di un nuovo utente | rifiutato |
| 14 | Visita di `https://<sito>/` | si vede la pagina di cortesia "Soarlyai project", identica a prima |

## 4. Criteri di uscita

La funzione è finita quando: tutti i controlli del punto 2 sono verdi, gli scenari 1-14 hanno
l'esito atteso, le prove tecniche sono registrate, e `.specify/memory/constitution.md` ha i
`TODO` chiusi da questo piano (`STACK_UI`, `OFFLINE_CODA`, `RECUPERO_ATTESA`, `PWA_NEXT`)
aggiornati con le decisioni prese.
