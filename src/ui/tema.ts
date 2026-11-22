import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components';

/**
 * Tema "Grafite e ottone" di Fiscal: grafite come colore principale (pulsanti, link, voce attiva),
 * ottone caldo come accento (logo, riquadri in evidenza), in linea con il nero e oro di Soarlyai.
 * Una sola fonte dei colori: la usano il tema di Fluent, il logo, le icone e la home.
 */
export const COLORI = {
  grafite: '#31363F',
  grafiteChiara: '#3D434D',
  grafiteScura: '#15181C',
  ottone: '#C9A24B',
  ottoneChiaro: '#E2C47E',
  ottoneScuro: '#9C7A2E',
} as const;

/** Scala di grafite per Fluent UI 9 (10 = quasi nero, 160 = grigio chiarissimo). */
const grafite: BrandVariants = {
  10: '#060708',
  20: '#0E1013',
  30: '#15181C',
  40: '#1B1F24',
  50: '#21252B',
  60: '#262B32',
  70: '#2B3038',
  80: '#31363F',
  90: '#3D434D',
  100: '#4A515C',
  110: '#5C6370',
  120: '#737A86',
  130: '#8C929C',
  140: '#A8ADB5',
  150: '#C8CBD0',
  160: '#E6E8EB',
};

/** I link in ottone scuro: in grafite si confonderebbero col testo (contrasto ≥ 4,5:1 sul bianco). */
export const temaChiaro: Theme = {
  ...createLightTheme(grafite),
  colorBrandForegroundLink: '#7E611E',
  colorBrandForegroundLinkHover: '#6A5119',
  colorBrandForegroundLinkPressed: '#5A4415',
};

/** Al buio la grafite non si vedrebbe: pulsanti e link principali in ottone. */
export const temaScuro: Theme = {
  ...createDarkTheme(grafite),
  colorBrandBackground: COLORI.ottone,
  colorBrandBackgroundHover: COLORI.ottoneChiaro,
  colorBrandBackgroundPressed: COLORI.ottoneScuro,
  colorBrandBackgroundSelected: COLORI.ottoneScuro,
  colorNeutralForegroundOnBrand: COLORI.grafiteScura,
  colorBrandForeground1: COLORI.ottoneChiaro,
  colorBrandForeground2: COLORI.ottone,
  colorBrandForegroundLink: COLORI.ottoneChiaro,
  colorBrandForegroundLinkHover: COLORI.ottone,
  colorBrandForegroundLinkPressed: COLORI.ottoneScuro,
  colorBrandStroke1: COLORI.ottone,
  colorCompoundBrandBackground: COLORI.ottone,
  colorCompoundBrandForeground1: COLORI.ottoneChiaro,
  colorCompoundBrandStroke: COLORI.ottone,
};
