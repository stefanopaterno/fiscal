# Contratto: motore delle spese (`src/engine/spese/`)

TypeScript puro (principio I), centesimi interi, regole da `src/engine/regole/spese/{tipi,2026,2027,index}.ts`
(`regoleSpesePerAnno(anno)`, errore se mancano).

## `deducibileSpesa(spesa, contesto) → { deducibile, percentuale, tetto?, motivo, regola }`
Spesa: categoria, importo, iva_detraibile, percentuale?, modalita, rimborsata. Contesto: anno, compensi
dell'anno (per i tetti in % dei compensi). Esclusa se rimborsata o se la categoria richiede tracciabilità e
il pagamento è in contanti.

## `totaleSpeseAnno(spese, beni, contesto) → { deducibile, perCategoria[], ammortamenti, senzaGiustificativo, avvisi }`
Applica i tetti annui per categoria (formazione 10.000 €, vitto 2% dei compensi, rappresentanza 1%) sulla
somma della categoria, non sulla singola spesa.

## `pianoAmmortamento(bene, regole) → { immediata: boolean, quote: { anno, quota, residuo }[] }`
≤ 516,46 € ⇒ una quota nell'anno di acquisto; oltre ⇒ quote al coefficiente fino a esaurimento (ultima
quota = residuo). Dismissione ⇒ quote ferme all'anno precedente, avviso.

## `oneriAnno(oneri, contesto) → { deduzioni, detrazioni, perVoce[], residui[], esauriti[] }`
Contesto: anno, reddito complessivo (per art. 16-ter), figli, previdenza complementare già in CU.

## `consigli(input001, spese, oneri, impostazioni, oggi) → { attivi[], esauriti[], risparmioTotale }`
Ogni consiglio: voce, natura, residuo, risparmioPerEuro (su 100 €), risparmioMassimo, costoNetto,
scadenza, avvertenze, regola. Il risparmio viene da `calcolaAnno` (001) con e senza la voce.

## `simulaSpesa(input001, ipotesi[]) → { prima, dopo, perOpzione[] }` (US4, non salva nulla)

## `budgetUfficio(incassiMensili[], impostazioni, compensoMedioSeduta, input001) → { canoneMassimo, costoNetto, sedute, affidabile, avvisi, ipotesi }`
