import { describe, expect, it } from 'vitest';
import {
  fraseAccettabile,
  generaCodici,
  hashFrase,
  hmacCodice,
  normalizzaCodice,
  verificaFrase,
} from '../../supabase/functions/_shared/crypto';

// T061/T063 (US4): la stessa libreria gira nelle funzioni Edge (Deno) e qui (Node).

describe('codici di recupero', () => {
  it('genera 10 codici diversi da 16 caratteri base32 in 4 gruppi', () => {
    const codici = generaCodici();
    expect(codici).toHaveLength(10);
    expect(new Set(codici).size).toBe(10);
    for (const c of codici) expect(c).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}$/);
  });

  it('normalizza spazi, trattini e minuscole', () => {
    expect(normalizzaCodice(' k7qm-2hxp zdta-4wrn ')).toBe('K7QM2HXPZDTA4WRN');
  });

  it("l'HMAC è stabile con lo stesso pepe e diverso con un altro pepe", async () => {
    const a = await hmacCodice('K7QM-2HXP-ZDTA-4WRN', 'pepe-uno');
    const b = await hmacCodice('k7qm2hxpzdta4wrn', 'pepe-uno');
    const c = await hmacCodice('K7QM-2HXP-ZDTA-4WRN', 'pepe-due');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^\\x[0-9a-f]{64}$/);
  });

  it('senza pepe si rifiuta di calcolare', async () => {
    await expect(hmacCodice('K7QM2HXPZDTA4WRN', '')).rejects.toThrow(/pepe/);
  });
});

describe('frase di recupero', () => {
  it('accetta frasi lunghe (almeno 24 caratteri o 6 parole) e rifiuta quelle corte', () => {
    expect(fraseAccettabile('il gatto mangia la torta di mele')).toBe(true);
    expect(fraseAccettabile('Supercalifragilistico2027!')).toBe(true);
    expect(fraseAccettabile('troppo corta')).toBe(false);
  });

  it('impronta argon2id con sale diverso ogni volta, verificabile', async () => {
    const frase = 'il gatto mangia la torta di mele';
    const h1 = await hashFrase(frase);
    const h2 = await hashFrase(frase);
    expect(h1).toMatch(/^argon2id\$m=\d+,t=\d+,p=1\$/);
    expect(h1).not.toBe(h2);
    expect(h1).not.toContain('gatto');
    expect(await verificaFrase(frase, h1)).toBe(true);
    expect(await verificaFrase('  Il gatto   mangia la TORTA di mele ', h1)).toBe(true);
    expect(await verificaFrase('il cane mangia la torta di mele', h1)).toBe(false);
    expect(await verificaFrase(frase, 'formato-sbagliato')).toBe(false);
  });

  it('il calcolo resta sotto 1,5 secondi (limite di CPU delle funzioni Edge)', async () => {
    const inizio = performance.now();
    await hashFrase('una frase di prova abbastanza lunga');
    expect(performance.now() - inizio).toBeLessThan(1500);
  });
});
