import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Pagina di cortesia invariata (research D-12): dopo `npm run build`, out/index.html e out/robots.txt
// devono essere identici byte per byte ai file alla radice. Senza una build il test viene saltato.

const radice = path.resolve(__dirname, '../..');
const out = path.join(radice, 'out');
const impronta = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');

describe.skipIf(!existsSync(path.join(out, 'app')))('build: pagina di cortesia', () => {
  it.each(['index.html', 'robots.txt'])("%s in out/ è identico all'originale", (nome) => {
    expect(impronta(path.join(out, nome))).toBe(impronta(path.join(radice, nome)));
  });

  it("l'app è sotto out/app/ e non sostituisce la pagina di cortesia", () => {
    expect(existsSync(path.join(out, 'app', 'index.html'))).toBe(true);
    expect(readFileSync(path.join(out, 'index.html'), 'utf8')).not.toContain('_next/');
  });

  it("le pagine dell'app hanno la Content-Security-Policy", () => {
    const html = readFileSync(path.join(out, 'app', 'index.html'), 'utf8');
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("connect-src 'self' https://aldiyymgvngvdrroluus.supabase.co");
  });
});
