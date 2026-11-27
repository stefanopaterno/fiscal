# Contratto: guide agli adempimenti

## Catalogo delle 22 guide

| id | Gruppo | Titolo | Frequenza | Pertinenza | Valori citati (segnaposto) | Apri in Fiscal | Disegno |
|---|---|---|---|---|---|---|---|
| `apertura-piva` | apertura | Aprire la partita IVA | una volta | sempre | `adempimenti.codice_ateco` | Impostazioni → Attività | inizio_attivita |
| `iscrizione-enpap` | apertura | Iscriversi a ENPAP come libero professionista | una volta | sempre | `adempimenti.giorni_iscrizione_enpap` | — | — |
| `accesso-sts` | apertura | Accedere al Sistema Tessera Sanitaria | una volta | sts | — | Adempimenti | — |
| `ricevere-fatture` | apertura | Ricevere le fatture elettroniche (codice destinatario o PEC) | una volta | sempre | — | Documenti | — |
| `ordine-pec` | apertura | PEC e dati all'Ordine | una volta | sempre | — | — | — |
| `emettere-fattura` | fattura | Emettere la fattura elettronica esente | ogni fattura | sempre | `adempimenti.natura_esente`, `fattura.soglia_bollo`, `fattura.importo_bollo`, `fattura.aliquota_integrativo`, `fattura.aliquota_ritenuta` | Fatture → Nuova | fattura |
| `opposizione-sts` | fattura | Opposizione del paziente all'invio al Sistema TS | se serve | sts | — | Clienti | — |
| `invio-sts` | fattura | Inviare le spese al Sistema TS | ogni mese | sts | `scadenza.sts_01`… | Adempimenti | — |
| `nota-credito` | fattura | Nota di credito (storno o rimborso) | se serve | sempre | — | Fatture | — |
| `f24-tasse` | versamenti | Pagare le tasse con l'F24 | ogni anno | sempre | `f24.irpef_saldo`, `f24.irpef_primo_acconto`, `f24.irpef_secondo_acconto`, `f24.addizionale_regionale`, `f24.addizionale_comunale_acconto`, `f24.addizionale_comunale_saldo`, `scadenza.saldo_acconto`, `scadenza.secondo_acconto` | Tasse → Versamenti | f24 |
| `f24-bollo` | versamenti | Pagare il bollo delle fatture elettroniche | ogni trimestre | bollo | `f24.bollo_t1..t4`, `scadenza.bollo_t1..t4`, `adempimenti.soglia_accorpamento_bollo` | Adempimenti | f24 |
| `contributi-enpap` | versamenti | Pagare i contributi ENPAP | ogni anno | sempre | `scadenza.enpap`, `enpap.aliquota_soggettivo`, `fattura.aliquota_integrativo` | Tasse | — |
| `iva-periodica` | versamenti | Liquidazione e versamento IVA | ogni trimestre | iva | `f24.iva_t1..t3`, `f24.iva_acconto`, `f24.iva_saldo`, `scadenza.iva_*` | Fatture → riepilogo IVA | f24 |
| `rateizzare` | versamenti | Rateizzare saldo e primo acconto | se serve | sempre | `f24.interessi_rateizzazione` | Tasse → Strategia | f24 |
| `ravvedimento` | versamenti | Rimediare a un versamento dimenticato o sbagliato | se serve | sempre | `f24.ravv_*`, `f24.bollo_sanzione`, `f24.bollo_interessi` | Tasse → Versamenti | f24 |
| `redditi-pf` | dichiarazioni | Dichiarazione dei redditi con partita IVA (Redditi PF) | ogni anno | sempre | `scadenza.redditi_invio`, `scadenza.precompilata` | Dichiarazione | redditi |
| `dichiarazione-enpap` | dichiarazioni | Comunicazione annuale dei redditi a ENPAP | ogni anno | sempre | `scadenza.enpap` | Dichiarazione | — |
| `dichiarazione-iva` | dichiarazioni | Dichiarazione IVA: quando non serve e quando sì | ogni anno | iva | `scadenza.iva_dichiarazione` | — | — |
| `cu-ricevute` | dichiarazioni | Le CU dei clienti sostituti d'imposta | ogni anno | sempre | `fattura.aliquota_ritenuta`, `scadenza.cu_rilascio` | Tasse → Dati dell'anno | — |
| `variare-piva` | particolari | Cambiare i dati della partita IVA | se serve | sempre | `adempimenti.codice_ateco` | Impostazioni → Attività | inizio_attivita |
| `chiudere-piva` | particolari | Chiudere la partita IVA | se serve | sempre | — | Dichiarazione | inizio_attivita |
| `avviso-irregolarita` | particolari | Una comunicazione dall'Agenzia delle Entrate | se serve | sempre | — | Tasse → Versamenti | — |

## Esempio completo: `f24-tasse` (forma, non testo definitivo)

- **In breve**: con l'F24 paghi saldo e acconti di IRPEF e addizionali. Con la partita IVA si paga solo online.
- **Quando**: saldo e primo acconto entro il {{scadenza.saldo_acconto}}; secondo acconto entro il {{scadenza.secondo_acconto}}.
  Il primo anno di partita IVA niente acconti (vedi il calendario).
- **Dove si fa**: home banking o servizi online dell'Agenzia delle Entrate (F24 web), con SPID o CIE.
- **Cosa ti serve**: gli importi dalla pagina Tasse → Versamenti; il codice fiscale; l'IBAN se paghi da F24 web.
- **Passo per passo**: 1) apri l'F24 «ordinario»; 2) contribuente: codice fiscale e dati anagrafici; 3) sezione
  Erario: una riga per tributo; 4) sezione Regioni ed enti locali: addizionali; 5) controlla i totali; 6) paga e
  scarica la quietanza.
- **Cosa scrivere** (sezione Erario): IRPEF saldo `{{f24.irpef_saldo}}`, anno = anno dei redditi; primo acconto
  `{{f24.irpef_primo_acconto}}`, anno = anno in corso; secondo acconto `{{f24.irpef_secondo_acconto}}`. Sezione
  Regioni: addizionale regionale `{{f24.addizionale_regionale}}` con il codice della regione; sezione IMU e altri
  tributi locali: addizionale comunale saldo `{{f24.addizionale_comunale_saldo}}` e acconto
  `{{f24.addizionale_comunale_acconto}}` con il codice catastale del comune.
- **Errori comuni**: anno di riferimento sbagliato tra saldo e acconto; addizionale comunale nella sezione sbagliata;
  pagare con F24 cartaceo (non ammesso con partita IVA).
- **Fonte**: Agenzia delle Entrate, codici tributo F24; art. 37 c. 49 DL 223/2006. Stato: verificata.
- **Apri in Fiscal**: Tasse → Versamenti.
- **Disegno**: F24 con caselle 2 (contribuente), 3 (Erario), 4 (Regioni / IMU e tributi locali), 5 (totali).
