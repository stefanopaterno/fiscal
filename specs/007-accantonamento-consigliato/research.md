# Ricerca: Accantonamento consigliato

**Spec**: [spec.md](spec.md) | **Piano**: [plan.md](plan.md) | **Data**: 2026-11-23

## R-01 — Cosa accantonare su ogni incasso (FR-001, FR-002, FR-010, FR-011)

- **Decisione**: per un incasso la quota da mettere da parte è la somma di:
  1. **imposte**: IRPEF e addizionali dell'anno con l'incasso meno quelle senza (motore 001, sul cumulo con la
     CU: il lavoro dipendente è già tassato in busta paga, conta solo l'effetto aggiuntivo);
  2. **contributo soggettivo ENPAP**: differenza del soggettivo con e senza il compenso (minimi compresi);
  3. **contributo integrativo** incassato (si gira all'ENPAP), **IVA** incassata (si versa allo Stato) e
     **bollo** della fattura (lo versa il professionista);
  4. **meno la ritenuta d'acconto** della quota incassata (l'ha già versata il cliente).
  Il margine di sicurezza (10% nel primo anno) si applica a imposte e soggettivo, mostrato a parte. Le quote
  sono quelle dell'incasso (in proporzione al netto della fattura, come in `redditoDiCassa`).
- **Ordine degli incassi**: gli incassi dell'anno si calcolano in ordine di data, ognuno sopra a quelli
  precedenti (reddito senza incassi + compensi cumulati): la somma degli effetti coincide con l'effetto totale
  della partita IVA sull'anno. Il totale è comunque controllato dalla copertura (R-03).
- **Senza CU** dell'anno il calcolo non si fa (il motore 001 parte dalla busta paga: senza, l'effetto sul
  cumulo sarebbe sottostimato): la pagina chiede la CU e non propone accantonamenti.
- Base dei dati: anno in corso fino a oggi (`raccogliAnno`). La previsione di fine anno arriva con la 006.

## R-02 — Percentuale del mese (FR-003)

- **Decisione**: "su ogni 100 € di compenso accantona X €" = effetto di +100 € di compenso su imposte e
  soggettivo (più margine), con a parte il 100% di integrativo, IVA e bollo incassati. Fotografata una volta
  al mese (o a richiesta) con i suoi motivi: scaglione marginale, detrazione da lavoro, aliquota ENPAP; al
  ricalcolo il sistema spiega cosa è cambiato rispetto alla fotografia precedente.

## R-03 — Fabbisogno e copertura (FR-005, FR-006)

- **Decisione**: scadenze dell'anno dopo dal motore 001 (`stimaVersamenti`: giugno e novembre) + contributi
  ENPAP (1° ottobre, `contributiEnpap`) + IVA e bollo incassati (versamento trimestrale, date approssimate) (D).
  Il saldo del salvadanaio copre le scadenze in ordine di data; per ognuna: coperta, mancano X, eccedenza.

## R-04 — Primo anno e piano mensile (FR-007)

- **Decisione**: fabbisogno fino a giugno dell'anno dopo (più novembre ed ENPAP) meno saldo, diviso per i mesi
  che mancano a giugno, arrotondato per eccesso al centesimo. Con un tasso annuo lordo, gli interessi netti
  (ritenuta 26% sugli interessi dei conti, art. 26 DPR 600/1973 come modificato dal DL 66/2014 (D)) riducono
  il piano; interessi a capitalizzazione semplice, stima dichiarata.

## R-05 — Netto reale (FR-008)

- **Decisione**: incassato dell'anno (P.IVA) − spese pagate − accantonamenti necessari dell'anno (imposte e
  contributi dovuti per la P.IVA, integrativo, IVA, bollo) = disponibile. Niente stipendio, niente crediti non
  incassati.

## R-06 — Registrazione nel salvadanaio (FR-004)

- **Decisione**: movimenti registrati a mano (versamento collegato all'incasso o libero; prelievo per una
  scadenza pagata). Un incasso dell'anno senza versamento collegato resta un **promemoria** ("fatto",
  "importo diverso", "dopo") finché non si chiude. Controllo mensile facoltativo del saldo reale: la
  differenza si registra come rettifica.
