import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { admin, eliminaUtente, type UtenteProva } from '../integration/_supabase-locale';
import { entraNelBrowser, utenteConTelefono } from './_aiuti';

// Specifica 009: controlli, anteprima, pacchetto ZIP AES con PDF ed Excel, password mostrata una volta, codici al
// posto dei nomi, storico e richieste del commercialista.
let utente: UtenteProva | undefined;
test.afterEach(async () => {
  await eliminaUtente(utente);
  utente = undefined;
});

test('pacchetto per il commercialista: protetto, senza nomi con i codici, nello storico', async ({ page }) => {
  test.setTimeout(150_000);
  const u = await utenteConTelefono();
  utente = u.utente;
  await entraNelBrowser(page, u.utente, u.codice);

  await page.goto('/app/impostazioni/modalita/');
  await page.getByRole('button', { name: "Carica dati d'esempio" }).click();
  await page.getByRole('button', { name: 'Sì, carica' }).click();
  await expect(page.getByText(/Caricati 12 clienti/)).toBeVisible();
  await admin.from('certificazioni_uniche').insert({ id: crypto.randomUUID(), owner_id: u.utente.id, anno: 2027, reddito_lavoro: 50_500_00, ritenute_irpef: 13_865_00 });
  await page.evaluate(() => localStorage.setItem('fiscal.dataProva', '2027-11-22'));
  const { data: persone } = await admin.from('clienti').select('cognome').eq('owner_id', u.utente.id).eq('tipo', 'persona_fisica');
  const cognomi = (persone ?? []).map((p) => p.cognome as string).filter((c) => c && c.length >= 4);
  expect(cognomi.length).toBeGreaterThan(0);

  await page.goto('/app/dichiarazione/pacchetto/');
  await expect(page.getByRole('heading', { name: 'Pacchetto per il commercialista', level: 1 })).toBeVisible();
  await page.getByRole('textbox', { name: /^Anno/ }).fill('2027');
  await page.getByRole('switch', { name: 'Usa i codici al posto dei nomi dei pazienti' }).check();
  await page.getByRole('textbox', { name: /^Per/ }).fill('Studio di prova');
  await page.getByRole('button', { name: 'Controlla e prepara' }).click();
  await expect(page.getByRole('heading', { name: /^Controlli \(\d+\)$/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Anteprima' })).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Genera il pacchetto protetto' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('prospetto-2027-01-01_2027-12-31.zip');
  const password = (await page.getByLabel('Password del pacchetto', { exact: true }).textContent())!.trim();
  expect(password).toMatch(/^([a-zA-Z2-9]{4}-){5}[a-zA-Z2-9]{4}$/);

  if (existsSync('/usr/bin/bsdtar')) {
    const dir = mkdtempSync(join(tmpdir(), 'fiscal-pacchetto-'));
    try {
      await file.saveAs(join(dir, 'p.zip'));
      execFileSync('/usr/bin/bsdtar', ['-x', '--passphrase', password, '-f', 'p.zip'], { cwd: dir });
      const pdf = readFileSync(join(dir, 'prospetto.pdf')).toString('latin1');
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
      const xlsx = execFileSync('/usr/bin/bsdtar', ['-x', '-O', '-f', join(dir, 'dati.xlsx')]).toString('utf8');
      for (const c of cognomi) {
        expect(pdf).not.toContain(c);
        expect(xlsx).not.toContain(c);
      }
      expect(xlsx).toContain('C-');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  await page.getByRole('button', { name: "L'ho salvata, nascondi" }).click();
  await expect(page.getByLabel('Password del pacchetto', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/per Studio di prova/)).toBeVisible();

  // Secondo pacchetto dello stesso periodo: confronto riga per riga con il primo (T007)
  await page.getByRole('button', { name: 'Controlla e prepara' }).click();
  await expect(page.getByText(/^Rispetto al pacchetto del /)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Nessuna riga cambiata.')).toBeVisible();

  await page.getByRole('textbox', { name: /^Nuova richiesta/ }).fill('Manca la ricevuta ENPAP di ottobre');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Richieste del commercialista (1 aperte)' })).toBeVisible();
  await page.getByRole('button', { name: 'Chiudi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Richieste del commercialista (0 aperte)' })).toBeVisible();
});
