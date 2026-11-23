import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { scriviZip } from '../../src/engine/documenti/zip';
import { eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono, vaiA } from './_aiuti';

// T012 (010): importazione delle fatture ricevute (ZIP con P7M, XML, metadati e un file estraneo),
// doppioni, creazione della spesa, cestino e ripristino.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

const enc = new TextEncoder();
const p7m = new Uint8Array(readFileSync('tests/fixtures/fattura.xml.p7m'));
const seconda = enc.encode(
  readFileSync('tests/fixtures/fattura.xml', 'utf8').replace(
    '<Numero>FP-7</Numero>',
    '<Numero>FP-8</Numero>',
  ),
);
const metadati = enc.encode(
  '<?xml version="1.0"?><FileMetadati><IdentificativoSdI>123</IdentificativoSdI></FileMetadati>',
);
const zip = Buffer.from(
  scriviZip([
    { nome: 'IT01234567890_00001.xml.p7m', dati: p7m },
    { nome: 'IT01234567890_00001.xml.p7m_metaDato.xml', dati: metadati },
    { nome: 'IT01234567890_00002.xml', dati: seconda },
    { nome: 'IT01234567890_00002_MT_001.xml', dati: metadati },
    { nome: 'istruzioni.pdf', dati: enc.encode('%PDF-1.4 finto') },
  ]),
);

test('importo le fatture ricevute, salto i doppioni, creo la spesa e uso il cestino', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);
  await vaiA(page, 'Documenti');
  await expect(page.getByRole('heading', { name: 'Documenti', level: 1 })).toBeVisible();

  const importa = page.getByLabel('Fatture ricevute da importare');
  await importa.setInputFiles({ name: 'fatture.zip', mimeType: 'application/zip', buffer: zip });
  await expect(
    page.getByText(/2 fatture importate, 0 già presenti, 2 file di metadati ignorati, 1 scartate/),
  ).toBeVisible();
  await expect(page.getByText('istruzioni.pdf: non è una fattura elettronica')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Da classificare (2)' })).toBeVisible();

  // Lo stesso ZIP una seconda volta: niente doppioni
  await importa.setInputFiles({ name: 'fatture.zip', mimeType: 'application/zip', buffer: zip });
  await expect(page.getByText(/0 fatture importate, 2 già presenti/)).toBeVisible();

  // Crea la spesa dalla prima fattura
  await page.getByRole('button', { name: 'Mostra gli importi' }).click();
  await page
    .getByRole('link', { name: /Fornitore di Prova Srl/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: "È una spesa dell'attività?" })).toBeVisible();
  await page.getByLabel(/^Categoria della spesa/).selectOption({ label: 'Software e piattaforme' });
  await page.getByRole('button', { name: 'Crea la spesa' }).click();
  await expect(page.getByText('Spesa creata e collegata alla fattura.')).toBeVisible();
  await expect(page.getByText(/^Spesa del 15\/03\/2027/)).toBeVisible();

  // Cestino e ripristino
  await page.getByRole('button', { name: 'Elimina', exact: true }).click();
  await page.getByRole('button', { name: 'Sposta nel cestino' }).click();
  await expect(page.getByText('Spostato nel cestino.')).toBeVisible();
  await page.getByRole('button', { name: 'Ripristina' }).click();
  await expect(page.getByText('Ripristinato.')).toBeVisible();

  // La spesa creata è nell'elenco con il giustificativo
  await page.goto('/app/spese/?anno=2027');
  await expect(page.getByText('Software e piattaforme').first()).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Senza giustificativo' })).toHaveCount(0);
});
