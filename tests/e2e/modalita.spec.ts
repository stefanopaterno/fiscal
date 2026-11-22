import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// 003, FR-027..FR-030: modalità prova (prove cancellabili, filigrana) e passaggio irreversibile alla produzione.
const CF = 'RSSMRA80' + 'A01H501U';
const oggi = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('in prova emetto, stampo con filigrana e cancello; poi passo alla produzione senza ritorno', async ({
  page,
}) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  const owner = { owner_id: u.utente.id };
  await admin.from('profilo_professionale').insert({
    ...owner,
    id: randomUUID(),
    nome: 'Mario',
    cognome: 'Rossi',
    codice_fiscale: CF,
    partita_iva: '12345678903',
    inizio_attivita: '2099-01-01', // nel futuro: in prova non conta
    indirizzo: 'Via Roma 1',
    cap: '00100',
    comune: 'Roma',
    provincia: 'RM',
  });
  await admin
    .from('attivita')
    .insert({
      ...owner,
      id: randomUUID(),
      nome: 'Psicologo',
      natura_iva: 'esente_sanitaria',
      predefinita: true,
    });
  await admin.from('clienti').insert({
    ...owner,
    id: randomUUID(),
    tipo: 'persona_fisica',
    nome: 'Luca',
    cognome: 'Bianchi',
    codice_fiscale: CF,
    indirizzo: 'Via Milano 2',
    cap: '20100',
    comune: 'Milano',
    provincia: 'MI',
  });
  await entraNelBrowser(page, u.utente, u.codice);
  await expect(
    page
      .getByRole('region', { name: 'Modalità prova' })
      .or(page.getByText('Modalità prova', { exact: true }))
      .first(),
  ).toBeVisible();

  // Fattura di prova con la data di oggi (prima dell'inizio attività)
  await page.goto('/app/fatture/nuova/');
  await page.getByLabel(/^Cliente/).selectOption({ label: 'Bianchi Luca' });
  await page.getByLabel(/^Data/).fill(oggi());
  await page.getByLabel(/^Importo unitario/).fill('80');
  await page.getByRole('button', { name: 'Emetti la fattura' }).click();
  await expect(page.getByRole('heading', { name: /Fattura n\. 1\// })).toBeVisible();
  await page.getByRole('button', { name: 'Stampa o salva in PDF' }).click();
  await expect(page.getByText('DOCUMENTO DI PROVA — SENZA VALORE FISCALE')).toBeVisible();
  await page.goBack();

  // Si cancella anche se emessa
  await page.getByRole('button', { name: 'Elimina (è una prova)' }).click();
  await page.getByRole('button', { name: 'Sì, elimina' }).click();
  await expect(page).toHaveURL(/\/app\/fatture\/$/);
  await expect(page.getByText('Non hai ancora fatture.')).toBeVisible();

  // Un'altra prova, poi passaggio alla produzione: le prove spariscono, i clienti restano
  await page.goto('/app/fatture/nuova/');
  await page.getByLabel(/^Cliente/).selectOption({ label: 'Bianchi Luca' });
  await page.getByLabel(/^Data/).fill(oggi());
  await page.getByLabel(/^Importo unitario/).fill('60');
  await page.getByRole('button', { name: 'Emetti la fattura' }).click();
  await expect(page.getByRole('heading', { name: /Fattura n\. 1\// })).toBeVisible();

  await page.goto('/app/impostazioni/modalita/');
  const passa = page.getByRole('button', { name: 'Passa alla produzione' });
  await expect(passa).toBeDisabled();
  await page.getByRole('checkbox', { name: /Ho capito/ }).check();
  await page.getByLabel(/^Scrivi PRODUZIONE/).fill('PRODUZIONE');
  await passa.click(); // codice appena inserito all'accesso: la verifica recente è già valida
  await expect(page.getByRole('heading', { name: 'Sei in produzione' })).toBeVisible();
  await expect(page.getByText('Modalità prova', { exact: true })).toHaveCount(0);

  await page.goto('/app/fatture/');
  await expect(page.getByText('Non hai ancora fatture.')).toBeVisible();
  await page.goto('/app/clienti/');
  await expect(page.getByText('Persona', { exact: true })).toHaveCount(1);

  // In produzione la data di inizio attività conta di nuovo
  await page.goto('/app/fatture/nuova/');
  await page.getByLabel(/^Cliente/).selectOption({ label: 'Bianchi Luca' });
  await page.getByLabel(/^Data/).fill(oggi());
  await page.getByLabel(/^Importo unitario/).fill('60');
  await page.getByRole('button', { name: 'Emetti la fattura' }).click();
  await expect(page.getByText(/precedente all'inizio dell'attività/)).toBeVisible();

  const { data } = await admin.from('user_security').select('in_prova').eq('owner_id', u.utente.id).single();
  expect(data?.in_prova).toBe(false);
});
