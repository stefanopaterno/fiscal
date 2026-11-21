import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// T017 (003, US2, SC-001, SC-005): caso 1 di quickstart.md dal telefono e dal PC — seduta da 80 € nel 2027:
// contributo 3,20 €, bollo 2 €, totale 85,20 €; numero 1, poi 2; documento con le diciture obbligatorie.
const CF = 'RSSMRA80' + 'A01H501U';

let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

async function configura(owner: string) {
  const riga = { owner_id: owner };
  await admin.from('profilo_professionale').insert({
    ...riga,
    id: randomUUID(),
    nome: 'Mario',
    cognome: 'Rossi',
    codice_fiscale: CF,
    partita_iva: '12345678903',
    inizio_attivita: '2027-01-02',
    indirizzo: 'Via Roma 1',
    cap: '00100',
    comune: 'Roma',
    provincia: 'RM',
    albo_numero: '12345',
  });
  await admin.from('attivita').insert({
    ...riga,
    id: randomUUID(),
    nome: 'Psicologo',
    natura_iva: 'esente_sanitaria',
    predefinita: true,
  });
}

test('emetto una fattura per una seduta, la stampo e la numerazione prosegue', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await configura(u.utente.id);
  await entraNelBrowser(page, u.utente, u.codice);

  // Nuovo paziente dalla fattura
  await page
    .getByRole('navigation', { name: 'Sezioni di Fiscal' })
    .getByRole('link', { name: 'Fatture' })
    .click();
  await page.getByRole('button', { name: 'Nuova fattura' }).click();
  await page.getByRole('link', { name: '+ Nuovo cliente' }).click();
  await page.getByLabel(/^Nome/).fill('Luca');
  await page.getByLabel(/^Cognome/).fill('Bianchi');
  await page.getByLabel(/^Codice fiscale/).fill(CF);
  await page.getByRole('textbox', { name: /^Indirizzo/ }).fill('Via Milano 2');
  await page.getByLabel(/^CAP/).fill('20100');
  await page.getByLabel(/^Comune/).fill('Milano');
  await page.getByLabel(/^Provincia/).fill('MI');
  await page.getByRole('button', { name: 'Salva il cliente' }).click();

  // Torno alla fattura con il cliente già scelto
  await expect(page).toHaveURL(/\/app\/fatture\/nuova\/\?cliente=/);
  await expect(page.getByLabel(/^Cliente/)).toHaveValue(/.+/);
  await page.getByLabel(/^Data/).fill('2027-01-10');
  await page.getByLabel(/^Importo unitario/).fill('80');
  await page.getByRole('button', { name: 'Mostra gli importi' }).click();
  const riepilogo = page.getByRole('region', { name: 'Riepilogo' });
  await expect(riepilogo.getByText('3,20 €', { exact: true }).first()).toBeVisible();
  await expect(riepilogo.getByText('2,00 €', { exact: true }).first()).toBeVisible();
  await expect(riepilogo.getByText('85,20 €', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Emetti la fattura' }).click();
  await expect(page).toHaveURL(/\/app\/fatture\/dettaglio\/\?id=/);
  await expect(page.getByRole('heading', { name: 'Fattura n. 1/2027' })).toBeVisible();
  await expect(page.getByText('Tessera Sanitaria: da inviare')).toBeVisible();

  // Documento stampabile con le diciture obbligatorie (SC-005)
  await page.getByRole('button', { name: 'Stampa o salva in PDF' }).click();
  const foglio = page.getByRole('article', { name: 'Fattura n. 1/2027' });
  await expect(foglio).toContainText('P.IVA 12345678903');
  await expect(foglio).toContainText(`C.F. ${CF}`);
  await expect(foglio).toContainText('art. 10, comma 1, n. 18 del DPR 633/1972');
  await expect(foglio).toContainText('Imposta di bollo di 2,00 €');
  await expect(foglio).toContainText('85,20 €');

  // Seconda fattura, già incassata: numero 2 e incasso registrato
  await page.goto('/app/fatture/nuova/');
  await page.getByLabel(/^Cliente/).selectOption({ label: 'Bianchi Luca' });
  await page.getByLabel(/^Data/).fill('2027-01-11');
  await page.getByLabel(/^Importo unitario/).fill('60');
  await page.getByRole('checkbox', { name: 'Già incassata' }).check();
  await page.getByRole('button', { name: 'Emetti la fattura' }).click();
  await expect(page.getByRole('heading', { name: 'Fattura n. 2/2027' })).toBeVisible();
  await expect(page.getByText('Incassata', { exact: true })).toBeVisible();

  // Una data precedente all'ultima emessa viene rifiutata con una spiegazione
  await page.goto('/app/fatture/nuova/');
  await page.getByLabel(/^Cliente/).selectOption({ label: 'Bianchi Luca' });
  await page.getByLabel(/^Data/).fill('2027-01-05');
  await page.getByLabel(/^Importo unitario/).fill('60');
  await page.getByRole('button', { name: 'Emetti la fattura' }).click();
  await expect(page.getByText(/precedente all'ultima fattura emessa/)).toBeVisible();

  // Elenco: due fatture emesse e riepilogo IVA dell'anno (solo sanitarie)
  await page.goto('/app/fatture/');
  await expect(page.getByText('Fattura n. 2/2027')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'IVA 2027' })).toBeVisible();
  await expect(page.getByText(/Solo prestazioni sanitarie/)).toBeVisible();

  // Totali e filtro «da incassare» (FR-011, FR-018)
  const mostra = page.getByRole('button', { name: 'Mostra gli importi' });
  if (await mostra.isVisible()) await mostra.click();
  const totali = page.getByRole('region', { name: 'Totali' });
  await expect(totali).toContainText('Emesso147,60 €');
  await expect(totali).toContainText('Incassato62,40 €');
  await expect(totali).toContainText('Da incassare85,20 €');
  await page.getByLabel(/^Stato/).selectOption({ label: 'Da incassare' });
  await expect(page.getByText('Fattura n. 1/2027')).toBeVisible();
  await expect(page.getByText('Fattura n. 2/2027')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Totali della selezione' })).toContainText('Emesso85,20 €');

  // Adempimenti: due spese da comunicare al Sistema Tessera Sanitaria; ne segno una come inviata
  await page
    .getByRole('navigation', { name: 'Sezioni di Fiscal' })
    .getByRole('link', { name: 'Adempimenti' })
    .click();
  await expect(page.getByText('Da inviare', { exact: true })).toHaveCount(2);
  await page.getByRole('checkbox', { name: 'Scegli Fattura n. 1/2027' }).check();
  await page.getByRole('button', { name: 'Segna le scelte come inviate' }).click();
  await expect(page.getByText('1 spesa segnata come inviata.')).toBeVisible();
  await expect(page.getByText('Inviata', { exact: true })).toHaveCount(1);
  // il CSV parte solo dopo l'avviso sul file non protetto
  await page.getByRole('button', { name: /Scarica le da inviare/ }).click();
  await expect(page.getByRole('alertdialog', { name: 'Esportazione senza protezione' })).toBeVisible();
});
