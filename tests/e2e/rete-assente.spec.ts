import { expect, test } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, righeDiProva, utenteConTelefono } from './_aiuti';

// T050 (US3, FR-014, FR-021): inserimenti senza rete. Usa la tabella di prova `prove_sincronizzazione`
// (solo stack locale) e gli agganci presenti solo nella build dei test (`npm run build:e2e`).

let utente: UtenteProva | undefined;
let codice: () => Promise<string>;

test.beforeEach(async () => {
  ({ utente, codice } = await utenteConTelefono());
});
test.afterEach(async () => {
  await eliminaUtente(utente);
});

test('senza rete il dato resta "in attesa di invio"; al ritorno della rete parte, senza duplicati', async ({
  page,
  context,
}) => {
  await entraNelBrowser(page, utente!, codice);

  await context.setOffline(true);
  await page.evaluate(() => window.__fiscalProve!.accoda('scritto senza rete'));
  await expect(page.getByText(/1 dato in attesa di invio/)).toBeVisible();
  expect(await righeDiProva(utente!)).toHaveLength(0);

  await context.setOffline(false); // l'evento "online" fa partire l'invio
  await expect(page.getByText(/in attesa di invio/)).toHaveCount(0);
  await expect
    .poll(() => righeDiProva(utente!))
    .toEqual([expect.objectContaining({ testo: 'scritto senza rete' })]);

  // Un nuovo invio non crea duplicati
  await page.evaluate(() => window.__fiscalProve!.sincronizza());
  expect(await righeDiProva(utente!)).toHaveLength(1);
});

test("se nel frattempo l'app si blocca, il dato aspetta il nuovo accesso e poi parte", async ({
  page,
  context,
}) => {
  await page.clock.install();
  await entraNelBrowser(page, utente!, codice);

  await context.setOffline(true);
  await page.evaluate(() => window.__fiscalProve!.accoda('in attesa durante il blocco'));
  await expect(page.getByText(/1 dato in attesa di invio/)).toBeVisible();

  // 5 minuti senza attività: blocco (senza sblocco rapido = sessione chiusa sul dispositivo)
  await page.clock.fastForward('05:10');
  await expect(page).toHaveURL(/\/app\/blocco\/$/);
  await context.setOffline(false);
  expect(await righeDiProva(utente!)).toHaveLength(0);

  // Nuovo accesso completo: la coda è ancora lì e parte
  await page.getByRole('button', { name: 'Accedi con password e codice' }).click();
  await page.getByLabel(/^E-mail/).fill(utente!.email);
  await page.getByLabel(/^Password/).fill(utente!.password);
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await page.getByLabel(/^Codice a 6 cifre/).fill(await codice());
  await page.getByRole('button', { name: 'Verifica ed entra' }).click();
  await expect(page).toHaveURL(/\/app\/home\/$/);
  await expect
    .poll(() => righeDiProva(utente!))
    .toEqual([expect.objectContaining({ testo: 'in attesa durante il blocco' })]);
});
