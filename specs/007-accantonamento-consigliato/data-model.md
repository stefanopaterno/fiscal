# Modello dati: Accantonamento consigliato

Tabelle dal modello RLS della 002. Importi in centesimi.

### `salvadanaio` (movimenti, FR-004)

| Campo | Tipo | Vincoli |
|---|---|---|
| data | date | |
| importo | bigint ≠ 0 | positivo = messo da parte, negativo = prelevato (scadenza pagata, rettifica) |
| tipo | enum `accantonamento` / `scadenza_pagata` / `rettifica` / `interessi` | |
| incasso_id | uuid null → incassi | accantonamento di un incasso (chiude il promemoria), `unique` se valorizzato |
| rimandato | boolean | promemoria rimandato ("dopo"): resta visibile ma più in basso |

### `impostazioni_accantonamento` (una riga per utente, FR-009, FR-015)

| Campo | Tipo | Vincoli |
|---|---|---|
| margine | numeric(4,3) | 0–0,5; default 0,100 (primo anno) |
| metodo | enum `marginale` / `media` | default `marginale` |
| avvisi | boolean | default true |
| tasso_lordo | numeric(5,4) null | 0–0,2 |
| vincolato_fino | date null | |
| percentuale_mese | jsonb null | fotografia del mese: mese, per 100 €, quote, motivi |

Le scadenze e il fabbisogno non si salvano: si calcolano dal motore.
