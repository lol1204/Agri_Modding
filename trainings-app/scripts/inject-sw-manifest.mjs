/**
 * Läuft nach `expo export -p web`:
 * Trägt in dist/sw.js die Liste aller Dateien ein, die der Service Worker
 * vorab speichern soll, plus eine eindeutige Build-ID (für Updates).
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = join(process.cwd(), 'dist');
const swPath = join(dist, 'sw.js');

const SKIP = [/^\(/, /^sw\.js$/, /\.map$/, /^\+not-found\.html$/, /^_sitemap\.html$/, /(^|\/)\./, /^metadata\.json$/];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Datei → URL, so wie der Browser sie anfragt (saubere URLs ohne .html). */
function toUrl(file) {
  const rel = relative(dist, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'/index.html'.length);
  if (rel.endsWith('.html')) return '/' + rel.slice(0, -'.html'.length);
  return '/' + rel;
}

const files = walk(dist).filter((file) => {
  const rel = relative(dist, file).split(sep).join('/');
  return !SKIP.some((re) => re.test(rel));
});

const hash = createHash('sha256');
for (const file of files.sort()) {
  hash.update(relative(dist, file));
  hash.update(readFileSync(file));
}
const buildId = hash.digest('hex').slice(0, 12);
const urls = [...new Set(files.map(toUrl))].sort();

let sw = readFileSync(swPath, 'utf8');
const before = sw;
sw = sw.replace(/\/\*__BUILD_ID__\*\/\s*'dev'/, JSON.stringify(buildId));
sw = sw.replace(/\/\*__PRECACHE_MANIFEST__\*\/\s*\[\]/, JSON.stringify(urls, null, 2));
if (sw === before) {
  console.error('inject-sw-manifest: Platzhalter in dist/sw.js nicht gefunden.');
  process.exit(1);
}
writeFileSync(swPath, sw);
const totalKb = Math.round(files.reduce((sum, f) => sum + statSync(f).size, 0) / 1024);
console.log(`Service Worker: ${urls.length} Dateien (${totalKb} KB) vorgemerkt, Build ${buildId}.`);
