import { expect, test, type Page } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// T023 (001, US1, US2, US5, SC-002, SC-003): caso 2 di quickstart.md inserito dalla pagina, dal telefono e dal PC.
// CU 38.000 €, reddito professionale 10.000 € (inserito a mano), addizionali d'esempio 1,23% e 0,8%.

let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

const campo = (page: Page, nome: RegExp) => page.getByRole('textbox', { name: nome });

async function salvaE(page: Page, pulsante: string) {
  await page.getByRole('button', { name: pulsante }).click();
  await expect(page.getByText('Salvato.', { exact: true }).first()).toBeVisible();
}

test('inserisco la CU, vedo il conguaglio, simulo +5.000 € e confronto i piani', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);

  await page
    .getByRole('navigation', { name: 'Sezioni di Fiscal' })
    .getByRole('link', { name: 'Tasse' })
    .click();
  await expect(page.getByRole('heading', { name: 'Tasse', level: 1 })).toBeVisible();
  await page.getByLabel(/^Anno d'imposta/).selectOption('2026');
  await expect(page.getByText('Manca la Certificazione Unica 2026')).toBeVisible();
  await page.getByRole('link', { name: 'Inserisci la CU' }).click();
  await expect(page.getByRole('heading', { name: "Dati dell'anno", level: 1 })).toBeVisible();

  // CU
  await campo(page, /^Reddito di lavoro dipendente/).fill('38.000');
  await campo(page, /^Ritenute IRPEF/).fill('8.448,09');
  await campo(page, /^Addizionale regionale/).fill('467,40');
  await campo(page, /^Addizionale comunale, acconto/).fill('91,20');
  await campo(page, /^Addizionale comunale, saldo/).fill('212,80');
  await campo(page, /^Acconto comunale anno dopo/).fill('91,20');
  await salvaE(page, 'Salva la CU');

  // reddito professionale a mano e addizionali
  await campo(page, /^Reddito professionale \(a mano\)/).fill('10.000');
  await page.getByRole('button', { name: 'Salva i dati' }).click();
  await expect(page.getByText('Salvato.', { exact: true })).toHaveCount(2);
  await campo(page, /^Aliquota %/).fill('1,23');
  await campo(page, /^Aliquota comunale %/).fill('0,8');
  await page.getByRole('switch', { name: 'Verificate sui siti ufficiali' }).check();
  await page.getByRole('button', { name: 'Salva le aliquote' }).click();
  await expect(page.getByText('Salvato.', { exact: true })).toHaveCount(3);

  // Quadro
  await page.getByRole('link', { name: '← Tasse' }).click();
  await expect(page.getByRole('heading', { name: 'Il calcolo del 2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Mostra gli importi' }).click();
  await expect(page.getByText('4.621,29 €').first()).toBeVisible(); // conguaglio totale
  await expect(page.getByText('6.412,61 €').first()).toBeVisible(); // giugno 2027
  await expect(page.getByText('2.650,97 €').first()).toBeVisible(); // novembre 2027
  await expect(page.getByText('173,62 €').first()).toBeVisible(); // detrazione ricalcolata
  await expect(page.getByText('33%').first()).toBeVisible();
  await expect(page.getByText('Risultato provvisorio')).toBeVisible();

  // spiegazione della detrazione
  await page.getByRole('button', { name: 'Aiuto: detrazione lavoro dipendente' }).click();
  await expect(page.getByText(/dipende dal reddito complessivo/)).toBeVisible();

  // Simulatore: +5.000 € ⇒ +2.123,62 € di IRPEF, si passa al 43%
  await campo(page, /^Compensi in più/).fill('5.000');
  await expect(page.getByText('2.123,62 €').first()).toBeVisible();
  await expect(page.getByText(/33% → 43%/)).toBeVisible();

  // Strategia
  await page.getByRole('link', { name: 'Strategia dei versamenti' }).click();
  await expect(page.getByRole('heading', { name: 'Rateizzazione in 7 rate' })).toBeVisible();
  await expect(page.getByText('consigliato')).toBeVisible();
  await campo(page, /^Acconto volontario/).fill('3.000');
  await expect(page.getByText('3.412,61 €').first()).toBeVisible(); // giugno dopo l'acconto volontario
});
