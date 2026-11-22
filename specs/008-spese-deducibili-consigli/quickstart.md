# Guida di verifica: Spese deducibili e consigli

Casi ricontrollati con uno script indipendente (Decimal, arrotondamento commerciale). Regole 2027 (R-01..R-03).

| Caso | Dati | Atteso |
|---|---|---|
| A | formazione 1.200,00 € | deducibile 1.200,00 € |
| B | telefono 600,00 € | 80% ⇒ 480,00 € |
| C | computer 1.500,00 € (IVA indetraibile compresa) | ammortamento 20%: 300,00 € l'anno per 5 anni |
| D | computer 450,00 € | sotto 516,46 € ⇒ 450,00 € subito |
| E | vitto 500,00 €, compensi dell'anno 10.000,00 € | 75% = 375,00 € ma tetto 2% = 200,00 € ⇒ 200,00 € |
| E2 | vitto 500,00 € pagato in contanti | 0 € e avviso di tracciabilità |
| F | previdenza complementare 6.000,00 €, 1.000,00 € già in CU | residuo 4.164,57 €; 1.835,43 € senza vantaggio |
| G | spese sanitarie 1.000,00 € | (1.000,00 − 129,11) × 19% = 165,47 € |
| H | reddito complessivo 90.000 €, nessun figlio, spese al 19% 20.000 € | tetto 16-ter 14.000 × 0,50 = 7.000 € |
| I | incassi medi 3.000 €/mese, margine 20%, rapporto 15% | canone massimo 360,00 € |
| J | risparmio: caso A con CU 50.500 € e professionale 10.000 € (2026) | IRPEF −516,00 € (1.200 € al 43%), il motore lo conferma |
| K | consigli: residui su formazione, previdenza, sanitarie | ordine per risparmio per euro; esaurita una voce, passa alla successiva |

## Comandi
`npm test` (motore), `supabase test db` (011), `npm run test:e2e` (spese, consigli e box in home).
