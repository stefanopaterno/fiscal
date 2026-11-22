import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono, vaiA } from './_aiuti';

// T020 (008): spesa registrata, spesa letta da fattura elettronica XML, consigli e box in home.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

const anno = new Date().getFullYear();
const campo = (page: Page, nome: RegExp) => page.getByRole('textbox', { name: nome });

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader><CedentePrestatore><DatiAnagrafici><IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdFiscaleIVA>
  <Anagrafica><Denominazione>Software Clinico Srl</Denominazione></Anagrafica></DatiAnagrafici></CedentePrestatore></FatturaElettronicaHeader>
  <FatturaElettronicaBody><DatiGenerali><DatiGeneraliDocumento><TipoDocumento>TD01</TipoDocumento><Divisa>EUR</Divisa>
  <Data>${anno}-02-15</Data><Numero>42</Numero><ImportoTotaleDocumento>122.00</ImportoTotaleDocumento></DatiGeneraliDocumento></DatiGenerali>
  <DatiBeniServizi><DettaglioLinee><NumeroLinea>1</NumeroLinea><Descrizione>Abbonamento annuale agenda online</Descrizione><PrezzoUnitario>100.00</PrezzoUnitario><PrezzoTotale>100.00</PrezzoTotale><AliquotaIVA>22.00</AliquotaIVA></DettaglioLinee>
  <DatiRiepilogo><AliquotaIVA>22.00</AliquotaIVA><ImponibileImporto>100.00</ImponibileImporto><Imposta>22.00</Imposta></DatiRiepilogo></DatiBeniServizi></FatturaElettronicaBody>
</p:FatturaElettronica>`;

test('registro una spesa, ne leggo una dalla fattura XML e vedo i consigli', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  const o = u.utente.id;
  const ok = (r: { error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
  };
  ok(
    await admin
      .from('certificazioni_uniche')
      .insert({ owner_id: o, id: randomUUID(), anno, reddito_lavoro: 50_500_00, ritenute_irpef: 13_915_00 }),
  );
  ok(
    await admin
      .from('dati_anno')
      .insert({ owner_id: o, id: randomUUID(), anno, reddito_professionale_manuale: 10_000_00 }),
  );
  await entraNelBrowser(page, u.utente, u.codice);

  await vaiA(page, 'Spese');
  await expect(page.getByRole('heading', { name: 'Spese', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Nuova spesa' }).click();
  await campo(page, /^Importo pagato/).fill('1.200');
  await page.getByRole('button', { name: 'Salva la spesa' }).click();
  await expect(page.getByText('Spesa salvata.')).toBeVisible();

  // Seconda spesa dalla fattura elettronica
  await page.goto('/app/spese/scheda/');
  await page
    .getByLabel('File XML della fattura')
    .setInputFiles({ name: 'fattura.xml', mimeType: 'text/xml', buffer: Buffer.from(XML) });
  await expect(page.getByText(/Letti dalla fattura: Software Clinico Srl/)).toBeVisible();
  await expect(campo(page, /^Fornitore/)).toHaveValue('Software Clinico Srl');
  await expect(campo(page, /^Importo pagato/)).toHaveValue('122,00');
  await page.getByLabel(/^Categoria/).selectOption({ label: 'Software e piattaforme' });
  await page.getByRole('button', { name: 'Salva la spesa' }).click();
  await expect(page.getByText('Spesa salvata.')).toBeVisible();

  // Elenco: deducibile 1.200 + 122
  await page.goto('/app/spese/');
  await page.getByRole('button', { name: 'Mostra gli importi' }).click();
  await expect(page.getByText('1.322,00 €').first()).toBeVisible();

  // Consigli: formazione con 8.800 € ancora deducibili, risparmio al 43%
  await page.goto('/app/spese/consigli/');
  await expect(page.getByText(/Formazione, master e convegni/).first()).toBeVisible();
  const mostra = page.getByRole('button', { name: 'Mostra gli importi' });
  if (await mostra.isVisible()) await mostra.click();
  await expect(page.getByText('8.800,00 €').first()).toBeVisible();
  await expect(page.getByText('43 € in meno').first()).toBeVisible();

  // Box in home
  await page.goto('/app/home/');
  await expect(page.getByText(/Come abbassare le tasse|Entro il 31 dicembre/).first()).toBeVisible();
});
