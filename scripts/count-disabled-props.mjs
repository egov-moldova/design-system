#!/usr/bin/env node
/**
 * How many components in this library implement a `disabled` prop, and out of how
 * many components in total.
 *
 * Cited by `mud-accordion-item`'s class JSDoc, which tells consumers that
 * `disabled` is not universal across slottable MUD controls. That is a claim
 * about this repo, so it needs a way to be recounted rather than trusted.
 *
 * Counts by the `@Component({ tag: … })` decorator, not by directory. Five
 * components ship from a sibling's directory — `mud-tab` inside `mud-tabs/`,
 * `mud-menu-item` inside `mud-menu/`, and three more — so a per-directory count
 * undercounts, and a glob over every `.tsx` in a directory over-counts against a
 * directory denominator. Both mistakes were made before this script existed.
 *
 *   node scripts/count-disabled-props.mjs
 *   node scripts/count-disabled-props.mjs --list
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const componentsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components');
const COMPONENT_TAG = /@Component\(\{[\s\S]*?tag:\s*'([a-z][a-z0-9-]*)'/;
const DISABLED_PROP = /@Prop\([^)]*\)\s*disabled/;

const components = [];
for (const dir of readdirSync(componentsDir)) {
  const dirPath = join(componentsDir, dir);
  if (!statSync(dirPath).isDirectory()) continue;
  for (const file of readdirSync(dirPath)) {
    if (!file.endsWith('.tsx') || file.endsWith('.spec.tsx')) continue;
    const source = readFileSync(join(dirPath, file), 'utf8');
    const tag = source.match(COMPONENT_TAG)?.[1];
    if (!tag) continue;
    components.push({ tag, hasDisabled: DISABLED_PROP.test(source) });
  }
}

components.sort((a, b) => a.tag.localeCompare(b.tag));
const withProp = components.filter(c => c.hasDisabled);

if (process.argv.includes('--list')) {
  for (const c of components) console.log(`${c.hasDisabled ? 'yes' : ' no'}  ${c.tag}`);
}
console.log(`${withProp.length} of ${components.length} components declare a \`disabled\` @Prop`);
