# Contratto: funzioni di database della fatturazione

**Modello**: [../data-model.md](../data-model.md) | **Ricerca**: R-04, R-05, R-06

Tutte con **sicurezza dell'invocante** (soggette alla RLS: aal2 e proprietario), `search_path` fisso.

| Funzione | Cosa fa | Errori |
|---|---|---|
| `emetti_fattura(p_id uuid) → (anno int, numero int)` | lucchetto per utente e anno; controlla configurazione completa, data ≥ inizio attività e ≥ ultima emessa dell'anno, almeno una riga, somma delle righe = totale compensi; assegna il numero successivo della sequenza unica dell'anno; imposta lo stato STS; salva la fotografia di professionista, cliente e attività; stato bozza→emessa | `configurazione_incompleta`, `data_anteriore_inizio`, `data_anteriore_ultima`, `fattura_vuota`, `totali_incoerenti`, `non_bozza` |
| `crea_nota_di_credito(p_fattura uuid, p_id_nota uuid, p_data date default current_date) → (anno, numero)` | storno totale: copia righe e importi (positivi; il tipo `nota_credito` indica che si sottraggono nei riepiloghi), la emette nella stessa sequenza e porta la fattura ad `annullata`. Note di credito parziali: rinviate | `non_emessa` più quelli dell'emissione |
| inserimento diretto in `incassi` (compatibile con la coda senza rete) | trigger `incassi_controlla`: lucchetto sulla fattura, rifiuta se non emessa o se la somma supera il netto; i contanti non sono tracciabili (vincolo) | `oltre_il_netto`, `non_emessa` |
| `segna_sts_inviate(p_ids uuid[]) → int` | stato_sts da_inviare→inviata, restituisce quante | — |
| vista `reddito_cassa` | per anno di incasso: incassato e parte di compenso incassata (in proporzione al netto) | — |
| vista `riepilogo_iva` | per anno: imponibile, IVA, esente delle fatture emesse, note di credito sottratte | — |

| `elimina_fattura_prova(p_id uuid)` | solo in prova: cancella una fattura (anche emessa) con incassi e note di credito collegate | `non_in_prova` |
| `cancella_dati_prova(p_anagrafiche boolean) → (fatture, incassi, anagrafiche)` | solo in prova: cancella fatture e incassi, e se richiesto clienti, attività e profilo | `non_in_prova` |
| `carica_dati_esempio() → (clienti, fatture, incassi, versamenti)` | FR-032, solo in prova; **security definer** (scrive il registro `private.dati_esempio`), quindi controlla da sé aal2, accesso completo e prova e lavora solo su `auth.uid()`. Crea profilo e attività se mancano, 12 clienti, 45 documenti 2026 emessi con `emetti_fattura`/`crea_nota_di_credito`, incassi e versamenti ENPAP. Lo annulla `cancella_dati_prova` | `accesso_negato` (42501), `non_in_prova`, `esempio_gia_caricato`, `esempio_fatture_presenti`, `configurazione_incompleta` |
| `passa_a_produzione(p_conferma text, p_tieni_anagrafiche boolean)` | parola «PRODUZIONE», codice TOTP da ≤ 300 s; cancella le prove, `in_prova` → false per sempre (trigger), evento `passaggio_produzione` | `non_in_prova`, `conferma_mancante`, `verifica_recente` |

In prova (`user_security.in_prova`, default true) `emetti_fattura` non controlla l'inizio attività e segna `fotografia.prova = true`.

Gli errori hanno codice `P0001`, messaggio = codice dell'errore, `detail` in italiano semplice.
Le viste sono `security_invoker` (soggette alla RLS di chi legge).

Trigger:
- `fatture_immutabili`: nessuna modifica o cancellazione di fatture `emessa`/`annullata`, eccetto
  `stato` (solo via nota di credito) e `stato_sts`.
- `righe_immutabili`: nessuna modifica di righe di fatture non in bozza.

Test pgTAP (`006_fatturazione.test.sql`): numerazione senza salti con bozze cancellate, sequenza unica
con note di credito, rifiuto della data anteriore, immutabilità, incassi oltre il netto, conformità RLS
(automatica con `003_conformita`).
