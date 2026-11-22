import { expect, test } from '@playwright/test';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono, vaiA } from './_aiuti';

// T011-T012 (003, US1): configurazione della partita IVA, indicatore "pronto a fatturare", attività.
// Codice fiscale di esempio costruito a pezzi per non farlo scambiare per un dato vero dalla scansione.
const CF = 'RSSMRA80' + 'A01H501U';

let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('configuro la partita IVA e divento pronto a fatturare', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);

  // dalla navigazione alle impostazioni
  await vaiA(page, 'Impostazioni');
  await page.getByRole('link', { name: /Partita IVA e attività/ }).click();
  await expect(page.getByText('Non ancora.')).toBeVisible();
  await expect(page.getByText("Almeno un'attività")).toBeVisible();

  // un dato scritto male viene segnalato e non si salva
  await page.getByLabel(/^Codice fiscale/).fill('RSSMRA80' + 'A01H501X');
  await expect(page.getByText(/Il codice fiscale non è corretto/)).toBeVisible();
  await page.getByRole('button', { name: 'Salva i dati' }).click();
  await expect(page.getByText('Correggi prima i campi in rosso.')).toBeVisible();

  await page
    .getByLabel(/^Nome\b/)
    .first()
    .fill('Mario');
  await page.getByLabel(/^Cognome/).fill('Rossi');
  await page.getByLabel(/^Codice fiscale/).fill(CF.toLowerCase());
  await page.getByLabel(/^Numero di partita IVA/).fill('12345678903');
  await page.getByLabel(/^Data di inizio attività/).fill('2027-01-02');
  await page.getByLabel(/^Indirizzo/).fill('Via Roma 1');
  await page.getByLabel(/^CAP/).fill('00100');
  await page.getByLabel(/^Comune/).fill('Roma');
  await page.getByLabel(/^Provincia/).fill('rm');
  await page.getByRole('button', { name: 'Salva i dati' }).click();
  await expect(page.getByText('Salvato.', { exact: true })).toBeVisible();

  // l'attività proposta è già compilata
  await page.getByRole('button', { name: "Aggiungi un'attività" }).click();
  await expect(page.getByLabel(/^Nome dell'attività/)).toHaveValue('Psicologo');
  await page.getByRole('button', { name: "Salva l'attività" }).click();
  await expect(page.getByText('Salvata.')).toBeVisible();
  await expect(page.getByText('Sì, puoi emettere fatture.')).toBeVisible();

  // dopo il ricaricamento i dati ci sono (maiuscole normalizzate)
  await page.reload();
  await expect(page.getByText('Sì, puoi emettere fatture.')).toBeVisible();
  await expect(page.getByLabel(/^Codice fiscale/)).toHaveValue(CF);
  await expect(page.getByLabel(/^Provincia/)).toHaveValue('RM');
});
