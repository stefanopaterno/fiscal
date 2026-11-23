import { expect, test } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// T012 (007, US1–US3, US5, FR-004, FR-006, FR-013): con i dati d'esempio 2027 e la data di prova al
// 22/11/2027 il salvadanaio mostra i promemoria degli incassi; «Fatto» li registra, il saldo cresce, un
// movimento manuale e le impostazioni si salvano, la home mostra netto reale e percentuale.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('promemoria, movimenti, impostazioni e home del salvadanaio', async ({ page }) => {
  test.setTimeout(120_000);
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);

  await page.goto('/app/impostazioni/modalita/');
  await page.getByRole('button', { name: "Carica dati d'esempio" }).click();
  await page.getByRole('button', { name: 'Sì, carica' }).click();
  await expect(page.getByText(/Caricati 12 clienti/)).toBeVisible();
  await page.evaluate(() => localStorage.setItem('fiscal.dataProva', '2027-11-22'));

  // senza CU non si propone nulla: lo stipendio decide lo scaglione
  await page.goto('/app/salvadanaio/');
  await expect(page.getByRole('heading', { name: 'Salvadanaio', level: 1 })).toBeVisible();
  await expect(page.getByText('Manca la Certificazione Unica 2027')).toBeVisible();
  const cu = await admin.from('certificazioni_uniche').insert({
    id: crypto.randomUUID(),
    owner_id: u.utente.id,
    anno: 2027,
    reddito_lavoro: 50_500_00,
    ritenute_irpef: 13_865_00,
  });
  expect(cu.error).toBeNull();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Da mettere da parte' })).toBeVisible();
  // occhio chiuso: nessun importo in chiaro (FR-013)
  await expect(page.getByText('Nel salvadanaio')).toBeVisible();
  await expect(page.locator('[data-nascosto="true"]').first()).toBeVisible();

  const promemoria = page.getByRole('list', { name: 'Promemoria di accantonamento' }).getByRole('listitem');
  const prima = await promemoria.count();
  expect(prima).toBeGreaterThan(1);
  await promemoria.first().getByRole('button', { name: 'Fatto' }).click();
  await expect(promemoria).toHaveCount(prima - 1);

  // «Dopo»: resta, ma in fondo e segnato come rimandato
  await promemoria.first().getByRole('button', { name: 'Dopo' }).click();
  await expect(promemoria.filter({ hasText: 'Rimandato' })).toHaveCount(1);

  // Importo diverso
  await promemoria.first().getByRole('button', { name: 'Importo diverso' }).click();
  await promemoria.first().getByLabel('Importo messo da parte').fill('10,00');
  await promemoria.first().getByRole('button', { name: 'Salva' }).click();
  await expect(promemoria).toHaveCount(prima - 2);

  await page.getByRole('button', { name: 'Mostra gli importi' }).click();
  await expect(page.getByText('+10,00 €')).toBeVisible();
  await expect(page.getByText(/Su ogni 100 € di compenso metti da parte/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Copertura delle scadenze' })).toBeVisible();
  await expect(page.getByText(/Saldo e primo acconto \(giugno 2028\)/)).toBeVisible();

  // movimento manuale: una scadenza pagata toglie dal salvadanaio
  await page.getByLabel(/^Movimento/).selectOption({ label: 'Ho pagato una scadenza' });
  await page.getByRole('textbox', { name: /^Importo/ }).fill('5,00');
  await page.getByRole('button', { name: 'Registra', exact: true }).click();
  await expect(page.getByText('−5,00 €')).toBeVisible();

  // fotografia della percentuale e impostazioni
  await page.getByRole('button', { name: 'Fissa la percentuale del mese' }).click();
  await expect(page.getByRole('button', { name: 'Fissa la percentuale del mese' })).toHaveCount(0);
  await page.getByRole('textbox', { name: /^Margine di sicurezza/ }).fill('0');
  await page.getByRole('button', { name: 'Salva le impostazioni' }).click();
  await expect(page.getByRole('button', { name: 'Aggiorna la percentuale del mese' })).toBeVisible();
  await expect(page.getByText(/Cosa è cambiato dalla percentuale/)).toBeVisible();

  // home
  await page.goto('/app/home/');
  await expect(page.getByText('Netto reale disponibile')).toBeVisible();
  await expect(page.getByText('Ogni 100 € di compenso')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apri il salvadanaio' })).toBeVisible();
});
