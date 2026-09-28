#!/usr/bin/env node
/**
 * check-content-language.mjs — issue #163: demo content is English. The static half of
 * `copy-probe.mjs --content-language`: the same letter check, dictionary-value check and
 * `scripts/eslint/content-language.allow.json` allowlist (one shared module,
 * `scripts/eslint/content-language.mjs`), over the sources the probe cannot render.
 *
 * Sources: web-components/demo/index.html, web-components/demo/pages/**\/*.html,
 * web-components/demo/*.ts, .storybook/stories/*.mdx, src/components/*\/*.mdx.
 *
 * Usage: node scripts/check-content-language.mjs [--root <dir>]
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_ROOT,
  checkSource,
  loadAllowlist,
  loadDictionaryValues,
  makeChecker,
} from './eslint/content-language.mjs';

const list = (dir, suffix) =>
  existsSync(dir) && statSync(dir).isDirectory()
    ? readdirSync(dir)
        .filter(f => f.endsWith(suffix))
        .map(f => join(dir, f))
    : [];

function walk(dir, suffix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path, suffix) : path.endsWith(suffix) ? [path] : [];
  });
}

/** `{ path, kind }` for every static source under `root`. */
export function staticSources(root) {
  const demo = join(root, 'web-components/demo');
  const componentDirs = existsSync(join(root, 'src/components')) ? readdirSync(join(root, 'src/components')) : [];
  return [
    ...(existsSync(join(demo, 'index.html')) ? [{ path: join(demo, 'index.html'), kind: 'markup' }] : []),
    ...walk(join(demo, 'pages'), '.html').map(path => ({ path, kind: 'markup' })),
    ...list(demo, '.ts').map(path => ({ path, kind: 'ts' })),
    ...list(join(root, '.storybook/stories'), '.mdx').map(path => ({ path, kind: 'markup' })),
    ...componentDirs
      .flatMap(dir => list(join(root, 'src/components', dir), '.mdx'))
      .map(path => ({
        path,
        kind: 'markup',
      })),
  ];
}

/** All violations under `root`: `[{ file, line, text, reason }]`. */
export async function checkContentLanguage(root = DEFAULT_ROOT) {
  const check = makeChecker({ allow: loadAllowlist(root), dictionary: await loadDictionaryValues(root) });
  const violations = [];
  for (const { path, kind } of staticSources(root)) {
    for (const v of checkSource(readFileSync(path, 'utf8'), kind, check)) {
      violations.push({ file: relative(root, path), ...v });
    }
  }
  return violations;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootFlag = process.argv.indexOf('--root');
  const root = rootFlag > 0 ? process.argv[rootFlag + 1] : DEFAULT_ROOT;
  const violations = await checkContentLanguage(root);
  for (const v of violations) console.log(`${v.file}:${v.line} · ${v.reason} · ${v.text}`);
  console.log(`[check-content-language] ${violations.length} violation(s).`);
  process.exit(violations.length > 0 ? 1 : 0);
}
