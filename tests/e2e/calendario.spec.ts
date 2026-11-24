import { expect, test } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Calendario fiscale (specifica 013): dalla home si apre come layer sopra a tutto, solo informativo.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('dalla home il calendario fiscale si apre come layer e si chiude', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);

  await page.getByRole('button', { name: /Calendario fiscale/ }).click();

  await expect(page.getByRole('heading', { name: 'Calendario fiscale 2027' })).toBeVisible();
  await expect(page.getByText('30 giugno 2028')).toBeVisible();
  await expect(page.getByText('30 novembre 2028')).toBeVisible();
  await expect(page.getByText(/Niente acconti nel 2027/)).toBeVisible();

  await page.getByRole('button', { name: 'Chiudi' }).click();
  await expect(page.getByRole('heading', { name: 'Calendario fiscale 2027' })).toBeHidden();
});
