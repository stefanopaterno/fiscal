import { expect, test, type Page } from '@playwright/test';
import {
  accediConPassword,
  admin,
  authenticator,
  chiamaFunzione,
  configuraSecondoFattore,
  creaUtente,
  eliminaUtente,
  type UtenteProva,
} from '../integration/_supabase-locale';

// T073 (US4): recupero nel browser, contro lo stack LOCALE con le funzioni avviate
// (`node scripts/env-funzioni-locali.mjs && supabase functions serve --env-file supabase/functions/.env`).

const FRASE = 'la nonna faceva le lasagne la domenica';
let utente: UtenteProva | undefined;

test.beforeEach(async () => {
  utente = await creaUtente();
});
test.afterEach(async () => {
  await eliminaUtente(utente);
});

async function accediSoloPassword(page: Page) {
  await page.goto('/app/accesso/');
  await page.getByLabel(/^E-mail/).fill(utente!.email);
  await page.getByLabel(/^Password/).fill(utente!.password);
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
}

async function collegaTelefono(page: Page) {
  await expect(page).toHaveURL(/\/app\/accesso\/configura\/$/);
  const chiave = (await page.getByText(/^[A-Z2-7]{16,}$/).textContent())?.trim() ?? '';
  await page.getByLabel(/Scrivi il codice a 6 cifre/).fill(await authenticator(chiave).codiceStabile());
  await page.getByRole('button', { name: 'Conferma e entra' }).click();
}

test('prima configurazione: codici di recupero mostrati una volta e frase', async ({ page }) => {
  await accediSoloPassword(page);
  await collegaTelefono(page);

  // Codici: 10, si prosegue solo dopo aver confermato di averli conservati
  await expect(page.getByRole('list', { name: 'Codici di recupero' }).getByRole('listitem')).toHaveCount(10);
  const continua = page.getByRole('button', { name: 'Continua' });
  await expect(continua).toBeDisabled();
  await page.getByLabel(/Li ho conservati/).check();
  await continua.click();

  // Frase di recupero
  await page.getByLabel(/^Frase di recupero/).fill(FRASE);
  await page.getByLabel(/^Scrivila di nuovo/).fill(FRASE);
  await page.getByRole('button', { name: 'Salva la frase' }).click();
  await expect(page).toHaveURL(/\/app\/home\/$/);

  const dati = await admin
    .from('user_security')
    .select('codici_confermati_il, frase_recupero_impostata_il')
    .eq('owner_id', utente!.id);
  expect(dati.data?.[0]?.codici_confermati_il).not.toBeNull();
  expect(dati.data?.[0]?.frase_recupero_impostata_il).not.toBeNull();
});

test('telefono perso: rientro con un codice di recupero e nuovo telefono', async ({ page }) => {
  const client = await accediConPassword(utente!);
  await configuraSecondoFattore(client);
  const codici = (await chiamaFunzione(client, 'recovery-codes', { azione: 'genera' })).dati
    .codici as string[];
  await client.auth.signOut();

  await accediSoloPassword(page);
  await expect(page).toHaveURL(/\/app\/accesso\/secondo-fattore\/$/);
  await page.getByRole('link', { name: 'Usa un codice di recupero' }).click();
  await expect(page).toHaveURL(/\/app\/accesso\/recupero\/$/);
  await page.getByLabel(/^Codice di recupero/).fill(codici[3]!.toLowerCase());
  await page.getByRole('button', { name: 'Usa il codice' }).click();

  await collegaTelefono(page);
  // Restano 9 codici: si può proseguire o generarne di nuovi
  await expect(page.getByText(/Hai ancora 9 codici di recupero validi/)).toBeVisible();
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Lo faccio dopo dalle impostazioni' }).click();
  await expect(page).toHaveURL(/\/app\/home\/$/);
});

test('frase di recupero: ripristino con attesa, poi completamento', async ({ page }) => {
  const client = await accediConPassword(utente!);
  await configuraSecondoFattore(client);
  await chiamaFunzione(client, 'recovery-phrase', { azione: 'imposta', frase: FRASE });
  await client.auth.signOut();

  await accediSoloPassword(page);
  await page.getByRole('link', { name: 'Usa un codice di recupero' }).click();
  await page.getByRole('tab', { name: 'Uso la frase' }).click();
  await page.getByLabel(/^Frase di recupero/).fill(FRASE);
  await page.getByRole('button', { name: 'Avvia il ripristino' }).click();
  await expect(page.getByText('Ripristino in corso')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Completa il ripristino' })).toBeDisabled();

  // 48 ore dopo (simulate)
  await admin
    .from('recovery_requests')
    .update({ esegui_dopo: new Date(Date.now() - 60_000).toISOString() })
    .eq('owner_id', utente!.id)
    .eq('stato', 'in_attesa');
  await page.reload();
  await page.getByRole('button', { name: 'Completa il ripristino' }).click();
  await collegaTelefono(page);
  await expect(page.getByRole('list', { name: 'Codici di recupero' }).getByRole('listitem')).toHaveCount(10);
});
