import { describe, expect, it } from 'vitest';
import { etichettaDispositivo } from '@/features/sessions/etichetta';

describe('etichettaDispositivo', () => {
  it.each([
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      'iPhone · Safari',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
      'Mac · Chrome',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0',
      'Windows · Edge',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',
      'Android · Chrome',
    ],
    [null, 'Dispositivo sconosciuto'],
  ])('%s → %s', (ua, attesa) => {
    expect(etichettaDispositivo(ua)).toBe(attesa);
  });
});
