<!-- Output reale di `generaRichiesta` (src/engine/parametri/richiesta.ts) al 26/11/2026, anno 2027, con regione e comune di esempio e aliquote di esempio: nessun dato personale. Si rigenera dalla pagina Parametri fiscali → Prepara richiesta. -->

# Richiesta di aggiornamento dei parametri fiscali — Fiscal

Generata il 26/11/2026. Anni richiesti: **2027**.

## 1. Prompt

Sei un esperto di fiscalità italiana delle persone fisiche. Devi aggiornare i parametri fiscali di un'app di contabilità personale per uno **psicologo iscritto ENPAP, in regime ordinario (contabilità semplificata), che è anche lavoratore dipendente**.
Anni richiesti: **2027**. Data di oggi: **26/11/2026**.

Per ogni parametro del catalogo (sezione 3):

1. Cerca il valore in vigore per l'anno o dalla data indicata **sulle fonti ufficiali** della sezione 4 (Gazzetta Ufficiale, Normattiva, Agenzia delle Entrate, Dipartimento delle Finanze, ENPAP, INPS, sito della regione e del comune). Usa siti divulgativi solo per orientarti, mai come fonte.
2. Inserisci la voce nel file **solo se** il valore è diverso da quello in uso **oppure** se hai trovato una fonte ufficiale che conferma un valore oggi «da verificare». Se non trovi una fonte, **non inserire la voce**: non indovinare.
3. Per ogni voce indica la fonte esatta: titolo dell'atto, articolo/comma, collegamento `https://` alla pagina ufficiale, data dell'atto.
4. `stato_norma`: `in_vigore` solo se l'atto è pubblicato e in vigore; `approvata_non_pubblicata` (es. legge approvata non ancora in Gazzetta); `proposta` (disegno di legge, bozza di delibera).
5. `stato_proposto`: `verificata` solo con fonte ufficiale e norma in vigore; altrimenti `da_verificare`.
6. Usa **esattamente** le chiavi e le unità del catalogo: percentuali come numeri (23 = 23%), euro con il punto decimale (2.00), date `AAAA-MM-GG`, scadenze `"MM-GG"`.
7. «Decorrenza»: per «anno» e «anno solare» usa il campo `anno`; per «data» usa il campo `dal` (il giorno da cui vale il nuovo valore).
8. Le novità che non sono un semplice cambio di valore (una detrazione nuova, un'imposta nuova, un calcolo diverso, una regola che non è nel catalogo) mettile in `modifiche_programma`.
9. In `fonti_controllate` elenca le fonti che hai consultato e se erano raggiungibili.
10. Rispondi con **solo** il file JSON nel formato della sezione 5, dentro un blocco ```json. Nessun altro testo.

## 2. Da controllare per primi (oggi «da verificare» o mancanti)

| Chiave | Anno | Valore in uso | Fonte attuale |
|---|---|---|---|
| `irpef.scaglioni` | 2027 | [{"fino_a":28000,"aliquota":23},{"fino_a":55000,"aliquota":33},{"fino_a":null,"aliquota":43}] | DDL di Bilancio 2027 (Consiglio dei ministri del 28/10/2026, in Parlamento): 33% esteso fino a 55.000 € per il solo 2027. Da confermare sul testo pubblicato in Gazzetta |
| `irpef.detrazione_lavoro` | 2027 | {"importo_fisso":1955,"prima_soglia":15000,"base":1910,"aggiunta":1190,"seconda_soglia":28000,"terza_soglia":50000,"maggiorazione":{"importo":65,"oltre":25000,"fino_a":35000}} | Art. 13 c. 1 e 1.1 TUIR (D.Lgs. 216/2023, resa stabile dalla L. 207/2024) |
| `irpef.ulteriore_detrazione` | 2027 | {"importo":1000,"oltre":20000,"piena_fino_a":32000,"azzera_a":40000} | Art. 1 c. 6 L. 207/2024 (Legge di Bilancio 2025), misura strutturale |
| `irpef.acconti` | 2027 | {"percentuale":100,"soglia_non_dovuto":51.65,"soglia_unica_soluzione":257.52,"prima_rata":{"non_isa":40,"isa":50},"addizionale_comunale":30,"mese_primo":6,"mese_secondo":11,"con_scaglioni_precedenti":false} | Art. 17 DPR 435/2001 e istruzioni Modello Redditi PF: 100% del rigo "differenza", soglie 51,65 e 257,52 €, 40/60 non ISA e 50/50 ISA; acconto addizionale comunale 30% (art. 1 c. 4 D.Lgs. 360/1998) |
| `irpef.rateizzazione` | 2027 | {"max_rate":7,"interessi_per_rata":[0,0.18,0.51,0.84,1.17,1.5,1.83]} | Art. 20 D.Lgs. 241/1997: rate mensili con interessi 4% annuo; tabella delle rate per i titolari di partita IVA (scadenza il 16 di ogni mese) |
| `irpef.differimento` | 2027 | {"maggiorazione":0.4,"giorni":30} | Art. 17 c. 2 DPR 435/2001: versamento nei 30 giorni successivi con maggiorazione dello 0,40% |
| `enpap.aliquota_soggettivo` | 2027 | 12 | ENPAP, riforma approvata: +1 punto l'anno dall'11% sui redditi 2026 ⇒ 12% sui redditi 2027 (interpretazione da confermare con ENPAP) |
| `enpap.minimo_soggettivo` | 2027 | — (mancante) | Minimo 2027 non ancora pubblicato da ENPAP (e agevolazioni per i nuovi iscritti da verificare) |
| `enpap.minimo_integrativo` | 2027 | — (mancante) | Minimo integrativo 2027 non ancora pubblicato da ENPAP |
| `enpap.maternita` | 2027 | — (mancante) | Contributo di maternità 2027 non ancora pubblicato da ENPAP |
| `spese.categoria.formazione.percentuale` | 2027 | 100 | Art. 54-ter TUIR (D.Lgs. 192/2024): deducibili fino a 10.000 € l'anno |
| `spese.categoria.formazione.tetto_annuo` | 2027 | 10000 | Art. 54-ter TUIR (D.Lgs. 192/2024): deducibili fino a 10.000 € l'anno |
| `spese.categoria.supervisione.percentuale` | 2027 | 100 | Art. 54 e seguenti TUIR come riformati dal D.Lgs. 192/2024 |
| `spese.categoria.assicurazione.percentuale` | 2027 | 100 | Art. 54 e seguenti TUIR come riformati dal D.Lgs. 192/2024 |
| `spese.categoria.software.percentuale` | 2027 | 100 | Art. 54 e seguenti TUIR come riformati dal D.Lgs. 192/2024 |
| `spese.categoria.libri_test.percentuale` | 2027 | 100 | Art. 54 e seguenti TUIR come riformati dal D.Lgs. 192/2024 |
| `spese.categoria.albo_enpap.percentuale` | 2027 | 100 | Art. 54 e seguenti TUIR come riformati dal D.Lgs. 192/2024 |
| `spese.categoria.commissioni.percentuale` | 2027 | 100 | Art. 54 e seguenti TUIR come riformati dal D.Lgs. 192/2024 |
| `spese.categoria.internet.percentuale` | 2027 | 100 | Art. 54 e seguenti TUIR come riformati dal D.Lgs. 192/2024 |
| `spese.categoria.telefonia.percentuale` | 2027 | 80 | Art. 54 TUIR: spese telefoniche deducibili all'80% |
| `spese.categoria.vitto_alloggio.percentuale` | 2027 | 75 | Art. 54 TUIR: 75% entro il 2% dei compensi; pagamento tracciabile obbligatorio dal 2025 (L. 207/2024) |
| `spese.categoria.vitto_alloggio.tetto_su_compensi` | 2027 | 2 | Art. 54 TUIR: 75% entro il 2% dei compensi; pagamento tracciabile obbligatorio dal 2025 (L. 207/2024) |
| `spese.categoria.rappresentanza.percentuale` | 2027 | 100 | Art. 54 TUIR: entro l'1% dei compensi |
| `spese.categoria.rappresentanza.tetto_su_compensi` | 2027 | 1 | Art. 54 TUIR: entro l'1% dei compensi |
| `spese.categoria.beni_piccoli.percentuale` | 2027 | 100 | Art. 54 TUIR: beni di costo unitario fino a 516,46 € deducibili nell'anno |
| `spese.categoria.affitto_studio.percentuale` | 2027 | 100 | Art. 54 e seguenti TUIR come riformati dal D.Lgs. 192/2024 |
| `spese.categoria.utenze_studio.percentuale` | 2027 | 100 | Art. 54 e seguenti TUIR come riformati dal D.Lgs. 192/2024 |
| `spese.categoria.uso_promiscuo_casa.percentuale` | 2027 | 50 | Art. 54 TUIR: 50% se nello stesso comune non hai un altro studio |
| `spese.categoria.altro.percentuale` | 2027 | 100 | Principio di inerenza, art. 54 TUIR |
| `spese.onere.enpap_volontario.aliquota_massima_volontaria` | 2027 | 30 | Art. 10 c. 1 lett. e TUIR; aliquota volontaria fino al 30% (bozza ENPAP 02/2026) |
| `spese.onere.liberalita_ets.limite_su_reddito` | 2027 | 10 | Art. 83 D.Lgs. 117/2017: deducibili fino al 10% del reddito |
| `spese.onere.interessi_mutuo.aliquota` | 2027 | 19 | Art. 15 c. 1 lett. b TUIR: 19% fino a 4.000 € di interessi |
| `spese.onere.interessi_mutuo.limite` | 2027 | 4000 | Art. 15 c. 1 lett. b TUIR: 19% fino a 4.000 € di interessi |
| `spese.onere.altre_19.aliquota` | 2027 | 19 | Art. 15 TUIR: istruzione, sport dei figli e altre voci, ciascuna con i suoi limiti |
| `spese.bene.computer.coefficiente` | 2027 | 20 | DM 31/12/1988: macchine d'ufficio elettroniche 20% |
| `spese.bene.arredi.coefficiente` | 2027 | 12 | DM 31/12/1988: mobili e arredi 12% |
| `spese.bene.attrezzature.coefficiente` | 2027 | 15 | DM 31/12/1988: attrezzatura varia 15% |
| `scadenze.bollo_t4.data` | 2027 | "02-28" | Art. 6 DM 17/6/2014 come modificato dal DL 73/2022: bollo virtuale sulle fatture elettroniche, versamento trimestrale |
| `scadenze.bollo_t1.data` | 2027 | "05-31" | Art. 6 DM 17/6/2014 come modificato dal DL 73/2022 |
| `scadenze.bollo_t2.data` | 2027 | "09-30" | Art. 6 DM 17/6/2014 come modificato dal DL 73/2022 |
| `scadenze.bollo_t3.data` | 2027 | "11-30" | Art. 6 DM 17/6/2014 come modificato dal DL 73/2022 |
| `scadenze.precompilata.data` | 2027 | "04-30" | Agenzia delle Entrate: precompilata disponibile dalla fine di aprile (data indicativa) |
| `scadenze.enpap.data` | 2027 | "10-01" | ENPAP: saldo sui redditi dell'anno prima entro il 1° ottobre (enpap.it); rateizzazioni e acconti da verificare per il primo anno |
| `scadenze.sts_01.data` | 2027 | "02-28" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_02.data` | 2027 | "03-31" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_03.data` | 2027 | "04-30" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_04.data` | 2027 | "05-31" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_05.data` | 2027 | "06-30" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_06.data` | 2027 | "07-31" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_07.data` | 2027 | "08-31" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_08.data` | 2027 | "09-30" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_09.data` | 2027 | "10-31" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_10.data` | 2027 | "11-30" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_11.data` | 2027 | "12-31" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `scadenze.sts_12.data` | 2027 | "01-31" | DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno) |
| `f24.iva_t1` | 2027 | "6031" | Codici tributo IVA per i contribuenti trimestrali (tabelle F24, Agenzia delle Entrate) |
| `f24.iva_t2` | 2027 | "6032" | Codici tributo IVA per i contribuenti trimestrali (tabelle F24, Agenzia delle Entrate) |
| `f24.iva_t3` | 2027 | "6033" | Codici tributo IVA per i contribuenti trimestrali (tabelle F24, Agenzia delle Entrate) |
| `f24.iva_acconto` | 2027 | "6035" | Codici tributo IVA per i contribuenti trimestrali (tabelle F24, Agenzia delle Entrate) |
| `f24.iva_saldo` | 2027 | "6099" | Codici tributo IVA per i contribuenti trimestrali (tabelle F24, Agenzia delle Entrate) |
| `f24.interessi_rateizzazione` | 2027 | "1668" | Risoluzioni Agenzia delle Entrate sui codici tributo IRPEF (es. ris. 12/E/2007) |
| `addizionali.regionale.scaglioni` | 2027 | [{"fino_a":null,"aliquota":1.23}] | Aliquote inserite in Tasse → Dati dell'anno |
| `addizionali.comunale.aliquota` | 2027 | 0.8 | Aliquote inserite in Tasse → Dati dell'anno |
| `addizionali.comunale.soglia_esenzione` | 2027 | — | non inserito |

## 3. Catalogo dei parametri

**Decorrenza**: «anno» = vale per tutto l'anno d'imposta (usa `anno`); «data» = vale per le operazioni da quella data in poi (usa `dal`); «anno solare» = scadenza di quell'anno (usa `anno`).

### Anno 2027

#### IRPEF

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `irpef.scaglioni` | scaglioni [{ "fino_a": euro o null per l'ultimo, "aliquota": percentuale tra 5 e 60 }] | anno | [{"fino_a":28000,"aliquota":23},{"fino_a":55000,"aliquota":33},{"fino_a":null,"aliquota":43}] | da verificare |
| `irpef.detrazione_lavoro` | oggetto { "importo_fisso": euro con il punto decimale (es. 2.00), tra 0 e 5000; "prima_soglia": euro con il punto decimale (es. 2.00), tra 1000 e 100.000; "base": euro con il punto decimale (es. 2.00), tra 0 e 5000; "aggiunta": euro con il punto decimale (es. 2.00), tra 0 e 5000; "seconda_soglia": euro con il punto decimale (es. 2.00), tra 1000 e 200.000; "terza_soglia": euro con il punto decimale (es. 2.00), tra 1000 e 300.000; "maggiorazione": oggetto { "importo": euro con il punto decimale (es. 2.00), tra 0 e 1000; "oltre": euro con il punto decimale (es. 2.00), tra 0 e 200.000; "fino_a": euro con il punto decimale (es. 2.00), tra 0 e 200.000 } } | anno | {"importo_fisso":1955,"prima_soglia":15000,"base":1910,"aggiunta":1190,"seconda_soglia":28000,"terza_soglia":50000,"maggiorazione":{"importo":65,"oltre":25000,"fino_a":35000}} | da verificare |
| `irpef.ulteriore_detrazione` | oggetto { "importo": euro con il punto decimale (es. 2.00), tra 0 e 5000; "oltre": euro con il punto decimale (es. 2.00), tra 0 e 100.000; "piena_fino_a": euro con il punto decimale (es. 2.00), tra 0 e 200.000; "azzera_a": euro con il punto decimale (es. 2.00), tra 0 e 300.000 } | anno | {"importo":1000,"oltre":20000,"piena_fino_a":32000,"azzera_a":40000} | da verificare |

#### Acconti e versamenti

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `irpef.acconti` | oggetto { "percentuale": percentuale (23 = 23%), tra 50 e 100; "soglia_non_dovuto": euro con il punto decimale (es. 2.00), tra 0 e 1000; "soglia_unica_soluzione": euro con il punto decimale (es. 2.00), tra 0 e 5000; "prima_rata": oggetto { "non_isa": percentuale (23 = 23%), tra 0 e 100; "isa": percentuale (23 = 23%), tra 0 e 100 }; "addizionale_comunale": percentuale (23 = 23%), tra 0 e 100; "mese_primo": numero del mese (1–12); "mese_secondo": numero del mese (1–12); "con_scaglioni_precedenti": true o false } | anno | {"percentuale":100,"soglia_non_dovuto":51.65,"soglia_unica_soluzione":257.52,"prima_rata":{"non_isa":40,"isa":50},"addizionale_comunale":30,"mese_primo":6,"mese_secondo":11,"con_scaglioni_precedenti":false} | da verificare |
| `irpef.rateizzazione` | oggetto { "max_rate": numero intero (numero massimo di rate), tra 1 e 12; "interessi_per_rata": elenco di 1–12 valori: percentuale (23 = 23%), tra 0 e 10 } | anno | {"max_rate":7,"interessi_per_rata":[0,0.18,0.51,0.84,1.17,1.5,1.83]} | da verificare |
| `irpef.differimento` | oggetto { "maggiorazione": percentuale (23 = 23%), tra 0 e 5; "giorni": numero intero (giorni di differimento), tra 1 e 120 } | anno | {"maggiorazione":0.4,"giorni":30} | da verificare |

#### ENPAP

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `enpap.aliquota_soggettivo` | percentuale (23 = 23%), tra 5 e 40 | anno | 12 | da verificare |
| `enpap.minimo_soggettivo` | euro con il punto decimale (es. 2.00), tra 0 e 5000; null se non ancora pubblicato | anno | — (mancante) | da verificare |
| `enpap.minimo_integrativo` | euro con il punto decimale (es. 2.00), tra 0 e 2000; null se non ancora pubblicato | anno | — (mancante) | da verificare |
| `enpap.maternita` | euro con il punto decimale (es. 2.00), tra 0 e 1000; null se non ancora pubblicato | anno | — (mancante) | da verificare |
| `enpap.scadenza_saldo` | mese-giorno "MM-GG" (es. "06-30") | anno | "10-01" | verificata |

#### Fatturazione

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `fattura.aliquota_integrativo` | percentuale (23 = 23%), tra 0 e 10 | data | 4 | verificata |
| `fattura.aliquota_iva` | percentuale (23 = 23%), tra 4 e 30 | data | 22 | verificata |
| `fattura.soglia_bollo` | euro con il punto decimale (es. 2.00), tra 10 e 1000 | data | 77.47 | verificata |
| `fattura.importo_bollo` | euro con il punto decimale (es. 2.00), tra 0,5 e 20 | data | 2 | verificata |
| `fattura.aliquota_ritenuta` | percentuale (23 = 23%), tra 5 e 40 | data | 20 | verificata |

#### Spese e oneri

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `spese.categoria.formazione.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.formazione.tetto_annuo` | euro con il punto decimale (es. 2.00), tra 0 e 1.000.000 | anno | 10000 | da verificare |
| `spese.categoria.supervisione.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.assicurazione.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.software.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.libri_test.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.albo_enpap.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.commissioni.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.internet.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.telefonia.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 80 | da verificare |
| `spese.categoria.vitto_alloggio.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 75 | da verificare |
| `spese.categoria.vitto_alloggio.tetto_su_compensi` | percentuale (23 = 23%), tra 0 e 10 | anno | 2 | da verificare |
| `spese.categoria.rappresentanza.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.rappresentanza.tetto_su_compensi` | percentuale (23 = 23%), tra 0 e 10 | anno | 1 | da verificare |
| `spese.categoria.beni_piccoli.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.affitto_studio.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.utenze_studio.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.categoria.uso_promiscuo_casa.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 50 | da verificare |
| `spese.categoria.altro.percentuale` | percentuale (23 = 23%), tra 0 e 100 | anno | 100 | da verificare |
| `spese.onere.previdenza_complementare.limite` | euro con il punto decimale (es. 2.00), tra 0 e 1.000.000 | anno | 5164.57 | verificata |
| `spese.onere.enpap_volontario.aliquota_massima_volontaria` | percentuale (23 = 23%), tra 0 e 100 | anno | 30 | da verificare |
| `spese.onere.liberalita_ets.limite_su_reddito` | percentuale (23 = 23%), tra 0 e 100 | anno | 10 | da verificare |
| `spese.onere.spese_sanitarie.aliquota` | percentuale (23 = 23%), tra 0 e 100 | anno | 19 | verificata |
| `spese.onere.spese_sanitarie.franchigia` | euro con il punto decimale (es. 2.00), tra 0 e 10.000 | anno | 129.11 | verificata |
| `spese.onere.interessi_mutuo.aliquota` | percentuale (23 = 23%), tra 0 e 100 | anno | 19 | da verificare |
| `spese.onere.interessi_mutuo.limite` | euro con il punto decimale (es. 2.00), tra 0 e 1.000.000 | anno | 4000 | da verificare |
| `spese.onere.altre_19.aliquota` | percentuale (23 = 23%), tra 0 e 100 | anno | 19 | da verificare |
| `spese.beni.soglia_immediata` | euro con il punto decimale (es. 2.00), tra 0 e 10.000 | anno | 516.46 | verificata |
| `spese.bene.computer.coefficiente` | percentuale (23 = 23%), tra 1 e 100 | anno | 20 | da verificare |
| `spese.bene.arredi.coefficiente` | percentuale (23 = 23%), tra 1 e 100 | anno | 12 | da verificare |
| `spese.bene.attrezzature.coefficiente` | percentuale (23 = 23%), tra 1 e 100 | anno | 15 | da verificare |

#### Scadenze

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `scadenze.cu_rilascio.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "03-16" | verificata |
| `scadenze.iva_saldo.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "03-16" | verificata |
| `scadenze.iva_dichiarazione.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "04-30" | verificata |
| `scadenze.iva_t1.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "05-16" | verificata |
| `scadenze.iva_t2.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "08-20" | verificata |
| `scadenze.iva_t3.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "11-16" | verificata |
| `scadenze.iva_acconto.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "12-27" | verificata |
| `scadenze.bollo_t4.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "02-28" | da verificare |
| `scadenze.bollo_t1.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "05-31" | da verificare |
| `scadenze.bollo_t2.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "09-30" | da verificare |
| `scadenze.bollo_t3.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "11-30" | da verificare |
| `scadenze.precompilata.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "04-30" | da verificare |
| `scadenze.saldo_acconto.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "06-30" | verificata |
| `scadenze.enpap.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "10-01" | da verificare |
| `scadenze.redditi_invio.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "10-31" | verificata |
| `scadenze.secondo_acconto.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "11-30" | verificata |
| `scadenze.documenti_commercialista.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "05-15" | verificata |
| `scadenze.sts_01.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "02-28" | da verificare |
| `scadenze.sts_02.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "03-31" | da verificare |
| `scadenze.sts_03.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "04-30" | da verificare |
| `scadenze.sts_04.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "05-31" | da verificare |
| `scadenze.sts_05.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "06-30" | da verificare |
| `scadenze.sts_06.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "07-31" | da verificare |
| `scadenze.sts_07.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "08-31" | da verificare |
| `scadenze.sts_08.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "09-30" | da verificare |
| `scadenze.sts_09.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "10-31" | da verificare |
| `scadenze.sts_10.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "11-30" | da verificare |
| `scadenze.sts_11.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "12-31" | da verificare |
| `scadenze.sts_12.data` | mese-giorno "MM-GG" (es. "06-30") | anno solare | "01-31" | da verificare |

#### Codici tributo F24

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `f24.irpef_saldo` | codice (es. "4001") | data | "4001" | verificata |
| `f24.irpef_primo_acconto` | codice (es. "4001") | data | "4033" | verificata |
| `f24.irpef_secondo_acconto` | codice (es. "4001") | data | "4034" | verificata |
| `f24.addizionale_regionale` | codice (es. "4001") | data | "3801" | verificata |
| `f24.addizionale_comunale_acconto` | codice (es. "4001") | data | "3843" | verificata |
| `f24.addizionale_comunale_saldo` | codice (es. "4001") | data | "3844" | verificata |
| `f24.bollo_t1` | codice (es. "4001") | data | "2521" | verificata |
| `f24.bollo_t2` | codice (es. "4001") | data | "2522" | verificata |
| `f24.bollo_t3` | codice (es. "4001") | data | "2523" | verificata |
| `f24.bollo_t4` | codice (es. "4001") | data | "2524" | verificata |
| `f24.iva_t1` | codice (es. "4001") | data | "6031" | da verificare |
| `f24.iva_t2` | codice (es. "4001") | data | "6032" | da verificare |
| `f24.iva_t3` | codice (es. "4001") | data | "6033" | da verificare |
| `f24.iva_acconto` | codice (es. "4001") | data | "6035" | da verificare |
| `f24.iva_saldo` | codice (es. "4001") | data | "6099" | da verificare |
| `f24.interessi_rateizzazione` | codice (es. "4001") | data | "1668" | da verificare |

#### Addizionali (Regione di esempio, comune di Comune di esempio)

| Chiave | Unità | Decorrenza | Valore in uso | Stato |
|---|---|---|---|---|
| `addizionali.regionale.scaglioni` | scaglioni [{ "fino_a": euro o null per l'ultimo, "aliquota": percentuale tra 0 e 5 }] | anno | [{"fino_a":null,"aliquota":1.23}] | da verificare |
| `addizionali.comunale.aliquota` | percentuale (23 = 23%), tra 0 e 0,9 | anno | 0.8 | da verificare |
| `addizionali.comunale.soglia_esenzione` | euro con il punto decimale (es. 2.00), tra 0 e 100.000 | anno | — | — |

## 4. Fonti ufficiali da consultare

| Area | Fonti |
|---|---|
| IRPEF | Gazzetta Ufficiale (https://www.gazzettaufficiale.it/); Normattiva (https://www.normattiva.it/); Agenzia delle Entrate: istruzioni Modello Redditi PF (https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/redditi-persone-fisiche); Agenzia delle Entrate: istruzioni Certificazione Unica (https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/certificazione-unica) |
| Acconti e versamenti | Agenzia delle Entrate: istruzioni Modello Redditi PF (https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/redditi-persone-fisiche); Normattiva (https://www.normattiva.it/) |
| ENPAP | ENPAP (delibere, regolamento, comunicazioni) (https://www.enpap.it/) |
| Fatturazione | ENPAP (delibere, regolamento, comunicazioni) (https://www.enpap.it/); Normattiva (https://www.normattiva.it/); Agenzia delle Entrate (https://www.agenziaentrate.gov.it/); FatturaPA (https://www.fatturapa.gov.it/) |
| Spese e oneri | Normattiva (https://www.normattiva.it/); Agenzia delle Entrate (https://www.agenziaentrate.gov.it/); Agenzia delle Entrate: istruzioni Modello Redditi PF (https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/redditi-persone-fisiche) |
| Scadenze | Agenzia delle Entrate (https://www.agenziaentrate.gov.it/); Gazzetta Ufficiale (https://www.gazzettaufficiale.it/); ENPAP (delibere, regolamento, comunicazioni) (https://www.enpap.it/); Sistema Tessera Sanitaria (https://sistemats1.sanita.finanze.it/) |
| Codici tributo F24 | Agenzia delle Entrate: codici tributo F24 (https://www.agenziaentrate.gov.it/portale/web/guest/schede/pagamenti/f24) |
| Addizionali | Dipartimento delle Finanze: addizionali regionali e comunali (https://www1.finanze.gov.it/finanze/pagina_dichiarazioni/public/dichiarazioni.php); sito della regione Regione di esempio e del comune di Comune di esempio |

## 5. Formato della risposta

Un solo oggetto JSON con questa forma (versione 1). L'esempio mostra la forma, non valori reali: sostituisci i «…» e non copiare i numeri.

```json
{
  "versione_schema": 1,
  "data_ricerca": "2026-11-26",
  "anni": [
    2027
  ],
  "ambito": {
    "regione": "Regione di esempio",
    "comune": "Comune di esempio"
  },
  "voci": [
    {
      "chiave": "irpef.scaglioni",
      "anno": 2027,
      "valore": [
        {
          "fino_a": 28000,
          "aliquota": 23
        },
        {
          "fino_a": 50000,
          "aliquota": 33
        },
        {
          "fino_a": null,
          "aliquota": 43
        }
      ],
      "fonte": {
        "titolo": "Titolo dell'atto",
        "riferimento": "art. …, comma …",
        "url": "https://www.gazzettaufficiale.it/…",
        "data_atto": "AAAA-MM-GG"
      },
      "stato_proposto": "verificata",
      "stato_norma": "in_vigore",
      "nota": "Cosa cambia, in parole semplici."
    },
    {
      "chiave": "fattura.importo_bollo",
      "dal": "2027-01-01",
      "valore": 2,
      "fonte": {
        "titolo": "Titolo dell'atto",
        "url": "https://www.agenziaentrate.gov.it/…",
        "data_atto": "AAAA-MM-GG"
      },
      "stato_proposto": "verificata",
      "stato_norma": "in_vigore"
    }
  ],
  "modifiche_programma": [
    {
      "titolo": "Titolo breve della novità",
      "descrizione": "Cosa cambia e perché non è un semplice valore.",
      "dal": "AAAA-MM-GG",
      "fonte": {
        "titolo": "Titolo dell'atto",
        "url": "https://…",
        "data_atto": "AAAA-MM-GG"
      }
    }
  ],
  "fonti_controllate": [
    {
      "nome": "Gazzetta Ufficiale",
      "url": "https://www.gazzettaufficiale.it/",
      "raggiunta": true
    }
  ]
}
```

Regole del formato: `versione_schema` è sempre 1; ogni voce ha `chiave`, `valore`, `fonte`, `stato_proposto`, `stato_norma` ed esattamente uno tra `anno` e `dal`; `nota` al massimo 500 caratteri; al massimo 200 voci e 50 modifiche al programma.

Le voci `addizionali.*` valgono per Regione di esempio, comune di Comune di esempio: riporta `ambito` come nell'esempio.
