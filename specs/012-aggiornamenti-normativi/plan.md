# Piano: Aggiornamenti normativi

**Spec**: [spec.md](spec.md) | **Data**: 2026-11-23

## Scelte

- **Notizie nel codice, non nel database**: `src/engine/regole/novita/index.ts` (notizie, ultimo controllo, fonti).
  Contengono solo informazioni pubbliche e arrivano con la pubblicazione come le regole; le scrive
  l'assistente dopo ogni controllo (FR-001, FR-003, FR-013: lo storico è la cronologia del file).
- **Regole da verificare raccolte da sole** (`src/engine/novita/regole-aperte.ts`): si scorrono tutti i set
  di regole e si prendono quelle con `stato: 'da_verificare'` (FR-009).
- **Calendario dei controlli** (`src/engine/novita/controlli.ts`): controllo settimanale (scaduto dopo 7 giorni)
  e addizionali alle date di pubblicazione; chiusi quando le aliquote dell'anno sono «verificate» (FR-011).
- **Prompt per l'assistente** generato dall'app: date, regole aperte, fonti; nessun dato personale (FR-011, SC-006).
- **Pagina** `/app/novita/` e **avviso in home** (FR-012). Nessuna tabella nuova.
- **Impatto sui conti** (FR-005): descritto nella notizia in generale; l'effetto con i dati dell'utente si vede nel
  simulatore delle tasse. Il calcolo automatico "regole vecchie contro nuove" resta un passo successivo.
- **Approvazione** (FR-007, FR-008): ogni proposta resta «in attesa» finché l'utente non dice sì; poi l'assistente
  modifica le regole, i test passano e si pubblica con il suo consenso.

## Costituzione

Principio I (regole separate e versionate): rispettato, le notizie stanno accanto alle regole. Privacy: nessun dato
personale nel repository né nel prompt. Nessun dato clinico.
