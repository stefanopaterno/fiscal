import { expect, test } from '@playwright/test';
import { authenticator, creaUtente, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';

// T030 (US1): percorso completo nel browser, su telefono (360 px) e PC, contro lo stack LOCALE.
// Prima: `supabase start` e `npm run build:e2e`.

let utente: UtenteProva | undefined;

test.beforeEach(async () => {
  utente = await creaUtente();
});

test.afterEach(async () => {
  await eliminaUtente(utente);
});

test('prima configurazione, uscita, accesso con password e codice', async ({ page }) => {
  // Senza sessione si finisce sulla pagina di accesso
  await page.goto('/app/');
  await expect(page).toHaveURL(/\/app\/accesso\/$/);
  await expect(page.getByText('Fiscal', { exact: true }).filter({ visible: true }).first()).toBeVisible();

  // Password
  await page.getByLabel(/^E-mail/).fill(utente!.email);
  await page.getByLabel(/^Password/).fill(utente!.password);
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();

  // Prima volta: configurazione del secondo fattore con il QR
  await expect(page).toHaveURL(/\/app\/accesso\/configura\/$/);
  await expect(page.getByRole('img', { name: /Codice QR/ })).toBeVisible();
  const chiave = (await page.getByText(/^[A-Z2-7]{16,}$/).textContent())?.trim() ?? '';
  const app = authenticator(chiave);
  await page.getByLabel(/Scrivi il codice a 6 cifre/).fill(await app.codiceStabile());
  await page.getByRole('button', { name: 'Conferma e entra' }).click();

  // Subito dopo: codici di recupero (US4); la frase si può impostare dopo
  await page.getByLabel(/Li ho conservati/).check();
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Lo faccio dopo dalle impostazioni' }).click();

  await expect(page).toHaveURL(/\/app\/home\/$/);
  await expect(page.getByText(/Sei entrato con password e codice/)).toBeVisible();
  const larghezze = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(larghezze[0]).toBeLessThanOrEqual(larghezze[1]!);

  // Uscita
  await page.getByRole('button', { name: 'Esci' }).click();
  await expect(page).toHaveURL(/\/app\/accesso\/$/);

  // Solo password: si arriva al codice e la home resta chiusa
  await page.getByLabel(/^E-mail/).fill(utente!.email);
  await page.getByLabel(/^Password/).fill(utente!.password);
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/accesso\/secondo-fattore\/$/);

  await page.goto('/app/home/');
  await expect(page).toHaveURL(/\/app\/accesso\/secondo-fattore\/$/);
  await expect(page.getByText(/Sei entrato/)).toHaveCount(0);

  // Codice a 6 cifre: si entra
  await page.getByLabel(/^Codice a 6 cifre/).fill(await app.codiceStabile());
  await page.getByRole('button', { name: 'Verifica ed entra' }).click();
  await expect(page).toHaveURL(/\/app\/home\/$/);
  await expect(page.getByText(/Sei entrato con password e codice/)).toBeVisible();
});

test('password sbagliata: messaggio generico e nessun accesso', async ({ page }) => {
  await page.goto('/app/accesso/');
  await page.getByLabel(/^E-mail/).fill(utente!.email);
  await page.getByLabel(/^Password/).fill('password-sbagliata-123');
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await expect(page.getByText('E-mail o password non corrette.')).toBeVisible();
  await expect(page).toHaveURL(/\/app\/accesso\/$/);
});

test('aiuto "?": si apre sotto il campo con una spiegazione semplice', async ({ page }) => {
  await page.goto('/app/accesso/');
  await page.getByRole('button', { name: 'Aiuto: password' }).click();
  await expect(page.getByRole('note')).toContainText('In parole semplici');
  await expect(page.getByRole('note')).toContainText('come il bancomat');
});
