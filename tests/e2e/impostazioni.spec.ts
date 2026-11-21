import { expect, test, type Page } from '@playwright/test';
import { admin, authenticator, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// T085 (US6, FR-013, FR-019): impostazioni di sicurezza con la verifica recente (password + codice).

let utente: UtenteProva | undefined;
let codice: () => Promise<string>;

test.beforeEach(async () => {
  ({ utente, codice } = await utenteConTelefono());
  // Blocco a 60 minuti: durante la prova facciamo passare 6 minuti senza che l'app si blocchi.
  await admin.from('user_security').update({ blocco_minuti: 60 }).eq('owner_id', utente.id);
});
test.afterEach(async () => {
  await eliminaUtente(utente);
});

async function apriSicurezzaConVerificaScaduta(page: Page) {
  await page.clock.install();
  await entraNelBrowser(page, utente!, codice);
  await page.goto('/app/impostazioni/sicurezza/');
  await expect(page.getByRole('heading', { name: 'Sicurezza', level: 1 })).toBeVisible();
  // Aspetta che le impostazioni (blocco a 60 minuti) siano lette dal database prima di far passare il tempo
  await expect(page.getByLabel('Blocca dopo')).toHaveValue('60');
  await page.waitForLoadState('networkidle');
  await page.clock.fastForward('06:00'); // la verifica dell'accesso non è più "recente"
}

async function confermaCheSeiTu(page: Page) {
  const finestra = page.getByRole('alertdialog', { name: 'Conferma che sei tu' });
  await expect(finestra).toBeVisible();
  await finestra.getByLabel(/^Password attuale/).fill(utente!.password);
  await finestra.getByLabel(/^Codice a 6 cifre/).fill(await codice());
  await finestra.getByRole('button', { name: 'Conferma' }).click();
  await expect(finestra).toHaveCount(0);
}

test('cambio password con verifica: la nuova password funziona', async ({ page }) => {
  await apriSicurezzaConVerificaScaduta(page);
  await page.getByRole('button', { name: 'Cambia password' }).click();
  await confermaCheSeiTu(page);

  const nuova = 'Lasagne-della-nonna-1987!';
  await page.getByLabel(/^Nuova password/).fill(nuova);
  await page.getByLabel(/^Scrivila di nuovo/).fill(nuova);
  await page.getByRole('button', { name: 'Salva la nuova password' }).click();
  await expect(page.getByText(/Password cambiata/)).toBeVisible();

  // Esci e rientra con la nuova password
  await page.goto('/app/home/');
  await page.getByRole('button', { name: 'Esci' }).click();
  await page.getByLabel(/^E-mail/).fill(utente!.email);
  await page.getByLabel(/^Password/).fill(nuova);
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/accesso\/secondo-fattore\/$/);
});

test('nuovi codici di recupero solo dopo la verifica', async ({ page }) => {
  await apriSicurezzaConVerificaScaduta(page);
  // Primi codici: non serve la verifica (non ce n'erano)
  await page.getByRole('button', { name: 'Genera i codici' }).click();
  await page.getByLabel(/Li ho conservati/).check();
  await page.getByRole('button', { name: 'Continua' }).click();
  await expect(page.getByText(/10 su 10 ancora validi|10\s*su 10/)).toBeVisible();

  // Nuovi codici al posto dei vecchi: serve la verifica
  await page.getByRole('button', { name: 'Generane di nuovi' }).click();
  await confermaCheSeiTu(page);
  await expect(page.getByRole('list', { name: 'Codici di recupero' }).getByRole('listitem')).toHaveCount(10);
});

test('sostituzione del telefono: il nuovo funziona, il vecchio no', async ({ page }) => {
  await apriSicurezzaConVerificaScaduta(page);
  const prima = await admin.auth.admin.mfa.listFactors({ userId: utente!.id });

  await page.getByRole('button', { name: 'Sostituisci il telefono' }).click();
  await confermaCheSeiTu(page);
  const chiave = (await page.getByText(/^[A-Z2-7]{16,}$/).textContent())?.trim() ?? '';
  await page.getByLabel(/^Codice a 6 cifre del nuovo telefono/).fill(await authenticator(chiave).codiceStabile());
  await page.getByRole('button', { name: 'Collega il nuovo telefono' }).click();
  await expect(page.getByText(/Nuovo telefono collegato/)).toBeVisible();

  const dopo = await admin.auth.admin.mfa.listFactors({ userId: utente!.id });
  expect(dopo.data?.factors).toHaveLength(1);
  expect(dopo.data?.factors[0]?.id).not.toBe(prima.data?.factors[0]?.id);
});
