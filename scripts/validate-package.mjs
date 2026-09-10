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
 * Where `exports["./components"]` points. Throws rather than returning
 * null: a null would make `checkBundleAssets` a silent no-op, which is the same
 * vacuous-scan failure `lazyBundleDir` exists to avoid one function up. If the
 * standalone bundle is ever dropped from the contract deliberately, drop the
 * asset check with it — do not let it quietly stop grading while the gate
 * still reports PASS.
 */
export function standaloneBundleDir(pkg) {
  const target = pkg.exports?.['./components']?.import;
  if (typeof target !== 'string' || !target.includes('/')) {
    throw new Error(
      'validate-package: cannot locate the standalone bundle — exports["./components"].import is missing or unusable',
    );
  }
  return `${path.posix.dirname(normalizePackagePath(target))}/`;
}

/**
 * Every packed `.js` carrying a development-build marker.
 *
 * `bundleDir` defaults to the WHOLE TARBALL, and that default is the point. This
 * check ran over the two bundle directories only — `dist/mud/` and
 * `dist/components/` — which left `main` (`dist/index.cjs.js`), `module`
 * (`dist/index.js`) and all of `loader/` unscanned. Those are the primary
 * entrypoints: a bare `import '@egov-moldova/mud'` resolves to one of them, so
 * the check furthest from the consumer was the one that ran. `checkDeclaredEntries`
 * did cover them, but only for PRESENCE — it never opens a file — so a dev-built
 * `dist/index.js` that exists passes both.
 *
 * Scanning everything rather than deriving two more directories is deliberate. A
 * derived list has to be kept in step with `package.json` forever and silently
 * under-scans the day a new output target is added; an unfiltered scan cannot go
 * stale and cannot be vacuous. The scope was measured before it was chosen: on
 * the current production tree of 461 `.js` files, zero carry either marker, so
 * completeness costs no false positive. And the markers are not decorative —
 * `Running in development mode` ships inside `@stencil/core`'s own
 * `internal/client/patch-browser.js`, so a `--dev` bundle does carry one.
 *
 * The parameter is retained so a caller can still ask about a single directory.
 */
export function checkDevSignature(packedFiles, readText, bundleDir) {
  // A default parameter fires on `undefined` only. `null` is the other way a caller
  // spells "no scope", and it would reach `startsWith(null)`, which coerces to the
  // literal `"null"` and matches nothing — a scan that silently grades zero files
  // while returning the empty array that means "clean". That is the exact failure
  // this function was just widened to remove, one layer up, so it is closed by a
  // type test rather than by a default.
  const prefix = typeof bundleDir === 'string' ? bundleDir : '';
  return packedFiles
    .filter(file => file.startsWith(prefix) && file.endsWith('.js'))
    .filter(file => DEV_BUILD_MARKERS.some(marker => marker.test(readText(file))));
}

/**
 * The standalone custom-elements bundle resolves `getAssetPath('./assets/x')`
 * relative to itself, but Stencil's `dist-custom-elements` target silently
 * ignores `assetsDirs` — `scripts/copy-component-assets.mjs` mirrors them in as
 * a post-build step. Without it a component with assets "renders empty
 * silently" (that script's own words). Nothing else in the tarball reveals it:
 * `exports["./components/*"]` is a pattern, so checkDeclaredEntries skips
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
 *   2. On this package the two packers agree exactly. That agreement is what
 *      lets a yarn-measured list stand for an npm-published tarball, so it is
 *      not assumed here: `checkPackerAgreement` re-derives it on every run and
 *      fails the gate the moment the two lists diverge.
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

/**
 * The same list as `packedFileList`, asked of the packer the release path
 * actually uses (`pipline-mud-publish-npm.yml` publishes with `npm publish`).
 *
 * `--ignore-scripts` is required, not cosmetic: without it `npm pack --dry-run`
 * runs this package's `prepare` (`husky install && ...`), so a read-only
 * validation would reinstall git hooks as a side effect. It also keeps the
 * comparison honest — yarn runs no lifecycle script either, so both sides are
 * measured under the same conditions.
 *
 * Output is a JSON array with one entry, whose `files[].path` are the tarball
 * paths without the `package/` prefix — the same shape yarn's `location` has.
 */
export function npmPackedFileList(cwd = PROJECT_ROOT) {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(raw)[0].files.map(file => file.path);
}

/**
 * Every other check in this gate reads a list produced by `yarn pack`, while
 * the pipeline ships whatever `npm publish` builds. That substitution is only
 * legitimate while the two packers resolve `files` and the ignore rules
 * identically — so this asserts it rather than trusting it, and the gate's
 * verdict stops meaning anything about the published tarball the moment it
 * fails.
 *
 * A divergence is not something to paper over by widening a rule: bring the
 * publish step onto the same tool (`yarn npm publish`, which `web-components`
 * already uses) and re-run.
 */
export function checkPackerAgreement(yarnFiles, npmFiles) {
  const yarnSet = new Set(yarnFiles);
  const npmSet = new Set(npmFiles);
  return [
    ...yarnFiles.filter(file => !npmSet.has(file)).map(file => `${file} — packed by yarn, absent from npm`),
    ...npmFiles.filter(file => !yarnSet.has(file)).map(file => `${file} — packed by npm, absent from yarn`),
  ];
}

export function main({ cwd = PROJECT_ROOT, log = console.log, error = console.error } = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const declared = collectDeclaredEntries(pkg);
  const files = packedFileList(cwd);
  const readText = file => fs.readFileSync(path.join(cwd, file), 'utf8');
  const lazyDir = lazyBundleDir(pkg);
  const standaloneDir = standaloneBundleDir(pkg);

  const categories = [
    // First, because it grades the instrument the other checks read from: if
    // the two packers disagree, every verdict below is about a tarball that is
    // not the one being published.
    ['gate packer disagrees with the publisher packer', checkPackerAgreement(files, npmPackedFileList(cwd))],
    [
      'declared entrypoint missing from tarball',
      checkDeclaredEntries(declared, files).map(entry => `${entry.source} -> ${entry.target}`),
    ],
    ['build-machine artifact in tarball', checkForbiddenPaths(files)],
    ['absolute build-machine path in tarball', checkAbsolutePaths(files)],
    ['source map in tarball (development build)', checkSourceMaps(files)],
    [
      'development runtime in tarball',
      // EVERY packed `.js`, not a list of bundle directories. The previous scope
      // named two dirs and read as complete — the comment here even claimed "the
      // tarball carries two" — while `main`, `module` and all of `loader/` went
      // unread. The bar says "no development-build artifacts", so the scope is
      // the tarball. Rationale and the measurement behind it: `checkDevSignature`.
      checkDevSignature(files, readText),
    ],
    ['standalone bundle published without its assets', checkBundleAssets(files, lazyDir, standaloneDir)],
  ];

  const failures = categories.filter(([, offenders]) => offenders.length > 0);

  if (failures.length === 0) {
    log(
      `validate-package: PASS — ${files.length} files packed (yarn and npm agree), ` +
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
