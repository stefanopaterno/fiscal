# Modello dati: Previsione mensile

Tabelle col modello RLS della 002 (proprietario + aal2). Importi in centesimi.

### `ipotesi_previsione` (una per utente e anno)

| Campo | Tipo | Vincoli |
|---|---|---|
| anno | int | 2000–2100, unico per utente |
| metodo | enum `andamento`/`stagionalita`/`impegni`/`obiettivo` null | null = automatico |
| obiettivo | bigint null | > 0 |
| pesi | numeric(4,3)[] | 12 valori, 0–1, predefinito 1 |
| prudente | numeric(4,3) | 0–0,9, predefinito 0,2 |
| ottimistico | numeric(4,3) | 0–2, predefinito 0,2 |

### `previsioni_salvate` (una per utente, anno e mese)

| Campo | Tipo | Vincoli |
|---|---|---|
| anno, mese | int, text `aaaa-mm` | unico per utente |
| metodo | enum null | |
| compensi_reali, compensi_previsti | bigint | ≥ 0 |
| reddito | bigint | anche negativo |
| imposte, contributi, totale | bigint | ≥ 0 |
| aliquota_marginale | numeric(4,3) | 0–1 |
