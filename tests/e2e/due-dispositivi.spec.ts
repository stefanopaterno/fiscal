import { expect, test } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// T051 (US3, SC-005): un dato inserito da un dispositivo è visibile dall'altro entro pochi secondi.

let utente: UtenteProva | undefined;
let codice: () => Promise<string>;

test.beforeEach(async () => {
  ({ utente, codice } = await utenteConTelefono());
});
test.afterEach(async () => {
  await eliminaUtente(utente);
});

test('dato inserito dal "telefono", visibile dal "PC" entro pochi secondi', async ({ page, browser }) => {
  const pcContesto = await browser.newContext({
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 800 },
  });
  const pc = await pcContesto.newPage();

  await entraNelBrowser(page, utente!, codice);
  await entraNelBrowser(pc, utente!, codice);

  const inizio = Date.now();
  await page.evaluate(() => window.__fiscalProve!.accoda('dal telefono'));
  await expect
    .poll(() => pc.evaluate(() => window.__fiscalProve!.leggi()), { timeout: 5_000 })
    .toEqual([expect.objectContaining({ testo: 'dal telefono' })]);
  expect(Date.now() - inizio).toBeLessThan(5_000);

  // Dal PC: due dispositivi connessi; si chiude quello del "telefono" (FR-007)
  await pc.goto('/app/impostazioni/sicurezza/');
  const sessioni = pc.getByRole('list', { name: 'Sessioni attive' }).getByRole('listitem');
  await expect(sessioni).toHaveCount(2);
  await expect(pc.getByText('Questo dispositivo')).toHaveCount(1);
  await pc.getByRole('button', { name: 'Chiudi' }).click();
  await expect(pc.getByText(/Sessione chiusa/)).toBeVisible();
  await expect(sessioni).toHaveCount(1);

  await pcContesto.close();
});
