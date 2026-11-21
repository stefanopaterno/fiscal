# Implementation Plan: Configurazione della partita IVA e fatturazione

**Branch**: `003-configurazione-piva-fatture` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-configurazione-piva-fatture/spec.md`

## Summary

Configurazione dell'attività (profilo professionale e attività con codice ATECO, natura IVA e
previdenza), anagrafica clienti e pazienti senza dati clinici, fatture e note di credito con calcolo
automatico (contributo integrativo ENPAP, esenzione art. 10 n. 18 o IVA 22%, bollo 2 €, ritenuta 20%),
numerazione unica per anno assegnata dal database, incassi per cassa, documento stampabile/PDF,
preparazione dati per Sistema Tessera Sanitaria e riepilogo per la fattura elettronica, quota imponibile
e pro-rata IVA. Si appoggia interamente sulla specifica 002 (accesso, RLS, coda, aiuti, occhio).

Approccio (dettagli in [research.md](research.md)):

- **Calcoli nel motore fiscale puro** (`src/engine/`, principio I): regole per anno con fonte e stato
  di verifica; funzione `calcolaFattura` in centesimi con arrotondamenti documentati; test scritti prima.
- **Numerazione e immutabilità nel database**: la funzione `emetti_fattura` assegna il numero in modo
  atomico (lucchetto per utente e anno); un trigger impedisce di modificare le fatture emesse.
- **Interfaccia** secondo il mockup: navigazione a barra laterale (PC) e barra in basso (telefono);
  ogni campo con il suo aiuto "?"; nomi e importi rispettano l'occhio.
- **PDF nel browser** con una pagina di stampa dedicata (nessuna libreria in più); STS e fattura
  elettronica come riepiloghi da copiare o scaricare.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node 24; SQL Postgres 17 (Supabase).
**Primary Dependencies**: quelle della 002 (Next.js 16 export statico, React 19, Fluent UI 9, supabase-js); nessuna nuova.
**Storage**: Supabase Postgres, 7 tabelle nuove conformi al contratto RLS della 002.
**Testing**: Vitest (motore fiscale, validatori), pgTAP (numerazione, immutabilità, RLS), integrazione (emissione e incassi), Playwright (fattura da telefono e PC, stampa).
**Target Platform**: come 002 (PWA, telefono e PC).
**Project Type**: stessa app multipagina sotto `/app`.
**Performance Goals**: fattura sanitaria standard in meno di 2 minuti da telefono (SC-002); calcolo istantaneo (< 50 ms).
**Constraints**: importi in centesimi (interi); nessun dato clinico; regole dell'anno non scritte nella logica; fatture emesse immutabili.
**Scale/Scope**: un utente, qualche centinaio di fatture l'anno; ~8 pagine nuove.

## Constitution Check

| Principio / vincolo | Esito | Nota |
|---|---|---|
| I. Motore fiscale separato e versionato | ✅ | `src/engine/regole/2026.ts`, `2027.ts`; `src/engine/fattura/`; nessun import di UI o rete (regola ESLint già attiva) |
| II. Calcoli spiegabili | ✅ | `calcolaFattura` restituisce anche la spiegazione di ogni voce (perché il bollo, perché la ritenuta) |
| III. Test-first sui calcoli | ✅ | casi di prova al centesimo scritti prima (SC-001) |
| IV. Modello dati prima del codice | ✅ | [data-model.md](data-model.md), [contracts/](contracts/) |
| V. Configurabilità | ✅ | bollo a carico di chi, "già incassata" predefinita, soglia di attenzione IVA: impostazioni |
| VI. UI minimalista, Fluent UI 9, aiuti, mobile-first | ✅ | layout del mockup; test di impaginazione esteso alle pagine nuove |
| VII. Supabase, 2FA, RLS | ✅ | tabelle dal modello `nuova_tabella.sql`; test di conformità esistente le copre in automatico |
| Dati dei pazienti (GDPR) | ✅ | solo dati da fattura; nessun campo clinico; nomi oscurati dall'occhio |
| IVA: regola esente, eccezione 22% | ✅ | natura per riga e per attività; quota imponibile e pro-rata |

Nessuna violazione. Regole fiscali 2027 marcate "da verificare" finché non confermate (TODO(IVA_2027),
TODO(ENPAP_2027) nella costituzione).

## Project Structure

### Documentation

```text
specs/003-configurazione-piva-fatture/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/
│   ├── motore-fattura.md      # API del motore fiscale (input, output, arrotondamenti)
│   ├── database.md            # funzioni emetti_fattura, registra_incasso, nota di credito, viste
│   └── pagine.md              # percorsi e navigazione
└── tasks.md
```

### Source Code

```text
src/engine/
├── regole/{tipi.ts, 2026.ts, 2027.ts, index.ts}   # regole per anno con fonte e stato di verifica
├── fattura/{calcola.ts, prorata.ts}               # calcolo fattura e quota imponibile/pro-rata
└── validazioni/{codice-fiscale.ts, partita-iva.ts}
src/features/fatture/      # elenco, nuova fattura, dettaglio, stampa, incassi, note di credito
src/features/clienti/      # anagrafica clienti e pazienti
src/features/attivita/     # profilo professionale e attività
src/features/adempimenti/  # STS e riepilogo fattura elettronica, riepilogo IVA
src/ui/Navigazione.tsx     # barra laterale (PC) e barra in basso (telefono)
app/fatture/, app/fatture/nuova/, app/fatture/dettaglio/, app/fatture/stampa/,
app/clienti/, app/impostazioni/attivita/, app/adempimenti/
supabase/migrations/20261121000400_fatturazione.sql
supabase/tests/database/006_fatturazione.test.sql
tests/unit/{fattura-calcolo, prorata, codice-fiscale, partita-iva}.test.ts
tests/integration/fatture.test.ts
tests/e2e/fatture.spec.ts
```

**Structure Decision**: stesso progetto della 002; il dettaglio fattura usa il parametro `?id=` perché
l'esportazione statica non genera pagine per identificativi non noti in fase di build.

## Complexity Tracking

Nessuna violazione da giustificare.
