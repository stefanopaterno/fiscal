# Piano: Previsione mensile delle tasse

**Spec**: [spec.md](spec.md) | **Data**: 2026-11-23

## Scelte

- **Motore separato** `src/engine/previsione/`:
  - `proiezione.ts`: compensi per mese reali, mese corrente «in corso» (il dato parziale non sembra un calo),
    mesi futuri con andamento, stagionalità, impegni noti (fatture da incassare il mese dopo) o obiettivo annuo;
    pesi dei mesi 0–100%; scenari prudente/ottimistico sulla sola parte futura; metodo automatico (obiettivo nel
    primo anno, andamento dopo tre mesi) (FR-003, FR-004, FR-010, FR-016).
  - `anno.ts`: tasse di fine anno col motore 001 (con e senza partita IVA) e contributi ENPAP; spese deducibili e
    ritenute future nella stessa proporzione dei compensi avuta finora (ipotesi dichiarata); righe mensili con
    tasse maturate e mese del cambio di scaglione (FR-001, FR-002, FR-009, FR-012).
  - `calendario.ts`: pagamenti per 18 mesi da `stimaVersamenti` ed ENPAP dell'anno prima e dell'anno in corso;
    con un credito a giugno si mostra il netto compensato, così il totale coincide col motore (SC-004); spiegazione
    delle variazioni tra due fotografie (FR-006, FR-007).
- **Dati** (migrazione `20261123000300_previsione.sql`): `ipotesi_previsione` (una per anno) e
  `previsioni_salvate` (una per mese). Chiusura mensile alla prima apertura dopo la fine del mese, più il salvataggio
  a mano (FR-005).
- **Pagina** `/app/tasse/previsione/` (collegata dal quadro delle tasse) e **riquadro in evidenza della home** con
  tasse previste, prossimo grande versamento e scenario prudente (FR-017).
- Senza CU dell'anno non si mostrano importi (come nella 007).

## Rinviato

- Confronto con un obiettivo di netto (US5): c'è il confronto con l'anno prima e con l'obiettivo di compensi.
- Intervallo degli scenari dalla variabilità reale dopo sei mesi (FR-004, facoltativo).
- Crediti dell'anno prima da compensare (FR-009) arrivano con la specifica 004.
