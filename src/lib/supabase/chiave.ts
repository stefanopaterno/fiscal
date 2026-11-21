/**
 * Controllo della chiave usata dal browser (FR-005, costituzione principio VII).
 * Nel codice pubblicato può stare solo la chiave PUBBLICA (sb_publishable_… o la vecchia "anon").
 * Se per errore arrivasse la chiave segreta, l'app si ferma invece di esporla.
 */
export function verificaChiavePubblica(chiave: string): void {
  if (!chiave) {
    throw new Error('Configurazione: manca la chiave pubblica di Supabase (NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  }
  if (chiave.startsWith('sb_secret_')) {
    throw new Error(
      'Configurazione: è stata inserita la chiave segreta di Supabase. Usare solo la chiave pubblica.',
    );
  }
  const parti = chiave.split('.');
  if (parti.length === 3 && parti[1]) {
    let ruolo: unknown;
    try {
      ruolo = JSON.parse(decodificaBase64Url(parti[1])).role;
    } catch {
      ruolo = undefined;
    }
    if (ruolo === 'service_role') {
      throw new Error(
        'Configurazione: è stata inserita la chiave segreta (service_role). Usare solo la chiave pubblica.',
      );
    }
  }
}

function decodificaBase64Url(testo: string): string {
  const base64 = testo
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(testo.length / 4) * 4, '=');
  return typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8');
}
