# Ricerca: Spese deducibili e consigli di risparmio fiscale

**Spec**: [spec.md](spec.md) | **Piano**: [plan.md](plan.md) | **Data**: 2026-11-22

Legenda: (V) verificata su fonte ufficiale; (D) da verificare (fonte divulgativa, fonti discordanti o
interpretazione). Ogni valore sta nelle regole per anno `src/engine/regole/spese/` con fonte e stato
(FR-016, SC-006). Il quadro normativo è quello del D.Lgs. 192/2024 (riforma del lavoro autonomo, artt. 54
e seguenti TUIR) e della L. 207/2024.

## R-01 — Categorie di spesa professionale e deducibilità

| Categoria | Deducibile | Limiti e condizioni | Stato |
|---|---|---|---|
| Formazione, master, convegni (con viaggio e soggiorno) | 100% | fino a 10.000 € l'anno (art. 54-ter TUIR) | (D) |
| Supervisione e consulenze professionali | 100% | — | (D) |
| Assicurazione RC professionale | 100% | — | (D) |
| Software, piattaforme di videochiamata, abbonamenti | 100% | — | (D) |
| Libri, test, riviste | 100% | — | (D) |
| Commissioni di incasso (POS, bonifici) | 100% | — | (D) |
| Connessione internet | 100% o 50% | 50% se uso promiscuo (scelta dell'utente) | (D) |
| Telefonia | 80% | — | (D) |
| Vitto e alloggio | 75% | entro il 2% dei compensi dell'anno; pagamento tracciabile obbligatorio (L. 207/2024) | (D) |
| Spese di rappresentanza | 100% | entro l'1% dei compensi | (D) |
| Iscrizione all'Albo, quota ENPAP non contributiva, PEC, firma digitale | 100% | — | (D) |
| Affitto studio, utenze dello studio (studio fisico) | 100% | **disattivate di default** (FR-026) | (D) |
| Uso promiscuo di locali di proprietà/affitto dell'abitazione | 50% | disattivata di default; solo se non c'è altro studio | (D) |
| Auto | 20% | costo massimo 18.075,99 €; fuori dalla prima versione (attività online) | (D) |
| Beni durevoli | vedi R-02 | — | (D) |

- **Decisione**: catalogo delle categorie nelle regole dell'anno (codice, nome, percentuale, tetto in
  percentuale dei compensi o in euro, obbligo di tracciabilità, attiva di default sì/no). La percentuale si
  può cambiare per singola spesa solo con una motivazione scritta (FR-002).
- **IVA**: con prestazioni esenti (art. 10 n. 18) l'IVA sugli acquisti è indetraibile e diventa costo: la
  spesa si registra al lordo dell'IVA. Con attività imponibili si applica il pro-rata della 003 (R-03 della
  003); nella prima versione l'utente indica l'IVA detraibile della spesa (di norma zero).
- **Rimborsi analitici** addebitati ai clienti (dal 2025): non sono reddito e la relativa spesa non è
  deducibile; la spesa si marca "rimborsata dal cliente" ed è esclusa.
