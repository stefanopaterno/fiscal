import { expect, test, type Page } from '@playwright/test';
import {
  accediConPassword,
  creaUtente,
  eliminaUtente,
  type UtenteProva,
} from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// T089-T090 (principio VI, specifica 011): su ogni pagina dell'app
// - nessuno scorrimento laterale (telefono 360 px e PC);
// - sul telefono ogni elemento da toccare è alto almeno 44 px;
// - c'è almeno un aiuto "?".

async function controllaPagina(page: Page, nome: string, telefono: boolean) {
  await page.waitForLoadState('networkidle');
  const esito = await page.evaluate(() => {
    const visibili = [
      ...document.querySelectorAll(
        'button, a[href], input:not([type=checkbox]):not([type=radio]), select, [role=tab], [role=switch], .fui-Checkbox',
      ),
    ].filter(
      (e) => (e as HTMLElement).offsetParent !== null && !(e as HTMLElement).closest('[aria-hidden="true"]'),
    );
    return {
      scorreDiLato: document.documentElement.scrollWidth > window.innerWidth,
      piccoli: visibili
        .map((e) => ({
          cosa: (e.getAttribute('aria-label') || (e as HTMLElement).innerText || e.tagName).slice(0, 40),
          // l'area toccabile di un campo è il suo riquadro (bordo compreso)
          altezza: Math.round((e.closest('.fui-Input, .fui-Select') ?? e).getBoundingClientRect().height),
        }))
        .filter((x) => x.altezza < 44),
      aiuti: document.querySelectorAll('button[aria-label^="Aiuto:"]').length,
    };
  });
  expect(esito.scorreDiLato, `${nome}: scorrimento laterale`).toBe(false);
  if (telefono) expect(esito.piccoli, `${nome}: elementi sotto i 44 px`).toEqual([]);
  expect(esito.aiuti, `${nome}: almeno un aiuto "?"`).toBeGreaterThan(0);
}

const daEliminare: UtenteProva[] = [];
test.afterEach(async () => {
  while (daEliminare.length) await eliminaUtente(daEliminare.pop());
});

test('tutte le pagine: niente scorrimento laterale, aree da 44 px sul telefono, aiuti presenti', async ({
  page,
}, info) => {
  const telefono = info.project.name === 'telefono';

  await page.goto('/app/accesso/');
  await controllaPagina(page, 'accesso', telefono);
  await page.goto('/app/blocco/');
  await controllaPagina(page, 'blocco', telefono);

  // Prima configurazione (utente senza telefono collegato)
  const nuovo = await creaUtente();
  daEliminare.push(nuovo);
  await page.goto('/app/accesso/');
  await page.getByLabel(/^E-mail/).fill(nuovo.email);
  await page.getByLabel(/^Password/).fill(nuovo.password);
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/accesso\/configura\/$/);
  await expect(page.getByRole('img', { name: /Codice QR/ })).toBeVisible();
  await controllaPagina(page, 'configura', telefono);
  await (await accediConPassword(nuovo)).auth.signOut({ scope: 'global' });
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  // Utente con telefono collegato: codice, recupero, home, sicurezza
  const { utente, codice } = await utenteConTelefono();
  daEliminare.push(utente);
  await page.goto('/app/accesso/');
  await page.getByLabel(/^E-mail/).fill(utente.email);
  await page.getByLabel(/^Password/).fill(utente.password);
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/accesso\/secondo-fattore\/$/);
  await controllaPagina(page, 'secondo-fattore', telefono);
  await page.goto('/app/accesso/recupero/');
  await expect(page.getByRole('tab', { name: 'Uso la frase' })).toBeVisible();
  await controllaPagina(page, 'recupero', telefono);

  await page.evaluate(() => localStorage.clear());
  await entraNelBrowser(page, utente, codice);
  await controllaPagina(page, 'home', telefono);
  await page.goto('/app/impostazioni/sicurezza/');
  await expect(page.getByRole('heading', { name: 'Registro di sicurezza' })).toBeVisible();
  await controllaPagina(page, 'sicurezza', telefono);
});
