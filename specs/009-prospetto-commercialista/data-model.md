# Modello dati: Prospetto per il commercialista

- `pacchetti`: periodo_da ≤ periodo_a, sezioni (1–20), usa_codici, allegati ≥ 0, destinatario (1–80), avvisi ≥ 0,
  regole (≤ 120), totali (oggetto JSON per sezione). Nessuna colonna per file o password.
- `richieste_commercialista`: data, testo (1–300, senza dati dei pazienti), stato aperta/chiusa con chiusa_il
  obbligatoria se chiusa, pacchetto_id (set null se il pacchetto si cancella).
- `modelli_pacchetto`: nome unico per utente (1–40), sezioni, usa_codici, allegati.
