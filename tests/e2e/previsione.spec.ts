import { expect, test } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Specifica 006: con i dati d'esempio 2027, una CU e la data di prova al 22/11/2027 il prospetto mostra
// scenari, mesi reali e previsti, la chiusura di ottobre salvata da sola, il calendario a 18 mesi;
// le ipotesi si salvano e la home mostra tasse previste e prossimo versamento.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('previsione mensile: prospetto, ipotesi, andamento, calendario e home', async ({ page }) => {
  test.setTimeout(120_000);
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);

  await page.goto('/app/impostazioni/modalita/');
  await page.getByRole('button', { name: "Carica dati d'esempio" }).click();
  await page.getByRole('button', { name: 'Sì, carica' }).click();
  await expect(page.getByText(/Caricati 12 clienti/)).toBeVisible();
  const cu = await admin.from('certificazioni_uniche').insert({
    id: crypto.randomUUID(),
    owner_id: u.utente.id,
    anno: 2027,
    reddito_lavoro: 50_500_00,
    ritenute_irpef: 13_865_00,
  });
  expect(cu.error).toBeNull();
  await page.evaluate(() => localStorage.setItem('fiscal.dataProva', '2027-11-22'));

  await page.goto('/app/tasse/previsione/?anno=2027');
  await expect(page.getByRole('heading', { name: 'Previsione', level: 1 })).toBeVisible();
  await expect(page.getByText('Tasse e contributi 2027')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mese per mese' })).toBeVisible();
  await expect(page.getByText('in corso')).toBeVisible();
  // chiusura di ottobre salvata alla prima apertura
  await expect(page.getByRole('heading', { name: 'Come è cambiata la previsione' })).toBeVisible();
  await expect(page.getByText('ottobre 2027', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quando escono i soldi (18 mesi)' })).toBeVisible();
  await expect(page.getByText('il più pesante')).toBeVisible();

  // ipotesi: obiettivo annuo e metodo
  await page.getByRole('textbox', { name: /^Obiettivo annuo di compensi/ }).fill('80.000');
  await page.getByLabel(/^Metodo/).selectOption({ label: 'Obiettivo annuo' });
  await page.getByRole('textbox', { name: /^dicembre/ }).fill('50');
  await page.getByRole('button', { name: 'Salva le ipotesi' }).click();
  await expect(page.getByText(/Metodo usato: Obiettivo annuo/)).toBeVisible();

  // salvataggio a mano e variazione spiegata (con gli importi visibili)
  await page.getByRole('button', { name: 'Salva la previsione di oggi' }).click();
  await page.getByRole('button', { name: 'Mostra gli importi' }).click();
  await expect(page.getByText(/Rispetto alla previsione di/)).toBeVisible();

  await page.goto('/app/home/');
  await expect(page.getByText('Tasse e contributi previsti per il 2027')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vedi la previsione' })).toBeVisible();
});
