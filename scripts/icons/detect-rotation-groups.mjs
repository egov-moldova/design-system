#!/usr/bin/env node
/**
 * Find groups of icon SVGs whose path content is identical — these are icons
 * Figma renders as rotations/flips of a shared vector.
 *
 * We strip the viewBox attribute (which differs after re-framing) and compare
 * the rest of the file. Groups with >1 member need rotation/flip post-processing
 * derived from get_design_context's wrapper transform.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'src/components/cor-icon/assets');
const SIZES = [12, 16, 20, 24];

function bodyHash(svg) {
  // Strip the viewBox so re-framed twins still compare equal.
  const body = svg.replace(/viewBox="[^"]*"/, '');
  return createHash('sha1').update(body).digest('hex');
}

const groups = new Map();

for (const size of SIZES) {
  const dir = path.join(ASSETS_ROOT, String(size));
  let files;
  try {
    files = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') continue;
    throw err;
  }
  for (const file of files) {
    if (!file.endsWith('.svg')) continue;
    const svg = await fs.readFile(path.join(dir, file), 'utf8');
    const h = bodyHash(svg);
    const key = `${size}/${h}`;
    if (!groups.has(key)) groups.set(key, { size, members: [] });
    groups.get(key).members.push(file.replace(/\.svg$/, ''));
  }
}

const dupGroups = [...groups.values()].filter(g => g.members.length > 1);
console.log(`Total groups: ${groups.size}`);
console.log(`Duplicated groups (>1 member sharing path geometry): ${dupGroups.length}`);
console.log(`Total icons in those groups: ${dupGroups.reduce((s, g) => s + g.members.length, 0)}`);
for (const g of dupGroups) {
  console.log(`  ${g.size}px [${g.members.length}]: ${g.members.join(', ')}`);
}
