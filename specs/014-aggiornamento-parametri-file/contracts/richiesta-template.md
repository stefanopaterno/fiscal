# Richiesta di aggiornamento dei parametri fiscali — Fiscal

> Bozza del documento che Fiscal genera con «Prepara aggiornamento». I valori qui sotto sono quelli in uso al
> 26/11/2026 (regole 2027 del programma); nel documento vero li riempie l'app al momento. `{{regione}}` e
> `{{comune}}` sono sostituiti solo se impostati nel profilo. Il catalogo completo ha ~60 voci: qui ne sono
> mostrate alcune per area.

---

## 1. Prompt (copia tutto il documento e incollalo a Claude)

Sei un esperto di fiscalità italiana delle persone fisiche. Devi aggiornare i parametri fiscali di un'app di
contabilità personale per uno **psicologo iscritto ENPAP, in regime ordinario (contabilità semplificata), che è
anche lavoratore dipendente**. Anni richiesti: **2027**. Data di oggi: **26/11/2026**.

Per ogni parametro del catalogo (sezione 3):

1. Cerca il valore in vigore per l'anno o dalla data indicata **sulle fonti ufficiali** della sezione 4
   (Gazzetta Ufficiale, Normattiva, Agenzia delle Entrate, Dipartimento delle Finanze, ENPAP, INPS, sito della
   regione e del comune). Usa siti divulgativi solo per orientarti, mai come fonte.
2. Inserisci la voce nel file **solo se** il valore è diverso da quello in uso **oppure** se hai trovato una fonte
   ufficiale che conferma un valore oggi «da verificare». Se non trovi una fonte, **non inserire la voce**: non
   indovinare.
3. Per ogni voce indica la fonte esatta: titolo dell'atto, articolo/comma, collegamento `https://` alla pagina
   ufficiale, data dell'atto.
4. `stato_norma`: `in_vigore` solo se l'atto è pubblicato e in vigore; `approvata_non_pubblicata` (es. legge
   approvata non ancora in Gazzetta); `proposta` (disegno di legge, bozza di delibera).
5. `stato_proposto`: `verificata` solo con fonte ufficiale e norma in vigore; altrimenti `da_verificare`.
6. Usa **esattamente** le chiavi e le unità del catalogo: percentuali come numeri (23 = 23%), euro con il punto
   decimale (2.00), date `AAAA-MM-GG`.
7. Le novità che non sono un semplice cambio di valore (una detrazione nuova, un'imposta nuova, un calcolo
   diverso, una regola che non è nel catalogo) mettile in `modifiche_programma`.
