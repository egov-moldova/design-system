#!/usr/bin/env node
/**
 * check-props-kept.mjs — issue #163's acceptance bar: every `Property`/`Attribute` row in
 * each component's readme.md Properties table at `upstream/main` is still present on
 * the branch. No existing prop is removed or renamed; a prop's TYPE or DEFAULT may still
 * change (the locale work turns several required-string props into `string | undefined`
 * overrides — see `changes/issue-163-locale-behaviour.md`).
 *
 * Usage:
 *   node scripts/check-props-kept.mjs
 *   node scripts/check-props-kept.mjs --base upstream/main
 *
 * Run after `yarn build` — the readme tables are generated, not hand-written.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const baseIndex = argv.indexOf('--base');
const BASE_REF = baseIndex >= 0 ? argv[baseIndex + 1] : 'upstream/main';

const ROOT = process.cwd();
const COMPONENTS_DIR = path.join(ROOT, 'src/components');

/** Every `Property` and `Attribute` cell of a readme's `## Properties` table. */
function parsePropertiesTable(markdown) {
  const names = new Set();
  const section = markdown.match(/## Properties\n\n([\s\S]*?)(?:\n\n## |\n\n---|\n*$)/);
  if (!section) return names;
  const lines = section[1].split('\n').filter(line => line.trim().startsWith('|'));
  // Row 0 is the header, row 1 the `---` separator.
  for (const line of lines.slice(2)) {
    const cells = line.split('|').map(cell => cell.trim());
    const property = (cells[1] ?? '')
      .replace(/_\(required\)_/g, '')
      .replace(/`/g, '')
      .trim();
    const attribute = (cells[2] ?? '').replace(/`/g, '').trim();
    if (property) names.add(property);
    if (attribute && attribute !== '--' && attribute !== '') names.add(attribute);
  }
  return names;
}

function readAtBase(relPath) {
  try {
    return execFileSync('git', ['show', `${BASE_REF}:${relPath}`], { encoding: 'utf8', cwd: ROOT });
  } catch {
    return null; // No such path at the base ref — a component born after it; nothing to compare.
  }
}

function main() {
  if (!fs.existsSync(COMPONENTS_DIR)) {
    console.error(`[check-props-kept] ${COMPONENTS_DIR} does not exist.`);
    process.exit(1);
  }
  const dirs = fs
    .readdirSync(COMPONENTS_DIR)
    .filter(entry => fs.statSync(path.join(COMPONENTS_DIR, entry)).isDirectory())
    .sort();

  let failed = false;
  for (const dir of dirs) {
    const relPath = `src/components/${dir}/readme.md`;
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) continue;

    const baseContent = readAtBase(relPath);
    if (baseContent === null) continue;

    const baseProps = parsePropertiesTable(baseContent);
    const currentProps = parsePropertiesTable(fs.readFileSync(fullPath, 'utf8'));

    for (const name of baseProps) {
      if (!currentProps.has(name)) {
        console.error(
          `[check-props-kept] ${relPath}: "${name}" is missing — a Property/Attribute row present at ` +
            `${BASE_REF} was removed or renamed.`,
        );
        failed = true;
      }
    }
  }

  if (failed) {
    console.error('[check-props-kept] FAILED — see rows above.');
    process.exit(1);
  }
  console.log(`[check-props-kept] OK — every ${BASE_REF} Property/Attribute row is still present.`);
}

main();
