import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Prova S6 (research D-14): il service worker conserva solo i file dell'app e non intercetta mai
// le richieste verso altri domini (Supabase). Richiede `npm run build`; altrimenti è saltato.

const sw = path.resolve(__dirname, '../../out/app/sw.js');

describe.skipIf(!existsSync(sw))('service worker', () => {
  const codice = existsSync(sw) ? readFileSync(sw, 'utf8') : '';

  it('esce subito per le richieste verso altri domini (Supabase solo in rete)', () => {
    expect(codice).toContain('if (url.origin !== self.location.origin) return;');
  });

  it("non contiene indirizzi di Supabase né di altri domini da mettere in cache", () => {
    expect(codice).not.toMatch(/supabase\.co/i);
    expect(codice).not.toMatch(/https?:\/\//);
  });

  it("mette in cache solo percorsi dell'app", () => {
    const elenco = JSON.parse(/const FILE_APP = (\[.*\]);/.exec(codice)?.[1] ?? '[]') as string[];
    expect(elenco.length).toBeGreaterThan(0);
    for (const url of elenco) expect(url.startsWith('/app/')).toBe(true);
    expect(elenco).toContain('/app/');
  });

  it('ignora le richieste che non sono letture (POST, PATCH...)', () => {
    expect(codice).toContain("if (richiesta.method !== 'GET') return;");
  });
});
