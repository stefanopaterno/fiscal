import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Specifica 014 (quickstart.md scenari 1, 2, 3, 5, 6, 9): prepara la richiesta, importa, approva, annulla.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

const fixture = (nome: string) => readFileSync(join(__dirname, '../fixtures/parametri', nome), 'utf8');

test('parametri fiscali: richiesta, importazione, approvazione e annullamento', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);
  await page.evaluate(() => localStorage.setItem('fiscal.dataProva', '2027-01-10'));

  // dalle impostazioni
  await page.goto('/app/impostazioni/');
  await page.getByRole('link', { name: /Parametri fiscali/ }).click();
  await expect(page.getByRole('heading', { name: 'Parametri fiscali', level: 1 })).toBeVisible();
  await expect(page.getByText('Nessun aggiornamento importato: tutto viene dal programma.')).toBeVisible();

  // 1) richiesta per Claude, senza dati personali
  await page.getByRole('tab', { name: 'Prepara richiesta' }).click();
  const richiesta = page.getByRole('textbox', { name: 'Richiesta per Claude' });
  await expect(richiesta).toHaveValue(/## 1\. Prompt/);
  await expect(richiesta).toHaveValue(/`irpef\.scaglioni` \| 2027/);
  await expect(richiesta).not.toHaveValue(/addizionali\./);
  expect(await richiesta.inputValue()).not.toContain(u.utente.email);

  // 2) importazione: una voce cambia, una è confermata; niente cambia prima del sì
  await page.getByRole('tab', { name: 'Importa' }).click();
  await page.getByRole('textbox', { name: 'Risposta di Claude' }).fill(`Ecco il file:\n\`\`\`json\n${fixture('valido.json')}\n\`\`\``);
  await page.getByRole('button', { name: 'Controlla' }).click();
  await expect(page.getByRole('heading', { name: 'Cambiano (1)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Confermati (1)' })).toBeVisible();
  await expect(page.getByText(/33% fino a 55\.000,00\s€.*→.*33% fino a 50\.000,00\s€/)).toBeVisible();

  // 3) file con errori: scartati con il motivo
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  await page.getByRole('textbox', { name: 'Risposta di Claude' }).fill(fixture('errori.json'));
  await page.getByRole('button', { name: 'Controlla' }).click();
  await expect(page.getByRole('heading', { name: 'Scartati (3)' })).toBeVisible();
  await expect(page.getByText(/chiave sconosciuta/)).toBeVisible();
  await expect(page.getByText(/non è un sito ufficiale/)).toBeVisible();

  // 9) file malevolo: il testo resta testo
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  let dialogo = false;
  page.on('dialog', (d) => {
    dialogo = true;
    void d.dismiss();
  });
  await page.getByRole('textbox', { name: 'Risposta di Claude' }).fill(fixture('malevolo.json'));
  await page.getByRole('button', { name: 'Controlla' }).click();
  await expect(page.getByText('<b>grassetto</b> {{regione}}')).toBeVisible();
  expect(dialogo).toBe(false);

  // 5) approvazione dello scaglione
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  await page.getByRole('textbox', { name: 'Risposta di Claude' }).fill(fixture('valido.json'));
  await page.getByRole('button', { name: 'Controlla' }).click();
  await page.getByRole('button', { name: 'Approva 2 voci' }).click();
  await expect(page.getByText(/2 voci approvate/)).toBeVisible();

  await page.getByRole('tab', { name: 'In uso' }).click();
  await expect(page.getByText('2 aggiornamenti attivi.')).toBeVisible();
  await page.getByRole('button', { name: /^IRPEF/ }).click();
  await expect(page.getByText(/^23% fino a 28\.000,00\s€; 33% fino a 50\.000,00\s€; 43% oltre$/)).toBeVisible();

  // 6) annullamento: torna il valore del programma e resta la cronologia
  await page.getByRole('button', { name: 'Annulla', exact: true }).first().click();
  await page.getByRole('button', { name: "Annulla l'aggiornamento" }).click();
  await expect(page.getByText(/^23% fino a 28\.000,00\s€; 33% fino a 55\.000,00\s€; 43% oltre$/)).toBeVisible();
  await expect(page.getByText(/annullato/).first()).toBeVisible();
});