8. In `fonti_controllate` elenca le fonti che hai consultato e se erano raggiungibili.
9. Rispondi con **solo** il file JSON nel formato della sezione 5, dentro un blocco ```json. Nessun altro testo.

## 2. Da controllare per primi (oggi «da verificare»)

| Chiave | Anno | Valore in uso | Perché è da verificare |
|---|---|---|---|
| `irpef.scaglioni` | 2027 | 23% fino a 28.000 €; 33% fino a 55.000 €; 43% oltre | DDL di Bilancio 2027, non ancora in Gazzetta |
| `enpap.aliquota_soggettivo` | 2027 | 12% | Riforma ENPAP: +1 punto l'anno, interpretazione da confermare |
| `enpap.minimo_soggettivo` | 2027 | — (mancante) | Non ancora pubblicato da ENPAP |
| `enpap.maternita` | 2027 | — (mancante) | Non ancora pubblicato da ENPAP |
| `irpef.acconti` | 2027 | 100%; soglie 51,65 € e 257,52 €; prima rata 40% (50% con ISA) | Da riscontrare sulle istruzioni Redditi PF |
| `addizionali.regionale.scaglioni` | 2027 | (aliquote del profilo) | Delibera regionale non ancora controllata |

## 3. Catalogo dei parametri (estratto)

**Decorrenza**: «anno» = vale per tutto l'anno d'imposta (usa `anno`); «data» = vale per le operazioni da quella
data in poi (usa `dal`); «anno solare» = scadenza di quell'anno (usa `anno`).

### IRPEF

| Chiave | Unità | Decorrenza | Valore in uso 2027 | Stato |
|---|---|---|---|---|
| `irpef.scaglioni` | scaglioni (`fino_a` in euro, `aliquota` in %) | anno | `[{fino_a: 28000, aliquota: 23}, {fino_a: 55000, aliquota: 33}, {fino_a: null, aliquota: 43}]` | da verificare |
| `irpef.detrazione_lavoro` | oggetto (euro) | anno | fisso 1.955; base 1.910 + 1.190; soglie 15.000 / 28.000 / 50.000; maggiorazione 65 tra 25.000 e 35.000 | da verificare |
| `irpef.ulteriore_detrazione` | oggetto (euro) | anno | 1.000 oltre 20.000, piena fino a 32.000, zero a 40.000 | da verificare |

### Acconti e versamenti

| Chiave | Unità | Decorrenza | Valore in uso 2027 | Stato |
|---|---|---|---|---|
| `irpef.acconti` | oggetto | anno | 100%; 51,65; 257,52; 40/60 (ISA 50/50); comunale 30% | da verificare |
| `irpef.rateizzazione` | oggetto | anno | 7 rate; interessi per rata 0 / 0,18 / 0,51 / … / 1,83 % | da verificare |

### ENPAP

| Chiave | Unità | Decorrenza | Valore in uso 2027 | Stato |
|---|---|---|---|---|
| `enpap.aliquota_soggettivo` | percentuale | anno | 12 | da verificare |
| `enpap.minimo_soggettivo` | euro | anno | — | da verificare |
| `enpap.minimo_integrativo` | euro | anno | — | da verificare |
| `enpap.maternita` | euro | anno | — | da verificare |

### Fatturazione

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `fattura.aliquota_integrativo` | percentuale | data | 4 (dal 2027-01-01) | verificata |
| `fattura.aliquota_iva` | percentuale | data | 22 | verificata |
| `fattura.soglia_bollo` | euro | data | 77.47 | verificata |
| `fattura.importo_bollo` | euro | data | 2.00 | verificata |
| `fattura.aliquota_ritenuta` | percentuale | data | 20 | verificata |

### Spese e oneri (estratto)

| Chiave | Unità | Decorrenza | Valore in uso 2027 | Stato |
|---|---|---|---|---|
| `spese.categoria.telefonia.percentuale` | percentuale | anno | 80 | verificata |
| `spese.categoria.vitto_alloggio.percentuale` | percentuale | anno | 75 | verificata |
| `spese.categoria.vitto_alloggio.tetto_su_compensi` | percentuale | anno | 2 | verificata |
| `spese.onere.spese_sanitarie.franchigia` | euro | anno | 129.11 | verificata |

### Scadenze e codici tributo (estratto)

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `scadenze.saldo_acconto.data` | mese-giorno | anno solare | 06-30 | verificata |
| `scadenze.secondo_acconto.data` | mese-giorno | anno solare | 11-30 | verificata |
| `f24.irpef_saldo` | codice | data | 4001 | verificata |
| `f24.irpef_primo_acconto` | codice | data | 4033 | verificata |
| `f24.irpef_secondo_acconto` | codice | data | 4034 | verificata |

### Addizionali ({{regione}}, comune di {{comune}})

| Chiave | Unità | Decorrenza | Valore in uso 2027 | Stato |
|---|---|---|---|---|
| `addizionali.regionale.scaglioni` | scaglioni | anno | (dal profilo) | da verificare |
| `addizionali.comunale.aliquota` | percentuale | anno | (dal profilo) | da verificare |
| `addizionali.comunale.soglia_esenzione` | euro | anno | (dal profilo) | da verificare |

## 4. Fonti ufficiali da consultare

| Area | Fonti |
|---|---|
| IRPEF, detrazioni, acconti | gazzettaufficiale.it, normattiva.it, agenziaentrate.gov.it (istruzioni Modello Redditi PF e CU) |
| ENPAP | enpap.it (delibere, regolamento contributi, comunicazioni) |
| Fatturazione, bollo, F24 | agenziaentrate.gov.it (risoluzioni sui codici tributo, provvedimenti), fatturapa.gov.it |
| Spese e oneri | agenziaentrate.gov.it (circolari, guide), normattiva.it (TUIR) |
| Addizionali | finanze.gov.it (sezione addizionali regionali e comunali), sito di {{regione}} e del comune di {{comune}} |

## 5. Formato della risposta

Schema completo: `file-aggiornamento.schema.json` (versione 1). Esempio:

```json
{
  "versione_schema": 1,
  "data_ricerca": "2027-01-10",
  "anni": [2027],
  "voci": [
    {
      "chiave": "irpef.scaglioni",
      "anno": 2027,
      "valore": [
        { "fino_a": 28000, "aliquota": 23 },
        { "fino_a": 55000, "aliquota": 33 },
        { "fino_a": null, "aliquota": 43 }
      ],
      "fonte": {
        "titolo": "Legge di Bilancio 2027",
        "riferimento": "art. 1, comma …",
        "url": "https://www.gazzettaufficiale.it/…",
        "data_atto": "2026-12-30"
      },
      "stato_proposto": "verificata",
      "stato_norma": "in_vigore",
      "nota": "Confermato il 33% fino a 55.000 € per il 2027."
    }
  ],
  "modifiche_programma": [],
  "fonti_controllate": [
    { "nome": "Gazzetta Ufficiale", "url": "https://www.gazzettaufficiale.it/", "raggiunta": true }
  ]
}
```

> L'esempio mostra la forma, non un valore reale: i riferimenti con «…» vanno sostituiti con quelli veri.
