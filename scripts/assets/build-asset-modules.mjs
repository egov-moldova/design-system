#!/usr/bin/env node
/**
 * `yarn assets.generate` — turn every SVG owned by `mud-icon`, `mud-logo` and `mud-phone-input`
 * into one sanitized, id-prefixed ES module, plus one `key → () => import()` map per class:
 *
 *   src/components/mud-icon/assets/{outlined,filled}/<name>.svg → src/generated/icons/<variant>/<name>.ts
 *   src/components/mud-logo/assets/<name>.svg                   → src/generated/logos/<name>.ts
 *   src/components/mud-phone-input/assets/flags/<code>.svg      → src/generated/flags/<code>.ts
 *
 * and `src/generated/{icons,logos,flags}/index.ts` exporting `ICON_MODULES`, `LOGO_MODULES` and
 * `FLAG_MODULES`, each a `SvgModuleMap` (`src/utils/svg-assets.ts`). Each module is
 * `const svg: string = '<svg …>'; export default svg;`; the transform is `svgo.asset-modules.mjs`.
 *
 * The output is committed, like `icon-names.ts`: a fresh clone, the editor and every script resolve
 * it with no build step. `src/generated/` belongs to this script — a file there with no source is
 * deleted.
 *
 *   yarn assets.generate                                     # write
 *   node scripts/assets/build-asset-modules.mjs --check      # write nothing; exit 1 on drift
 *
 * `--check` exits 1 when any output would differ (stale, missing or extra file), when any module
 * carries a `style` attribute or element, a script, an event handler, a reference or `url()` out of
 * its own file, or an element that loads, navigates or retargets a reference (`FORBIDDEN`), or
 * when a drawing references an id it never defines and is not in `KNOWN_DANGLING`
 * (run by scripts/__tests__/build-asset-modules.spec.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { optimize } from 'svgo';

import { isEntrypoint } from '../lib/is-entrypoint.mjs';
import { configFor } from './svgo.asset-modules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..');
const COMPONENTS = path.join(ROOT, 'src/components');
export const OUT_DIR = path.join(ROOT, 'src/generated');

const ICON_VARIANTS = ['outlined', 'filled'];
const FLAGS_DIR = path.join(COMPONENTS, 'mud-phone-input/assets/flags');

/**
 * Keys become file paths, import specifiers and TypeScript string keys, so each `/`-separated
 * segment is held to this alphabet; anything else could escape the output folder or inject code.
 */
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]*$/;

/**
 * What no emitted drawing may carry: it is appended inline to a shadow root on every consumer's page.
 * The transform strips some of these; this list is the check that refuses whatever it did not, so a
 * new upstream drawing that needs one of them fails the run instead of shipping.
 */
