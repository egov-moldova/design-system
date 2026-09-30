#!/usr/bin/env node
/**
 * locale-report.mjs — `yarn locale.report`: prints one Markdown table per component,
 * key × `ro-MD` / `en-US` / `ru-MD`, with plural forms expanded to `key (one)` / `key (few)` …
 * rows. It exists to serve a later native-speaker review of the en/ru text; it is run on
 * demand and its output is never committed.
 *
 * Usage: node scripts/locale-report.mjs [component-name ...]   (e.g. mud-pagination)
 */
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isEntrypoint } from './lib/is-entrypoint.mjs';

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['ro-MD', 'en-US', 'ru-MD'];
const PLURAL_ORDER = ['one', 'few', 'many', 'other'];

/** Flattens one locale table to `Map<row label, string>`; a `Plural` becomes `key (form)` rows. */
export function flattenTable(table) {
  const rows = new Map();
  for (const [key, value] of Object.entries(table ?? {})) {
    if (typeof value === 'string') rows.set(key, value);
    else if (value && typeof value === 'object') {
      for (const form of PLURAL_ORDER) if (typeof value[form] === 'string') rows.set(`${key} (${form})`, value[form]);
    }
  }
  return rows;
}

/** Rows of one dictionary export, in `ro-MD` order followed by keys only other locales carry. */
export function dictionaryRows(dictionary) {
  const perLocale = Object.fromEntries(LOCALES.map(l => [l, flattenTable(dictionary[l])]));
  const labels = [];
  for (const l of LOCALES) for (const label of perLocale[l].keys()) if (!labels.includes(label)) labels.push(label);
  return labels.map(label => ({ key: label, values: LOCALES.map(l => perLocale[l].get(label) ?? '') }));
}

const cell = text => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** One Markdown table. */
export function renderTable(rows) {
  const lines = [`| key | ${LOCALES.join(' | ')} |`, `| --- | ${LOCALES.map(() => '---').join(' | ')} |`];
  for (const { key, values } of rows) lines.push(`| \`${key}\` | ${values.map(cell).join(' | ')} |`);
  return lines.join('\n');
}

/** The whole report: `### mud-<name>` + table per component that owns a `*.messages.ts`. */
export async function buildReport(root = DEFAULT_ROOT, only = []) {
  const componentsDir = join(root, 'src/components');
  const sections = [];
  for (const dir of readdirSync(componentsDir).sort()) {
    const dirPath = join(componentsDir, dir);
    if (!statSync(dirPath).isDirectory() || (only.length > 0 && !only.includes(dir))) continue;
    const rows = [];
    for (const entry of readdirSync(dirPath).sort()) {
      if (!entry.endsWith('.messages.ts')) continue;
      const mod = await import(pathToFileURL(join(dirPath, entry)).href);
      for (const exported of Object.values(mod)) {
        if (!exported || typeof exported !== 'object' || !LOCALES.every(l => l in exported)) continue;
        rows.push(...dictionaryRows(exported));
      }
    }
    if (rows.length > 0) sections.push(`### ${dir}\n\n${renderTable(rows)}`);
  }
  return sections.join('\n\n');
}

if (isEntrypoint(import.meta.url)) {
  buildReport(DEFAULT_ROOT, process.argv.slice(2)).then(
    out => console.log(out),
    err => {
      console.error('[locale-report] failed:', err);
      process.exit(1);
    },
  );
}
