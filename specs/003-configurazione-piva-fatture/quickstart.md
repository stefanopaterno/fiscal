# Guida di verifica: Configurazione della partita IVA e fatturazione

**Piano**: [plan.md](plan.md) | **Contratti**: [contracts/](contracts/)

## Controlli automatici

```text
npm test                  # motore: casi al centesimo (SC-001), pro-rata, validatori
supabase test db          # numerazione, immutabilità, incassi, RLS
npm run test:integration  # emissione, note di credito, reddito per cassa
npm run build:e2e && npm run test:e2e   # fattura da telefono e PC, stampa, impaginazione
```

## Casi di prova al centesimo (regole 2027)

| # | Caso | Atteso |
|---|---|---|
| 1 | Seduta esente 80,00 €, persona fisica | integrativo 3,20; esente 83,20; bollo 2,00; totale 85,20; ritenuta 0; netto 85,20 |
| 2 | Seduta esente 74,00 €, persona fisica | integrativo 2,96; esente 76,96; bollo 0; totale 76,96 |
| 3 | Seduta esente 1.000,00 € a ente sostituto d'imposta | integrativo 40,00; esente 1.040,00; bollo 2,00; totale 1.042,00; ritenuta 200,00; netto 842,00 |
| 4 | Consulenza imponibile 500,00 € a ente sostituto | integrativo 20,00; imponibile 520,00; IVA 114,40; totale 634,40; ritenuta 100,00; netto 534,40; nessun bollo |
| 5 | Righe miste: esente 100,00 + imponibile 100,00, persona fisica | integrativo 4,00+4,00; esente 104,00; imponibile 104,00; IVA 22,88; bollo 2,00; totale 232,88 |
| 6 | Bollo a carico del professionista, caso 1 | bollo 2,00 non addebitato; totale 83,20 |

## Scenari a mano (telefono e PC)

1. Configurazione: l'indicatore passa a "pronto a fatturare" solo con i dati obbligatori.
2. Fattura caso 1 in meno di 2 minuti da telefono; numero 1 nell'anno.
3. Bozza cancellata e nuova fattura: numero 2, nessun salto.
4. Fattura emessa: non modificabile; nota di credito con numero successivo.
5. Fattura di dicembre incassata a gennaio: reddito nell'anno di gennaio.
6. Stampa/PDF con tutte le diciture.
7. Adempimenti: STS esclude il paziente con opposizione; riepilogo fattura elettronica per l'ente.
