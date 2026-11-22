# Ricerca: Motore IRPEF sul cumulo CU + P.IVA

**Spec**: [spec.md](spec.md) | **Piano**: [plan.md](plan.md) | **Data**: 2026-11-22

Legenda dello stato: (V) verificata su fonte ufficiale; (D) da verificare (fonte divulgativa o norma non
ancora in vigore). Ogni valore sta nel set di regole dell'anno con fonte e stato (FR-016, FR-017).

## R-01 — Scaglioni IRPEF 2026 e 2027

- **Decisione**: 2026 = 23% fino a 28.000 €, 33% da 28.000 a 50.000 €, 43% oltre (art. 11 TUIR come
  modificato dalla L. 199/2025, Legge di Bilancio 2026; la seconda aliquota passa dal 35% al 33%).
  Stato (D) fino a riscontro sul testo in Gazzetta. **2027** (aggiornato 2026-11-22): 23% fino a 28.000 €,
  **33% fino a 55.000 €**, 43% oltre, come nel DDL di Bilancio 2027 approvato dal Consiglio dei ministri il
  28/10/2026 e ora in Parlamento; misura **solo per il 2027** (dal 2028 si torna a 50.000 €, salvo nuove
  norme). Stato (D) finché la legge non è pubblicata. Scelta: per l'anno della partita IVA il valore del DDL
  è più probabile di quello attuale; se il testo finale cambia si aggiorna `regole/irpef/2027.ts` e i casi
  7–8. Il DDL non tocca le detrazioni (soglia 50.000 € dell'art. 13 invariata). Fonti:
  [studiopizzano](https://www.studiopizzano.it/taglio-irpef-2027-33-per-cento-fino-55000-euro),
  [commercialistatelematico](https://www.commercialistatelematico.com/articoli/2026/11/ddl-bilancio-2027-irpef-detassazione.html),
  [fiscomania](https://fiscomania.com/manovra-simulazioni-stipendi/).
- **Effetto per chi ha la CU tra 50.000 e 55.000 €**: nel 2027 i primi euro di partita IVA fino a 55.000 € di
  imponibile sono al 33% invece che al 43% (fino a 500 € di imposta in meno); il datore applica già lo
  scaglione 2027 in busta paga, quindi il conguaglio misura solo la parte professionale (caso 7).
- **Acconti 2028 dopo un taglio temporaneo**: se la legge prevede (come in passato per i tagli IRPEF) che
  l'acconto dell'anno dopo si calcoli con le regole precedenti, il motore dovrà ricalcolare la "differenza"
  2027 con gli scaglioni 2026. Il DDL letto non ne parla: (D), regola `accontoConScaglioniPrecedenti`
  falsa finché non risulta dal testo.
- **Motivo**: fonti concordi ([diritto.it](https://www.diritto.it/irpef-2026-aliquote-detrazioni-riduzioni-imposta/),
  [informazionefiscale.it](https://www.informazionefiscale.it/IRPEF-scaglioni-aliquote-calcolo),
  [fiscoetasse](https://www.fiscoetasse.com/new-rassegna-stampa/2990-irpef-2027-come-cambiano-aliquote-e-scaglioni-chi-paga-meno-tasse.html)).
- **Alternative**: nessuna regola 2027 (il motore non calcolerebbe l'anno reale dell'utente): scartata,
  meglio un risultato "provvisorio" segnalato (chiarimento 2026-11-20).
- La "neutralizzazione" del taglio per redditi oltre 200.000 € è fuori ambito (non applicabile).

## R-02 — Detrazioni per lavoro dipendente (art. 13 TUIR) e ulteriore detrazione (L. 207/2024)

- **Decisione**: sul **reddito complessivo** R (al netto della deduzione per abitazione principale):
  è il reddito **prima** degli oneri deducibili (rigo RN1 del Modello Redditi). I contributi ENPAP e gli altri
  oneri deducibili (art. 10 TUIR) abbassano il **reddito imponibile** (RN4, base di scaglioni e addizionali)
  ma **non** aumentano le detrazioni (correzione 2026-11-22 del caso 5).
  - R ≤ 15.000: 1.955 € (minimi di 690 € / 1.380 € fuori ambito: l'utente supera i 35.000 €);
  - 15.000 < R ≤ 28.000: 1.910 + 1.190 × (28.000 − R) / 13.000;
  - 28.000 < R ≤ 50.000: 1.910 × (50.000 − R) / 22.000;
  - R > 50.000: 0; **+65 €** se 25.000 < R ≤ 35.000.
  - **Ulteriore detrazione** (art. 1 c. 6 L. 207/2024, strutturale): 1.000 € se 20.000 < R ≤ 32.000;
    1.000 × (40.000 − R) / 8.000 se 32.000 < R ≤ 40.000; 0 oltre. Spetta a chi ha reddito di lavoro
    dipendente.
  - Ragguaglio ai giorni di lavoro (art. 13): input facoltativo "giorni di lavoro" della CU (365 di default).
    L'ulteriore detrazione va rapportata al periodo di lavoro (istruzioni CU 2026, punto 368) (V, aggiornato 2026-11-22).
  - Il coefficiente si calcola con 4 decimali, la detrazione si arrotonda al centesimo (prassi delle
    istruzioni ministeriali, (D)).
- **Motivo**: è la voce che rende il "costo vero" della P.IVA più alto dell'aliquota marginale: superando
  i 40.000 e poi i 50.000 € si perdono detrazioni già fruite in busta paga (FR-007). Fonti:
  [informazionefiscale.it](https://www.informazionefiscale.it/detrazioni-lavoro-dipendente-importo-calcolo),
  [money.it](https://www.money.it/taglio-cuneo-fiscale-quanti-soldi-puoi-recuperare-730-2026-tabella).
  Le fonti divulgative non concordano su alcune fasce: stato (D) finché non riscontrato sul testo
  dell'art. 13 TUIR e sulle istruzioni del Modello Redditi 2027.
- **Fuori ambito** (prima versione): somma esente per redditi di lavoro fino a 20.000 € (non pertinente),
  riduzione degli oneri detraibili oltre 75.000 € (art. 16-ter TUIR, serve con la 008: R-11).

## R-03 — Imposta netta, conguaglio e "differenza"

- **Decisione**: imposta lorda (scaglioni) − detrazioni lavoro (R-02) − altre detrazioni inserite (FR-032)
  − detrazioni per oneri (008, quando ci sarà), minimo 0 (eventuale incapienza mostrata). Conguaglio IRPEF
  = imposta netta − ritenute del datore (CU) − ritenute d'acconto subite sulle fatture incassate nell'anno
  − acconti versati. Le detrazioni già fruite in CU **non** si sottraggono di nuovo: sono già dentro le
  ritenute; il ricalcolo sul reddito complessivo fa emergere da solo la detrazione da restituire.
  La "differenza" (imposta netta − ritenute) è la base dell'acconto storico (R-05).
- **Ritenute d'acconto**: scomputate nell'anno in cui il compenso è incassato (art. 22 TUIR),
  in proporzione agli incassi di ciascuna fattura.

## R-04 — Addizionali regionale e comunale

- **Decisione**: aliquote inserite dall'utente per anno (profilo, non repository, chiarimento 2026-11-20):
  regionale a scaglioni (progressiva per scaglioni come l'IRPEF, (D) per regioni con aliquota unica sul
  totale), comunale = aliquota × reddito imponibile se superiore alla soglia di esenzione (se la soglia è
  superata si tassa tutto il reddito, (D)). Base: reddito imponibile (complessivo − oneri deducibili).
  **Non dovute se l'IRPEF netta è zero** (art. 50 c. 2 D.Lgs. 446/1997: "dovuta se ... l'imposta ... al netto
  delle detrazioni ... risulta dovuta"; stessa regola per la comunale, D.Lgs. 360/1998).
  Trattenute dalla CU: regionale (punto 22); comunale acconto dell'anno (punto 26) e saldo (punto 27).
  Conguaglio = dovuta − trattenute.
- **Acconto addizionale comunale** (30%) per l'anno dopo: 30% × comunale dovuta − acconto già trattenuto dal
  datore per l'anno dopo (punto 29 della CU). Se il punto 29 non è inserito l'app lo stima come 30% della
  comunale sul solo reddito della CU (approssimazione segnalata, (D)).
  La regionale non ha acconto.

## R-05 — Acconti IRPEF (FR-013, FR-024)

- **Decisione** (regole per anno, (D) su fonte ufficiale): acconto = 100% della "differenza" dell'anno
  prima (storico) o dell'imposta attesa (previsionale); non dovuto se ≤ 51,65 €; in unica soluzione a
  novembre se ≤ 257,52 €; altrimenti 40% a giugno e 60% a novembre per i **non ISA**, 50/50 per i
  soggetti ISA. **2027, primo anno di attività**: l'inizio attività è causa di esclusione dagli ISA ⇒
  40/60 (D, da confermare col commercialista per gli anni successivi: input "soggetto ISA").
  Arrotondamento: prima rata al centesimo, seconda = totale − prima.
- Fonti: [Sole 24 Ore](https://ntplusfisco.ilsole24ore.com/art/dichiarazioni-2026-versamenti-saldo-e-acconto-giugno-e-luglio-AIDeWZXD),
  [fiscomania](https://fiscomania.com/calcolo-acconto-irpef), [altroconsumo](https://www.altroconsumo.it/soldi/730/consigli/acconti-imposte).

## R-06 — Piani di versamento (FR-025..FR-030)

- **Decisione**: il motore genera i versamenti per mese di ciascun piano a partire dagli stessi totali:
  1. minimo storico; 2. previsionale (reddito atteso inserito, rischio se < stima aggiornata);
  3. acconto volontario (importo e mese scelti, scalato dal saldo); 4. rateizzazione di saldo e primo acconto
  fino a 7 rate mensili con interessi 4% annuo dalla seconda rata, secondo la tabella dei titolari di
  partita IVA (rata 2: 0,18%; poi +0,33% al mese: 0,51%, 0,84%, 1,17%, 1,50%, 1,83%); 5. differimento di
  30 giorni con maggiorazione 0,40%. Il **secondo acconto non è rateizzabile**: la rateizzazione in 5 rate
  da gennaio a maggio per le partite IVA fino a 170.000 € valeva solo per il 2023 e il 2024 e non risulta
  riaperta ([informazionefiscale](https://www.informazionefiscale.it/irpef-scadenza-secondo-acconto-2026));
  se tornasse, si aggiunge come piano. Totale d'imposta identico tra i piani (test). Valori (D) nelle
  regole dell'anno.
- **Motivo**: l'imposta non cambia, cambia quando si paga (storia 5). Nessuna strategia che sposti
  incassi o fatture (FR-029).

## R-07 — Contributi ENPAP (FR-004, FR-005, FR-022)

- **Fonte ufficiale** ([ENPAP, 10/11/2026](https://www.enpap.it/news/2026/11/approvata-la-riforma-della-previdenza-le-novita-dal-1-gennaio-2027/)):
  "I Ministeri vigilanti hanno approvato la proposta". Integrativo **4% dal 1° gennaio 2027** (V) — aggiorna
  la regola della 003. Soggettivo: "nel 2027 il minimo è pari all'11% del reddito professionale", applicato
  "con il saldo sui redditi 2026 con scadenza 1° ottobre 2027"; +1 punto l'anno fino al 15% nel 2031.
- **Decisione**: l'aliquota del soggettivo è associata all'**anno del reddito**: redditi 2026 → 11% (V),
  redditi 2027 → 12% (D: la pagina indica l'anno di versamento, l'interpretazione va confermata con ENPAP),
  2028 → 13%, 2029 → 14%, 2030 e seguenti → 15% (D). Minimi 2026: soggettivo 856 €, integrativo 66 € (D,
  fonte divulgativa); maternità ≈ 130 € (D); agevolazioni per i neoiscritti e minimi 2027: **non noti** ⇒
  regole con valore assente: il motore li segnala come mancanti e il risultato è provvisorio
  (mai valori inventati).
- **Versamento e deducibilità**: i contributi del reddito N si versano entro il 1° ottobre N+1 (saldo);
  soggettivo e maternità sono deducibili **nell'anno in cui si pagano** (art. 10 c. 1 lett. e TUIR,
  principio di cassa); l'integrativo no (non è reddito né costo: lo paga il cliente). Per un anno in
  corso il motore aggiunge i contributi **previsti** entro il 31/12 dal calendario ENPAP delle regole
  (chiarimento 2026-11-20), mostrati a parte.
- Conseguenza per il primo anno: nel 2027 non si deduce quasi nulla (salvo minimi), i contributi sui
  redditi 2027 riducono l'IRPEF **2028**.

## R-08 — Reddito professionale per cassa (FR-002)

- **Decisione**: compensi incassati nell'anno (vista `reddito_cassa.compensi_incassati` della 003, cioè
  la parte di compenso degli incassi, ritenuta compresa, senza integrativo e IVA) + bolli addebitati
  incassati − spese inerenti pagate (inserite a mano finché non c'è la 008) − bolli pagati. Il reddito può
  essere negativo e allora riduce il reddito complessivo (art. 8 TUIR: per i professionisti in ordinario
  la perdita si scomputa dagli altri redditi dell'anno) (D).

## R-09 — Arrotondamenti (FR-018)

- **Decisione**: tutto in centesimi interi; percentuali e coefficienti con arrotondamento commerciale al
  centesimo nel punto in cui la norma indica l'importo (imposta per scaglione, detrazione, addizionale,
  acconto); somme senza arrotondamenti intermedi. La dichiarazione riporta gli importi in euro interi:
  lo scarto (≤ 1 € per voce) è dichiarato nella spiegazione.

## R-10 — Struttura delle regole

- **Decisione**: `src/engine/regole/irpef/{tipi,2026,2027,index}.ts` separato dalle regole di fatturazione;
  ogni valore `Regola<T>` con `fonte` e `stato`; `regoleIrpefPerAnno(anno)` lancia un errore se l'anno
  manca. Regole con `valore: null` = assenti ⇒ avviso e risultato provvisorio.

## R-11 — Rinvii

- Oneri deducibili e detraibili da 004/008 (FR-023): il motore accetta già l'input (totali per aliquota),
  il calcolo delle franchigie e dei limiti per reddito (art. 16-ter) arriva con la 008. Promemoria per la
  008: con reddito complessivo oltre 75.000 € (CU oltre 50.000 € più partita IVA) scattano i tetti agli oneri
  detraibili dell'art. 16-ter (L. 207/2024); va calcolato, non ignorato.
- Gestione Separata INPS per attività diverse (FR-022): tipo di previdenza nell'input, aliquote (D) vuote
  ⇒ segnalazione.
- Familiari a carico automatici: rinviati (FR-032).

## R-12 — Persistenza

- **Decisione**: nuove tabelle dal modello RLS della 002: `certificazioni_uniche`, `dati_anno`,
  `aliquote_addizionali`, `versamenti_previdenza`, `versamenti_imposte` (data-model.md). Gli **scenari**
  non si salvano (FR-014: vivono nella pagina e si scartano). Il motore non legge il database: riceve i
  dati già raccolti dalla pagina (principio I).
