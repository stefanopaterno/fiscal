# Quickstart: verificare le guide agli adempimenti

## Prerequisiti

`supabase start`, `npm run build:e2e`, account di prova con 2FA (come gli altri e2e). Nessuna migrazione.

## Test automatici

| Comando | Cosa dimostra |
|---|---|
| `npx vitest run tests/unit/guide-adempimenti.test.ts` | 22 guide con sezioni obbligatorie, fonte e stato; ogni segnaposto si risolve; nessun codice tributo, data di scadenza o aliquota scritta nei testi; ricerca con sinonimi; «da ricontrollare» dopo 12 mesi |
| `npx vitest run tests/unit/parametri-catalogo.test.ts` | i nuovi valori (set adempimenti e codici F24) sono nel catalogo della 014 |
| `npx playwright test tests/e2e/guide-adempimenti.spec.ts` | layer dalla home, ricerca, guida F24, disegno → passo, Apri in Fiscal |
| `npx playwright test tests/e2e/layout.spec.ts` | 360 px, 44 px, nessuno scroll orizzontale |

## Scenari manuali

1. **Indice** (US1): home → «Guide agli adempimenti» sotto il calendario. Atteso: 5 gruppi con frequenza; cercando
   «bollo» resta la guida del bollo; «740» trova la dichiarazione dei redditi; Chiudi torna alla home.
2. **Guida F24** (US2, US4): apri «Pagare le tasse con l'F24». Atteso: sezioni in ordine, codici 4001, 4033, 4034,
   3801, 3843, 3844 presi dalle regole, disegno della sezione Erario con numeri che portano ai passi.
3. **Valore aggiornato** (US5): importa (014) un file che cambia `f24.irpef_saldo` dal giorno dopo; riapri la guida
   con la data di prova di quel giorno. Atteso: la guida mostra il codice nuovo senza modifiche al testo.
4. **Da verificare**: la guida del ravvedimento mostra i codici delle addizionali «da verificare» con l'invito a
   controllarli sul sito dell'Agenzia.
5. **Spunte**: segna due passi, chiudi e riapri: restano; «Azzera» le toglie.
6. **Apri in Fiscal**: dalla guida F24 → Tasse → Versamenti; il layer si chiude.
7. **Da altre pagine**: in Aiuto tocca una guida → si apre la home con il layer sulla guida.
