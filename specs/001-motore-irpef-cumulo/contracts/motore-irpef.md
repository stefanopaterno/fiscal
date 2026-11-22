# Contratto: motore IRPEF (`src/engine/irpef/`)

TypeScript puro (principio I). Importi in centesimi interi. Nessun accesso a rete o database.

## `calcolaAnno(input: InputAnno): RisultatoAnno`

`InputAnno`:
- `anno`
- `cu: { redditoLavoro, giorniLavoro?, ritenuteIrpef, addRegionale, addComunaleAcconto, addComunaleSaldo, addComunaleAccontoAnnoDopo?, detrazioniFamiliariFruite? }[]` (almeno una, assunzione della spec)
- `redditoProfessionale` (anche negativo, R-08), `ritenuteSubite`
- `versamentiPrevidenza: { data, importo, tipo, cassa }[]`, `contributiPrevisti?` (anno in corso)
- `oneriDeducibili`, `altreDetrazioni`
- `addizionali: { regionale: { finoA: number|null; aliquota: number }[]; comunale: { aliquota; soglia? } } | null`
- `accontiVersati: { irpef, addComunale }`

`RisultatoAnno`:
- `redditoLavoro`, `redditoProfessionale`, `redditoComplessivo` (base delle detrazioni), `contributiDedotti`
  (solo soggettivo e maternità con data nell'anno; integrativo escluso), `contributiPrevisti`,
  `redditoImponibile` (complessivo − contributi − oneri: base di scaglioni e addizionali)
- `irpefLorda` con `perScaglione: { da, a, aliquota, imponibile, imposta }[]`
- `detrazioneLavoro`, `ulterioreDetrazione`, `altreDetrazioni`, `irpefNetta`, `incapienza`
- `scaglione: { aliquotaMarginale, sogliaSuccessiva | null, mancaAlProssimo | null }`
- `ritenute` (CU + subite), `differenza` (base acconto storico), `conguaglioIrpef`
- `addizionali: { regionale: { dovuta, trattenuta, conguaglio }, comunale: { dovuta, trattenuta, conguaglio, accontoAnnoDopo } } | null`
- `conguaglioTotale`, `provvisorio: boolean`, `regoleDaVerificare: string[]`, `datiMancanti: string[]`
- `spiegazioni: { voce: string; testo: string; regola: string }[]` (FR-011, SC-004)

Errori: anno senza regole; nessuna CU; importi negativi non ammessi (tranne reddito professionale).

## `confrontaScenario(input, variazione: { compensi?: number; spese?: number })`

Restituisce `{ prima, dopo, differenze: { redditoComplessivo, irpef, addizionali, conguaglio,
contributiEnpapDovuti }, superaScaglione, spiegazione }`. Non modifica `input` (FR-014).

## `calcolaAcconti(base: RisultatoAnno, opzioni: { metodo: 'storico' | 'previsionale'; differenzaAttesa?; soggettoIsa })`

`{ totale, primo, secondo, unicaSoluzione, nonDovuto, accontoAddComunale, spiegazione }` (R-05).

## `pianiVersamento(...)` (storia 5)

Per ogni piano: `versamenti: { mese: 'AAAA-MM'; importo; voce }[]`, `picco`, `costi`, `rischio`,
`totaleImposta` (identico tra i piani, test), `consigliato`.

## Arrotondamenti (R-09)

Commerciale al centesimo su: imposta di ogni scaglione, detrazioni (coefficiente a 4 decimali),
addizionali, rate degli acconti (seconda = totale − prima).
