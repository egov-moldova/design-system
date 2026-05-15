import fs from 'node:fs';
import path from 'node:path';
import * as CarbonIcons from '@carbon/icons';

const OUT_FILE = path.resolve('src/components/cor-icon/assets/carbon-icon-names.json');

function uniqSorted(arr) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

const names = uniqSorted(
  Object.values(CarbonIcons)
    .map(icon => icon?.name)
    .filter(Boolean),
);

function toKey(name) {
  return name.replace(/-/g, '_').toUpperCase();
}

const map = Object.fromEntries(names.map(n => [toKey(n), `carbon:${n}`]));

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(map, null, 2) + '\n', 'utf8');

console.log(`[carbon-icon-names] wrote ${Object.keys(map).length} items to ${OUT_FILE}`);
