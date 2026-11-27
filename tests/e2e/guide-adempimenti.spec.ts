import { expect, test } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Specifica 015 (quickstart.md scenari 1, 2, 5, 6, 7): layer dalla home, ricerca, guida F24, disegno, spunte,
// Apri in Fiscal, apertura da Aiuto. Nessuno scroll orizzontale sul telefono.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

const senzaScrollOrizzontale = async (page: import('@playwright/test').Page) => {
  const fuori = await page.evaluate(() => {
    const dialogo = document.querySelector('[role="dialog"]');
    const el = (dialogo?.querySelector('.fui-DialogContent') as HTMLElement | null) ?? document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(fuori).toBeLessThanOrEqual(1);
};

test('guide agli adempimenti: indice, ricerca, guida F24, spunte e collegamenti', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);
  await page.evaluate(() => localStorage.setItem('fiscal.dataProva', '2027-03-10'));

  // 1) dalla home, sotto il calendario
  await page.goto('/app/home/');
  await page.getByRole('button', { name: /Guide agli adempimenti/ }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByRole('heading', { name: 'Apertura' })).toBeVisible();
  await expect(dialogo.getByRole('heading', { name: 'Dichiarazioni annuali' })).toBeVisible();
  await senzaScrollOrizzontale(page);

  // ricerca con sinonimi
  await dialogo.getByRole('searchbox', { name: 'Cerca una guida' }).fill('740');
  await expect(dialogo.getByRole('button', { name: /Dichiarazione dei redditi con partita IVA/ })).toBeVisible();
  await expect(dialogo.getByRole('button', { name: /Pagare le tasse con l'F24/ })).toHaveCount(0);
  await dialogo.getByRole('searchbox', { name: 'Cerca una guida' }).fill('bollo');
  await expect(dialogo.getByRole('button', { name: /Pagare il bollo delle fatture elettroniche/ })).toBeVisible();

  // 2) guida F24: codici dalle regole, disegno che porta ai passi
  await dialogo.getByRole('searchbox', { name: 'Cerca una guida' }).fill('');
  await dialogo.getByRole('button', { name: /Pagare le tasse con l'F24/ }).click();
  for (const codice of ['4001', '4033', '4034', '3801', '3843', '3844']) await expect(dialogo.getByText(codice, { exact: true })).toBeVisible();
  await expect(dialogo.getByText(/30 giugno 2027/).first()).toBeVisible();
  await dialogo.getByRole('button', { name: 'Sezione Erario: vai al passo 3' }).click();
  await expect(page.locator('#passo-f24-tasse-3')).toBeFocused();
  await senzaScrollOrizzontale(page);

  // 5) spunte che restano
  await dialogo.getByRole('checkbox', { name: /^2\. Contribuente/ }).check();
  await dialogo.getByRole('button', { name: 'Indietro' }).click();
  await dialogo.getByRole('button', { name: /Pagare le tasse con l'F24/ }).click();
  await expect(dialogo.getByRole('checkbox', { name: /^2\. Contribuente/ })).toBeChecked();
  await dialogo.getByRole('button', { name: /Azzera le spunte/ }).click();
  await expect(dialogo.getByRole('checkbox', { name: /^2\. Contribuente/ })).not.toBeChecked();

  // 6) Apri in Fiscal
  await dialogo.getByRole('link', { name: /Apri in Fiscal: Tasse → Versamenti/ }).click();
  await expect(page.getByRole('heading', { name: 'Versamenti', level: 1 })).toBeVisible();

  // 7) da Aiuto alla guida, nel layer della home
  await page.goto('/app/aiuto/');
  await page.getByRole('searchbox', { name: "Cerca nell'aiuto" }).fill('ravvedimento');
  await page.getByRole('link', { name: 'Rimediare a un versamento dimenticato o sbagliato' }).click();
  await expect(page.getByRole('dialog').getByText('Rimediare a un versamento dimenticato o sbagliato').first()).toBeVisible();
  // codici del ravvedimento confermati sulla ricerca dei codici tributo dell'Agenzia (verifica del 27/11/2026)
  await expect(page.getByRole('dialog').getByText('8926', { exact: true })).toBeVisible();
});
