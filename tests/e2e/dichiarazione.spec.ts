import { expect, test } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Specifica 004: checklist ed esito, scadenze (fatta, personale, esportazione), anno di partenza, riepilogo e
// promemoria in home, con i dati d'esempio 2027, una CU e la data di prova al 22/11/2027.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('dichiarazione: checklist, esito, scadenze, anno di partenza, riepilogo e home', async ({ page }) => {
  test.setTimeout(150_000);
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

  // checklist ed esito
  await page.goto('/app/dichiarazione/?anno=2027');
  await expect(page.getByRole('heading', { name: 'Dichiarazione', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cosa serve per la dichiarazione 2027' })).toBeVisible();
  await expect(page.getByText(/% pronto/)).toBeVisible();
  const conservazione = page.getByRole('listitem').filter({ hasText: 'Conservazione a norma' });
  await conservazione.getByRole('button', { name: 'Non applicabile' }).click();
  await expect(conservazione.getByText('Non applicabile', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Esito della dichiarazione' })).toBeVisible();
  await expect(page.getByText('IRPEF lorda')).toBeVisible();

  // scadenze
  await page.goto('/app/dichiarazione/scadenze/');
  await expect(page.getByRole('heading', { name: 'Scadenze 2027' })).toBeVisible();
  const bollo = page.getByRole('listitem').filter({ hasText: 'Bollo delle fatture del terzo trimestre' });
  await expect(bollo.getByText('tra 8 giorni')).toBeVisible();
  await bollo.getByRole('button', { name: 'Fatta' }).click();
  await expect(bollo.getByText('Fatta il 22/11/2027')).toBeVisible();
  await page.getByLabel(/^Anno$/).selectOption('2028');
  await expect(page.getByRole('heading', { name: 'Scadenze 2028' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Saldo e primo acconto' }).getByText(/Importo stimato/)).toBeVisible();
  await page.getByRole('textbox', { name: /^Cosa/ }).fill('Documenti al commercialista');
  await page.getByRole('combobox', { name: /^Quando/ }).fill('10/05/2028');
  await page.getByRole('combobox', { name: /^Quando/ }).press('Enter');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Scadenza personale' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Scarica il file del calendario' }).click();
  expect((await download).suggestedFilename()).toBe('scadenze-fiscal-2028.ics');

  // anno di partenza
  await page.goto('/app/dichiarazione/partenza/?anno=2026');
  await expect(page.getByRole('heading', { name: 'Anno di partenza', level: 1 })).toBeVisible();
  await page.getByRole('textbox', { name: /^Imposta netta/ }).fill('12.000');
  await page.getByRole('textbox', { name: /^Differenza/ }).fill('0');
  await page.getByRole('button', { name: 'Salva i dati del 730' }).click();
  await expect(page.getByText('Salvato.')).toBeVisible();

  // riepilogo
  await page.goto('/app/dichiarazione/riepilogo/?anno=2027');
  await expect(page.getByRole('region', { name: 'Redditi di lavoro dipendente' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Redditi di lavoro autonomo (arti e professioni)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stampa o salva in PDF' })).toBeVisible();

  // home
  await page.goto('/app/home/');
  await expect(page.getByText(/Scadenze in arrivo|Scadenze da sistemare/)).toBeVisible();
});
