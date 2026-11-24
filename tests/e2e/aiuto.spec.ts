import { expect, test } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Specifica 011: suggerimento in home disattivabile, ricerca e glossario, guida riprendibile, termini toccabili
// nei fumetti e livello dettagliato.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('aiuto: guida riprendibile, glossario, termini toccabili e suggerimenti disattivabili', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);

  // suggerimento della prima guida in home
  await expect(page.getByText('Prima volta?')).toBeVisible();
  await page.getByRole('link', { name: 'Configurare la partita IVA' }).click();
  await expect(page.getByRole('heading', { name: 'Guida passo passo', level: 1 })).toBeVisible();
  await expect(page.getByText('Passo 1 di 4')).toBeVisible();
  await page.getByRole('button', { name: 'Fatto, avanti' }).click();
  await page.getByRole('button', { name: 'Fatto, avanti' }).click();
  await page.reload();
  await expect(page.getByText('Passo 3 di 4')).toBeVisible();

  // ricerca e glossario
  await page.goto('/app/aiuto/');
  await expect(page.getByRole('heading', { name: 'Aiuto', level: 1 })).toBeVisible();
  await expect(page.getByText('passo 3 di 4')).toBeVisible();
  await page.getByRole('searchbox', { name: "Cerca nell'aiuto" }).fill('ritenute');
  await expect(page.getByRole('heading', { name: "ritenuta d'acconto" })).toBeVisible();
  await expect(page.getByText(/ritenuta del 20%/)).toBeVisible();

  // termine toccabile nel fumetto e dettagli con l'avvertenza
  await page.goto('/app/tasse/dati/?anno=2027');
  await page.getByRole('button', { name: 'Aiuto: certificazione unica' }).first().click();
  await page.getByRole('note').getByRole('button', { name: 'Cosa vuol dire «CU»' }).click();
  await expect(page.getByRole('region', { name: 'Glossario: CU' })).toBeVisible();
  await page.getByRole('note').getByRole('button', { name: 'Dettagli' }).click();
  await expect(page.getByRole('note')).toContainText('non una consulenza fiscale');

  // suggerimenti spenti: la home non li mostra più
  await page.goto('/app/home/');
  await expect(page.getByText('Riprendi la guida')).toBeVisible();
  await page.getByRole('button', { name: 'Non mostrare più' }).click();
  await expect(page.getByText('Riprendi la guida')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Riprendi la guida')).toHaveCount(0);
});
