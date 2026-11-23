import { expect, test } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Tour di Fiscal: il pulsante della mappa accanto all'occhio apre il tour; le tappe viste restano sul dispositivo.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('il pulsante della mappa apre il tour e le spunte restano', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);

  await page.getByRole('button', { name: 'Tour di Fiscal' }).click();
  await expect(page.getByRole('heading', { name: 'Tour di Fiscal', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: '3 · Salvadanaio' })).toBeVisible();
  await expect(page.getByText('0 tappe viste su 10')).toBeVisible();

  await page.getByRole('region', { name: '1 · Home' }).getByRole('checkbox', { name: 'Vista' }).check();
  await expect(page.getByText('1 tappa vista su 10')).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 tappa vista su 10')).toBeVisible();

  await page.getByRole('region', { name: '3 · Salvadanaio' }).getByRole('link', { name: 'Apri il salvadanaio' }).click();
  await expect(page.getByRole('heading', { name: 'Salvadanaio', level: 1 })).toBeVisible();
});
