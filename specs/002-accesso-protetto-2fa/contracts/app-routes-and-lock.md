# Contratto: percorsi dell'app, stati di blocco e coda offline

**Piano**: [../plan.md](../plan.md) | **Spec**: [../spec.md](../spec.md)

Tutti i percorsi stanno sotto `/app` (la radice del sito resta la pagina di cortesia). Ogni
percorso è una pagina vera (esportata come HTML statico, `trailingSlash: true`).

## Percorsi

| Percorso | Accesso | Scopo |
|---|---|---|
| `/app/` | pubblico | smista: senza sessione → `/app/accesso/`; con sessione completa → `/app/home/` |
| `/app/accesso/` | pubblico | email e password (nessun testo che riveli se l'utente esiste) |
| `/app/accesso/secondo-fattore/` | `aal1` | codice a 6 cifre dell'app di autenticazione |
| `/app/accesso/configura/` | `aal1` senza fattore | QR del secondo fattore, conferma, **codici di recupero mostrati una volta**, richiesta di conferma, impostazione frase di recupero |
| `/app/accesso/recupero/` | `aal1` | scelta: codice di recupero oppure frase di recupero; stato della richiesta con attesa |
| `/app/blocco/` | sessione valida ma bloccata | sblocco rapido o login completo; nessun importo visibile |
| `/app/home/` | `aal2` | segnaposto protetto (le funzioni arrivano con le altre specifiche) |
| `/app/impostazioni/sicurezza/` | `aal2` | password, secondo fattore, codici, frase, tempi di blocco e di accesso completo, sblocco rapido, sessioni, registro eventi |

**Regola di protezione**: ogni pagina "`aal2`" è un componente client che, prima di mostrare
qualunque contenuto, verifica la sessione e il livello `aal2`; l'HTML esportato non contiene mai
dati dell'utente (solo scheletro). Senza sessione valida reindirizza al login. La protezione vera
resta nel database (policy restrittive): l'interfaccia è solo comodità.

## Macchina a stati di accesso (client)

```text
anonimo ──password ok──▶ aal1 ──nessun fattore──▶ configura ──verifica──▶ completo (aal2)
                          │                                                   │ ▲
                          └──codice a 6 cifre ok──────────────────────────────┘ │
completo ──inattività / background──▶ bloccato ──sblocco rapido (entro N giorni)──┘
bloccato ──login completo (password + codice)──▶ completo
completo ──logout / sessione chiusa / scadenza 14 gg──▶ anonimo
aal1 ──codice di recupero──▶ aal1 senza fattore ──▶ configura
aal1 ──frase + attesa 48 h──▶ aal1 senza fattore ──▶ configura (+ nuova frase)
```

Regole:
- **Bloccato** significa: importi nascosti, memoria svuotata dei dati, token cifrato sul
  dispositivo. Il blocco scatta dopo `blocco_minuti` di inattività e subito quando l'app va in
  background (evento di visibilità).
- **Sblocco rapido** valido solo se: attivo nelle impostazioni, il browser supporta WebAuthn con
  PRF, l'ultimo accesso completo è entro `accesso_completo_giorni`, il dispositivo è lo stesso su
  cui è stato attivato. Dopo 3 rifiuti consecutivi chiede il login completo.
- **Sempre login completo** (mai sblocco rapido): nuovo dispositivo, accesso completo scaduto,
  cambio password, rigenerazione codici, esportazione dati, disattivazione 2FA, modifica frase.
- **Modalità "occhio"**: stato locale che nasconde importi e nomi (FR-011); si ripristina bloccato
  all'avvio.

## Coda degli inserimenti senza rete

**Interfaccia del modulo** `src/features/offline-queue`:

```ts
interface VoceCoda {
  id: string;            // UUID generato sul dispositivo = chiave primaria nel database
  tabella: string;
  operazione: 'inserisci' | 'modifica';
  versioneBase?: number; // per le modifiche: versione che l'utente stava vedendo
  payload: unknown;      // cifrato a riposo (AES-GCM, chiave non esportabile)
  creataIl: string;
  stato: 'in_attesa' | 'inviata' | 'in_conflitto';
  tentativi: number;
}

accoda(voce): Promise<void>
svuotaVersoServer(): Promise<{ inviate: number; conflitti: VoceCoda[] }>
risolviConflitto(id, scelta: 'mia' | 'server'): Promise<void>
pulisci(): Promise<void>   // chiamata al logout e alla chiusura della sessione
```

**Invio**: richiede sessione `aal2` valida; se l'app è bloccata o la sessione scaduta la coda
aspetta il nuovo accesso (FR-014, edge case). L'invio è idempotente (`on conflict (id) do nothing`
per gli inserimenti; per le modifiche `where versione = versioneBase`). Nessun dato è mai perso:
una voce esce dalla coda solo dopo conferma del database. Segnali visibili all'utente:
"in attesa di invio", "inviato", "in conflitto" con le due versioni.

**Non fa mai**: copiare l'intero database sul dispositivo; memorizzare risposte di Supabase nella
cache del service worker (le richieste verso il progetto sono sempre `NetworkOnly`).

## Aiuto contestuale (specifica 011)

Ogni schermata e campo di questo contratto avrà il suo aiuto in linguaggio semplicissimo; i
testi degli aiuti di accesso e sicurezza si scrivono insieme alle schermate (non in un secondo
momento).
