import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono, vaiA } from './_aiuti';

// Specifica 005: tipo di consenso, paziente minorenne con un solo genitore (incompleto), secondo genitore
// (presente), revoca (revocato), avviso non bloccante in fattura, nomi come iniziali e mostrati dopo la verifica.
const CF_MINORE = 'BNCLCU12' + 'E12H501X'; // nato nel 2012

let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('registro, completo e revoco il consenso di un minore; la fattura avvisa senza bloccare', async ({ page }) => {
  test.setTimeout(90_000);
  const u = await utenteConTelefono();
  utente = u.utente;
  const paziente = randomUUID();
  await admin.from('clienti').insert({
    owner_id: u.utente.id,
    id: paziente,
    tipo: 'persona_fisica',
    nome: 'Luca',
    cognome: 'Bianchi',
    codice_fiscale: CF_MINORE,
  });
  await entraNelBrowser(page, u.utente, u.codice);

  // Senza tipi: Fiscal chiede di crearli (non ne propone)
  await vaiA(page, 'Consensi');
  await expect(page.getByText(/Prima crea i tuoi tipi di consenso/)).toBeVisible();
  await page.getByRole('link', { name: 'Tipi di consenso e modelli' }).click();
  await page.getByLabel(/^Nome del tipo/).fill('Percorso individuale');
  await page.getByRole('button', { name: 'Aggiungi il tipo' }).click();
  await expect(page.getByText('Tipo di consenso aggiunto.', { exact: true })).toBeVisible();

  // Il paziente compare con iniziali e anno, mai con il nome
  await page.getByRole('link', { name: 'Consensi' }).first().click();
  const voce = page.getByRole('link', { name: /L\.B\. 2012/ });
  await expect(voce).toBeVisible();
  await expect(page.getByText('Bianchi')).toHaveCount(0);
  await expect(voce.getByText('Consenso mancante')).toBeVisible();

  // Un solo genitore: incompleto
  await voce.click();
  await page.getByLabel(/^Versione \(scritta\)/).fill('1.0');
  await page.getByLabel(/^Nome e cognome/).fill('Anna Bianchi');
  await expect(page.getByText('Firme incomplete')).toBeVisible();
  await page.getByRole('button', { name: 'Registra il consenso' }).click();
  await expect(page.getByText('Consenso registrato.', { exact: true })).toBeVisible();
  await expect(page.getByText('Incompleto', { exact: true })).toBeVisible();
  await expect(page.getByText(/Manca la firma del secondo genitore/).first()).toBeVisible();

  // Il secondo genitore firma dopo: presente
  await page.getByRole('button', { name: 'Aggiungi firmatario' }).last().click();
  await page.getByLabel(/^Nome e cognome/).last().fill('Paolo Bianchi');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await expect(page.getByText('Firmatario aggiunto.', { exact: true })).toBeVisible();
  await expect(page.getByText('Presente', { exact: true })).toBeVisible();

  // Revoca: lo stato cambia, il consenso resta nello storico
  await page.getByRole('button', { name: 'Revoca', exact: true }).click();
  await page.getByRole('button', { name: 'Registra la revoca' }).click();
  await expect(page.getByText('Revoca registrata.', { exact: true })).toBeVisible();
  await expect(page.getByText('Revocato', { exact: true })).toBeVisible();
  await expect(page.getByText('Storico (1)')).toBeVisible();
  await expect(page.getByText(/· Revoca registrata$/)).toBeVisible(); // registro delle modifiche

  // I nomi completi compaiono solo dopo la verifica (qui il codice è appena stato inserito) e per pochi secondi
  await page.getByRole('button', { name: 'Mostra i nomi dei pazienti' }).click();
  await expect(page.getByText('Bianchi Luca')).toBeVisible();
  await page.getByRole('button', { name: 'Nascondi i nomi dei pazienti' }).click();
  await expect(page.getByText('Bianchi Luca')).toHaveCount(0);

  // In fattura: avviso, ma si può procedere
  await page.goto(`/app/fatture/nuova/?cliente=${paziente}`);
  await expect(page.getByText(/Consenso informato: revocato/)).toBeVisible();
  await expect(page.getByLabel(/^Cliente/)).toHaveValue(paziente);
});
