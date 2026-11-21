/** Etichetta breve del dispositivo dal "user agent" (stessa regola della funzione del database). */
export function etichettaDispositivo(ua: string | null | undefined): string {
  if (!ua) return 'Dispositivo sconosciuto';
  const u = ua.toLowerCase();
  const sistema = u.includes('iphone')
    ? 'iPhone'
    : u.includes('ipad')
      ? 'iPad'
      : u.includes('android')
        ? 'Android'
        : u.includes('macintosh') || u.includes('mac os x')
          ? 'Mac'
          : u.includes('windows')
            ? 'Windows'
            : u.includes('linux')
              ? 'Linux'
              : 'Altro dispositivo';
  const browser = u.includes('edg/')
    ? 'Edge'
    : u.includes('firefox/') || u.includes('fxios/')
      ? 'Firefox'
      : u.includes('chrome/') || u.includes('crios/')
        ? 'Chrome'
        : u.includes('safari/')
          ? 'Safari'
          : null;
  return browser ? `${sistema} · ${browser}` : sistema;
}
