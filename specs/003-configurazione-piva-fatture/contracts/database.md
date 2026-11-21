# Contratto: funzioni di database della fatturazione

**Modello**: [../data-model.md](../data-model.md) | **Ricerca**: R-04, R-05, R-06

Tutte con **sicurezza dell'invocante** (soggette alla RLS: aal2 e proprietario), `search_path` fisso.

| Funzione | Cosa fa | Errori |
|---|---|---|
| `emetti_fattura(p_id uuid) → (anno int, numero int)` | lucchetto per utente e anno; controlla configurazione completa, data ≥ inizio attività, almeno una riga; assegna il numero successivo della sequenza unica dell'anno; stato bozza→emessa | `configurazione_incompleta`, `data_anteriore_inizio`, `fattura_vuota`, `non_bozza` |
| `crea_nota_di_credito(p_fattura uuid, p_id_nota uuid)` | crea una nota di credito (stessa sequenza, importi con segno opposto) collegata alla fattura; se copre l'intero importo la fattura passa ad `annullata` | `non_emessa` |
| `registra_incasso(p_id uuid, p_fattura uuid, p_data date, p_importo bigint, p_modalita, p_tracciabile)` | inserisce l'incasso; rifiuta se la somma supera il netto | `oltre_il_netto`, `non_emessa` |
| `segna_sts_inviate(p_ids uuid[])` | stato_sts da_inviare→inviata | — |
| vista `reddito_cassa` | anno di incasso, totale incassato | — |
| vista `riepilogo_iva` | per anno: imponibili, esenti (dalle fatture emesse) | — |

Trigger:
- `fatture_immutabili`: nessuna modifica o cancellazione di fatture `emessa`/`annullata`, eccetto
  `stato` (solo via nota di credito) e `stato_sts`.
- `righe_immutabili`: nessuna modifica di righe di fatture non in bozza.

Test pgTAP (`006_fatturazione.test.sql`): numerazione senza salti con bozze cancellate, sequenza unica
con note di credito, rifiuto della data anteriore, immutabilità, incassi oltre il netto, conformità RLS
(automatica con `003_conformita`).
