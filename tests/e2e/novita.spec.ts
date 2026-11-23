import { expect, test } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Specifica 012: pagina Novità, controlli alle date giuste, prompt senza dati personali, avviso in home.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('novità: controlli dovuti a febbraio, regole da verificare, prompt e avviso in home', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);

  // in prova come se fosse il 5 febbraio 2027 (data di prova disponibile per gli account in prova)
  await page.evaluate(() => localStorage.setItem('fiscal.dataProva', '2027-02-05'));
  await page.goto('/app/novita/');
  await expect(page.getByRole('heading', { name: 'Novità', level: 1 })).toBeVisible();
  await expect(page.getByText("Aliquote dell'addizionale regionale 2027")).toBeVisible();
  await expect(page.getByText('Controllo settimanale delle novità', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Regole da verificare \(\d+\)$/ })).toBeVisible();
  const prompt = page.getByRole('textbox', { name: "Testo da incollare all'assistente" });
  await expect(prompt).toHaveValue(/Controllo settimanale delle novità di Fiscal/);
  await expect(page.getByText('Legge di Bilancio 2027: IRPEF al 33% fino a 55.000 €')).toBeVisible();

  await page.goto('/app/home/');
  await expect(page.getByText('Da controllare')).toBeVisible();
  await page.getByRole('link', { name: 'Apri le novità' }).click();
  await expect(page.getByRole('heading', { name: 'Novità', level: 1 })).toBeVisible();
});
