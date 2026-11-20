/**
 * Qualitäts-Check: Farbwerte dürfen nur in src/theme stehen.
 * Sucht in app/ und src/ nach Hex-Farben (#3DDC97) und rgb()/rgba()/hsl().
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const dirs = ['app', 'src'];
const allowed = [`src${sep}theme${sep}`];
const pattern = /(#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const problems = [];
for (const dir of dirs) {
  for (const file of walk(join(root, dir))) {
    if (!/\.(tsx?|jsx?)$/.test(file)) continue;
    const rel = relative(root, file);
    if (allowed.some((a) => rel.startsWith(a))) continue;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (pattern.test(line)) problems.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
  }
}

if (problems.length) {
  console.error('Farbwerte außerhalb von src/theme gefunden:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('Theme-Check ok: keine Farbwerte außerhalb von src/theme.');
