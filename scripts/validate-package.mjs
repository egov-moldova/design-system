#!/usr/bin/env node
/**
 * Publish gate — proves the tarball that would be published satisfies the
 * contract package.json declares, and carries no development-build artifacts.
 *
 * Run after a production build and before publishing. Prints every offender in
 * every category so one CI run reports the whole picture, then exits non-zero.
 *
 * Background: @egov-moldova/mud 1.0.x-1.1.9 shipped a development bundle with
 * most declared entrypoints absent, because the test step rebuilt dist/ in dev
 * mode after the production build. See GitHub issue #1.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** package.json fields whose value names exactly one entry file. */
export const ENTRY_FIELDS = ['main', 'module', 'types', 'unpkg', 'collection', 'collection:main', 'es2015', 'es2017'];

/**
 * Path segments that only ever appear in build-machine artifacts. `.stencil` is
 * Stencil's cache/staging directory; the three config basenames are root-level
 * TypeScript files that must not enter the published program.
 */
export const FORBIDDEN_SEGMENTS = ['.stencil', 'stencil.config.js', 'playwright.config.js', 'vitest-setup.js'];

/**
 * Markers Stencil leaves in a bundle built with `--dev`. A production build
 * minifies `isDev` to `!1` and drops the notice, so neither can match.
 */
export const DEV_BUILD_MARKERS = [/\bisDev:\s*true\b/, /Running in development mode/];

/**
 * Filesystem roots that can only appear in a tarball path when a declaration
 * was emitted under an absolute build-machine path: `/home/vsts/...` on the
 * Azure agent, `/Users/...` on macOS, `/private/var/folders/...` when the build
 * runs under a macOS temp directory, plus a Windows drive letter.
 *
 * `private` and `var` are on this list on purpose. An earlier revision dropped
 * them believing `dist/types/private/` was a directory this build legitimately
 * emits; it is not — it is the head of `/private/var/folders/...`, verified by
 * walking it. Colliding with a real source directory would need `src/private/`
 * or `src/var/` to exist; today `src/` holds assets, components, legacy and
 * utils. This asserts a shape, where FORBIDDEN_SEGMENTS enumerates today's
 * known offenders.
 */
export const ABSOLUTE_PATH_ROOTS = ['home', 'Users', 'private', 'var', 'root', 'tmp'];

