import { expect, type Page } from '@playwright/test';
import {
  accediConPassword,
  admin,
  configuraSecondoFattore,
  creaUtente,
  type UtenteProva,
} from '../integration/_supabase-locale';

/** Utente di prova con il secondo fattore già collegato. */
export async function utenteConTelefono(): Promise<{ utente: UtenteProva; codice: () => Promise<string> }> {
  const utente = await creaUtente();
  const client = await accediConPassword(utente);
  const { app } = await configuraSecondoFattore(client);
  await client.auth.signOut();
  return { utente, codice: app.codiceStabile };
}

/** Accesso completo nel browser: password e codice a 6 cifre, fino alla home. */
export async function entraNelBrowser(page: Page, utente: UtenteProva, codice: () => Promise<string>) {
  await page.goto('/app/accesso/');
  await page.getByLabel(/^E-mail/).fill(utente.email);
  await page.getByLabel(/^Password/).fill(utente.password);
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await page.getByLabel(/^Codice a 6 cifre/).fill(await codice());
  await page.getByRole('button', { name: 'Verifica ed entra' }).click();
  await expect(page).toHaveURL(/\/app\/home\/$/);
  await page.waitForFunction(() => Boolean(window.__fiscalProve));
}

/** Righe della tabella di prova di un utente, lette dallo stack locale. */
export async function righeDiProva(utente: UtenteProva) {
  const { data } = await admin.from('prove_sincronizzazione').select('id, testo').eq('owner_id', utente.id);
  return data ?? [];
}
