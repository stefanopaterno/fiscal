# Research: Guide agli adempimenti

Ricerca del 27/11/2026. Le fonti divulgative servono solo a orientarsi: un valore è «verificata» solo con fonte
ufficiale (Agenzia delle Entrate, Gazzetta, Normattiva, ENPAP, ISTAT, Sistema TS). Tutti i valori sotto entrano nelle
regole (non nei testi delle guide) e quindi si aggiornano anche con il file della 014.

## R-01 Contenuto statico, valori dalle regole

- **Decision**: testi delle guide nel codice (`src/engine/regole/guide-adempimenti/`), con segnaposto del tipo
  `{{f24.irpef_saldo}}`, `{{scadenza.saldo_acconto}}`, `{{fattura.soglia_bollo}}`, `{{adempimenti.codice_ateco}}`
  risolti a ogni apertura dalle regole dell'anno in corso (registro della 014 compreso). Un test fallisce se un testo
  contiene un codice tributo, una data `gg/mm` o una percentuale scritti a mano (FR-007, SC-005).
- **Rationale**: le guide restano giuste quando cambia una regola, senza toccare i testi; funzionano senza rete.
- **Alternatives**: guide in Markdown in `public/` (non possono leggere le regole); guide nel database (servirebbe
  la rete e un'interfaccia di scrittura che nessuno usa).

## R-02 Dove si aprono

- **Decision**: componente `GuideAdempimenti` in home sotto `CalendarioFiscale`, stesso stile (pulsante outline +
  Dialog con scorrimento verticale). Dentro il Dialog: indice ↔ guida con «Indietro». Per aprire una guida da altre
  pagine: `/home/?guida=<id>` (la home legge il parametro e apre il layer sulla guida), così Aiuto, scadenzario e
  Versamenti hanno un collegamento semplice anche nell'export statico.
- **Alternatives**: pagina dedicata `/guide/` (scartata: la spec chiede un layer come il calendario).

## R-03 Fatti normativi (valori nuovi nelle regole)

| Valore | Dove | Stato | Fonte e note |
|---|---|---|---|
| Codice ATECO psicologi: **86.93.00** «Attività di psicologi e psicoterapeuti, esclusi i medici» (prima 86.90.30) | `adempimenti.codice_ateco` | da_verificare | ATECO 2025 in vigore dal 1/4/2025; confermato da fonti divulgative ([codiceateco.it](https://codiceateco.it/categoria/attivita-di-psicologi-e-psicoterapeuti-esclusi-i-medici), [Fiscozen](https://www.fiscozen.it/guide/codice-ateco-psicologo/)); da riscontrare sulla tabella ISTAT |
| Natura IVA delle prestazioni sanitarie esenti: **N4** | `adempimenti.natura_esente` | verificata | Specifiche tecniche fattura elettronica (FatturaPA), art. 10 DPR 633/72 |
| Iscrizione ENPAP: entro **90 giorni** dal sorgere dei requisiti (in pratica dal primo compenso) | `adempimenti.giorni_iscrizione_enpap` | da_verificare | Regolamento ENPAP art. 2 ([enpap.it](https://www.enpap.it/wp-content/uploads/2015/01/Regolamento_Previdenza.pdf)); le fonti divergono su «inizio attività» o «primo compenso» |
| Comunicazione reddituale ENPAP e saldo: **1° ottobre** dell'anno dopo | già `scadenze.enpap` (004) | da_verificare | Istruzioni ENPAP modello 2025 e 2026 ([enpap.it](https://www.enpap.it/DOC/ISTRUZ_MOD2026_ORD_SITO.PDF)) |
| Modello Redditi PF obbligatorio con partita IVA (il 730 non si usa per redditi di lavoro autonomo con P.IVA) | testo della guida + fonte | verificata | Istruzioni 730 e Redditi PF, Agenzia delle Entrate |
| F24 solo telematico per i titolari di partita IVA | testo della guida + fonte | verificata | Art. 37 c. 49 DL 223/2006 |
| Esonero dalla dichiarazione IVA con sole operazioni esenti | già `scadenze.iva_dichiarazione` | verificata | Art. 8 DPR 322/1998 |
| Bollo fatture elettroniche: codici 2521–2524 | già `f24.bollo_t1..t4` (014) | verificata | Ris. 42/E/2019 ([Agenzia delle Entrate](https://www1.agenziaentrate.gov.it/servizi/codici/ricerca/SezioneErario.php?CT=2521)) |
| Bollo: sanzione **2525**, interessi **2526** | `f24.bollo_sanzione`, `f24.bollo_interessi` | da_verificare | Fonti divulgative ([ecnews](https://www.ecnews.it/fiscale/in-pratica/guida-agli-adempimenti/imposta-di-bollo-sulle-fatture-elettroniche-2025/)) |
| Bollo: soglia per accorpare i trimestri (**5.000 €**) | `adempimenti.soglia_accorpamento_bollo` | da_verificare | Fonti divulgative concordi sull'importo, testo ufficiale da riscontrare |
| Ravvedimento IRPEF: sanzione **8901**, interessi **1989** | `f24.ravv_irpef_sanzione`, `f24.ravv_irpef_interessi` | da_verificare | Fonti divulgative concordi ([Fiscozen](https://www.fiscozen.it/guide/codice-tributo-8901/), [FiscoeTasse](https://www.fiscoetasse.com/approfondimenti/12557-ravvedimento-operoso-2024-sanzioni-e-codici-tributo-per-mettersi-in-regola.html)) |
| Ravvedimento addizionali: sanzioni **8902** (regionale), **8926** (comunale); interessi **1994**, **1998** | `f24.ravv_*` | da_verificare | Fonti divulgative **contraddittorie** (una guida 2026 indica 8901 anche per le addizionali): la guida lo dice e invita a controllare il codice sul sito dell'Agenzia prima di pagare |

- **Decision**: i codici nuovi vanno in `f24/base.ts` (quindi nel catalogo della 014 senza lavoro in più); gli altri
  valori in un nuovo set `regole/adempimenti` con chiavi `adempimenti.*` nel catalogo (decorrenza «data»).

## R-04 Disegni dei moduli

- **Decision**: schemi ridisegnati in JSX con i token Fluent (nessuna immagine o schermata dei siti ufficiali): F24
  (sezione Erario e sezione IMU/Regioni con colonne codice tributo, rateazione/regione, anno, debito, credito),
  Modello Redditi PF (frontespizio + quadri RE, RN, RV, RP come blocchi), dichiarazione di inizio attività (quadri A,
  B, attività), fattura elettronica (intestazione, righe, natura, bollo, totali). Caselle numerate = passi; un tocco
  scorre al passo (FR-009). Una colonna sotto i 480 px, nessuno scroll orizzontale.

## R-05 Spunte e «da ricontrollare»

- **Decision**: spunte per guida in `localStorage` con `useSyncExternalStore` (come il tour), pulsante «Azzera».
  «Da ricontrollare» se `ultimoControllo` della guida ha più di 12 mesi rispetto a `oggiIso()` (data di prova
  compresa).

## R-06 Esempi

- **Decision**: gli esempi usano importi tondi dichiarati «esempio» e persone fittizie con iniziali (mai nomi completi,
  coerente con la 005). Gli importi d'esempio non sono valori normativi, quindi possono stare nel testo; il test di
  SC-005 controlla solo codici tributo, date di scadenza e aliquote.