const FORBIDDEN = [
  [/\sstyle\s*=/i, 'a style attribute'],
  [/<style/i, 'a style element'],
  [/<script/i, 'a script'],
  [/\son[a-z]+\s*=/i, 'an event handler'],
  [/\s(?:href|xlink:href|src)\s*=\s*["'](?!#)/i, 'a reference out of the file'],
  [/url\(\s*['"]?(?!#)/i, 'a url() out of the file'],
  // An animation can retarget an `href` the transform made local; the others load or navigate.
  [
    /<(?:animate|animateMotion|animateTransform|set|foreignObject|image|a|iframe|object|embed)[\s/>]/i,
    'an element that loads, navigates or retargets a reference',
  ],
];

/** The reasons, from `FORBIDDEN`, that a drawing may not be emitted; empty when it may. */
export function forbiddenIn(markup) {
  return FORBIDDEN.filter(([pattern]) => pattern.test(markup)).map(([, what]) => what);
}

/**
 * Drawings allowed to reference ids they never define, each with the reason. A browser paints a
 * missing `url(#…)` as nothing, so such a drawing silently loses the shapes that use it. An entry
 * expires: the run fails once its drawing defines every id it references, or no longer exists.
 */
const KNOWN_DANGLING = new Map([
  [
    'flag:sh-ac',
    'flag-icons 7.5.0 ships 96 shading gradients referenced but not defined; Chromium renders the flag ' +
      'correctly without them (checked 2026-10-05 at 640×480 and 20×14)',
  ],
]);

const relative = file => path.relative(ROOT, file).split(path.sep).join('/');

/** Ids a drawing references through `url(#…)` or `href="#…"` but never defines, sorted. */
export function danglingReferences(markup) {
  const defined = new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
  const referenced = new Set(
    [...markup.matchAll(/url\(\s*['"]?#([^'")\s]+)|\s(?:xlink:)?href="#([^"]+)"/g)].map(match => match[1] ?? match[2]),
  );
  return [...referenced].filter(id => !defined.has(id)).sort();
}

function svgFiles(dir) {
  if (!fs.existsSync(dir)) throw new Error(`[assets] missing source directory: ${relative(dir)}`);
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.svg'))
    .map(entry => entry.name)
    .sort();
}

/** One entry per asset class: where its sources live and what its index exports. */
const SETS = [
  {
    kind: 'icon',
    dir: 'icons',
    exportName: 'ICON_MODULES',
    sources: () =>
      ICON_VARIANTS.flatMap(variant => {
        const dir = path.join(COMPONENTS, 'mud-icon/assets', variant);
        return svgFiles(dir).map(file => ({ key: `${variant}/${file.slice(0, -4)}`, file: path.join(dir, file) }));
      }),
  },
  {
    kind: 'logo',
    dir: 'logos',
    exportName: 'LOGO_MODULES',
    sources: () => {
      const dir = path.join(COMPONENTS, 'mud-logo/assets');
      return svgFiles(dir).map(file => ({ key: file.slice(0, -4), file: path.join(dir, file) }));
    },
  },
  {
    kind: 'flag',
    dir: 'flags',
    exportName: 'FLAG_MODULES',
    sources: () => svgFiles(FLAGS_DIR).map(file => ({ key: file.slice(0, -4), file: path.join(FLAGS_DIR, file) })),
    banner: flagLicenceBanner,
  },
];

/**
 * The flag-icons copyright and MIT notice as a `/*!` comment, which minifiers keep, so the licence
 * travels inside the chunk that ships the flag map. Overrides with their own licence are named.
 */
function flagLicenceBanner() {
  const licence = fs.readFileSync(path.join(FLAGS_DIR, 'LICENSE'), 'utf8').trim();
  const source = JSON.parse(fs.readFileSync(path.join(FLAGS_DIR, 'SOURCE.json'), 'utf8'));
  const overrides = Object.entries(source.overrides ?? {}).map(([code, { license }]) => `${code} (${license})`);
  const lines = [
    `Flags: flag-icons, ${source.repository} (${source.folder} at ${source.commit}).`,
    ...(overrides.length ? [`Drawn from another source, under its own licence: ${overrides.join(', ')}.`] : []),
    '',
    ...licence.split(/\r?\n/),
  ];
  const body = lines.map(line => (line ? ` * ${line}` : ' *')).join('\n');
  if (body.includes('*/'))
    throw new Error('[assets] the flag LICENSE contains "*/" and cannot be embedded in a comment');
  return `/*!\n${body}\n */\n`;
}

/**
 * Sanitizes one drawing, prefixes its ids with the asset key and marks its root.
 * @param {string} svg
 * @param {{ kind: 'icon' | 'logo' | 'flag', key: string }} asset
 */
export function transformSvg(svg, asset) {
  return optimize(svg, configFor(asset)).data;
}

const LINE_SEPARATORS = new RegExp('[\\u2028\\u2029]', 'g');

/**
 * One single-quoted string literal, default-exported. The `: string` annotation is what keeps the
 * drawing out of the published types: without it Stencil declares the default export as the whole
 * markup as a literal type, publishing every drawing a second time under `dist/types/generated/`.
 */
export function toModuleSource(markup) {
  const literal = markup
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    // U+2028 / U+2029 end a line inside a string literal in older parsers.
    .replace(LINE_SEPARATORS, char => `\\u${char.charCodeAt(0).toString(16)}`);
  return `const svg: string = '${literal}';\nexport default svg;\n`;
}

function indexSource(set, keys) {
  return [
    '// Generated by scripts/assets/build-asset-modules.mjs — do not edit; run `yarn assets.generate`.\n',
    "import type { SvgModuleMap } from '../../utils/svg-assets';\n",
    '\n',
    // The banner sits inside the map's initializer: before the erased `import type` TypeScript drops
    // it, and before the declaration the minifier drops it when it merges declarations; attached to
    // the object literal it is the one legal comment Terser keeps in the minified chunk.
    `export const ${set.exportName}: SvgModuleMap = ${set.banner ? set.banner().trimEnd() + ' ' : ''}{\n`,
    ...keys.map(key => `  '${key}': () => import('./${key}'),\n`),
    '};\n',
  ].join('');
}

/** Every file the generator owns, as `src/generated`-relative path → content. */
export function buildOutputs() {
  /** @type {Map<string, string>} */
  const outputs = new Map();
  const unsafe = [];
  const forbidden = [];
  const dangling = [];
  const expired = new Set(KNOWN_DANGLING.keys());

  for (const set of SETS) {
    const sources = set.sources();
    for (const { key } of sources) {
      if (!key.split('/').every(segment => SAFE_SEGMENT.test(segment)))
        unsafe.push(`${set.kind}:${JSON.stringify(key)}`);
    }
    if (unsafe.length) continue;

    for (const { key, file } of sources) {
      const markup = transformSvg(fs.readFileSync(file, 'utf8'), { kind: set.kind, key });
      for (const what of forbiddenIn(markup)) forbidden.push(`${set.kind}:${key} (${what})`);
      const asset = `${set.kind}:${key}`;
      const missingIds = danglingReferences(markup);
      if (missingIds.length && KNOWN_DANGLING.has(asset)) expired.delete(asset);
      else if (missingIds.length) dangling.push(`${asset} (${missingIds.length}, e.g. #${missingIds[0]})`);
      outputs.set(`${set.dir}/${key}.ts`, toModuleSource(markup));
    }
    outputs.set(
      `${set.dir}/index.ts`,
      indexSource(
        set,
        sources.map(source => source.key),
      ),
    );
  }

  if (unsafe.length) throw new Error(`[assets] refusing unsafe asset key(s): ${unsafe.join(', ')}`);
  if (forbidden.length)
    throw new Error(`[assets] refusing drawing(s) the transform left unsafe: ${forbidden.join(', ')}`);
  if (dangling.length)
    throw new Error(
      `[assets] refusing drawing(s) that reference ids they never define: ${dangling.join(', ')} — ` +
        'fix the source SVG, or list it in KNOWN_DANGLING with the reason',
    );
  if (expired.size)
    throw new Error(
      `[assets] KNOWN_DANGLING lists drawing(s) that no longer reference a missing id, or no longer ` +
        `exist: ${[...expired].join(', ')} — remove the entry`,
    );
  return outputs;
}

function readIfPresent(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(entry.parentPath, entry.name));
}

function removeEmptyDirectories(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirectories(path.join(dir, entry.name));
  }
  if (dir !== OUT_DIR && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

function main(argv) {
  const checkOnly = argv.includes('--check');
  const outputs = buildOutputs();
  const extra = filesUnder(OUT_DIR)
    .map(file => path.relative(OUT_DIR, file).split(path.sep).join('/'))
    .filter(rel => !outputs.has(rel))
    .sort();
  const missing = [];
  const stale = [];
  for (const [rel, content] of outputs) {
    const actual = readIfPresent(path.join(OUT_DIR, rel));
    if (actual === undefined) missing.push(rel);
    else if (actual !== content) stale.push(rel);
  }

  if (checkOnly) {
    if (missing.length || stale.length || extra.length) {
      const list = (label, items) =>
        items.length
          ? [`${items.length} ${label} (${items.slice(0, 5).join(', ')}${items.length > 5 ? ', …' : ''})`]
          : [];
      const summary = [...list('stale', stale), ...list('missing', missing), ...list('extra', extra)].join('; ');
      console.error(`[assets] src/generated is out of date: ${summary} — run yarn assets.generate`);
      return 1;
    }
    console.log(`[assets] src/generated is up to date (${outputs.size} files)`);
    return 0;
  }

  for (const rel of [...missing, ...stale]) {
    const file = path.join(OUT_DIR, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, outputs.get(rel), 'utf8');
  }
  for (const rel of extra) fs.rmSync(path.join(OUT_DIR, rel));
  if (fs.existsSync(OUT_DIR)) removeEmptyDirectories(OUT_DIR);

  const counts = SETS.map(
    set =>
      `${set.dir} ${[...outputs.keys()].filter(rel => rel.startsWith(`${set.dir}/`) && !rel.endsWith('/index.ts')).length}`,
  );
  console.log(
    `[assets] ${relative(OUT_DIR)}: ${counts.join(', ')} — ${missing.length} written, ${stale.length} updated, ${extra.length} deleted`,
  );
  return 0;
}

if (isEntrypoint(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
