# Tasks: Previsione mensile delle tasse

- [X] T001 Test `tests/unit/previsione-mensile.test.ts`: metodi, pesi, scenari, motore 001, cambio di scaglione, calendario, variazioni
- [X] T002 Motore `src/engine/previsione/{proiezione,anno,calendario}.ts`
- [X] T003 Migrazione `supabase/migrations/20261123000300_previsione.sql` e pgTAP `014_previsione.test.sql`
- [X] T004 Dati `src/features/previsione/dati.ts` (compensi per mese, impegni, quadro, chiusura mensile)
- [X] T005 [US1–US4] Pagina `app/tasse/previsione/page.tsx` con `src/features/previsione/Previsione.tsx`
- [X] T006 [FR-017] Riquadro in evidenza della home con tasse previste e prossimo versamento
- [X] T007 Test e2e `tests/e2e/previsione.spec.ts` e pagina nel test di impaginazione
- [ ] T008 [US5] Obiettivo di netto e intervallo degli scenari dalla variabilità reale — rinviati
