// Genera le icone PNG dell'app (192 e 512 px) dal marchio public/icons/icon.svg (grafite e ottone).
// Le icone delle PWA sono a tutto quadro: il sistema arrotonda gli angoli da sé.
// Uso: node scripts/genera-icone.mjs (serve Chromium di Playwright, già tra le dipendenze di sviluppo).

import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const svg = await readFile('public/icons/icon.svg', 'utf8');
const browser = await chromium.launch();
for (const lato of [192, 512]) {
  const pagina = await browser.newPage({ viewport: { width: lato, height: lato } });
  const pieno = svg.replace('rx="24"', 'rx="0"').replace('<svg ', `<svg width="${lato}" height="${lato}" `);
  await pagina.setContent(`<body style="margin:0;background:#15181C">${pieno}</body>`);
  await pagina.screenshot({ path: `public/icons/icon-${lato}.png` });
  console.log(`public/icons/icon-${lato}.png`);
}
await browser.close();
