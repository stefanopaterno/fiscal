# Tasks: Aggiornamenti normativi

- [X] T001 Test `tests/unit/novita.test.ts`: regole aperte, calendario, prompt senza dati personali, notizie
- [X] T002 Motore `src/engine/novita/{regole-aperte,controlli}.ts` e notizie `src/engine/regole/novita/index.ts`
- [X] T003 [US1, US3, US4] Pagina `app/novita/page.tsx` con `src/features/novita/Novita.tsx`: controlli, prompt, notizie, regole da verificare
- [X] T004 [US1] Avviso in home `src/features/novita/AvvisoNovita.tsx` e voce di menu «Novità»
- [X] T005 Test e2e `tests/e2e/novita.spec.ts` e pagina nel test di impaginazione
- [X] T006 [US2] Impatto automatico sui conti: `simulazione` nella notizia (regole alternative), `calcolaAnno(input, regoleAlternative)`, `src/engine/novita/impatto.ts`, pulsante «Calcola l'impatto sui miei conti» nella pagina Novità (calcolo nel browser); test in `tests/unit/novita.test.ts`