- Fonti: [Fondazione Studi / edotto](https://www.edotto.com/articolo/reddito-di-lavoro-autonomo-lanalisi-della-fondazione-studi),
  [ecnews, rigo RE15 Redditi 2026](https://www.ecnews.it/fiscale/fisco-e-patrimonio/imposte-sul-reddito/spese-alberghiere-e-di-ristorazione-come-cambia-il-rigo-re15-nel-modello-redditi-2026-pf/),
  [revisori.it, riforma](https://www.revisori.it/wp-content/uploads/2025/03/Riforma-reddito-professionale.pdf),
  [fiscoetasse, telefonia](https://www.fiscoetasse.com/new-rassegna-stampa/3670-spese-servizi-di-telefonia-quando-sono-interamente-deducibili.html).
  Una fonte cita per vitto e alloggio un ulteriore limite dell'1%: da verificare (D).

## R-02 — Beni durevoli e ammortamento

- **Decisione**: costo unitario (al lordo dell'IVA indetraibile) fino a **516,46 €** ⇒ deduzione intera
  nell'anno del pagamento; oltre ⇒ ammortamento con il coefficiente della categoria (DM 31/12/1988):
  computer e telefoni 20%, mobili e arredi 12%, altre attrezzature 15% (D). **Primo anno**: le fonti non
  concordano sul dimezzamento per i professionisti; regola `primoAnnoMeta` = false (D) e l'app lo dice.
  L'ammortamento segue la data di entrata in funzione, non il pagamento (eccezione al principio di cassa).
- **Dismissione o vendita**: dal 2025 le plusvalenze dei beni strumentali concorrono al reddito (D.Lgs.
  192/2024); nella prima versione l'app registra la dismissione, ferma le quote e segnala di sentire il
  commercialista sull'eventuale plusvalenza o minusvalenza.
- Fonti: [fiscomania, ammortamento](https://fiscomania.com/ammortamento-beni-strumentali/),
  [fiscoetasse, beni sotto 516,46 €](https://www.fiscoetasse.com/approfondimenti/10391-ammortamento-ed-acquisto-di-beni-inferiori-ad-516-46.html).

## R-03 — Oneri personali deducibili e detraibili

| Voce | Tipo | Regola | Stato |
|---|---|---|---|
| Previdenza complementare | deduzione | fino a 5.164,57 € l'anno, **compresi** i versamenti già fatti tramite il datore (CU) | (V) |
| Contributi ENPAP volontari (aliquota maggiorata del soggettivo) | deduzione | integralmente; aliquota volontaria fino al 30% (bozza ENPAP 02/2026) | (D) |
| Erogazioni liberali a enti del Terzo settore | deduzione **o** detrazione | deduzione fino al 10% del reddito oppure detrazione 30% (35% ODV) fino a 30.000 € | (D) |
| Spese sanitarie personali | detrazione 19% | oltre la franchigia di 129,11 €; pagamento tracciabile (salvo farmaci e dispositivi) | (V) |
| Interessi del mutuo prima casa | detrazione 19% | fino a 4.000 € di interessi | (D) |
| Istruzione, attività sportive dei figli, altre art. 15 | detrazione 19% | limiti della voce | (D) |

- **Tetto alle detrazioni per redditi alti** (art. 16-ter TUIR, L. 207/2024, dal 2025): oltre 75.000 € di
  reddito complessivo le spese detraibili al 19% (escluse quelle sanitarie e poche altre) si considerano
  fino a 14.000 € (8.000 € oltre 100.000 €) × coefficiente per figli a carico (0,50 senza figli; 0,70 con
  uno; 0,85 con due; 1 con tre o più o con figli disabili) (D: le fonti non concordano sui coefficienti).
  È probabile per l'utente quando la partita IVA cresce (CU oltre 50.000 € + professionale oltre 25.000 €).
- **Riduzione dell'art. 15 oltre 120.000 €**: fuori dalla prima versione (non pertinente), segnalata.
- Fonti: [ecnews, limiti detrazioni](https://www.ecnews.it/fiscale/adempimenti-in-pratica/i-limiti-relativi-alle-detrazioni-irpef/),
  [brocardi, art. 16-ter](https://www.brocardi.it/testo-unico-imposte-redditi/titolo-i/capo-i/art16ter.html),
  [ENPAP, verbale CIG 02/2026](https://www.enpap.it/DOC/RIFORMA_PREVIDENZIALE/2026_02_06-07_VERBALE_CIG_OMISSIS.PDF),
  [memoria alla Camera 07/2026](https://documenti.camera.it/leg19/documentiAcquisiti/COM27/Audizioni/leg19.com27.Audizioni.Contributo%20Scritto.PUBBLICO.ideGes.97811.23-07-2026-11-16-18.189.pdf).

## R-04 — Risparmio d'imposta (FR-006, SC-001)

- **Decisione**: il risparmio si calcola **sempre con il motore della 001** confrontando l'anno con e senza
  la voce (stesse CU, stesso reddito): deduzioni professionali ⇒ riducono il reddito professionale (e quindi
  anche il contributo soggettivo ENPAP: risparmio contributivo mostrato a parte); oneri deducibili ⇒
  riducono l'imponibile; detrazioni ⇒ si aggiungono alle detrazioni, con incapienza. Nessuna aliquota
  "marginale" scritta nella logica dei consigli: è il motore a dire quanto vale ogni euro.
- Risparmio per euro = (imposte prima − imposte dopo) / importo, calcolato su 100 € e sul residuo intero.

## R-05 — Consigli (FR-007..FR-012, FR-027)

- **Decisione**: lista generata da regole (dati, non logica): per ogni voce con residuo > 0 nell'anno in
  corso il motore calcola risparmio massimo, risparmio per euro e costo netto (= importo − risparmio);
  ordine per risparmio per euro, poi per risparmio massimo. Natura: "spesa che fai comunque" (formazione,
  supervisione, assicurazione) o "solo per risparmio" (previdenza complementare, contributi volontari,
  liberalità) con l'avvertenza "deducibile non vuol dire gratis". Previdenza e contributi volontari solo se
  l'accantonamento è coperto: finché manca la 007 l'utente lo conferma con un interruttore (FR-027).
  Scadenza 31 dicembre (pagamento entro l'anno). Mai consigli su date di incasso o fatturazione (FR-012).

## R-06 — Ufficio (storia 8, FR-022..FR-025)

- **Decisione**: finché non c'è la 006, la previsione degli incassi è la media mensile degli ultimi 12 mesi
  di incassi (003), segnalata come stima. Canone massimo = incassi medi × (1 − margine) × rapporto massimo
  (valori iniziali dell'utente: margine 20%, rapporto 15%; regole pratiche, non fiscali). Costo netto con il
  motore (affitto 100% deducibile). Sedute di pareggio = canone ÷ compenso medio per seduta, per eccesso.
  Avviso di inaffidabilità con meno di 6 mesi di incassi o forte variabilità (coefficiente di variazione
  > 50%).

## R-07 — Giustificativi (FR-015, US6)

- **Decisione**: file in Supabase Storage, bucket privato `giustificativi`, percorso `<owner_id>/<id>`,
  policy sul proprietario e aal2 come le tabelle. La spesa conserva `ha_giustificativo`; una spesa senza
  file si salva con l'etichetta "senza giustificativo" (FR-014). Riepilogo per categoria e anno esportabile
  in CSV. L'archivio completo dei documenti resta alla 010.

## R-08 — Integrazione con la 001

- Le spese professionali (deducibile dell'anno, quote di ammortamento) sostituiscono il campo manuale
  `dati_anno.spese_professionali`, che resta come "altre spese non registrate". Gli oneri deducibili
  personali alimentano `oneriDeducibili`; le detrazioni calcolate alimentano le detrazioni del motore
  insieme ad `altreDetrazioni` (inserite a mano). La previdenza complementare versata tramite il datore (sezione
  "previdenza complementare" della CU) si inserisce nella CU (nuovo campo facoltativo) per il residuo del limite.
