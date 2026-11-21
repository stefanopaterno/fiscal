import { expect, test, type CDPSession, type Page } from '@playwright/test';
import {
  accediConPassword,
  configuraSecondoFattore,
  creaUtente,
  eliminaUtente,
  type UtenteProva,
} from '../integration/_supabase-locale';

// T077 (US5): blocco per inattività, occhio, sblocco rapido con Face ID simulato e 3 rifiuti.
// Orologio simulato di Playwright; "Face ID" = autenticatore virtuale di Chrome con PRF.

let utente: UtenteProva | undefined;
let app: { codiceAdesso: () => string; codiceStabile: () => Promise<string> };

test.beforeEach(async () => {
  utente = await creaUtente();
  const client = await accediConPassword(utente);
  app = (await configuraSecondoFattore(client)).app;
  await client.auth.signOut();
});
test.afterEach(async () => {
  await eliminaUtente(utente);
});

async function entra(page: Page) {
  await page.clock.install();
  await page.goto('/app/accesso/');
  await page.getByLabel(/^E-mail/).fill(utente!.email);
  await page.getByLabel(/^Password/).fill(utente!.password);
  await page.getByRole('button', { name: 'Accedi', exact: true }).click();
  await page.getByLabel(/^Codice a 6 cifre/).fill(await app.codiceStabile());
  await page.getByRole('button', { name: 'Verifica ed entra' }).click();
  await expect(page).toHaveURL(/\/app\/home\/$/);
}

async function idSessione(page: Page): Promise<string | undefined> {
  return page.evaluate(() => {
    const chiave = Object.keys(localStorage).find((k) => /^sb-.*-auth-token/.test(k));
    const token = chiave ? (JSON.parse(localStorage.getItem(chiave) ?? '{}').access_token as string) : '';
    if (!token) return undefined;
    const parte = token.split('.')[1] ?? '';
    return JSON.parse(atob(parte.replace(/-/g, '+').replace(/_/g, '/'))).session_id as string;
  });
}

async function faceIdVirtuale(page: Page): Promise<{ cdp: CDPSession; id: string }> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
      hasPrf: true,
    },
  });
  return { cdp, id: authenticatorId };
}

test("dopo 5 minuti senza attività l'app si blocca e senza sblocco rapido servono password e codice", async ({
  page,
}) => {
  await entra(page);
  await page.clock.fastForward('05:10');
  await expect(page).toHaveURL(/\/app\/blocco\/$/);
  await expect(page.getByRole('heading', { name: 'Fiscal è bloccato' })).toBeVisible();
  await expect(page.getByText(/Lo sblocco rapido non è attivo/)).toBeVisible();

  // La sessione non c'è più: la home rimanda all'accesso
  await page.goto('/app/home/');
  await expect(page).toHaveURL(/\/app\/accesso\/$/);
});

test("occhio: all'avvio importi nascosti, si mostrano a comando e si richiudono in background", async ({
  page,
}) => {
  await entra(page);
  const mostra = page.getByRole('button', { name: 'Mostra gli importi' });
  await expect(mostra).toHaveAttribute('aria-pressed', 'false');
  await mostra.click();
  await expect(page.getByRole('button', { name: 'Nascondi gli importi' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Mostra gli importi' })).toBeVisible();
});

test('sblocco rapido con Face ID: si rientra senza password; dopo 3 rifiuti servono password e codice', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'autenticatore virtuale solo su Chromium');
  const { cdp, id } = await faceIdVirtuale(page);
  await entra(page);

  // Attivazione dalle impostazioni
  await page.goto('/app/impostazioni/sicurezza/');
  await page.getByRole('switch', { name: 'Sblocco rapido su questo dispositivo' }).click();
  await expect(page.getByText('Sblocco rapido attivo su questo dispositivo.')).toBeVisible();

  // Blocco e sblocco con "Face ID": si torna dove si era, senza password, con la STESSA sessione (FR-020)
  const prima = await idSessione(page);
  expect(prima).toBeTruthy();
  await page.clock.fastForward('05:10');
  await expect(page).toHaveURL(/\/app\/blocco\/$/);
  await page.getByRole('button', { name: 'Sblocca con Face ID o impronta' }).click();
  await expect(page).toHaveURL(/\/app\/impostazioni\/sicurezza\/$/);
  await expect(page.getByRole('heading', { name: 'Sicurezza', level: 1 })).toBeVisible();
  expect(await idSessione(page)).toBe(prima);

  // Nuovo blocco, questa volta il volto non viene riconosciuto 3 volte
  await page.clock.fastForward('05:10');
  await expect(page).toHaveURL(/\/app\/blocco\/$/);
  await cdp.send('WebAuthn.setUserVerified', { authenticatorId: id, isUserVerified: false });
  const sblocca = page.getByRole('button', { name: 'Sblocca con Face ID o impronta' });
  await sblocca.click();
  await expect(page.getByText(/Puoi riprovare ancora 2 volte/)).toBeVisible();
  await sblocca.click();
  await expect(page.getByText(/Puoi riprovare ancora 1 volta/)).toBeVisible();
  await sblocca.click();
  await expect(page.getByText(/Troppi tentativi con Face ID o impronta/)).toBeVisible();
  await expect(sblocca).toHaveCount(0);
  await page.getByRole('button', { name: 'Accedi con password e codice' }).click();
  await expect(page).toHaveURL(/\/app\/accesso\/$/);
});
