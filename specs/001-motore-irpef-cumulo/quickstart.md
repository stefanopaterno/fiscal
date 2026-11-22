# Guida di verifica: Motore IRPEF sul cumulo

Casi calcolati a mano con le regole 2026 (R-01, R-02; identiche nel 2027 finché non cambiano).
Addizionali d'esempio (non dell'utente): regionale 1,23% un solo scaglione, comunale 0,8% senza soglia.
Detrazioni con coefficiente a 4 decimali (R-02, R-09).

## Caso 1 — solo CU 38.000 €
Lorda 6.440,00 + 3.300,00 = **9.740,00**. Detrazione lavoro 1.910 × 0,5455 = **1.041,91**; ulteriore
1.000 × 0,25 = **250,00**. Netta **8.448,09**. Con ritenute CU 8.448,09: conguaglio **0,00**.

## Caso 2 — CU 38.000 + professionale 10.000 (complessivo 48.000)
Lorda 6.440,00 + 6.600,00 = **13.040,00**. Detrazione 1.910 × 0,0909 = **173,62**; ulteriore **0**
(oltre 40.000). Netta **12.866,38**. Conguaglio IRPEF **4.418,29** (= 3.300 al 33% + 868,29 + 250,00 di
detrazioni perse). Marginale 33%, mancano 2.000 € al 43%.
Addizionali: regionale 590,40 − 467,40 = **123,00**; comunale 384,00 − (91,20 + 212,80) = **80,00**;
acconto comunale anno dopo 30% × 80,00 = **24,00**. Conguaglio totale **4.621,29**.
Acconti (storico, non ISA): 4.418,29 → giugno **1.767,32**, novembre **2.650,97**.
Giugno dell'anno dopo: 4.418,29 + 123,00 + 80,00 + 1.767,32 + 24,00 = **6.412,61**.

## Caso 3 — perdita professionale −3.000 (complessivo 35.000)
Lorda 6.440 + 2.310 = **8.750,00**. Detrazione 1.910 × 0,6818 = 1.302,24 + 65 = **1.367,24**; ulteriore
1.000 × 0,625 = **625,00**. Netta **6.757,76**. Conguaglio a **credito −1.690,33**.

## Caso 4 — scenario "+5.000 €" sul caso 2 (complessivo 53.000)
Lorda 6.440 + 7.260 + 1.290 = **14.990,00**, detrazioni 0, conguaglio **6.541,91**: +**2.123,62** rispetto al
caso 2 (660 al 33% + 1.290 al 43% + 173,62 di detrazione persa). Scaglione 33% → 43%: solo i 3.000 € oltre
50.000 sono al 43%.

## Caso 5 — contributi versati nell'anno (2027): soggettivo 1.200, integrativo 400
Dedotto solo il soggettivo: complessivo 46.800. Lorda 6.440 + 6.204 = **12.644,00**; detrazione
1.910 × 0,1455 = **277,91**; netta **12.366,09**; conguaglio **3.918,00**. L'integrativo non cambia nulla.

## Caso 6 — primo anno (2027)
Anno 2026 come caso 1 (differenza 0) ⇒ nessun acconto nel 2027. Anno 2027 come caso 2 ⇒ il saldo emerge
a giugno 2028 (stessi importi del caso 2) e il quadro mostra "da accantonare" con l'avviso sul primo anno
(SC-006).

## Comandi
`npm test` (motore), `supabase test db` (009), `npm run test:e2e` (pagina Tasse da telefono e PC).
