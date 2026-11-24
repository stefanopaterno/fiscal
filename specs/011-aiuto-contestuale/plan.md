# Piano: Aiuto contestuale

**Spec**: [spec.md](spec.md) | **Data**: 2026-11-24

- **Fumetto a due livelli** (`src/ui/AiutoContestuale.tsx`, FR-007, FR-014): breve (spiegazione ed esempio) e
  «Dettagli» (perché, da dove viene il numero, passi del calcolo, fonte e stato di verifica, avvertenza «non è
  consulenza»). Livello predefinito dalle preferenze. Si chiude solo se il focus esce anche dal fumetto.
- **Occhio** (FR-012): con l'occhio chiuso gli importi in euro nel testo dei fumetti diventano «•••• €»; i passi del
  calcolo usano gli importi oscurabili.
- **Glossario** (`src/engine/regole/glossario/`, FR-006, FR-009): 28 termini con definizione, esempio con le cifre
  prese dalle regole dell'anno e pagine collegate; i termini nei fumetti sono toccabili (prima occorrenza, parole
  intere, forma più lunga).
- **Guide passo passo** (`src/features/aiuto/guide.ts`, FR-004): partita IVA, prima fattura, CU, spesa, saldo
  della dichiarazione, pacchetto per il commercialista, archivio; avanzamento salvato sul dispositivo.
- **Pagina Aiuto** `/app/aiuto/` (ricerca su guide, glossario e tour; preferenze) e **guida** `/app/aiuto/guida/`.
- **Suggerimento automatico in home** (FR-010) disattivabile.
- **Da dove viene questo numero** (FR-002) su tasse previste e netto reale; nel quadro delle tasse la fonte della
  regola passa nei dettagli del fumetto.
- **Controlli per lo sviluppo** (FR-013) in `tests/unit/aiuto.test.ts`: ogni pagina ha un aiuto, ogni collegamento
  di guide, glossario e tour porta a una pagina esistente, nessuna cifra normativa nelle guide.

## Rinviato
- «Da dove viene» con i passi su tutti gli importi calcolati (oggi: tasse previste, netto reale e le voci del quadro
  delle tasse con le spiegazioni del motore).
- Prova con una persona esterna (SC-002).
