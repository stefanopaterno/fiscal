import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// T042 (SC-003, FR-005): il codice pubblicato (out/) non contiene chiavi segrete, pepper o dati personali.
// Richiede `npm run build`; senza build il test viene saltato.

const out = path.resolve(__dirname, '../../out');

function tuttiIFile(cartella: string): string[] {
  return readdirSync(cartella).flatMap((nome) => {
    const p = path.join(cartella, nome);
    return statSync(p).isDirectory() ? tuttiIFile(p) : [p];
  });
}

describe.skipIf(!existsSync(out))('segreti nella build', () => {
  const testi = existsSync(out)
    ? tuttiIFile(out)
        .filter((f) => /\.(html|js|txt|json|webmanifest|css)$/.test(f))
        .map((f) => ({ f: path.relative(out, f), t: readFileSync(f, 'utf8') }))
    : [];

  it('nessuna chiave segreta di Supabase', () => {
    for (const { f, t } of testi) {
      // Il codice contiene il prefisso solo per RIFIUTARE le chiavi segrete: si cerca una chiave completa.
      expect(new RegExp('sb_' + 'secret_[A-Za-z0-9_-]{10,}').test(t), f).toBe(false);
      expect(/SERVICE_ROLE(_KEY)?\s*[=:]\s*["']?\S{20,}/i.test(t), f).toBe(false);
    }
  });

  it('nessun token con ruolo service_role', () => {
    for (const { f, t } of testi) {
      for (const m of t.matchAll(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
        const payload = JSON.parse(Buffer.from(m[0].split('.')[1] ?? '', 'base64url').toString('utf8'));
        expect(payload.role, f).not.toBe('service_role');
      }
    }
  });

  it('nessun pepper dei codici di recupero né codici fiscali', () => {
    for (const { f, t } of testi) {
      expect(/PEPPER/i.test(t), f).toBe(false);
      expect(/\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b/.test(t), f).toBe(false);
    }
  });
});

// La build pubblicata non contiene gli agganci usati solo nei test end-to-end (build:e2e).
const buildDiProva = existsSync(path.join(out, 'app', 'index.html'))
  ? readFileSync(path.join(out, 'app', 'index.html'), 'utf8').includes('http://127.0.0.1:54321')
  : true;
describe.skipIf(!existsSync(out) || buildDiProva)('build pubblicata senza codice di prova', () => {
  it('nessun aggancio di prova né tabella di prova', () => {
    for (const f of tuttiIFile(out).filter((x) => x.endsWith('.js'))) {
      const t = readFileSync(f, 'utf8');
      expect(t.includes('__fiscalProve'), f).toBe(false);
      expect(t.includes('prove_sincronizzazione'), f).toBe(false);
    }
  });
});
