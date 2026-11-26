/**
 * Novità «da fare nel programma» arrivate con i file di aggiornamento (specifica 014, US5, FR-026, research.md
 * R-10): una voce per impronta anche se compare in più importazioni; chiusa se è stata segnata «fatta» o «non mi
 * riguarda» in una qualsiasi di esse.
 */
export type StatoModifica = 'aperta' | 'fatta' | 'non_riguarda';

export type ModificaImportata = {
  titolo: string;
  descrizione: string;
  dal?: string;
  fonte: { titolo: string; url: string; data_atto: string };
  impronta: string;
  stato: StatoModifica;
};

export type ImportazioneConModifiche = { id: string; creato_il: string; modifiche_programma: ModificaImportata[] };

export type ModificaRaggruppata = ModificaImportata & { importazioni: string[]; ultima: string };

export function modificheProgramma(importazioni: ImportazioneConModifiche[]): ModificaRaggruppata[] {
  const perImpronta = new Map<string, ModificaRaggruppata>();
  const ordinate = [...importazioni].sort((a, b) => a.creato_il.localeCompare(b.creato_il));
  for (const imp of ordinate)
    for (const m of imp.modifiche_programma) {
      const prima = perImpronta.get(m.impronta);
      const stato: StatoModifica = prima && prima.stato !== 'aperta' ? prima.stato : m.stato;
      perImpronta.set(m.impronta, {
        ...m,
        stato: m.stato !== 'aperta' ? m.stato : stato,
        importazioni: [...(prima?.importazioni ?? []), imp.id],
        ultima: imp.creato_il,
      });
    }
  return [...perImpronta.values()].sort((a, b) => b.ultima.localeCompare(a.ultima));
}
