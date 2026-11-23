import { webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

/**
 * Tema di Fiscal: il blu di Fluent UI 9, in versione chiara (predefinita) e scura. L'utente sceglie con il
 * pulsante in alto (luna/sole); la scelta resta su questo dispositivo. Una sola fonte dei colori del
 * marchio: la usano il logo, le icone e il riquadro in evidenza della home.
 */
export const COLORI = {
  blu: '#0F6CBD',
  bluChiaro: '#2B88D8',
  bluScuro: '#0B4F8F',
} as const;

export type NomeTema = 'chiaro' | 'scuro';

export const temi: Record<NomeTema, Theme> = { chiaro: webLightTheme, scuro: webDarkTheme };

const CHIAVE = 'fiscal.tema';

/** Tema salvato su questo dispositivo; chiaro se non c'è una scelta. */
export function temaSalvato(): NomeTema {
  try {
    return localStorage.getItem(CHIAVE) === 'scuro' ? 'scuro' : 'chiaro';
  } catch {
    return 'chiaro';
  }
}

export function salvaTema(t: NomeTema) {
  try {
    localStorage.setItem(CHIAVE, t);
  } catch {
    /* archivio del browser non disponibile: la scelta vale fino alla chiusura */
  }
}
