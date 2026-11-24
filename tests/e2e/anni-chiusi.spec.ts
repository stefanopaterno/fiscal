import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Specifica 004, FR-015 e FR-006: un anno chiuso si legge ma non si modifica; un anno nuovo propone le aliquote
// dell'anno prima, da verificare.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('anno chiuso in sola lettura e aliquote proposte dall\'anno prima', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  const owner_id = u.utente.id;
  await entraNelBrowser(page, u.utente, u.codice);

  // aliquote del 2026 salvate dall'utente, poi l'anno viene chiuso
  await page.goto('/app/tasse/dati/');
  await page.getByLabel(/^Anno/).first().selectOption('2026');
  await page.getByLabel('Aliquota comunale %').fill('0,8');
  await page.getByRole('button', { name: 'Salva le aliquote' }).click();
  await expect(page.getByText('Salvato.')).toBeVisible();
  await admin.from('dichiarazioni').insert({ owner_id, id: randomUUID(), anno: 2026, tipo: 'redditi', chiuso_il: '2027-10-01' });
  await page.reload();
  await page.getByLabel(/^Anno/).first().selectOption('2026');
  await expect(page.getByText(/L'anno 2026 è chiuso dal 01\/10\/2027/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salva le aliquote' })).toBeDisabled();

  await page.getByLabel(/^Anno/).first().selectOption('2027');
  await expect(page.getByText(/Ho proposto le aliquote delle addizionali del 2026/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salva le aliquote' })).toBeEnabled();
});