/** Strips the leading `./` that `exports` values carry and tarball paths do not. */
export function normalizePackagePath(target) {
  return target.replace(/^\.\//, '');
}

function walkExports(node, trail, entries) {
  if (typeof node === 'string') {
    entries.push({ source: trail, target: node });
    return;
  }
  if (node === null || typeof node !== 'object') {
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    // A subpath pattern resolves to many files; a literal existence check on it
    // would be meaningless. Its directory is covered by the sibling literals,
    // and `checkBundleAssets` covers the one subtree that has no literal.
    if (key.includes('*')) {
      continue;
    }
    walkExports(child, `${trail}[${key}]`, entries);
  }
}

/** Every single-file path package.json declares, each tagged with where it came from. */
export function collectDeclaredEntries(pkg) {
  const entries = [];
  for (const field of ENTRY_FIELDS) {
    if (typeof pkg[field] === 'string') {
      entries.push({ source: field, target: pkg[field] });
    }
  }
  walkExports(pkg.exports, '$.exports', entries);
  return entries.filter(entry => !entry.target.includes('*'));
}

export function checkDeclaredEntries(entries, packedFiles) {
  const packed = new Set(packedFiles);
  return entries.filter(entry => !packed.has(normalizePackagePath(entry.target)));
}

export function checkForbiddenPaths(packedFiles) {
  return packedFiles.filter(file => file.split('/').some(segment => FORBIDDEN_SEGMENTS.includes(segment)));
}

export function checkAbsolutePaths(packedFiles) {
  // Every segment, index 0 included. An earlier revision skipped the first,
  // which would have let a declaration emitted at the tarball root (`Users/...`)
  // through — the exact leak class this exists to catch, escaping at index 0.
  // Nothing needs skipping: `dist` and `loader` are not roots on the list.
  return packedFiles.filter(file =>
    file.split('/').some(segment => ABSOLUTE_PATH_ROOTS.includes(segment) || /^[A-Za-z]:$/.test(segment)),
  );
}

export function checkSourceMaps(packedFiles) {
  return packedFiles.filter(file => file.endsWith('.map'));
}

/**
 * The directory the lazy browser bundle is published into, derived from the
 * `unpkg` field rather than hardcoded. Hardcoding `dist/mud/` would make this
 * check answer "no dev build" by scanning a directory that no longer exists the
 * moment the Stencil namespace is renamed — the rule's letter met with its
 * intent violated. Throws instead of degrading to a vacuous scan.
 */
export function lazyBundleDir(pkg) {
  if (typeof pkg.unpkg !== 'string' || !pkg.unpkg.includes('/')) {
    throw new Error('validate-package: cannot locate the lazy bundle — package.json has no usable "unpkg" field');
  }
  return `${path.posix.dirname(normalizePackagePath(pkg.unpkg))}/`;
}

/**
 * Where `exports["./dist/components"]` points. Throws rather than returning
 * null: a null would make `checkBundleAssets` a silent no-op, which is the same
 * vacuous-scan failure `lazyBundleDir` exists to avoid one function up. If the
 * standalone bundle is ever dropped from the contract deliberately, drop the
 * asset check with it — do not let it quietly stop grading while the gate
 * still reports PASS.
 */
export function standaloneBundleDir(pkg) {
  const target = pkg.exports?.['./dist/components']?.import;
  if (typeof target !== 'string' || !target.includes('/')) {
    throw new Error(
      'validate-package: cannot locate the standalone bundle — exports["./dist/components"].import is missing or unusable',
    );
  }
  return `${path.posix.dirname(normalizePackagePath(target))}/`;
}

export function checkDevSignature(packedFiles, readText, bundleDir) {
  return packedFiles
    .filter(file => file.startsWith(bundleDir) && file.endsWith('.js'))
    .filter(file => DEV_BUILD_MARKERS.some(marker => marker.test(readText(file))));
}

/**
 * The standalone custom-elements bundle resolves `getAssetPath('./assets/x')`
 * relative to itself, but Stencil's `dist-custom-elements` target silently
 * ignores `assetsDirs` — `scripts/copy-component-assets.mjs` mirrors them in as
 * a post-build step. Without it a component with assets "renders empty
 * silently" (that script's own words). Nothing else in the tarball reveals it:
 * `exports["./dist/components/*"]` is a pattern, so checkDeclaredEntries skips
 * it by design.
 */
export function checkBundleAssets(packedFiles, lazyDir, standaloneDir) {
  const lazy = packedFiles.filter(file => file.startsWith(`${lazyDir}assets/`));
  if (lazy.length === 0) {
    return [];
  }
  const standalone = packedFiles.filter(file => file.startsWith(`${standaloneDir}assets/`));
  return standalone.length === 0
    ? [`${standaloneDir}assets/ is empty while ${lazyDir}assets/ carries ${lazy.length} file(s)`]
    : [];
}

/**
 * The exact file list that would be published — `files`, ignore rules and the
 * packer's own built-in rules all applied. Asking the packer beats
 * reimplementing its rules.
 *
 * Yarn, because this repo is Yarn 4 (`packageManager` in package.json) and
 * `web-components` already publishes with `yarn npm publish`. Two properties
 * make it the better instrument here, both measured rather than assumed:
 *
 *   1. `yarn pack --dry-run` runs NO lifecycle script — neither `prepare` nor
 *      `prepack`. `npm pack --dry-run` runs `prepare`, and a `prepare` that
 *      exits non-zero aborts the pack with that code. This package's `prepare`
 *      is `husky install && ...`, so an npm-based gate would reinstall git
 *      hooks as a side effect of a read-only validation.
 *   2. On this package the two packers agree exactly — measured at 2037 files,
 *      zero difference, on a production build carrying dist/components. This
 *      function does not re-derive that; it is a property to re-check whenever
 *      `files` or the publish tooling changes, not an invariant to assume.
 *
 * Output is NDJSON: one `{"base":...}` line, then one `{"location":...}` per
 * file, with no `package/` prefix.
 */
export function packedFileList(cwd = PROJECT_ROOT) {
  const raw = execFileSync('yarn', ['pack', '--dry-run', '--json'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return raw
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => JSON.parse(line))
    .filter(entry => typeof entry.location === 'string')
    .map(entry => entry.location);
}

export function main({ cwd = PROJECT_ROOT, log = console.log, error = console.error } = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const declared = collectDeclaredEntries(pkg);
  const files = packedFileList(cwd);
  const readText = file => fs.readFileSync(path.join(cwd, file), 'utf8');
  const lazyDir = lazyBundleDir(pkg);
  const standaloneDir = standaloneBundleDir(pkg);

  const categories = [
    [
      'declared entrypoint missing from tarball',
      checkDeclaredEntries(declared, files).map(entry => `${entry.source} -> ${entry.target}`),
    ],
    ['build-machine artifact in tarball', checkForbiddenPaths(files)],
    ['absolute build-machine path in tarball', checkAbsolutePaths(files)],
    ['source map in tarball (development build)', checkSourceMaps(files)],
    [
      'development runtime in tarball',
      // Both runtime bundles, not just the lazy one: the tarball carries two,
      // and the bar says "no development-build artifacts", not "none in the
      // lazy bundle".
      [lazyDir, standaloneDir].flatMap(dir => checkDevSignature(files, readText, dir)),
    ],
    ['standalone bundle published without its assets', checkBundleAssets(files, lazyDir, standaloneDir)],
  ];

  const failures = categories.filter(([, offenders]) => offenders.length > 0);

  if (failures.length === 0) {
    log(
      `validate-package: PASS — ${files.length} files packed, ` +
        `${declared.length}/${declared.length} declared entrypoints present`,
    );
    return 0;
  }

  for (const [label, offenders] of failures) {
    error(`validate-package: FAIL — ${label} (${offenders.length})`);
    for (const offender of offenders) {
      error(`  ${offender}`);
    }
  }
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
