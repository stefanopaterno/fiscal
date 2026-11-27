import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Azzeramento del 27/11/2026: in prova si cancella tutto tranne CU, anagrafica, attività e addizionali.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('azzera tutto tranne CU, anagrafica, attività e addizionali', async ({ page }) => {
  const u = await utenteConTelefono();
  utente = u.utente;
  const owner = { owner_id: u.utente.id };
  await admin.from('profilo_professionale').insert({ ...owner, id: randomUUID(), nome: 'Mario', cognome: 'Rossi' });
  await admin.from('attivita').insert({ ...owner, id: randomUUID(), nome: 'Psicologo', natura_iva: 'esente_sanitaria', predefinita: true });
  await admin.from('certificazioni_uniche').insert({ ...owner, id: randomUUID(), anno: 2026, reddito_lavoro: 38_000_00 });
  await admin.from('aliquote_addizionali').insert({ ...owner, id: randomUUID(), anno: 2026, regionale_scaglioni: [{ fino_a: null, aliquota: 0.0123 }], comunale_aliquota: 0.008 });
  await admin.from('clienti').insert({ ...owner, id: randomUUID(), tipo: 'persona_fisica', nome: 'Luca', cognome: 'Bianchi' });
  await admin.from('spese').insert({ ...owner, id: randomUUID(), data: '2026-10-01', importo: 50_00, categoria: 'software' });

  await entraNelBrowser(page, u.utente, u.codice);
  await page.goto('/app/impostazioni/modalita/');
  const pulsante = page.getByRole('button', { name: 'Azzera i dati' });
  await expect(pulsante).toBeDisabled();
  await page.getByLabel('Per confermare scrivi AZZERA').fill('AZZERA');
  await page.getByRole('checkbox', { name: /Ho capito che i dati cancellati non si recuperano/ }).check();
  await pulsante.click(); // codice appena inserito all'accesso: la verifica recente è già valida
  await expect(page.getByText(/Azzerato: .*1 clienti, 1 spese/)).toBeVisible();

  const conta = async (t: string) => (await admin.from(t).select('id', { count: 'exact', head: true }).eq('owner_id', u.utente.id)).count;
  expect(await conta('certificazioni_uniche')).toBe(1);
  expect(await conta('aliquote_addizionali')).toBe(1);
  expect(await conta('profilo_professionale')).toBe(1);
  expect(await conta('attivita')).toBe(1);
  expect(await conta('clienti')).toBe(0);
  expect(await conta('spese')).toBe(0);
});
