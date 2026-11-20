/**
 * Erzeugt die App-Icons (PNG) aus scripts/icon.svg.
 * Nur bei Änderungen am Icon nötig: `node scripts/render-icons.mjs`
 * Benötigt Playwright mit Chromium (nicht Teil der App-Abhängigkeiten).
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const svg = readFileSync(join(process.cwd(), 'scripts/icon.svg'), 'utf8');
const out = join(process.cwd(), 'public/icons');
mkdirSync(out, { recursive: true });

const targets = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['favicon-32.png', 32],
  ['../../assets/icon.png', 1024],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path: join(out, name), omitBackground: false });
  console.log('Icon erstellt:', name, size);
}
await browser.close();
